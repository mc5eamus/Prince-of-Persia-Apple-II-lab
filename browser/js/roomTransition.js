/**
 * roomTransition.js — Room transition (cut) logic.
 *
 * Ported from AUTO.S (CUTCHECK).
 * Detects when the character crosses a room boundary and wraps
 * coordinates to the adjacent room.
 */

// ── Cut thresholds from AUTO.S ─────────────────────────────────────────────
const CUT_LEFT   = 54;    // CharX <= 54 → go left
const CUT_RIGHT  = 201;   // CharX >= 201 → go right (ScrnLeft + ScrnWidth + margin)
const CUT_TOP    = 10;    // CharY < 10 → go up (roughly row -1 threshold)
const CUT_BOT    = 215;   // CharY >= 215 → go down

// ── Wrapping deltas ────────────────────────────────────────────────────────
const WRAP_X = 140;        // ScrnWidth: add/subtract for left/right transitions
const WRAP_Y = 189;        // 3 × BlockHeight: add/subtract for up/down transitions
const WRAP_BY = 3;         // block rows per room

// ── Cooldown ───────────────────────────────────────────────────────────────
const CUT_COOLDOWN = 2;    // frames to wait between cuts

/**
 * State for the cut system.
 */
export function createCutState() {
  return {
    cooldown: 0,           // frames remaining before another cut is allowed
  };
}

/**
 * Check if the character has crossed a room boundary and apply the transition.
 *
 * Must be called AFTER checkFloor in the per-frame pipeline.
 *
 * @param {object} char       Character state (mutated: charX, charY, charBlockY, charScrn)
 * @param {object} level      Parsed level data
 * @param {object} cutState   Cut state (mutated: cooldown)
 * @returns {{ cut: boolean, direction?: string, newRoom?: number }}
 */
export function cutcheck(char, level, cutState) {
  // Cooldown enforcement
  if (cutState.cooldown > 0) {
    cutState.cooldown--;
    return { cut: false };
  }

  const room = level.rooms[char.charScrn];
  if (!room) return { cut: false };

  let direction = null;
  let newRoom = 0;

  // ── Left ──
  if (char.charX <= CUT_LEFT) {
    newRoom = room.left;
    if (newRoom) {
      char.charX += WRAP_X;
      direction = 'left';
    }
  }
  // ── Right ──
  else if (char.charX >= CUT_RIGHT) {
    newRoom = room.right;
    if (newRoom) {
      char.charX -= WRAP_X;
      direction = 'right';
    }
  }
  // ── Up ──
  else if (char.charY < CUT_TOP) {
    newRoom = room.up;
    if (newRoom) {
      char.charY += WRAP_Y;
      char.charBlockY += WRAP_BY;
      direction = 'up';
    }
  }
  // ── Down ──
  else if (char.charY >= CUT_BOT) {
    newRoom = room.down;
    if (newRoom) {
      char.charY -= WRAP_Y;
      char.charBlockY -= WRAP_BY;
      direction = 'down';
    }
  }

  if (direction && newRoom) {
    char.charScrn = newRoom;
    cutState.cooldown = CUT_COOLDOWN;
    return { cut: true, direction, newRoom };
  }

  // ── Fell off screen with no neighbor → death ──
  if (char.charY >= CUT_BOT && !room.down) {
    // Fell into the void
    char.charLife = 0;
    char.alive = false;
    return { cut: false, fellOff: true };
  }

  return { cut: false };
}
