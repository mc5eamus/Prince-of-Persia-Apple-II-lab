/**
 * charState.js — Character state management.
 *
 * Ported from GAMEEQ.S / CTRLSUBS.S / SUBS.S.
 * Each character is a 16-field record matching the Apple II zero-page layout.
 */

import { getKidStartPosition } from './level.js';
import { FLOOR_Y } from './frameDef.js';
import { getSeqPointer, SEQ } from './seqtable.js';

// ── Action codes (CharAction) ──────────────────────────────────────────────
export const ACTION = {
  normal:          0,  // on ground, standard movement
  onGround:        1,  // active ground contact
  hanging:         2,  // hanging from ledge
  controlledFall:  3,  // stepping off edge, can grab
  freefall:        4,  // full gravity
  bumped:          5,  // hit a wall
  hangStatic:      6,  // stable hang (CHECKFLOOR skips)
  onGroundVariant: 7,  // treated as on-ground
};

// ── Gravity constants ──────────────────────────────────────────────────────
export const TERM_VELOCITY   = 33;
export const ACCEL_GRAVITY   = 3;
export const WTLESS_TERM_VEL = 4;
export const WTLESS_GRAVITY  = 1;

/**
 * Create a fresh character state record.
 *
 * Matches the Apple II 16-byte layout at $40 (Char).
 *
 * @returns {CharState}
 */
export function createCharState() {
  return {
    charPosn:    0,    // +0  frame number (1–240)
    charX:       0,    // +1  X in 140-res
    charY:       0,    // +2  Y screen (foot position)
    charFace:   -1,    // +3  -1=left, +1=right
    charBlockX:  0,    // +4  block column 0–9
    charBlockY:  0,    // +5  block row 0–2
    charAction:  0,    // +6  action code
    charXVel:    0,    // +7  horizontal velocity (signed)
    charYVel:    0,    // +8  vertical velocity
    charSeq:     0,    // +9  byte offset into SEQ_DATA
    charScrn:    0,    // +11 room number
    charRepeat:  0,    // +12 repeat counter
    charId:      0,    // +13 0=kid, 1=shadow, 2+=guard
    charSword:   0,    // +14 sword state: 0=none, 2=en garde
    charLife:   -1,    // +15 -1=alive, 0=dead

    // ── Phase 6 extended fields (not in original 16-byte layout) ──
    stunTimer:   0,    // frames remaining of stun (hard landing)
    rjumpflag:   0,    // running-jump committed flag
    alive:       true, // simplified alive flag for JS
  };
}

/**
 * Initialize the kid from level start data.
 *
 * Replicates STARTKID / STARTKID1 from SUBS.S.
 *
 * @param {import('./level.js').Level} level
 * @param {number} levelNum
 * @returns {CharState}
 */
export function createKid(level, levelNum) {
  const kid = createCharState();
  const start = getKidStartPosition(level);

  kid.charScrn   = start.room;
  kid.charX      = start.x;
  kid.charY      = start.y;
  kid.charFace   = start.face;
  kid.charBlockX = start.col;
  kid.charBlockY = start.row;
  kid.charId     = 0;    // kid
  kid.charSword  = 0;
  kid.charLife   = -1;   // alive
  kid.charXVel   = 0;
  kid.charYVel   = 0;

  // Starting sequence depends on level (STARTKID logic)
  if (levelNum === 1) {
    jumpSeq(kid, SEQ.stepfall);   // falls through gate
  } else if (levelNum === 13) {
    jumpSeq(kid, SEQ.running);    // running in
  } else {
    jumpSeq(kid, SEQ.stand);      // standing
  }

  return kid;
}

/**
 * Initialize a guard from level guard data.
 *
 * @param {import('./level.js').Level} level
 * @param {number} roomIdx  Room number 1–24
 * @param {number} levelNum
 * @returns {CharState|null}  null if no guard in this room
 */
export function createGuard(level, roomIdx, levelNum) {
  if (!level.guards) return null;
  const g = level.guards[roomIdx];
  if (!g || g.block >= 30) return null;

  const guard = createCharState();
  const col = g.block % 10;
  const row = Math.floor(g.block / 10);
  if (row > 2) return null;

  guard.charScrn   = roomIdx;
  guard.charBlockX = col;
  guard.charBlockY = row;
  guard.charX      = 58 + col * 14 + 7;
  guard.charY      = FLOOR_Y[row + 1];   // FLOOR_Y[1..3]
  guard.charFace   = g.face || -1;
  guard.charId     = 2;                   // guard
  guard.charSword  = 2;                   // en garde
  guard.charLife   = -1;                  // alive
  guard.charXVel   = 0;
  guard.charYVel   = 0;

  jumpSeq(guard, SEQ.guardengarde);

  return guard;
}

/**
 * Set character's sequence pointer to the start of a named sequence.
 *
 * Replicates JUMPSEQ from CTRLSUBS.S:
 *   sec; sbc #1; asl; tax; lda seqtab,x → CharSeq
 *
 * @param {CharState} char
 * @param {number} seqNum  1-based sequence number
 */
export function jumpSeq(char, seqNum) {
  char.charSeq = getSeqPointer(seqNum);
}

/**
 * Add a signed delta to CharX, direction-aware.
 *
 * Replicates ADDCHARX from CTRLSUBS.S:
 *   If facing left, negate delta before adding.
 *
 * @param {CharState} char
 * @param {number} dx  Signed delta (+ = forward)
 */
export function addCharX(char, dx) {
  if (char.charFace < 0) {
    char.charX -= dx;  // facing left: forward = decreasing X
  } else {
    char.charX += dx;  // facing right: forward = increasing X
  }
}

/**
 * Apply gravity to a falling character.
 *
 * Replicates GRAVITY from SUBS.S.
 * Only applies when CharAction == 4 (freefall).
 *
 * @param {CharState} char
 * @param {boolean} [weightless=false]
 */
export function applyGravity(char, weightless = false) {
  if (char.charAction !== ACTION.freefall) return;

  if (weightless) {
    char.charYVel = Math.min(char.charYVel + WTLESS_GRAVITY, WTLESS_TERM_VEL);
  } else {
    char.charYVel = Math.min(char.charYVel + ACCEL_GRAVITY, TERM_VELOCITY);
  }
}

/**
 * Apply fall velocity to position.
 *
 * Replicates ADDFALL from SUBS.S.
 *
 * @param {CharState} char
 */
export function addFall(char) {
  char.charY += char.charYVel;

  if (char.charAction === ACTION.freefall) {
    addCharX(char, char.charXVel);
  }
}

/**
 * Clone a character state (for Save/Load pattern).
 *
 * @param {CharState} char
 * @returns {CharState}
 */
export function cloneChar(char) {
  return { ...char };
}

/**
 * Copy all fields from src to dst (in-place).
 * Replicates LOADKID / SAVEKID bulk copy.
 *
 * @param {CharState} dst
 * @param {CharState} src
 */
export function copyChar(dst, src) {
  dst.charPosn    = src.charPosn;
  dst.charX       = src.charX;
  dst.charY       = src.charY;
  dst.charFace    = src.charFace;
  dst.charBlockX  = src.charBlockX;
  dst.charBlockY  = src.charBlockY;
  dst.charAction  = src.charAction;
  dst.charXVel    = src.charXVel;
  dst.charYVel    = src.charYVel;
  dst.charSeq     = src.charSeq;
  dst.charScrn    = src.charScrn;
  dst.charRepeat  = src.charRepeat;
  dst.charId      = src.charId;
  dst.charSword   = src.charSword;
  dst.charLife    = src.charLife;
}

/**
 * @typedef {Object} CharState
 * @property {number} charPosn    - Current frame number (1–240)
 * @property {number} charX       - X pixel in 140-res
 * @property {number} charY       - Y screen coordinate (foot position)
 * @property {number} charFace    - -1=left, +1=right
 * @property {number} charBlockX  - Block column (0–9)
 * @property {number} charBlockY  - Block row (0–2)
 * @property {number} charAction  - Action code (0–7)
 * @property {number} charXVel    - Horizontal velocity (signed)
 * @property {number} charYVel    - Vertical velocity
 * @property {number} charSeq     - Byte offset into SEQ_DATA
 * @property {number} charScrn    - Room number (1–24)
 * @property {number} charRepeat  - Repeat counter
 * @property {number} charId      - 0=kid, 1=shadow, 2+=guard
 * @property {number} charSword   - 0=none, 2=en garde
 * @property {number} charLife    - -1=alive, 0=dead
 */
