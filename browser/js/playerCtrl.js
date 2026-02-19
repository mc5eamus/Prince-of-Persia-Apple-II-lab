/**
 * playerCtrl.js — Player control state machine.
 *
 * Ported from CTRL.S (GenCtrl, UserCtrl) and COLL.S (GETFWDDIST, DBarr).
 * Handles keyboard input dispatch → animation sequence selection for the kid.
 *
 * Excludes: FightCtrl (combat), GuardCtrl (AI),
 *           trap interactions (deferred to Phase 7).
 */

import { jumpSeq, addCharX, ACTION } from './charState.js';
import { SEQ } from './seqtable.js';
import { getFrameDef } from './frameDef.js';
import { TILE } from './level.js';
import {
  rdblock, cmpspace, cmpbarr, cmpwall,
  getunderft, getinfront, get2infront, getbehind,
  getabove, getaboveinf, getabovebeh,
  checkledge, BarL, BarR,
} from './blockReader.js';
import {
  getbasex, getbaseblock, getdist, getdist1,
  getblockx, getblockxp, getblockej,
  addcharx, rereadblocks,
  ANGLE, BLOCK_WIDTH,
  F_FOOT_MARK, F_CHECK_MARK,
  STEP_OFF_FWD, STEP_OFF_BACK, JUMP_BACK_THRES,
  STUN_TIME, OOF_VELOCITY, DEATH_VELOCITY,
} from './positionMath.js';
import { facejstk, unfacejstk } from './input.js';

// ── Constants from CTRL.S ──────────────────────────────────────────────────
const RJ_CHANGE     = 4;     // projected delta-X for running jump
const RJ_LOOKAHEAD  = 1;     // max blocks to look ahead
const RJ_LEAD_DIST  = 14;    // required leading distance
const RJ_MAX_FUJ_BAK = 8;    // max fudge backward
const RJ_MAX_FUJ_FWD = 2;    // max fudge forward
const STAIR_THRES   = 30;    // (spec >> 2) threshold for stairs
const G_CLIMB_THRES = 6;     // gate spec threshold for climbing

const JUMPUP_REACH  = 0;     // X offset for ceiling check
const JUMPUP_ANGLE  = -6;    // X angle for ceiling check

// ────────────────────────────────────────────────────────────────────────────
//  Main entry point
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run one frame of player control.
 *
 * Replicates PLAYERCTRL → UserCtrl → GenCtrl.
 *
 * @param {object} char   Character state (mutated)
 * @param {object} ctx    { level, input }
 */
export function playerCtrl(char, ctx) {
  // Update stun timer
  if (char.stunTimer > 0) char.stunTimer--;

  // Normalize input for facing direction (UserCtrl)
  const savedFace = char.charFace;
  facejstk(ctx.input, savedFace);

  genCtrl(char, ctx);

  // Restore input
  unfacejstk(ctx.input, savedFace);
}

// ────────────────────────────────────────────────────────────────────────────
//  GenCtrl — CharPosn-based dispatch
// ────────────────────────────────────────────────────────────────────────────

function genCtrl(char, ctx) {
  const inp = ctx.input;

  // ── Dead check ──
  if (char.charLife >= 0) {
    // Character is dead
    const posn = char.charPosn;
    if (posn === 15 || posn === 166 || posn === 158 || posn === 171) {
      jumpSeq(char, SEQ.dropdead);
    }
    return;
  }

  // ── Skip if freefall or bumped ──
  if (char.charAction === ACTION.freefall || char.charAction === ACTION.bumped) {
    clrall(inp);
    return;
  }

  // ── Skip combat (charSword == 2 → FightCtrl, excluded) ──
  // ── Skip guard AI (charId >= 2 → GuardCtrl, excluded) ──

  // ── Dispatch on CharPosn ──
  const posn = char.charPosn;

  if (posn === 15) {
    standing(char, ctx);
  } else if (posn === 48) {
    turning(char, ctx);
  } else if (posn >= 50 && posn < 53) {
    standing(char, ctx);      // turn7/8/9 → treat as standing
  } else if (posn < 4) {
    starting(char, ctx);      // first frames of startrun
  } else if (posn >= 67 && posn < 70) {
    stjumpup(char, ctx);      // starting jump-up
  } else if (posn < 15) {
    running(char, ctx);       // full run (posn 4–14)
  } else if (posn >= 87 && posn < 100) {
    hanging(char, ctx);       // hanging from ledge
  } else if (posn === 109) {
    crouching(char, ctx);     // crouching
  }
  // else: no control input processed (mid-animation)
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: STANDING (CharPosn == 15 or 50–52)
// ────────────────────────────────────────────────────────────────────────────

function standing(char, ctx) {
  const inp = ctx.input;

  // ── Pickup attempt (button) ──
  if (inp.clrbtn < 0 && inp.btn) {
    if (tryPickup(char, ctx)) return;
  }

  // ── Button held: precise movement ──
  if (inp.btn) {
    if (inp.clrB < 0) return doTurn(char, ctx);
    if (inp.clrU < 0) return standingUp(char, ctx);
    if (inp.clrD < 0) return standingDown(char, ctx);
    if (inp.JSTKX < 0) {
      if (inp.clrF < 0) return doStepfwd(char, ctx);
    }
    return;
  }

  // ── Button up: fluid movement ──
  if (inp.clrF < 0) return doStartrun(char, ctx);
  if (inp.clrB < 0) return doTurn(char, ctx);
  if (inp.clrU < 0) return standingUp(char, ctx);
  if (inp.clrD < 0) return standingDown(char, ctx);
  if (inp.JSTKX < 0) return doStartrun(char, ctx);
}

/**
 * Standing + up pressed: check stairs first, then jump.
 */
function standingUp(char, ctx) {
  const level = ctx.level;

  // ── Stairs detection ──
  let stairTile = null;
  let stairBlockX = -1;

  // Check underfoot for exit tile
  const underft = getunderft(level, char);
  if (underft.id === TILE.exit || underft.id === TILE.exit2) {
    stairTile = underft;
    stairBlockX = char.charBlockX;
  }

  if (!stairTile) {
    const behind = getbehind(level, char);
    if (behind.tile.id === TILE.exit || behind.tile.id === TILE.exit2) {
      stairTile = behind.tile;
      stairBlockX = behind.behindx;
    }
  }

  if (!stairTile) {
    const infront = getinfront(level, char);
    if (infront.tile.id === TILE.exit || infront.tile.id === TILE.exit2) {
      stairTile = infront.tile;
      stairBlockX = infront.infrontx;
    }
  }

  if (stairTile && (stairTile.spec >> 2) >= STAIR_THRES) {
    // Climb stairs
    char.charX = getblockej(stairBlockX) + 10;
    char.charFace = -1;
    jumpSeq(char, SEQ.climbstairs);
    return;
  }

  // ── No stairs: jump ──
  if (ctx.input.JSTKX < 0) {
    return doStandjump(char, ctx);
  }
  return doJumpup(char, ctx);
}

/**
 * Standing + down pressed: check for cliff edges, then crouch.
 */
function standingDown(char, ctx) {
  const inp = ctx.input;
  const level = ctx.level;
  inp.clrD = 1; // consumed

  // 1) Cliff in front: if space ahead AND close to edge, step forward
  const infront = getinfront(level, char);
  if (cmpspace(infront.tile.id) === 0) {
    const dist = getdist(char);
    if (dist < STEP_OFF_FWD) {
      addCharX(char, 5);
      rereadblocks(char);
      return;
    }
  }

  // 2) Cliff behind: if space behind AND far from edge, try climbdown
  const behind = getbehind(level, char);
  if (cmpspace(behind.tile.id) === 0) {
    const dist = getdist(char);
    if (dist >= STEP_OFF_BACK) {
      // Check for ledge below to grab
      const underft = getunderft(level, char);
      const canGrab = checkledge(
        underft.id,
        underft.spec || 0,
        behind.tile.id,
        char.charFace
      );
      if (canGrab) {
        // Gate climb threshold check
        if (char.charFace > 0 && underft.id === TILE.gate) {
          if ((underft.spec >> 2) < G_CLIMB_THRES) {
            return doCrouch(char, ctx);
          }
        }
        // Position for climbdown
        addCharX(char, getdist(char) - 9);
        jumpSeq(char, SEQ.climbdown);
        return;
      }
    }
  }

  // 3) Default: crouch
  doCrouch(char, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: STARTING (CharPosn 1–3)
// ────────────────────────────────────────────────────────────────────────────

function starting(char, ctx) {
  if (ctx.input.JSTKY < 0) {
    if (ctx.input.JSTKX < 0) {
      return doStandjump(char, ctx);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: RUNNING (CharPosn 4–14)
// ────────────────────────────────────────────────────────────────────────────

function running(char, ctx) {
  const inp = ctx.input;

  if (inp.JSTKX === 0) {
    // Centered — try to stop
    return runstop(char, ctx);
  }

  if (inp.JSTKX > 0) {
    // Backward — turn while running
    return runturn(char, ctx);
  }

  // ── Forward (JSTKX < 0): keep running ──
  if (inp.JSTKY < 0) {
    // Up — running jump
    if (inp.clrU < 0) {
      return doRunjump(char, ctx);
    }
    return;
  }

  if (inp.clrD < 0) {
    // Down — dive roll
    inp.clrD = 1;
    jumpSeq(char, SEQ.rdiveroll);
    return;
  }
}

function runstop(char, ctx) {
  // Can only stop on specific run frames (7=run10, 11=run14)
  if (char.charPosn === 7 || char.charPosn === 11) {
    clrall(ctx.input);
    jumpSeq(char, SEQ.runstop);
  }
}

function runturn(char, ctx) {
  clrall(ctx.input);
  jumpSeq(char, SEQ.runturn);
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: TURNING (CharPosn 48)
// ────────────────────────────────────────────────────────────────────────────

function turning(char, ctx) {
  const inp = ctx.input;
  if (inp.btn) return;            // button held — finish turn
  if (inp.JSTKX >= 0) return;    // not forward — finish turn
  if (inp.JSTKY < 0) return;     // up pressed — finish turn

  // Forward held, no button, no up → convert to turn-run
  jumpSeq(char, SEQ.turnrun);
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: ST-JUMPUP (CharPosn 67–69)
// ────────────────────────────────────────────────────────────────────────────

function stjumpup(char, ctx) {
  const inp = ctx.input;
  if (inp.JSTKX < 0) return doStandjump(char, ctx);
  if (inp.clrF < 0)  return doStandjump(char, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: HANGING (CharPosn 87–99)
// ────────────────────────────────────────────────────────────────────────────

function hanging(char, ctx) {
  const inp = ctx.input;
  const level = ctx.level;

  // ── Climbup ──
  if (char.stunTimer === 0 && inp.JSTKY < 0) {
    return hangClimbup(char, ctx);
  }

  // ── Button released → drop ──
  if (!inp.btn) {
    return hangDrop(char, ctx);
  }

  // ── Button held — check for hangstraight ──
  if (char.charAction !== ACTION.hangStatic) {
    // Check if wall below → go straight
    const underft = getunderft(level, char);
    if (underft.id === TILE.block) {
      jumpSeq(char, SEQ.hangstraight);
      return;
    }
    if (char.charFace < 0) {
      if (underft.id === TILE.panelwif || underft.id === TILE.panelwof) {
        jumpSeq(char, SEQ.hangstraight);
        return;
      }
    }
  }

  // Check ledge still exists
  const above = getabove(level, char);
  if (cmpspace(above.tile.id) === 0) {
    // Ledge disappeared — drop
    return hangDrop(char, ctx);
  }
  // Keep swinging
}

function hangClimbup(char, ctx) {
  const level = ctx.level;
  const inp = ctx.input;

  clrall(inp);
  inp.clrU = 1;
  inp.clrbtn = 1;

  // Check if the block above allows climbing
  const above = getabove(level, char);
  const tileId = above.tile.id;

  // Mirror/slicer: only from left side
  if (tileId === TILE.mirror || tileId === TILE.slicer) {
    if (char.charFace < 0) {
      jumpSeq(char, SEQ.climbup);
    } else {
      jumpSeq(char, SEQ.climbfail);
    }
    return;
  }

  // Gate: facing right OK, facing left needs spec check
  if (tileId === TILE.gate) {
    if (char.charFace > 0) {
      jumpSeq(char, SEQ.climbup);
    } else {
      const spec = above.tile.spec || 0;
      if ((spec >> 2) < G_CLIMB_THRES) {
        jumpSeq(char, SEQ.climbfail);
      } else {
        jumpSeq(char, SEQ.climbup);
      }
    }
    return;
  }

  // Default: succeed
  jumpSeq(char, SEQ.climbup);
}

function hangDrop(char, ctx) {
  const level = ctx.level;
  const inp = ctx.input;

  clrall(inp);
  inp.clrD = 1;

  // Check if space behind — if so, fall into void
  const behind = getbehind(level, char);
  if (cmpspace(behind.tile.id) !== 0) {
    // Solid behind → hangdrop
    return doHangdrop(char, ctx);
  }

  // Check if space under feet — if so, hang-fall
  const underft = getunderft(level, char);
  if (cmpspace(underft.id) === 0) {
    // Space below → hangfall (no floor to land on)
    jumpSeq(char, SEQ.hangfall);
    return;
  }

  // Default: hangdrop
  doHangdrop(char, ctx);
}

function doHangdrop(char, ctx) {
  const level = ctx.level;

  // Check if wall below (sheer drop)
  const underft = getunderft(level, char);
  let sheer = false;

  if (underft.id === TILE.block) {
    sheer = true;
  } else if (char.charFace < 0) {
    if (underft.id === TILE.panelwof || underft.id === TILE.panelwif) {
      sheer = true;
    }
  }

  if (sheer) {
    addCharX(char, -7); // step away from wall
  }

  jumpSeq(char, SEQ.hangdrop);
}

// ────────────────────────────────────────────────────────────────────────────
//  Handler: CROUCHING (CharPosn 109)
// ────────────────────────────────────────────────────────────────────────────

function crouching(char, ctx) {
  const inp = ctx.input;

  // Pickup attempt
  if (inp.clrbtn < 0) {
    if (tryPickup(char, ctx)) return;
  }

  // Not holding down → stand up
  if (inp.JSTKY !== 1) {
    jumpSeq(char, SEQ.standup);
    return;
  }

  // Forward → crawl
  if (inp.clrF < 0) {
    inp.clrF = 1;
    jumpSeq(char, SEQ.crawl);
    return;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Do-action helpers
// ────────────────────────────────────────────────────────────────────────────

function doStartrun(char, ctx) {
  const fwd = getfwddist(char, ctx);

  if (fwd.type === 1) {
    // Barrier — check if enough room
    if (fwd.tileId !== TILE.slicer) {
      // Solid barrier — check again for room
      if (fwd.dist >= 8) {
        jumpSeq(char, SEQ.startrun);
        return;
      }
      // Too close — try stepping
      if (ctx.input.clrF < 0) {
        return doStepfwd(char, ctx);
      }
      return;
    }
  }

  jumpSeq(char, SEQ.startrun);
}

function doTurn(char, ctx) {
  clrall(ctx.input);
  jumpSeq(char, SEQ.turn);
}

function doStandjump(char, ctx) {
  ctx.input.clrU = 1;
  ctx.input.clrF = 1;
  jumpSeq(char, SEQ.standjump);
}

function doCrouch(char, ctx) {
  jumpSeq(char, SEQ.stoop);
  clrall(ctx.input);
}

function doStepfwd(char, ctx) {
  const inp = ctx.input;
  inp.clrF = 1;
  inp.clrbtn = 1;

  const fwd = getfwddist(char, ctx);
  let dist = fwd.dist;

  if (dist !== 0) {
    char.charRepeat = dist;
    // stepfwd1 = SEQ 29, so seq = 28 + dist
    jumpSeq(char, 28 + dist);
    return;
  }

  // dist == 0
  if (fwd.type === 1) {
    // At barrier — full step through (for Phase 6, just step)
    char.charRepeat = 11;
    jumpSeq(char, 28 + 11); // step11
    return;
  }

  if (dist === char.charRepeat) {
    // Second time at 0 — step off edge
    char.charRepeat = 11;
    jumpSeq(char, 28 + 11);
    return;
  }

  // First time at dist==0 — test foot
  char.charRepeat = 0;
  jumpSeq(char, SEQ.testfoot);
}

// ────────────────────────────────────────────────────────────────────────────
//  DoJumpup — standing vertical jump
// ────────────────────────────────────────────────────────────────────────────

function doJumpup(char, ctx) {
  const level = ctx.level;
  const inp = ctx.input;

  clrall(inp);
  inp.clrU = 1;

  // 1) Check ledge in front+above
  const aboveInf = getaboveinf(level, char);
  const above = getabove(level, char);
  const canGrabFront = checkledge(
    aboveInf.tile.id,
    aboveInf.tile.spec || 0,
    above.tile.id,
    char.charFace
  );

  if (canGrabFront) {
    return doJumphang(char, ctx);
  }

  // 2) Check ledge above+behind (jumpback)
  const aboveBeh = getabovebeh(level, char);
  const canGrabBack = checkledge(
    above.tile.id,
    above.tile.spec || 0,
    aboveBeh.tile.id,
    char.charFace
  );

  if (canGrabBack) {
    const dist = getdist(char);
    if (dist >= JUMP_BACK_THRES) {
      // Far enough from edge — check solid behind
      const behind = getbehind(level, char);
      if (cmpspace(behind.tile.id) !== 0) {
        // Solid behind — move back 1 block
        addCharX(char, dist - BLOCK_WIDTH);
        rereadblocks(char);
        return doJumphang(char, ctx);
      }
      // Space behind — jump to edge
      return doJumpedge(char, ctx);
    }
    // Close to front edge — high jump
    return doJumphigh(char, ctx);
  }

  // 3) No ledge — high jump
  doJumphigh(char, ctx);
}

function doJumphang(char, ctx) {
  const level = ctx.level;

  // Re-check above+front for positioning
  getaboveinf(level, char);
  const dist = getdist(char);

  if (dist >= 4) {
    // Long hang — move to position
    addCharX(char, dist - 4);
    jumpSeq(char, SEQ.jumphangLong);
  } else {
    // Med hang — check if room
    const fwd = getfwddist(char, ctx);
    if (fwd.dist < 4 && fwd.type === 1) {
      // Wall close — fall back to Long
      addCharX(char, dist - 4);
      jumpSeq(char, SEQ.jumphangLong);
    } else {
      addCharX(char, dist);
      jumpSeq(char, SEQ.jumphangMed);
    }
  }
}

function doJumpedge(char, ctx) {
  // Jump to back edge
  const dist = getdist(char);
  addCharX(char, dist - 10);
  jumpSeq(char, SEQ.jumpbackhang);
}

function doJumphigh(char, ctx) {
  const level = ctx.level;
  const inp = ctx.input;

  clrall(inp);
  inp.clrU = 1;

  // Check forward barrier proximity
  const fwd = getfwddist(char, ctx);
  if (fwd.dist < 4 && fwd.type === 1) {
    addCharX(char, fwd.dist - 3); // step back from wall
  }

  // Check ceiling block
  const baseX = getbasex(char);
  const ceilX = baseX + JUMPUP_ANGLE; // baseX - 6
  const { block: ceilBlock } = getblockx(ceilX);
  const ceilY = char.charBlockY - 1;
  const ceilTile = rdblock(level, char.charScrn, ceilBlock, ceilY);

  const hasCeiling = (ceilTile.id === TILE.block) || (cmpspace(ceilTile.id) !== 0);

  if (hasCeiling) {
    jumpSeq(char, SEQ.jumpup);     // short jump (ceiling)
  } else {
    jumpSeq(char, SEQ.highjump);   // full height jump
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  DoRunjump — running jump
// ────────────────────────────────────────────────────────────────────────────

function doRunjump(char, ctx) {
  const level = ctx.level;
  const inp = ctx.input;

  // Must be in full-run frame (posn >= 7)
  if (char.charPosn < 7) return;

  let bufindex = 0;
  // Projected X after delta
  const projX = addcharx(RJ_CHANGE, char);
  let { block: blockx } = getblockxp(projX);

  // Count blocks to edge
  let foundEdge = false;
  for (let i = 0; i <= RJ_LOOKAHEAD; i++) {
    blockx += char.charFace;
    const tile = rdblock(level, char.charScrn, blockx, char.charBlockY);
    if (tile.id === TILE.spikes || cmpspace(tile.id) === 0) {
      foundEdge = true;
      break;
    }
    bufindex++;
  }

  if (foundEdge) {
    const pixelsToEdge = getdist1(projX, char.charFace) + bufindex * BLOCK_WIDTH;
    let diff = pixelsToEdge - RJ_LEAD_DIST;

    // Check fudge range
    if (diff < -RJ_MAX_FUJ_BAK) return;     // too far away, wait
    if (diff > RJ_MAX_FUJ_FWD) {
      diff = -3; // jumped too late, small correction
    }

    addCharX(char, diff + RJ_CHANGE);
  }

  clrall(inp);
  inp.clrU = 1;
  jumpSeq(char, SEQ.runjump);
}

// ────────────────────────────────────────────────────────────────────────────
//  GETFWDDIST — forward distance to obstacle
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute forward distance to next obstacle.
 *
 * Ported from COLL.S GETFWDDIST.
 *
 * @param {object} char   Character state
 * @param {object} ctx    { level }
 * @returns {{ dist: number, type: number, tileId: number }}
 *   dist = pixels (0–14), type = 0 edge, 1 barrier, 2 clear
 */
function getfwddist(char, ctx) {
  const level = ctx.level;

  // Update base block
  getbaseblock(char);

  // 1) Check current block for barrier
  const underft = getunderft(level, char);
  const barrCode = cmpbarr(underft.id);
  if (barrCode !== 0) {
    const bDist = dbarr(char, char.charBlockX, underft.id, barrCode, underft.spec);
    if (bDist >= 0) {
      return { dist: Math.min(bDist, 14), type: 1, tileId: underft.id };
    }
  }

  // 2) Check next block for barrier
  const inf = getinfront(level, char);
  if (inf.tile.id === TILE.panelwof && char.charFace > 0) {
    // Panel without floor facing right → go to end of block
    const d = getdist(char);
    return { dist: d, type: 0, tileId: inf.tile.id };
  }

  const infBarrCode = cmpbarr(inf.tile.id);
  if (infBarrCode !== 0) {
    const bDist = dbarr(char, inf.infrontx, inf.tile.id, infBarrCode, inf.tile.spec);
    if (bDist >= 0) {
      return { dist: Math.min(bDist, 14), type: 1, tileId: inf.tile.id };
    }
  }

  // 3) Check tile type of next block
  const nextTile = inf.tile;
  if (nextTile.id === TILE.loose) {
    return { dist: getdist(char), type: 0, tileId: nextTile.id };
  }
  if (nextTile.id === TILE.pressplate || nextTile.id === TILE.sword ||
      nextTile.id === TILE.flask) {
    const d = getdist(char);
    return { dist: d === 0 ? 11 : d, type: 0, tileId: nextTile.id };
  }
  if (cmpspace(nextTile.id) === 0) {
    // Space ahead
    return { dist: getdist(char), type: 0, tileId: nextTile.id };
  }

  // 4) All clear — natural step
  return { dist: 11, type: 2, tileId: nextTile.id };
}

/**
 * Compute distance from character to a barrier in a given block.
 *
 * Ported from COLL.S DBarr.
 *
 * @param {object} char       Character state
 * @param {number} blockx     Block column of the barrier
 * @param {number} tileId     Tile type
 * @param {number} barrCode   Barrier code from cmpbarr
 * @returns {number}  Signed distance (negative = behind, positive = ahead)
 */
function dbarr(char, blockx, tileId, barrCode, tileSpec) {
  // Gate: passable when opening >= 24 (original COLL.S threshold 0x18)
  if (tileId === TILE.gate && (tileSpec || 0) >= 24) return -1;

  const blockedge = getblockej(blockx) + ANGLE;
  const baseX = getbasex(char);

  if (char.charFace > 0) {
    // Facing right
    const barrLeft = blockedge + BarL[barrCode];
    return barrLeft - baseX;
  } else {
    // Facing left
    const barrRight = blockedge + BLOCK_WIDTH - 1 - BarR[barrCode];
    return baseX - barrRight;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  TRYPICKUP — pick up flask or sword
// ────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to pick up a flask or sword.
 *
 * Two-phase logic from CTRL.S TryPickup / PickItUp:
 *  Phase 1 (standing): detect object, crouch toward it.
 *  Phase 2 (crouching, charPosn===109): actually pick up the object,
 *          remove it from the level, start drink/sword animation.
 *
 * @param {object} char  Character state (mutated)
 * @param {object} ctx   { level, input, setLastPotion? }
 * @returns {boolean}  true if pickup initiated (caller should return)
 */
function tryPickup(char, ctx) {
  const level = ctx.level;

  // ── TryPickup: look for flask/sword underfoot or in-front ──
  const underft = getunderft(level, char);
  if (underft.id === TILE.flask || underft.id === TILE.sword) {
    // Object underfoot — check if space behind to step back
    const behind = getbehind(level, char);
    if (cmpspace(behind.tile.id) === 0) {
      // Can't step back (space behind = gap) → no pickup
      return false;
    }
    // Step character 1 block backward to approach from front
    addCharX(char, -14);
    rereadblocks(char);
  }

  const infront = getinfront(level, char);
  if (infront.tile.id !== TILE.flask && infront.tile.id !== TILE.sword) {
    return false; // nothing to pick up in front
  }

  // ── PickItUp ──
  pickItUp(char, ctx, infront.tile);
  return true;
}

/**
 * Execute the pickup action.
 *
 * From CTRL.S PickItUp: if not yet crouching → position toward object
 * and crouch.  If already crouching (posn 109) → remove object, start
 * drink/sword animation.
 *
 * @param {object} char   Character state
 * @param {object} ctx    { level, input, setLastPotion? }
 * @param {object} tile   The tile being picked up (mutated)
 */
function pickItUp(char, ctx, tile) {
  if (char.charPosn !== 109) {
    // Phase 1: crouch toward the object
    const fwd = getfwddist(char, ctx);
    if (fwd.type !== 2) {
      // Not at edge — nudge closer
      addCharX(char, fwd.dist);
    }
    if (char.charFace >= 0) {
      // Facing right — fine-tune position
      addCharX(char, -2);
    }
    doCrouch(char, ctx);
    return;
  }

  // Phase 2: actually pick up (charPosn === 109)
  if (tile.id === TILE.sword) {
    // Sword pickup → lastpotion = -1
    const potionType = -1;
    removeObj(tile, potionType, ctx);
    jumpSeq(char, SEQ.pickupsword);
  } else {
    // Flask pickup → potion type from upper 3 bits of spec
    const potionType = (tile.spec >> 5) & 7;
    removeObj(tile, potionType, ctx);
    jumpSeq(char, SEQ.drinkpotion);
  }
}

/**
 * Remove picked-up object: mutate tile to floor, set lastpotion.
 *
 * From CTRL.S RemoveObj.
 *
 * @param {object} tile        Tile to remove (mutated)
 * @param {number} potionType  Potion type to store (-1=sword, 0-7=potion)
 * @param {object} ctx         Context with setLastPotion callback
 */
function removeObj(tile, potionType, ctx) {
  tile.id = TILE.floor;
  tile.spec = 0;
  if (ctx.setLastPotion) {
    ctx.setLastPotion(potionType);
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Utility
// ────────────────────────────────────────────────────────────────────────────

/**
 * Clear all fresh-press flags (set to consumed).
 */
function clrall(input) {
  input.clrF = 1;
  input.clrB = 1;
  input.clrU = 1;
  input.clrD = 1;
  input.clrbtn = 1;
}
