/**
 * blockReader.js — Tile lookup and classification utilities.
 *
 * Ported from CTRLSUBS.S (RDBLOCK, CMPSPACE, CMPBARR, CMPWALL, CHECKLEDGE)
 * and helper routines (getunderft, getinfront, getbehind, getabove, etc.)
 */

import { TILE, getTile } from './level.js';

// ── Barrier code constants ─────────────────────────────────────────────────
export const BARR_CLEAR  = 0;
export const BARR_PANEL  = 1;   // panelwif, panelwof, gate
export const BARR_FLASK  = 2;   // in table but not returned by cmpbarr
export const BARR_MIRROR = 3;   // mirror, slicer
export const BARR_BLOCK  = 4;   // block

// ── Barrier edge tables (COLL.S lines ~48–57) ─────────────────────────────
// Indexed by barrier code.  Pixels from block edges to barrier edges.
export const BarL = [0, 12, 2, 0, 0];   // pixels from LEFT edge of block
export const BarR = [0,  0, 9, 11, 0];  // pixels from RIGHT edge of block

// ── Collision thresholds (COLL.S / GAMEEQ.S) ──────────────────────────────
export const gatemargin = 6;
export const estwidth   = 13;   // rough character width

// ────────────────────────────────────────────────────────────────────────────
//  RDBLOCK — read a tile from the level with room wrapping
// ────────────────────────────────────────────────────────────────────────────

/**
 * Read a tile from the level, handling room wrapping.
 *
 * Delegates to getTile(), which already handles out-of-bounds
 * columns/rows by following room links.  Returns a synthetic block
 * tile for absent rooms (screen 0 = solid mass).
 *
 * @param {import('./level.js').Level} level
 * @param {number} roomIdx   Room number (1–24, 0 = missing)
 * @param {number} col       Block column (can be <0 or ≥10)
 * @param {number} row       Block row (can be <0 or ≥3)
 * @returns {{ id: number, spec: number }}
 */
export function rdblock(level, roomIdx, col, row) {
  const tile = getTile(level, roomIdx, col, row);
  if (!tile) return { id: TILE.block, spec: 0 };
  return tile;
}

// ────────────────────────────────────────────────────────────────────────────
//  Tile classification routines
// ────────────────────────────────────────────────────────────────────────────

/**
 * Is this tile passable / has no floor?  (CMPSPACE)
 *
 * @param {number} tileId  Tile type ID (0–29)
 * @returns {number}  0 = passable (space-like), 1 = has floor
 */
export function cmpspace(tileId) {
  if (tileId === TILE.space)     return 0;
  if (tileId === TILE.pillartop) return 0;
  if (tileId === TILE.panelwof)  return 0;
  if (tileId === TILE.block)     return 0;
  if (tileId >= TILE.archtop1)   return 0;  // archtop1–archtop4
  return 1;  // has floor
}

/**
 * Is this tile a barrier?  (CMPBARR)
 *
 * @param {number} tileId  Tile type ID (0–29)
 * @returns {number}  Barrier code: 0=clear, 1=panel/gate, 3=mirror/slicer, 4=block
 */
export function cmpbarr(tileId) {
  if (tileId === TILE.panelwif)  return BARR_PANEL;
  if (tileId === TILE.panelwof)  return BARR_PANEL;
  if (tileId === TILE.gate)      return BARR_PANEL;
  if (tileId === TILE.mirror)    return BARR_MIRROR;
  if (tileId === TILE.slicer)    return BARR_MIRROR;
  if (tileId === TILE.block)     return BARR_BLOCK;
  return BARR_CLEAR;
}

/**
 * Is this tile a wall?  (CMPWALL)
 *
 * @param {number} tileId    Tile type ID
 * @param {number} charFace  -1 = left, +1 = right
 * @returns {number}  0 = yes (wall), 1 = no (not a wall)
 */
export function cmpwall(tileId, charFace) {
  if (tileId === TILE.block) return 0;
  if (charFace < 0) {
    // Facing left: panels count as walls
    if (tileId === TILE.panelwif) return 0;
    if (tileId === TILE.panelwof) return 0;
  }
  return 1;
}

// ────────────────────────────────────────────────────────────────────────────
//  Relative tile lookup helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tile directly under feet: (charBlockX, charBlockY).
 */
export function getunderft(level, char) {
  return rdblock(level, char.charScrn, char.charBlockX, char.charBlockY);
}

/**
 * Tile one block in front (charFace direction).
 * @returns {{ tile, infrontx: number }}
 */
export function getinfront(level, char) {
  const x = char.charBlockX + char.charFace;
  const tile = rdblock(level, char.charScrn, x, char.charBlockY);
  return { tile, infrontx: x };
}

/**
 * Tile two blocks in front.
 * @returns {{ tile, infrontx: number }}
 */
export function get2infront(level, char) {
  const x = char.charBlockX + char.charFace * 2;
  const tile = rdblock(level, char.charScrn, x, char.charBlockY);
  return { tile, infrontx: x };
}

/**
 * Tile one block behind (opposite of charFace).
 * @returns {{ tile, behindx: number }}
 */
export function getbehind(level, char) {
  const x = char.charBlockX - char.charFace;
  const tile = rdblock(level, char.charScrn, x, char.charBlockY);
  return { tile, behindx: x };
}

/**
 * Tile one row above, same column.
 * @returns {{ tile, abovey: number }}
 */
export function getabove(level, char) {
  const y = char.charBlockY - 1;
  const tile = rdblock(level, char.charScrn, char.charBlockX, y);
  return { tile, abovey: y };
}

/**
 * Tile one row above AND one block in front.
 * @returns {{ tile, infrontx: number, abovey: number }}
 */
export function getaboveinf(level, char) {
  const x = char.charBlockX + char.charFace;
  const y = char.charBlockY - 1;
  const tile = rdblock(level, char.charScrn, x, y);
  return { tile, infrontx: x, abovey: y };
}

/**
 * Tile one row above AND one block behind.
 * @returns {{ tile, behindx: number, abovey: number }}
 */
export function getabovebeh(level, char) {
  const x = char.charBlockX - char.charFace;
  const y = char.charBlockY - 1;
  const tile = rdblock(level, char.charScrn, x, y);
  return { tile, behindx: x, abovey: y };
}

/**
 * Tile one row below, same column.
 * @returns {{ tile }}
 */
export function getbelow(level, char) {
  const y = char.charBlockY + 1;
  const tile = rdblock(level, char.charScrn, char.charBlockX, y);
  return { tile, belowy: y };
}

// ────────────────────────────────────────────────────────────────────────────
//  CHECKLEDGE — is this a grabbable ledge?
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if a tile is a grabbable ledge.
 *
 * Ported from CTRLSUBS.S lines ~1779–1830.
 *
 * @param {number} tileId      Tile ID of the candidate floor block
 * @param {number} tileSpec    Spec byte of that block
 * @param {number} aboveTileId Tile ID of the block ABOVE the ledge
 * @param {number} charFace    -1=left, +1=right
 * @returns {boolean}  true if ledge is grabbable
 */
export function checkledge(tileId, tileSpec, aboveTileId, charFace) {
  // ── Block above must be clear ──
  if (aboveTileId === TILE.block) return false;
  if (aboveTileId === TILE.panelwof && charFace > 0) return false;
  if (cmpspace(aboveTileId) !== 0) return false;   // above must be passable

  // ── Ledge candidate must have a floor to grab ──
  if (tileId === TILE.loose && tileSpec !== 0) return false; // already falling
  if (tileId === TILE.panelwif && charFace < 0) return false; // can't grab left side
  if (cmpspace(tileId) === 0) return false;  // no floor = no ledge

  return true;
}
