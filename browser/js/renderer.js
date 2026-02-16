/**
 * renderer.js — Render Apple II sprites onto the Display framebuffer.
 *
 * Apple II hi-res pixel encoding:
 *   - Each byte encodes 7 pixels (bits 0–6); bit 7 selects palette group.
 *   - In single hi-res, bit 7 picks between two 2-color sub-palettes.
 *   - In double hi-res, pixels are 4-bit indices into the 16-color palette.
 *
 * For the intro/cutscene, character sprites are drawn in single-hi-res style
 * (monochrome-ish with NTSC artifact colors).  The original code (LAY in
 * HIRES.S) renders bottom-to-top: the first row of pixel data is the BOTTOM
 * scanline.  We account for this by flipping Y.
 *
 * Sprites can be drawn facing left or right.  Facing right means the image is
 * horizontally mirrored.
 */

import { DHIRES_COLORS } from './colors.js';

/**
 * Render a parsed image onto the Display framebuffer.
 *
 * @param {import('./display.js').Display} display
 * @param {Object} image         Parsed image { width, height, data }
 * @param {number} x             DHires X position (left edge)
 * @param {number} y             DHires Y position (bottom edge / foot)
 * @param {Object} [opts]
 * @param {boolean} [opts.flip]  Horizontal flip (face right)
 * @param {number}  [opts.page]  Page index to draw on
 * @param {boolean} [opts.mask]  If true, only draw set bits (transparent bg)
 * @param {number}  [opts.color] Force a single color for all set pixels
 */
export function drawSprite(display, image, x, y, opts = {}) {
  if (!image) return;

  const { width: wBytes, height, data } = image;
  const wPx = wBytes * 7; // pixels per row (7 pixels per byte)
  const flip = opts.flip || false;
  const page = opts.page !== undefined ? opts.page : display.drawPage;
  const mask = opts.mask !== false; // default: transparent background
  const forceColor = opts.color;

  // y is the foot (bottom) of the sprite — top scanline is y - height + 1
  const topY = y - height + 1;

  for (let row = 0; row < height; row++) {
    // Data is stored bottom-to-top in the original format
    const srcRow = height - 1 - row;
    const screenY = topY + row;

    if (screenY < 0 || screenY >= display.HEIGHT) continue;

    for (let byteIdx = 0; byteIdx < wBytes; byteIdx++) {
      const b = data[srcRow * wBytes + byteIdx];
      const palBit = (b >> 7) & 1; // bit 7 — palette select

      for (let bit = 0; bit < 7; bit++) {
        const pixel = (b >> bit) & 1;
        if (!pixel && mask) continue; // transparent

        // Determine color
        let colorIdx;
        if (forceColor !== undefined) {
          colorIdx = pixel ? forceColor : 0;
        } else {
          // Simple NTSC artifact color approximation:
          // Even column + pal0 → green/violet, odd → orange/blue
          // For now, use white (15) for set pixels in mono mode
          colorIdx = pixel ? 15 : 0;
        }

        if (!pixel && mask) continue;

        let screenX;
        if (flip) {
          screenX = x + (wPx - 1) - (byteIdx * 7 + bit);
        } else {
          screenX = x + byteIdx * 7 + bit;
        }

        // Each source pixel maps to 2 DHires pixels wide
        // (single hi-res pixel = 2 DHires pixels)
        display.setPixel(screenX * 2, screenY, colorIdx, page);
        display.setPixel(screenX * 2 + 1, screenY, colorIdx, page);
      }
    }
  }
}

/**
 * Erase (black-out) the rectangular region a sprite would occupy.
 */
export function eraseSprite(display, image, x, y, opts = {}) {
  if (!image) return;
  const { width: wBytes, height } = image;
  const wPx = wBytes * 7 * 2; // DHires pixels
  const topY = y - height + 1;
  const page = opts.page !== undefined ? opts.page : display.drawPage;

  for (let row = 0; row < height; row++) {
    const sy = topY + row;
    if (sy < 0 || sy >= display.HEIGHT) continue;
    for (let col = 0; col < wPx; col++) {
      const sx = x * 2 + col;
      display.setPixel(sx, sy, 0, page);
    }
  }
}
