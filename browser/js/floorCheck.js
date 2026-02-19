/**
 * floorCheck.js — Floor physics system.
 *
 * Ported from CTRL.S (CHECKFLOOR, falling, fallon, hitflr, onground, startfall).
 * Handles floor detection, landings, ledge grabs, and step-off-edge.
 *
 * Spike impalement and slicer triggers are handled in mover.js.
 */

import { jumpSeq, addCharX, ACTION, ACCEL_GRAVITY, TERM_VELOCITY } from './charState.js';
import { SEQ } from './seqtable.js';
import { getFrameDef } from './frameDef.js';
import { TILE } from './level.js';
import {
  cmpspace, cmpwall,
  getunderft, getinfront, getbehind,
  getabove, getaboveinf,
  checkledge,
} from './blockReader.js';
import {
  getbasex, getdist, rereadblocks, getblockej,
  FloorY, BLOCK_WIDTH, ANGLE,
  F_CHECK_MARK, F_FOOT_MARK,
  OOF_VELOCITY, DEATH_VELOCITY, STUN_TIME,
} from './positionMath.js';
import { animChar } from './seqInterpreter.js';

// ── Constants from CTRL.S ──────────────────────────────────────────────────
const GRAB_REACH = -8;    // pixels backward shift for grab check
const GRAB_SPEED = 32;    // max Y-velocity to grab a ledge
const GRAB_LEAD  = 25;    // vertical pixels: (CharY + 25) >= FloorY → close enough

// ────────────────────────────────────────────────────────────────────────────
//  CHECKFLOOR — main dispatcher
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check floor state and handle landings, falls, and ledge grabs.
 *
 * Must be called AFTER animChar + gravity + addFall in the per-frame pipeline.
 *
 * @param {object} char   Character state (mutated)
 * @param {object} ctx    { level, input }
 */
export function checkFloor(char, ctx) {
  const action = char.charAction;

  // Action 6: hanging static — skip
  if (action === ACTION.hangStatic) return;

  // Action 5: bumped — onground only for crouching (109) or dead (185)
  if (action === ACTION.bumped) {
    if (char.charPosn === 109 || char.charPosn === 185) {
      onground(char, ctx);
    }
    return;
  }

  // Action 4: freefall
  if (action === ACTION.freefall) {
    falling(char, ctx);
    return;
  }

  // Action 3: controlled fall — fallon only for posn 102–105
  if (action === ACTION.controlledFall) {
    if (char.charPosn >= 102 && char.charPosn < 106) {
      fallon(char, ctx);
    }
    return;
  }

  // Action 2: hanging — skip
  if (action === ACTION.hanging) return;

  // Actions 0, 1, 7: normal ground state
  onground(char, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  FALLING — each frame during freefall (CharAction == 4)
// ────────────────────────────────────────────────────────────────────────────

function falling(char, ctx) {
  const level = ctx.level;
  // FloorY[blockY + 1] = floor Y for that block row
  // After startfall's inc blockY, charBlockY is the row we're falling through
  const floorLevel = FloorY[char.charBlockY + 1];

  if (char.charY < floorLevel) {
    // Haven't reached the floor plane yet — check for ledge grab
    fallon(char, ctx);
    return;
  }

  // ── At or past the floor plane ──
  const underft = getunderft(level, char);

  // Inside a solid block? Bump out.
  if (underft.id === TILE.block) {
    insideBlock(char, ctx);
  }

  // Is the floor passable (space)?
  if (cmpspace(underft.id) === 0) {
    // Space — fall through to next row
    char.charBlockY++;
    return;
  }

  // Solid floor — land
  hitflr(char, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  FALLON — ledge grab detection
// ────────────────────────────────────────────────────────────────────────────

function fallon(char, ctx) {
  const level = ctx.level;
  const inp = ctx.input;

  // Must hold button AND be alive
  if (!inp.btn || char.charLife >= 0) return;

  // Must not be falling too fast
  if (char.charYVel >= GRAB_SPEED) return;

  // Must be within vertical range: (CharY + GRAB_LEAD) >= FloorY
  const floorLevel = FloorY[char.charBlockY + 1];
  if (char.charY + GRAB_LEAD < floorLevel) return;

  // ── Within range — try ledge grab ──
  const savedX = char.charX;

  // Shift backward to check nearby ledge
  addCharX(char, GRAB_REACH); // -8 pixels backward
  rereadblocks(char);

  // Check: tile above must be clear, tile above+front must be solid ledge
  const above = getabove(level, char);
  const aboveInf = getaboveinf(level, char);
  const canGrab = checkledge(
    aboveInf.tile.id,
    aboveInf.tile.spec || 0,
    above.tile.id,
    char.charFace
  );

  if (!canGrab) {
    // No ledge — restore position
    char.charX = savedX;
    rereadblocks(char);
    return;
  }

  // ── Found a ledge! Snap to it. ──

  // Align X to block edge
  const dist = getdist(char);
  addCharX(char, dist);

  // Snap Y to floor level
  char.charY = floorLevel;
  char.charYVel = 0;

  // Play fallhang sequence and advance one frame
  jumpSeq(char, SEQ.fallhang);
  animChar(char, {});

  // Stun for 12 frames
  char.stunTimer = STUN_TIME;
}

// ────────────────────────────────────────────────────────────────────────────
//  HITFLR — landing on a solid floor
// ────────────────────────────────────────────────────────────────────────────

function hitflr(char, ctx) {
  const level = ctx.level;

  // Snap Y to floor level
  const floorLevel = FloorY[char.charBlockY + 1];
  char.charY = floorLevel;

  // Spike check — deferred to Phase 7

  // Edge proximity: if space in front and too close to edge, push back
  const infront = getinfront(level, char);
  if (cmpspace(infront.tile.id) === 0) {
    const dist = getdist(char);
    if (dist < 4) {
      addCharX(char, -3);
    }
  }

  // Already dead → hard landing
  if (char.charLife >= 0) {
    doHardLand(char);
    return;
  }

  // ── Velocity-based landing severity ──
  const vel = char.charYVel;

  if (vel < OOF_VELOCITY) {
    // Soft landing (vel < 22)
    doSoftLand(char);
  } else if (vel < DEATH_VELOCITY) {
    // Medium landing (22 ≤ vel < 33)
    doMedLand(char, ctx);
  } else {
    // Hard landing (vel ≥ 33) — death
    doHardLand(char);
  }
}

function doSoftLand(char) {
  // In combat (sword drawn) → landengarde. Skipped for Phase 6.
  jumpSeq(char, SEQ.softland);
  animChar(char, {});
  char.charYVel = 0;
}

function doMedLand(char, ctx) {
  // Shadow always lands soft
  if (char.charId === 1) {
    doSoftLand(char);
    return;
  }
  // Guards die on medium landing (not relevant for Phase 6)
  if (char.charId >= 2) {
    doHardLand(char);
    return;
  }

  // Player: lose 1 HP via health system if available
  if (ctx.health) {
    const { decstr } = ctx.health;
    if (typeof decstr === 'function') {
      decstr(1);
    }
  }
  jumpSeq(char, SEQ.medland);
  animChar(char, {});
  char.charYVel = 0;
}

function doHardLand(char) {
  // Kill (100 damage — instant death regardless of HP)
  char.charLife = 0; // dead
  char.alive = false;
  jumpSeq(char, SEQ.hardland);
  animChar(char, {});
  char.charYVel = 0;
}

// ────────────────────────────────────────────────────────────────────────────
//  ONGROUND — floor check while walking/running
// ────────────────────────────────────────────────────────────────────────────

function onground(char, ctx) {
  // Only check on frames with fcheckmark set
  const frame = getFrameDef(char.charPosn, char.charId);
  if (!frame) return;

  if (!(frame.fcheck & F_CHECK_MARK)) return;

  const level = ctx.level;
  const underft = getunderft(level, char);

  // Inside a block — bump out
  if (underft.id === TILE.block) {
    insideBlock(char, ctx);
    return;
  }

  // Solid floor — stay put
  if (cmpspace(underft.id) !== 0) return;

  // ── No floor → start falling ──
  startfall(char, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  STARTFALL — initiate a fall
// ────────────────────────────────────────────────────────────────────────────

function startfall(char, ctx) {
  char.rjumpflag = char.charPosn;
  char.charSword = 0;   // clear sword for grabbing
  char.charBlockY++;     // advance to row below

  const posn = char.charPosn;
  let seq;

  // ── CharPosn → fall sequence mapping ──
  if (posn === 9) {
    // Running frame 12 → stepfall
    seq = SEQ.stepfall;
  } else if (posn === 13) {
    // Running frame 16 → stepfall2
    seq = SEQ.stepfall2;
  } else if (posn === 26) {
    // Standing jump frame 19 → jumpfall
    seq = SEQ.jumpfall;
  } else if (posn === 44) {
    // Running jump frame 11 → rjumpfall
    seq = SEQ.rjumpfall;
  } else if (posn >= 81 && posn < 86) {
    // Hanging-drop frames → move forward 5px, then stepfall2
    addCharX(char, 5);
    rereadblocks(char);
    seq = SEQ.stepfall2;
  } else if (posn >= 150 && posn < 180) {
    // Fighting stance fall (deferred — use stepfall)
    seq = SEQ.stepfall;
  } else {
    // Default: stepfall
    seq = SEQ.stepfall;
  }

  jumpSeq(char, seq);
  animChar(char, {});

  // After starting the fall, check for walls
  rereadblocks(char);

  const level = ctx.level;
  const underft = getunderft(level, char);
  if (cmpwall(underft.id, char.charFace) === 0) {
    // Fell into a wall — bump outside
    insideBlock(char, ctx);
    return;
  }

  const infront = getinfront(level, char);
  if (cmpwall(infront.tile.id, char.charFace) !== 0) {
    // Clear — done
    return;
  }

  // Wall in front — CDpatch
  cdpatch(char, ctx);
}

/**
 * CDpatch — running jump edge correction.
 * If character was doing a running jump and hits a wall, adjust.
 */
function cdpatch(char, ctx) {
  if (char.rjumpflag === 44) {
    // Was running jump
    const dist = getdist(char);
    if (dist < 6) {
      jumpSeq(char, SEQ.patchfall);
      animChar(char, {});
      rereadblocks(char);
      return;
    }
  }

  // Default: nudge 1 pixel backward
  addCharX(char, -1);
  rereadblocks(char);
}

// ────────────────────────────────────────────────────────────────────────────
//  INSIDEBLOCK — bump character out of a solid block
// ────────────────────────────────────────────────────────────────────────────

function insideBlock(char, ctx) {
  const level = ctx.level;
  const dist = getdist(char);

  if (dist < 8) {
    // Closer to front edge — try bump forward
    const infront = getinfront(level, char);
    if (cmpwall(infront.tile.id, char.charFace) !== 0) {
      // Space in front — bump forward
      addCharX(char, dist + 4);
      rereadblocks(char);
      return;
    }
  }

  // Bump backward
  addCharX(char, -(BLOCK_WIDTH - dist) + 4);
  rereadblocks(char);
}
