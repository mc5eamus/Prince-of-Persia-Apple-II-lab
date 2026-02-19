/**
 * positionMath.js — Character position math utilities.
 *
 * Ported from CTRLSUBS.S and TABLES.S.
 * Converts between screen coordinates and block coordinates,
 * computes distances to block edges, base position, etc.
 */

import { getFrameDef } from './frameDef.js';

// ── Constants from EQ.S / GAMEEQ.S / TABLES.S ─────────────────────────────
export const SCRN_LEFT   = 58;
export const SCRN_RIGHT  = 197;   // ScrnLeft + ScrnWidth - 1
export const SCRN_WIDTH  = 140;
export const SCRN_HEIGHT = 192;
export const SCRN_TOP    = 0;
export const SCRN_BOT    = 191;

export const BLOCK_WIDTH  = 14;
export const BLOCK_HEIGHT = 63;
export const ANGLE        = 7;     // center-plane offset
export const VERT_DIST    = 10;    // distance from block bottom to floor
export const D_HEIGHT     = 3;     // floor piece thickness
export const FLOOR_HEIGHT = 15;    // from GAMEEQ.S

// ── Frame check flags (GAMEEQ.S) ──────────────────────────────────────────
export const F_CHECK_MARK = 0x40;   // bit 6 — foot on floor
export const F_THIN_MARK  = 0x20;   // bit 5 — thin frame
export const F_FOOT_MARK  = 0x1F;   // bits 0–4 — 5-bit foot offset

// ── Fall thresholds (GAMEEQ.S / COLL.S) ──────────────────────────────────
export const OOF_VELOCITY   = 22;   // soft→med landing boundary
export const DEATH_VELOCITY = 33;   // med→hard/death boundary
export const GRAB_REACH     = -8;   // how far above floor char can reach ledge
export const GRAB_SPEED     = 32;   // max fall speed for ledge grab
export const GRAB_LEAD      = 25;   // pixels ahead for grab check
export const STUN_TIME      = 12;   // frames of stun after hard landing
export const STEP_OFF_FWD   = 3;    // forward stepoff threshold
export const STEP_OFF_BACK  = 8;    // backward stepoff threshold
export const JUMP_BACK_THRES = 6;   // forward dist check for running jump
export const THINNER        = 3;    // from CTRLSUBS.S

// ── Precomputed tables (TABLES.S) ──────────────────────────────────────────

/**
 * BlockTop[i] — Y-coord of the TOP of block row i (-1 through 3).
 * Index by (blockY + 1).
 */
export const BlockTop = [-60, 3, 66, 129, 192];

/**
 * BlockBot[i] — Y-coord of the BOTTOM of block row i.
 * Index by (blockY + 1).
 */
export const BlockBot = [2, 65, 128, 191, 254];

/**
 * FloorY[i] — Center-plane Y for each block row.
 * Index by (blockY + 1).
 */
export const FloorY = [-8, 55, 118, 181, 244];

/**
 * BlockAy[i] — Y position for drawing calculations.
 * Index by (blockY + 1).
 */
export const BlockAy = [-1, 62, 125, 188, 251];

// ────────────────────────────────────────────────────────────────────────────
//  Coordinate conversion:  screen X ↔ block column + pixel offset
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convert screen X to block column and pixel offset.
 * Foreground / absolute plane (GETBLOCKX).
 *
 * @param {number} x  Screen X coordinate
 * @returns {{ block: number, offset: number }}
 */
export function getblockx(x) {
  const rel = x - SCRN_LEFT;                     // relative to screen left edge
  const block = Math.floor(rel / BLOCK_WIDTH);
  const offset = ((rel % BLOCK_WIDTH) + BLOCK_WIDTH) % BLOCK_WIDTH; // always 0..13
  return { block, offset };
}

/**
 * Convert screen X to block column and pixel offset.
 * Center plane (GETBLOCKXP) — subtracts angle first.
 *
 * @param {number} x  Screen X coordinate
 * @returns {{ block: number, offset: number }}
 */
export function getblockxp(x) {
  return getblockx(x - ANGLE);
}

/**
 * Get the left-edge X of a block column (GETBLOCKEJ).
 *
 * @param {number} block  Block column number
 * @returns {number}  Screen X of left edge
 */
export function getblockej(block) {
  return SCRN_LEFT + block * BLOCK_WIDTH;
}

// ────────────────────────────────────────────────────────────────────────────
//  Coordinate conversion:  screen Y → block row
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convert screen Y to block row (foreground plane, GETBLOCKY).
 * Uses BlockTop thresholds.
 *
 * @param {number} y  Screen Y coordinate
 * @returns {number}  Block row (-1 to 3)
 */
export function getblocky(y) {
  for (let r = 3; r >= 0; r--) {
    if (y >= BlockTop[r + 1]) return r;
  }
  return -1;
}

/**
 * Convert screen Y to block row (center plane, GETBLOCKYP).
 * Uses FloorY thresholds.
 *
 * @param {number} y  Screen Y coordinate
 * @returns {number}  Block row (-1 to 3)
 */
export function getblockyp(y) {
  for (let r = 3; r >= 0; r--) {
    if (y >= FloorY[r + 1]) return r;
  }
  return -1;
}

// ────────────────────────────────────────────────────────────────────────────
//  Face-relative helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Add a face-relative displacement to CharX (ADDCHARX).
 *
 * Positive `a` = forward (in character's facing direction).
 * When facing left, forward is decreasing X; when facing right, increasing X.
 *
 * @param {number} a         Face-relative displacement
 * @param {object} char      Character state
 * @returns {number}         New absolute X position
 */
export function addcharx(a, char) {
  // Apple II: if face==left, negate a, then add to charX
  // JS: charFace is -1 (left) or +1 (right)
  return char.charX + char.charFace * a;
}

/**
 * Convert face-relative dx to absolute dx (FACEDX).
 *
 * Apple II convention: when facing right, negate.
 * When facing left, keep unchanged.
 *
 * @param {number} dx    Face-relative displacement (from frame data)
 * @param {number} face  -1=left, +1=right
 * @returns {number}     Absolute displacement
 */
export function facedx(dx, face) {
  return face > 0 ? -dx : dx;
}

// ────────────────────────────────────────────────────────────────────────────
//  Base position routines
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute the character's base X position (GETBASEX).
 *
 * The base is the character's "foot" position in absolute screen coords,
 * accounting for the current frame's foot offset and forward displacement.
 *
 * baseX = CharX + face * (Fdx - footmark)
 *
 * @param {object} char  Character state (needs charPosn, charX, charFace, charId)
 * @returns {number}     Absolute screen X of the character's foot base
 */
export function getbasex(char) {
  const frame = getFrameDef(char.charPosn, char.charId);
  if (!frame) return char.charX;

  const footmark = frame.fcheck & F_FOOT_MARK;
  const a = frame.fdx - footmark;
  return addcharx(a, char);
}

/**
 * Update charBlockX from the character's base position (GETBASEBLOCK).
 *
 * @param {object} char  Character state (mutated: charBlockX)
 * @returns {number}     The new charBlockX
 */
export function getbaseblock(char) {
  const baseX = getbasex(char);
  const { block } = getblockxp(baseX);
  char.charBlockX = block;
  return block;
}

// ────────────────────────────────────────────────────────────────────────────
//  Distance routines
// ────────────────────────────────────────────────────────────────────────────

/**
 * Distance from base X to the end of the current block (GETDIST1).
 *
 * "End" = the edge in the character's facing direction.
 * Returns 0–13 pixels.
 *
 * @param {number} baseX   Absolute X coordinate
 * @param {number} face    -1=left, +1=right
 * @returns {number}       Pixels to block edge
 */
export function getdist1(baseX, face) {
  const { offset } = getblockxp(baseX);
  return face > 0 ? (BLOCK_WIDTH - 1 - offset) : offset;
}

/**
 * Distance from the character's base position to the current block edge
 * in the facing direction (GETDIST).
 *
 * @param {object} char  Character state
 * @returns {number}     Pixels to block edge (0–13)
 */
export function getdist(char) {
  const baseX = getbasex(char);
  return getdist1(baseX, char.charFace);
}

// ────────────────────────────────────────────────────────────────────────────
//  Reread blocks  (REREADBLOCKS from TOPCTRL.S)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Re-derive charBlockX and charBlockY from the character's screen coords.
 *
 * Called before and after physics steps to keep block indices in sync
 * with the pixel position.
 *
 * @param {object} char  Character state (mutated: charBlockX, charBlockY)
 */
export function rereadblocks(char) {
  const baseX = getbasex(char);
  const { block } = getblockxp(baseX);
  char.charBlockX = block;
  char.charBlockY = getblockyp(char.charY);
}
