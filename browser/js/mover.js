/**
 * mover.js — Transitional & Mobile Object systems (TROB / MOB).
 *
 * Ported from MOVER.S, GAMEEQ.S, MOVEDATA.S.
 *
 * TROB list: gates, spikes, slicers, loose floors, pressure plates, torches,
 *            flasks, swords, exit doors — any tile whose spec changes over time.
 *
 * MOB list: falling floor pieces (after loose floor detaches).
 */

import { TILE } from './level.js';

// ── TROB / MOB capacity ────────────────────────────────────────────────────
const TROB_SPACE = 32;
const MAX_TR     = TROB_SPACE - 1;   // max index (slot 0 is scratch)
const MOB_SPACE  = 16;
const MAX_MOB    = MOB_SPACE - 1;

// ── Gate constants ─────────────────────────────────────────────────────────
export const GMAX_VAL     = 188;      // 47 * 4 — fully open
const GMIN_VAL     = 0;        // fully closed
const GATE_TIMER   = GMAX_VAL + 50;  // 238 — pause-at-top countdown start
const MAX_GATE_VEL = 8;
const GATE_VEL     = [0, 0, 0, 20, 40, 60, 80, 100, 120]; // fast-close velocity
const GATE_INC     = [-1, 4, 4];     // [down, up, upjam]

// ── Exit constants ─────────────────────────────────────────────────────────
const EXIT_INC   = 4;
const EMAX_VAL   = 172;              // 43 * 4 — fully open exit

// ── Loose floor constants ──────────────────────────────────────────────────
const FFALLING      = 10;   // detach frame
const WIGGLE_TIME   = 4;
export const FF_ACCEL      = 3;
export const FF_TERM_VEL   = 29;
const CRUMBLE_TIME  = 2;
const CRUMBLE_TIME2 = 10;
const DISAPPEAR_TIME = 2;
const FF_HEIGHT     = 17;
const CRUSH_DIST    = 30;
const LOOSE_WIPE    = 31;

// ── Spike constants ────────────────────────────────────────────────────────
export const SPIKE_EXT    = 5;
export const SPIKE_RET    = 9;
const SPIKE_TIMER  = 0x8F;           // 143 = 128 + 15
const SPIKE_WIPE   = 31;

// ── Slicer constants ───────────────────────────────────────────────────────
export const SLICER_EXT   = 2;
export const SLICER_RET   = 6;
const SLICE_TIMER  = 15;
const SLICER_WIPE  = 63;
const SLICER_SYNC  = 3;              // initial stagger offset
const SLICER_BLOOD = 0x80;           // high-bit = blood smear

// ── Pressure plate constants ───────────────────────────────────────────────
const PP_TIMER     = 5;
const PLATE_WIPE   = 16;

// ── Direction constants ────────────────────────────────────────────────────
const DIR_DOWN     = 0;
const DIR_UP       = 1;
const DIR_UPJAM    = 2;
const DIR_FAST_MIN = 3;
const DIR_STOPPED  = -1;  // 0xFF in Apple II

// ── Block geometry (from positionMath / frameDef) ──────────────────────────
import { FLOOR_Y } from './frameDef.js';

// BlockAy = FLOOR_Y - 3 for each row (same as bgRenderer)
const BlockAy = FLOOR_Y.map(y => y - 3);

// ════════════════════════════════════════════════════════════════════════════
//  MOVER STATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create the mover state for a level.
 * Called once when entering a new level.
 *
 * @returns {MoverState}
 */
export function createMoverState() {
  return {
    // TROB list
    numTrans: 0,
    trloc:    new Uint8Array(TROB_SPACE),
    trscrn:   new Uint8Array(TROB_SPACE),
    trdirec:  new Int8Array(TROB_SPACE),

    // MOB list
    numMob: 0,
    mobx:     new Uint8Array(MOB_SPACE),
    moby:     new Int16Array(MOB_SPACE),  // can go negative / > 255
    mobscrn:  new Uint8Array(MOB_SPACE),
    mobvel:   new Int16Array(MOB_SPACE),
    mobtype:  new Uint8Array(MOB_SPACE),
    moblevel: new Uint8Array(MOB_SPACE),

    // Flags
    cleanTrob: false,
    cleanMob:  false,
    shakeScreen: 0,   // frames of screen-shake remaining
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  TROB LIST MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Search TROB list for an entry matching (loc, scrn).
 *
 * @param {MoverState} mv
 * @param {number} loc   Tile index 0–29
 * @param {number} scrn  Screen number
 * @returns {number}  Index (1-based) or 0 if not found
 */
export function searchtrob(mv, loc, scrn) {
  for (let x = mv.numTrans; x >= 1; x--) {
    if (mv.trloc[x] === loc && mv.trscrn[x] === scrn) return x;
  }
  return 0;
}

/**
 * Add or update a TROB entry.
 *
 * @param {MoverState} mv
 * @param {number} loc    Tile index 0–29
 * @param {number} scrn   Screen number
 * @param {number} direc  Direction/mode
 * @returns {boolean}  true if entry was added/updated
 */
export function addtrob(mv, loc, scrn, direc) {
  const idx = searchtrob(mv, loc, scrn);
  if (idx > 0) {
    // Already exists — update direction
    mv.trdirec[idx] = direc;
    return true;
  }
  if (mv.numTrans >= MAX_TR) return false;  // list full
  mv.numTrans++;
  const n = mv.numTrans;
  mv.trloc[n]   = loc;
  mv.trscrn[n]  = scrn;
  mv.trdirec[n] = direc;
  return true;
}

/**
 * Mark a TROB entry for removal (stopobj).
 *
 * @param {MoverState} mv
 * @param {number} idx  1-based index
 */
function stopobj(mv, idx) {
  mv.trdirec[idx] = DIR_STOPPED;
  mv.cleanTrob = true;
}

/**
 * Compact TROB list — remove entries with trdirec === DIR_STOPPED.
 */
function compactTrob(mv) {
  let dst = 1;
  for (let src = 1; src <= mv.numTrans; src++) {
    if (mv.trdirec[src] !== DIR_STOPPED) {
      if (dst !== src) {
        mv.trloc[dst]   = mv.trloc[src];
        mv.trscrn[dst]  = mv.trscrn[src];
        mv.trdirec[dst] = mv.trdirec[src];
      }
      dst++;
    }
  }
  mv.numTrans = dst - 1;
  mv.cleanTrob = false;
}

// ════════════════════════════════════════════════════════════════════════════
//  MOB LIST MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Add a MOB entry (falling floor piece).
 *
 * @param {MoverState} mv
 * @param {number} x      X position
 * @param {number} y      Y position
 * @param {number} scrn   Screen number
 * @param {number} level  Row level (0–2)
 * @returns {boolean}
 */
export function addmob(mv, x, y, scrn, level) {
  if (mv.numMob >= MAX_MOB) return false;
  mv.numMob++;
  const n = mv.numMob;
  mv.mobx[n]     = x;
  mv.moby[n]     = y;
  mv.mobscrn[n]  = scrn;
  mv.mobvel[n]   = 0;
  mv.mobtype[n]  = 0;    // 0 = falling floor
  mv.moblevel[n] = level;
  return true;
}

/**
 * Compact MOB list — remove entries whose velocity sentinel indicates deletion.
 */
function compactMob(mv) {
  let dst = 1;
  for (let src = 1; src <= mv.numMob; src++) {
    if (mv.mobvel[src] > -200) {  // keep alive ones
      if (dst !== src) {
        mv.mobx[dst]     = mv.mobx[src];
        mv.moby[dst]     = mv.moby[src];
        mv.mobscrn[dst]  = mv.mobscrn[src];
        mv.mobvel[dst]   = mv.mobvel[src];
        mv.mobtype[dst]  = mv.mobtype[src];
        mv.moblevel[dst] = mv.moblevel[src];
      }
      dst++;
    }
  }
  mv.numMob = dst - 1;
  mv.cleanMob = false;
}

// ════════════════════════════════════════════════════════════════════════════
//  LINK DATA DECODING (LINKLOC / LINKMAP)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Decode a link entry into tile location, screen number, timer, and last-flag.
 *
 * @param {Uint8Array} linkLoc
 * @param {Uint8Array} linkMap
 * @param {number} idx  Index into link arrays
 * @returns {{ loc: number, scrn: number, timer: number, isLast: boolean }}
 */
export function decodeLink(linkLoc, linkMap, idx) {
  const locByte = linkLoc[idx] || 0;
  const mapByte = linkMap[idx] || 0;

  const loc     = locByte & 0x1F;            // bits 0-4: tile position 0-29
  const scrnLo  = (locByte & 0x60) >> 5;     // bits 5-6: low 2 bits of screen
  const isLast  = !!(locByte & 0x80);         // bit 7: last-entry flag

  const timer   = mapByte & 0x1F;            // bits 0-4: timer value
  const scrnHi  = (mapByte & 0xE0) >> 5;     // bits 5-7: high 3 bits of screen

  const scrn    = (scrnHi << 2) | scrnLo;    // 5-bit screen number (0-31)

  return { loc, scrn, timer, isLast };
}

/**
 * Set the timer field in a LINKMAP entry.
 *
 * @param {Uint8Array} linkMap
 * @param {number} idx
 * @param {number} timer  New timer value (0–31)
 */
function setLinkTimer(linkMap, idx, timer) {
  linkMap[idx] = (linkMap[idx] & 0xE0) | (timer & 0x1F);
}

// ════════════════════════════════════════════════════════════════════════════
//  ANIMTRANS — Animate all TROBs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Animate all transitional objects for one frame.
 *
 * Called BEFORE the DoKid pipeline each frame.
 *
 * @param {MoverState} mv
 * @param {object} level   Parsed level data
 * @param {number} currentScreen  Currently visible screen
 */
export function animtrans(mv, level, currentScreen) {
  mv.cleanTrob = false;

  for (let x = mv.numTrans; x >= 1; x--) {
    const loc  = mv.trloc[x];
    const scrn = mv.trscrn[x];
    const dir  = mv.trdirec[x];

    // Get the tile from level data
    const room = level.rooms[scrn];
    if (!room) {
      stopobj(mv, x);
      continue;
    }
    const tile = room.tiles[loc];
    if (!tile) {
      stopobj(mv, x);
      continue;
    }

    // Dispatch by tile type
    switch (tile.id) {
      case TILE.gate:
        animgate(mv, x, tile, dir);
        break;
      case TILE.exit:
        animexit(mv, x, tile, dir);
        break;
      case TILE.spikes:
        animspikes(mv, x, tile);
        break;
      case TILE.slicer:
        animslicer(mv, x, tile, scrn, currentScreen);
        break;
      case TILE.loose:
        animfloor(mv, x, tile, level, scrn, loc);
        break;
      case TILE.space:
        // A loose floor that already turned to space — stop tracking
        stopobj(mv, x);
        break;
      case TILE.pressplate:
      case TILE.upressplate:
        animplate(mv, x, tile, level);
        break;
      default:
        // Unknown tile type in TROB — remove
        stopobj(mv, x);
        break;
    }
  }

  // Compact if any entries were marked for removal
  if (mv.cleanTrob) compactTrob(mv);
}

// ════════════════════════════════════════════════════════════════════════════
//  ANIMMOBS — Animate all MOBs (falling floor pieces)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Animate all mobile objects for one frame.
 *
 * Called BEFORE animtrans each frame.
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {number} currentScreen
 */
export function animmobs(mv, level, currentScreen) {
  mv.cleanMob = false;

  for (let x = mv.numMob; x >= 1; x--) {
    animmob(mv, x, level, currentScreen);
  }

  // Compact if needed
  if (mv.cleanMob) compactMob(mv);
}

/**
 * Animate a single MOB.
 */
function animmob(mv, idx, level, currentScreen) {
  const vel = mv.mobvel[idx];

  // Stopping/crumbling countdown (negative velocity)
  if (vel < 0) {
    mv.mobvel[idx] = vel + 1;
    if (mv.mobvel[idx] >= 0) {
      // Done crumbling — delete
      mv.mobvel[idx] = -200; // sentinel for compaction
      mv.cleanMob = true;
    }
    return;
  }

  // Falling floor physics
  if (mv.mobtype[idx] === 0) {
    mobfloor(mv, idx, level, currentScreen);
  }
}

/**
 * Falling floor piece physics.
 */
function mobfloor(mv, idx, level, currentScreen) {
  let vel = mv.mobvel[idx];
  if (vel < 0) return; // already stopping

  // Accelerate
  vel += FF_ACCEL;
  if (vel > FF_TERM_VEL) vel = FF_TERM_VEL;
  mv.mobvel[idx] = vel;

  // Move down
  mv.moby[idx] += vel;
  const y    = mv.moby[idx];
  const scrn = mv.mobscrn[idx];
  const lvl  = mv.moblevel[idx];

  // Off-screen (null room)
  if (scrn === 0) {
    if (y >= 192 + FF_HEIGHT) {
      mv.mobvel[idx] = -DISAPPEAR_TIME;
      mv.cleanMob = true;
    }
    return;
  }

  // Check if we've passed through to next row
  const nextLevel = lvl + 1;
  if (nextLevel > 2) {
    // Past bottom row — move to room below
    const room = level.rooms[scrn];
    if (room && room.down > 0) {
      mv.mobscrn[idx]  = room.down;
      mv.moblevel[idx] = 0;
      mv.moby[idx]     = y - 63; // adjust for new room (block height)
    } else {
      // No room below — disappear
      mv.mobscrn[idx]  = 0;
    }
    return;
  }

  // Check floor at next level
  const floorY = FLOOR_Y[nextLevel];
  if (y < floorY) return; // still above the floor plane

  const room = level.rooms[scrn];
  if (!room) return;

  // Find column from x position
  const x   = mv.mobx[idx];
  const col = Math.floor((x - 58) / 14);
  if (col < 0 || col > 9) return;

  const tileIdx = nextLevel * 10 + col;
  const tile = room.tiles[tileIdx];
  if (!tile) return;

  if (tile.id === TILE.space) {
    // Pass through — advance to next level
    mv.moblevel[idx] = nextLevel;
    return;
  }

  if (tile.id === TILE.loose) {
    // Knock out a loose floor
    knockloose(mv, tile, scrn, tileIdx, level);
    mv.mobvel[idx] = Math.floor(vel / 2); // halve velocity
    mv.moblevel[idx] = nextLevel;
    return;
  }

  // Crash onto solid floor
  mv.moby[idx]   = floorY;
  mv.mobvel[idx]  = -CRUMBLE_TIME;

  // Make rubble at crash site
  makerubble(mv, tile, level, scrn, tileIdx);

  // Screen shake
  mv.shakeScreen = 4;
}

/**
 * Convert tile to rubble after MOB crash.
 */
function makerubble(mv, tile, level, scrn, tileIdx) {
  // If it was a pressure plate, trigger it first
  if (tile.id === TILE.pressplate || tile.id === TILE.upressplate) {
    const pptype = tile.id;
    const linkIdx = tile.spec;
    triggerChain(mv, level, linkIdx, pptype);
  }

  // Change tile to rubble
  tile.id   = TILE.rubble;
  tile.spec = 0;
}

/**
 * Knock a loose floor loose (chain reaction from MOB impact).
 */
function knockloose(mv, tile, scrn, tileIdx, level) {
  // Check reqmask — required floors can't break
  if (tile.modifier) return;

  // Start the shake countdown if idle
  if (tile.spec === 0) {
    tile.spec = 1; // start shaking
    addtrob(mv, tileIdx, scrn, DIR_UP);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  GATE ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function animgate(mv, idx, tile, dir) {
  let state = tile.spec;
  if (state === 0xFF) {
    // Jammed open — stop tracking
    stopobj(mv, idx);
    return;
  }

  if (dir === DIR_DOWN) {
    // Closing
    if (state > GMAX_VAL) {
      // Timer zone (238 → 189) — counting down to start closing
      state += GATE_INC[0]; // -1
      if (state <= GMAX_VAL) {
        // Timer expired, start actual movement down
        state = GMAX_VAL;
      }
    } else {
      // Actually closing
      state += GATE_INC[0]; // -1
      if (state <= GMIN_VAL) {
        state = GMIN_VAL;
        // Play gate slam sound effect (TODO: sound)
        stopobj(mv, idx);
      }
    }
  } else if (dir === DIR_UP) {
    // Opening (temporary)
    state += GATE_INC[1]; // +4
    if (state >= GMAX_VAL) {
      state = GATE_TIMER; // start close-timer at top
      mv.trdirec[idx] = DIR_DOWN; // will close after timer
    }
  } else if (dir === DIR_UPJAM) {
    // Opening permanently
    state += GATE_INC[2]; // +4
    if (state >= GMAX_VAL) {
      state = 0xFF; // jammed open
      stopobj(mv, idx);
    }
  } else if (dir >= DIR_FAST_MIN) {
    // Fast closing (slamming)
    const velIdx = Math.min(dir, MAX_GATE_VEL);
    state -= GATE_VEL[velIdx];
    if (state <= GMIN_VAL) {
      state = GMIN_VAL;
      // TODO: gate crash sound
      mv.shakeScreen = 2;
      stopobj(mv, idx);
    } else {
      // Accelerate next frame
      mv.trdirec[idx] = Math.min(dir + 1, MAX_GATE_VEL);
    }
  }

  tile.spec = Math.max(0, Math.min(state, 0xFF));
}

// ════════════════════════════════════════════════════════════════════════════
//  EXIT DOOR ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function animexit(mv, idx, tile, dir) {
  let state = tile.spec;

  if (dir === DIR_UP) {
    state += EXIT_INC;
    if (state >= EMAX_VAL) {
      state = EMAX_VAL;
      stopobj(mv, idx);
    }
  } else {
    state -= EXIT_INC;
    if (state <= 0) {
      state = 0;
      stopobj(mv, idx);
    }
  }

  tile.spec = state;
}

// ════════════════════════════════════════════════════════════════════════════
//  SPIKE ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function animspikes(mv, idx, tile) {
  let state = tile.spec;

  if (state === 0xFF) {
    // Jammed (impaled) — never change
    stopobj(mv, idx);
    return;
  }

  if (state & 0x80) {
    // Timer mode (fully extended, counting down)
    state--;
    if ((state & 0x7F) === 0) {
      // Timer expired → start retracting
      state = SPIKE_EXT + 1; // 6
    }
  } else {
    // Extending or retracting
    state++;
    if (state === SPIKE_EXT) {
      // Fully extended → start timer
      state = SPIKE_TIMER; // 0x8F
    } else if (state >= SPIKE_RET) {
      // Fully retracted → done
      state = 0;
      stopobj(mv, idx);
    }
  }

  tile.spec = state;
}

/**
 * Trigger spikes at a tile.
 *
 * @param {MoverState} mv
 * @param {object} tile   Tile object (mutated)
 * @param {number} scrn   Screen number
 * @param {number} loc    Tile index 0-29
 */
export function trigspikes(mv, tile, scrn, loc) {
  const state = tile.spec;

  if (state === 0) {
    // Retracted → trigger
    tile.spec = 1;
    addtrob(mv, loc, scrn, DIR_UP);
  } else if (state === 0xFF) {
    // Jammed — ignore
  } else if (state & 0x80) {
    // Extended with timer — reset timer
    tile.spec = SPIKE_TIMER;
  }
  // If 0 < state < spikeExt (extending): don't interfere
}

/**
 * Get spike danger status.
 *
 * @param {number} spec  Tile spec
 * @returns {number}  0 = safe, 1 = sprung (fully extended), 2 = springing (extending)
 */
export function getspikes(spec) {
  if (spec === 0) return 0;      // retracted
  if (spec === 0xFF) return 1;   // jammed = deadly
  if (spec & 0x80) return 1;     // extended with timer = deadly
  if (spec >= SPIKE_EXT) return 0;  // retracting = safe
  return 2;                       // extending = springing
}

// ════════════════════════════════════════════════════════════════════════════
//  SLICER ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function animslicer(mv, idx, tile, scrn, currentScreen) {
  let state = tile.spec;
  const blood = state & SLICER_BLOOD;   // preserve blood flag
  let frame = (state & 0x7F) + 1;

  if (frame > SLICE_TIMER) {
    frame = 1; // wrap cycle
  }

  // At slicerRet (6): if offscreen, purge
  if (frame === SLICER_RET) {
    if (scrn !== currentScreen) {
      tile.spec = 0;
      stopobj(mv, idx);
      return;
    }
  }

  tile.spec = blood | frame;
}

/**
 * Trigger a slicer into action.
 *
 * @param {MoverState} mv
 * @param {object} tile
 * @param {number} scrn
 * @param {number} loc
 * @param {number} [initState=1]  Starting state
 */
export function trigslicer(mv, tile, scrn, loc, initState = 1) {
  const state = tile.spec & 0x7F;

  // OK to trigger if idle (0) or past retraction point (≥ slicerRet)
  if (state !== 0 && state < SLICER_RET) return; // mid-slice, don't interfere

  tile.spec = (tile.spec & SLICER_BLOOD) | initState;
  addtrob(mv, loc, scrn, DIR_UP);
}

/**
 * Add all slicers in a room to the TROB list (staggered start).
 * Called when entering a new room.
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {number} scrn  Screen number
 */
export function addslicers(mv, level, scrn) {
  const room = level.rooms[scrn];
  if (!room) return;

  let sync = 0;
  for (let i = 0; i < 30; i++) {
    const tile = room.tiles[i];
    if (tile.id === TILE.slicer) {
      sync += SLICER_SYNC; // stagger by 3
      if (sync > SLICE_TIMER) sync -= SLICE_TIMER;
      trigslicer(mv, tile, scrn, i, sync);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  LOOSE FLOOR ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function animfloor(mv, idx, tile, level, scrn, loc) {
  let state = tile.spec;

  if (state & 0x80) {
    // Wiggling phase (bit 7 set)
    const wiggle = state & 0x7F;
    if (wiggle >= WIGGLE_TIME) {
      // Done wiggling — start shaking countdown
      tile.spec = 1;
    } else {
      tile.spec = 0x80 | (wiggle + 1);
    }
    return;
  }

  // Shaking countdown: 1 → Ffalling
  if (state > 0 && state < FFALLING) {
    tile.spec = state + 1;
    return;
  }

  if (state >= FFALLING) {
    // Detach! Convert tile to space and create MOB
    detachFloor(mv, tile, level, scrn, loc);
    stopobj(mv, idx);
  }
}

/**
 * Detach a loose floor — convert to space and create a falling MOB.
 */
function detachFloor(mv, tile, level, scrn, loc) {
  const row = Math.floor(loc / 10);
  const col = loc % 10;

  // Calculate X position (center of block)
  const x = 58 + col * 14 + 7;
  const y = FLOOR_Y[row];

  // Convert tile to space
  tile.id   = TILE.space;
  tile.spec = 0;

  // Create MOB
  addmob(mv, x, y, scrn, row);
}

/**
 * Trigger a loose floor to start shaking.
 * Called when kid steps on it, or from neighbor impact (shakem).
 *
 * @param {MoverState} mv
 * @param {object} tile
 * @param {number} scrn
 * @param {number} loc
 */
export function breakloose(mv, tile, scrn, loc) {
  // Check reqmask — required floors can't break
  if (tile.modifier) return;

  if (tile.spec === 0) {
    // Idle — start shaking
    tile.spec = 1;
    addtrob(mv, loc, scrn, DIR_UP);
  }
}

/**
 * Shake all loose floors in the current screen row.
 * Called when something heavy lands (MOB crash, hard fall).
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {number} scrn   Screen number
 * @param {number} row    Row 0–2 (-1 for all rows)
 */
export function shakem(mv, level, scrn, row) {
  const room = level.rooms[scrn];
  if (!room) return;

  const startTile = (row >= 0 && row <= 2) ? row * 10 : 0;
  const endTile   = (row >= 0 && row <= 2) ? startTile + 10 : 30;

  for (let i = startTile; i < endTile; i++) {
    const tile = room.tiles[i];
    if (tile.id === TILE.loose && tile.spec === 0 && !tile.modifier) {
      // Start wiggling (high-bit set)
      tile.spec = 0x80;
      addtrob(mv, i, scrn, DIR_UP);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  PRESSURE PLATE ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function animplate(mv, idx, tile, level) {
  // Pressure plate timer countdown in LINKMAP
  const linkIdx = tile.spec; // spec = index into link tables
  const link = decodeLink(level.linkLoc, level.linkMap, linkIdx);

  if (link.timer <= 0 || link.timer >= 31) {
    // Timer expired or permanent — stop
    stopobj(mv, idx);
    return;
  }

  // Decrement timer
  const newTimer = link.timer - 1;
  setLinkTimer(level.linkMap, linkIdx, newTimer);

  if (newTimer <= 0) {
    // Timer just expired — stop plate, release gate
    stopobj(mv, idx);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  PRESSURE PLATE TRIGGER (checkpress / pushpp)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if the character is standing on a pressure plate, and trigger it.
 *
 * From COLL.S: checkpress — called after checkfloor.
 *
 * @param {object} char       Character state
 * @param {MoverState} mv
 * @param {object} level
 */
export function checkpress(char, mv, level) {
  const room = level.rooms[char.charScrn];
  if (!room) return;

  const tileIdx = char.charBlockY * 10 + char.charBlockX;
  const tile = room.tiles[tileIdx];
  if (!tile) return;

  if (tile.id === TILE.pressplate || tile.id === TILE.upressplate) {
    pushpp(mv, level, tile, tileIdx, char.charScrn);
  }
}

/**
 * Push a pressure plate.
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {object} tile      Plate tile (has spec = linkIndex)
 * @param {number} tileIdx   Tile position (0–29)
 * @param {number} scrn      Screen number
 */
export function pushpp(mv, level, tile, tileIdx, scrn) {
  const pptype   = tile.id;
  const linkIdx  = tile.spec;

  // Read the timer from link data
  const link = decodeLink(level.linkLoc, level.linkMap, linkIdx);

  if (link.timer >= 31) {
    // Permanent — already down
    return;
  }

  if (link.timer >= 2) {
    // Already triggered, re-trigger (reset timer)
    setLinkTimer(level.linkMap, linkIdx, PP_TIMER);
    // Re-trigger all linked targets
    triggerChain(mv, level, linkIdx, pptype);
    return;
  }

  // Fresh trigger
  setLinkTimer(level.linkMap, linkIdx, PP_TIMER);
  addtrob(mv, tileIdx, scrn, DIR_UP);
  // TODO: play PlateDown sound
  triggerChain(mv, level, linkIdx, pptype);
}

/**
 * Jam a pressure plate (permanent activation).
 * Regular plate → dpressplate. Upressplate → floor.
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {object} tile
 * @param {number} tileIdx
 * @param {number} scrn
 */
export function jampp(mv, level, tile, tileIdx, scrn) {
  let pptype;
  if (tile.id === TILE.pressplate) {
    tile.id = 5; // dpressplate
    pptype = TILE.pressplate;
  } else if (tile.id === TILE.upressplate) {
    tile.id = TILE.floor;
    tile.spec = 0;
    pptype = TILE.rubble; // rubble causes upjam
  } else {
    return;
  }
  pushpp(mv, level, tile, tileIdx, scrn);
}

/**
 * Follow the link chain and trigger all connected targets.
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {number} startIdx  Starting link index
 * @param {number} pptype    Plate type (pressplate / upressplate / rubble)
 */
function triggerChain(mv, level, startIdx, pptype) {
  let idx = startIdx;

  for (let safety = 0; safety < 256; safety++) {
    const link = decodeLink(level.linkLoc, level.linkMap, idx);
    const targetScrn = link.scrn;
    const targetLoc  = link.loc;

    const room = level.rooms[targetScrn];
    if (room) {
      const tile = room.tiles[targetLoc];
      if (tile) {
        trigobj(mv, tile, targetLoc, targetScrn, pptype);
      }
    }

    if (link.isLast) break;
    idx++;
  }
}

/**
 * Trigger an individual target tile.
 *
 * @param {MoverState} mv
 * @param {object} tile
 * @param {number} loc
 * @param {number} scrn
 * @param {number} pptype  What triggered it
 */
function trigobj(mv, tile, loc, scrn, pptype) {
  if (tile.id === TILE.gate) {
    triggate(mv, tile, loc, scrn, pptype);
  } else if (tile.id === TILE.exit) {
    // Open exit door
    addtrob(mv, loc, scrn, DIR_UP);
  }
  // Other tile types: no effect
}

/**
 * Trigger a gate based on the plate type.
 *
 * Matches MOVER.S triggate — can fail if gate is already at target position.
 *
 * @param {MoverState} mv
 * @param {object} tile
 * @param {number} loc
 * @param {number} scrn
 * @param {number} pptype
 */
function triggate(mv, tile, loc, scrn, pptype) {
  const state = tile.spec;

  if (pptype === TILE.upressplate) {
    // Raise gate (up, temporary)
    if (state === 0xFF) return;  // already jammed open → fail
    if (state >= GMAX_VAL) {
      // Already at top → reset timer
      tile.spec = GATE_TIMER;
      return;
    }
    addtrob(mv, loc, scrn, DIR_UP);
  } else if (pptype === TILE.rubble) {
    // Open & jam gate permanently
    if (state === 0xFF) return;  // already jammed
    if (state >= GMAX_VAL) {
      tile.spec = 0xFF; // jam immediately
      return;
    }
    addtrob(mv, loc, scrn, DIR_UPJAM);
  } else {
    // Regular pressplate → fast close (slam)
    if (state <= GMIN_VAL) return;  // already fully closed → fail
    addtrob(mv, loc, scrn, DIR_FAST_MIN);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SPIKE COLLISION CHECKS (from COLL.S)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check spikes on the kid's row (checkspikes from COLL.S).
 * Triggers any spike tile the kid is near or over.
 *
 * @param {object} char   Character state
 * @param {MoverState} mv
 * @param {object} level
 */
export function checkspikes(char, mv, level) {
  const room = level.rooms[char.charScrn];
  if (!room) return;

  const row = char.charBlockY;
  // Check the tile the kid is standing on
  const tileIdx = row * 10 + char.charBlockX;
  const tile = room.tiles[tileIdx];
  if (tile && tile.id === TILE.spikes) {
    trigspikes(mv, tile, char.charScrn, tileIdx);
  }
}

/**
 * Check if the kid is impaled on spikes (checkimpale from COLL.S).
 * Called when landing on or running over spikes.
 *
 * @param {object} char   Character state
 * @param {object} level
 * @returns {boolean}  true if impalement occurred
 */
export function checkimpale(char, level) {
  const room = level.rooms[char.charScrn];
  if (!room) return false;

  const tileIdx = char.charBlockY * 10 + char.charBlockX;
  const tile = room.tiles[tileIdx];
  if (!tile || tile.id !== TILE.spikes) return false;

  const status = getspikes(tile.spec);
  if (status === 0) return false; // safe

  // Impaled!
  tile.spec = 0xFF; // jam spikes
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
//  SLICER COLLISION CHECKS (from COLL.S)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if the kid is sliced (checkslice from COLL.S).
 * Scans all columns on the kid's row for active slicers.
 *
 * @param {object} char   Character state
 * @param {object} level
 * @returns {boolean}  true if character was sliced
 */
export function checkslice(char, level) {
  const room = level.rooms[char.charScrn];
  if (!room) return false;

  const row = char.charBlockY;
  const charCol = char.charBlockX;

  // Check current column and adjacent for slicer at striking distance
  for (let col = Math.max(0, charCol - 1); col <= Math.min(9, charCol + 1); col++) {
    const tileIdx = row * 10 + col;
    const tile = room.tiles[tileIdx];
    if (!tile || tile.id !== TILE.slicer) continue;

    const frame = tile.spec & 0x7F;
    if (frame === SLICER_EXT) {
      // Blade is closed — sliced!
      tile.spec |= SLICER_BLOOD; // set blood flag
      return true;
    }
  }

  return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  LOOSE FLOOR COLLISION (shakeloose)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Shake loose floor under the kid's feet (shakeloose from COLL.S).
 * Called when kid lands or runs over a loose floor.
 *
 * @param {object} char   Character state
 * @param {MoverState} mv
 * @param {object} level
 */
export function shakeloose(char, mv, level) {
  const room = level.rooms[char.charScrn];
  if (!room) return;

  const tileIdx = char.charBlockY * 10 + char.charBlockX;
  const tile = room.tiles[tileIdx];
  if (!tile || tile.id !== TILE.loose) return;

  breakloose(mv, tile, char.charScrn, tileIdx);
}

// ════════════════════════════════════════════════════════════════════════════
//  LEVEL INITIALIZATION — scan for torches, slicers, etc.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Initialize movers for a newly loaded level.
 * Adds slicers in the starting room.
 *
 * @param {MoverState} mv
 * @param {object} level
 * @param {number} startScrn  Starting screen number
 */
export function initMovers(mv, level, startScrn) {
  // Reset lists
  mv.numTrans = 0;
  mv.numMob   = 0;
  mv.cleanTrob = false;
  mv.cleanMob  = false;
  mv.shakeScreen = 0;

  // Add slicers in the starting room
  addslicers(mv, level, startScrn);
}
