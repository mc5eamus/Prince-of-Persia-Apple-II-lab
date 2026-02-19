/**
 * charRenderer.js — Character sprite rendering for the mid-layer.
 *
 * Draws character images (kid body, guard body, sword) onto the Display
 * framebuffer.  Replicates the LAY / LAYMASK routines from HIRES.S,
 * simplified for our pixel-addressable DHires framebuffer.
 *
 * Drawing rules (from HIRES.S):
 *   - Image data is stored bottom-to-top: data row 0 = bottom scanline.
 *   - Each byte encodes 7 pixels (bits 0–6); bit 7 is unused.
 *   - Normal (face left): image is drawn un-flipped, starting at fCharX.
 *   - Mirrored (face right): image is horizontally flipped; the right edge
 *     of the drawn image aligns with fCharX (image extends leftward).
 *   - Each SHires pixel maps to 2 DHires pixels.
 *   - Only set pixels (1-bits) are drawn; 0-bits are transparent (ORA mode).
 *
 * Coordinate system (from CTRLSUBS.S):
 *   - CharX = 140-resolution game coordinate
 *   - FCharX = (CharX + fdx_adj - SCRN_LEFT) * 2 → 280-res SHires pixel
 *   - fCharY = CharY + fdy → screen scanline (bottom of sprite)
 *   - Crop boundaries: left/right in byte columns (0–40),
 *                       top/bottom in scanlines (0–192)
 */

import { setupChar, getSwordDef, decodeim,
         FLOOR_Y, CHSET_FOR_LEVEL, CHSET_FILE } from './frameDef.js';
import { getTile, TILE } from './level.js';

// ─── Character color constants ──────────────────────────────────────────────

/** Kid is always white. */
export const KID_COLOR = 15;

/** Per-guard-type color (indexed by chset value). */
const GUARD_COLORS = [
  7,  // 0: GD   → light blue
  15, // 1: SKEL → white
  9,  // 2: FAT  → orange
  5,  // 3: SHAD → dark gray
  13, // 4: VIZ  → yellow
  13, // 5: VIZ2 → yellow
];

/** Default crop — full screen, no clipping. */
function fullCrop() {
  return { left: 0, right: 40, top: 0, bottom: 192 };
}

// ─── Low-level image drawing ────────────────────────────────────────────────

/**
 * Draw a single Apple II image onto the display.
 *
 * Equivalent to the LAY routine (ORA mode) in HIRES.S, but operating
 * at the pixel level rather than at the byte level with SHIFT/CARRY tables.
 *
 * @param {import('./display.js').Display} display
 * @param {Object}  image       Parsed image { width, height, data }
 * @param {number}  fCharX      Screen X in SHires pixels (280-resolution)
 * @param {number}  fCharY      Screen Y — bottom scanline of the image
 * @param {number}  face        -1 = left (normal), +1 = right (mirrored)
 * @param {number}  color       DHires colour index (0–15) for set pixels
 * @param {Object}  [crop]      { left, right, top, bottom }
 * @param {number}  [page]      Display page
 */
export function drawCharImage(display, image, fCharX, fCharY, face, color, crop, page) {
  if (!image) return;

  const { width: wBytes, height, data } = image;
  const wPx = wBytes * 7;
  const mirrored = face > 0;

  // Clipping boundaries
  const c = crop || fullCrop();
  const clipL = c.left * 7;   // SHires pixel
  const clipR = c.right * 7;
  const clipT = c.top;        // scanline
  const clipB = c.bottom;

  for (let row = 0; row < height; row++) {
    const sy = fCharY - row;       // data row 0 = bottom
    if (sy < clipT || sy >= clipB) continue;
    if (sy < 0 || sy >= 192) continue;

    const rowOff = row * wBytes;

    for (let byteIdx = 0; byteIdx < wBytes; byteIdx++) {
      const b = data[rowOff + byteIdx];
      if (b === 0) continue;      // fast skip entirely-empty bytes

      for (let bit = 0; bit < 7; bit++) {
        if (!((b >> bit) & 1)) continue; // transparent pixel

        const imgPx = byteIdx * 7 + bit;
        let sx;
        if (mirrored) {
          // Mirrored: image extends leftward from fCharX.
          // Right edge is fCharX − 1, left edge is fCharX − wPx.
          sx = fCharX - 1 - imgPx;
        } else {
          sx = fCharX + imgPx;
        }

        if (sx < clipL || sx >= clipR) continue;

        // SHires → DHires (1 SHires pixel = 2 DHires pixels)
        const dx = sx * 2;
        display.setPixel(dx,     sy, color, page);
        display.setPixel(dx + 1, sy, color, page);
      }
    }
  }
}

// ─── Composite character frame drawing ──────────────────────────────────────

/**
 * Draw a full character frame (body + optional sword).
 *
 * @param {import('./display.js').Display} display
 * @param {Object[]}  chtables   Array of 5 parsed CHTAB image arrays
 *                                [0]=CHTAB1, [1]=CHTAB2, [2]=CHTAB3,
 *                                [3]=CHTAB4.*, [4]=CHTAB5
 * @param {number}  charX       Game X in 140-resolution
 * @param {number}  charY       Game Y (foot scanline, e.g. FloorY[row])
 * @param {number}  charFace    -1 = left, +1 = right
 * @param {number}  charPosn    Frame number (1–240)
 * @param {number}  charId      Character ID: 0 = kid, 1–4 = guard, 24 = mouse
 * @param {number}  color       DHires colour index for set pixels
 * @param {Object}  [crop]      Optional { left, right, top, bottom }
 * @param {number}  [page]      Display page
 * @param {number}  [charSword] Sword state: 0=none, 2=en garde. Sword only drawn when === 2.
 */
export function drawCharFrame(
  display, chtables, charX, charY, charFace, charPosn, charId, color, crop, page, charSword
) {
  const setup = setupChar(charX, charY, charFace, charPosn, charId);
  if (!setup) return;

  const { tableIndex, imageIndex, face, swordFrame, fCharX, y } = setup;

  // ── Draw body ──
  const chtab = chtables[tableIndex];
  if (chtab && imageIndex >= 1 && imageIndex <= chtab.images.length) {
    const bodyImg = chtab.images[imageIndex - 1];  // 1-based → 0-based
    drawCharImage(display, bodyImg, fCharX, y, face, color, crop, page);
  }

  // ── Draw sword (only in en garde / fighting stance) ──
  if (charSword === 2 && swordFrame > 0 && swordFrame <= 50) {
    drawSword(display, chtables, swordFrame, fCharX, y, face, color, crop, page);
  }
}

/**
 * Draw a sword overlay image.
 *
 * @param {import('./display.js').Display} display
 * @param {Object[]}  chtables    CHTAB array (index 2 = CHTAB3 = swords)
 * @param {number}    swordFrame  Sword frame number (1–50)
 * @param {number}    bodyX       Body fCharX (SHires pixels)
 * @param {number}    bodyY       Body screen Y (bottom scanline)
 * @param {number}    face        -1 = left, +1 = right
 * @param {number}    color       Colour index
 * @param {Object}    [crop]      Clipping
 * @param {number}    [page]      Display page
 */
function drawSword(display, chtables, swordFrame, bodyX, bodyY, face, color, crop, page) {
  const sdef = getSwordDef(swordFrame);
  if (!sdef) return;

  const swordTab = chtables[2]; // CHTAB3 = swords
  if (!swordTab || sdef.image < 1 || sdef.image > swordTab.images.length) return;

  const swordImg = swordTab.images[sdef.image - 1]; // 1-based → 0-based

  // Sword offset: dx/dy are in SHires pixels, relative to character.
  // SWORDTAB dx is defined for facing RIGHT. ADDFCHARX adds dx when
  // facing right, subtracts when facing left.
  const sdx = (face > 0) ? sdef.dx : -sdef.dx;
  const swordX = bodyX + sdx;
  const swordY = bodyY + sdef.dy;

  drawCharImage(display, swordImg, swordX, swordY, face, color, crop, page);
}

// ─── CROPCHAR — character clipping behind walls ─────────────────────────────

/**
 * Compute crop boundaries for a character based on surrounding tiles.
 *
 * Simplified version of CROPCHAR from CTRLSUBS.S.  Checks the tiles
 * above and to the right of the character and restricts the crop
 * rectangle so the character is hidden behind walls, panels, and floors.
 *
 * @param {Object}  level      Level data
 * @param {number}  roomIdx    Current room
 * @param {number}  charX      Character X (140-res)
 * @param {number}  charY      Character Y (foot scanline)
 * @param {number}  charFace   -1 = left, +1 = right
 * @param {number}  charPosn   Frame number
 * @param {number}  charId     Character type
 * @param {Object[]} chtables  CHTAB image tables
 * @returns {Object}  { left, right, top, bottom }
 */
export function cropChar(level, roomIdx, charX, charY, charFace, charPosn, charId, chtables) {
  // Default: full screen
  const crop = { left: 0, right: 40, top: 0, bottom: 192 };

  // BlockTop[i+1] = ScrnBot + 1 - (3-i)*63 for i = -1,0,1,2,3
  const BLOCK_TOP = [-60, 3, 66, 129, 192];

  // Character's block row from charY
  const charBlockY = getBlockY(charY);

  // Get image dimensions to compute edges
  const setup = setupChar(charX, charY, charFace, charPosn, charId);
  if (!setup) return crop;

  const { fCharX, y: fCharY, tableIndex, imageIndex } = setup;

  // Get body image dimensions
  const chtab = chtables?.[tableIndex];
  if (!chtab) return crop;
  const bodyImg = chtab.images?.[imageIndex - 1];
  if (!bodyImg) return crop;

  const imWidthPx = bodyImg.width * 7; // SHires pixels
  const imHeight = bodyImg.height;     // scanlines

  // Image edges in 140-res
  const x140 = Math.floor(fCharX / 2) + 58; // approx back to 140-res
  let leftEj, rightEj;
  if (charFace < 0) {
    // Facing left: image extends to the right from character X
    leftEj = x140;
    rightEj = x140 + Math.floor(imWidthPx / 2);
  } else {
    // Facing right (mirrored): image extends to the left
    rightEj = x140;
    leftEj = x140 - Math.floor(imWidthPx / 2);
  }

  // Image top scanline
  const topEj = fCharY - imHeight + 1;

  // Block positions
  const topBlock = getBlockY(topEj);
  const leftBlock = getBlockX(leftEj);
  const rightBlock = getBlockX(rightEj);

  // ── Phase 2: Top crop (floor/ceiling above) ──
  if (charBlockY >= 0 && charBlockY <= 2 && topBlock >= 0) {
    const tileLeftTop = getTileSafe(level, roomIdx, leftBlock, topBlock);
    if (tileLeftTop !== null && hasFloor(tileLeftTop)) {
      // Left topblock has floor — check right topblock too
      const tileRightTop = getTileSafe(level, roomIdx, rightBlock, topBlock);
      if (tileRightTop !== null && hasFloor(tileRightTop)) {
        const cropY = BLOCK_TOP[charBlockY + 1];
        if (cropY > 0 && cropY < fCharY) {
          crop.top = cropY;
        }
      }
    }
  }

  // ── Phase 3a: Right crop — panel ──
  const cdLeftBlock = getBlockX(leftEj + 3); // +thinner
  const tileAtFoot = getTileSafe(level, roomIdx, cdLeftBlock, charBlockY);
  if (tileAtFoot !== null && (tileAtFoot === TILE.panelwif || tileAtFoot === TILE.panelwof)) {
    // Panel at foot level — check head level tile
    const tileAtHead = getTileSafe(level, roomIdx, cdLeftBlock, topBlock);
    if (tileAtHead !== null &&
        (tileAtHead === TILE.block || tileAtHead === TILE.panelwif || tileAtHead === TILE.panelwof)) {
      crop.right = cdLeftBlock * 4 + 4; // byte columns
    }
  }

  // ── Phase 3b: Right crop — solid block ──
  if (crop.right >= 40) { // only if not already cropped
    const cdRightBlock = getBlockX(rightEj - 3); // -thinner
    const tileAtFootR = getTileSafe(level, roomIdx, cdRightBlock, charBlockY);
    if (tileAtFootR === TILE.block) {
      const tileAtHeadR = getTileSafe(level, roomIdx, cdRightBlock, topBlock);
      if (tileAtHeadR === TILE.block) {
        crop.right = cdRightBlock * 4; // byte columns
      }
    }
  }

  return crop;
}

/**
 * Is this tile type "has floor" (i.e., not passable vertically)?
 * Tiles counted as passable (no floor): space, pillartop, panelwof, block, archtop1+
 */
function hasFloor(tileId) {
  if (tileId === TILE.space) return false;
  if (tileId === TILE.pillartop) return false;
  if (tileId === TILE.panelwof) return false;
  if (tileId === TILE.block) return false;
  if (tileId >= TILE.archtop1) return false;  // archtop1..archtop4
  return true;
}

/** Convert 140-res X to block column (0–9). */
function getBlockX(x140) {
  const col = Math.floor((x140 - 58) / 14);
  return Math.max(0, Math.min(9, col));
}

/** Convert screen Y to block row (0–2, or -1/3 if off-screen). */
function getBlockY(y) {
  // BlockTop: [-60, 3, 66, 129, 192]
  if (y >= 129) return 2;
  if (y >= 66) return 1;
  if (y >= 3) return 0;
  return -1;
}

/** Safe tile lookup — returns tile id or null if off-screen. */
function getTileSafe(level, roomIdx, col, row) {
  if (row < 0 || row > 2) return null;
  if (col < 0 || col > 9) return null;
  const t = getTile(level, roomIdx, col, row);
  return t ? t.id : null;
}

// ─── High-level scene drawing helpers ───────────────────────────────────────

/**
 * Resolve which CHTAB4 variant file to load for a given level.
 *
 * @param {number} levelNum  Level number (0–14)
 * @returns {string}  e.g. "IMG.CHTAB4.GD"
 */
export function getChtab4Name(levelNum) {
  const idx = CHSET_FOR_LEVEL[levelNum] ?? 0;
  return `IMG.CHTAB4.${CHSET_FILE[idx]}`;
}

/**
 * Get guard colour for a given level.
 *
 * @param {number} levelNum
 * @returns {number}  DHires colour index
 */
export function getGuardColor(levelNum) {
  const idx = CHSET_FOR_LEVEL[levelNum] ?? 0;
  return GUARD_COLORS[idx];
}
