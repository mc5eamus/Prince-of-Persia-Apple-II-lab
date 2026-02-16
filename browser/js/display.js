/**
 * display.js — Apple II Double Hi-Res display emulator
 *
 * Emulates the 560×192 DHires framebuffer with the 16-color palette and
 * renders it onto an HTML Canvas at 2× vertical (560×384) to approximate
 * the 4:3 CRT aspect ratio.
 *
 * Memory layout mirrors a real Apple II:
 *   - Two "pages" (page 1 & 2), each with aux + main banks
 *   - 8 KB per bank, interleaved scan-line addressing
 *   - Each byte holds 7 pixels (bit 0 = leftmost), bit 7 = palette in SHires
 *     but in DHires the 4 nibbles across aux-main pairs produce the colors.
 *
 * For our purposes we store the framebuffer as a flat 560×192 array of
 * 4-bit color indices — this avoids the convoluted Apple II memory map and
 * lets us focus on the visual output.
 */

import { DHIRES_COLORS } from './colors.js';

export class Display {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Native Apple II DHires resolution
    this.WIDTH = 560;
    this.HEIGHT = 192;

    // Canvas output is 2× vertical
    this.SCALE_Y = 2;

    // Two pages — each is a flat Uint8Array of 4-bit color indices
    this.pages = [
      new Uint8Array(this.WIDTH * this.HEIGHT), // page 1
      new Uint8Array(this.WIDTH * this.HEIGHT), // page 2
    ];

    // Currently displayed page (0 or 1)
    this.activePage = 0;

    // ImageData for blitting
    this.imageData = this.ctx.createImageData(this.WIDTH, this.HEIGHT * this.SCALE_Y);

    // Palette (can be swapped for mono etc.)
    this.palette = DHIRES_COLORS;
  }

  // ---------------------------------------------------------------------------
  //  Low-level framebuffer access
  // ---------------------------------------------------------------------------

  /** Get the hidden (drawing) page index */
  get drawPage() {
    return this.activePage === 0 ? 1 : 0;
  }

  /** Clear a page to color index 0 (black) */
  clearPage(pageIdx = this.activePage) {
    this.pages[pageIdx].fill(0);
  }

  /** Set a single pixel on a given page */
  setPixel(x, y, colorIdx, pageIdx = this.drawPage) {
    if (x >= 0 && x < this.WIDTH && y >= 0 && y < this.HEIGHT) {
      this.pages[pageIdx][y * this.WIDTH + x] = colorIdx & 0x0F;
    }
  }

  /** Get a single pixel from a given page */
  getPixel(x, y, pageIdx = this.activePage) {
    if (x >= 0 && x < this.WIDTH && y >= 0 && y < this.HEIGHT) {
      return this.pages[pageIdx][y * this.WIDTH + x];
    }
    return 0;
  }

  /** Fill a rectangular region with a color index */
  fillRect(x, y, w, h, colorIdx, pageIdx = this.drawPage) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        this.setPixel(col, row, colorIdx, pageIdx);
      }
    }
  }

  // ---------------------------------------------------------------------------
  //  Page management
  // ---------------------------------------------------------------------------

  /** Flip the active display page */
  flipPage() {
    this.activePage = this.activePage === 0 ? 1 : 0;
  }

  /** Copy page src → dst */
  copyPage(srcIdx, dstIdx) {
    this.pages[dstIdx].set(this.pages[srcIdx]);
  }

  /** Copy page 1 → page 2 (mirrors copy1to2 in the original) */
  copy1to2() {
    this.copyPage(0, 1);
  }

  /** Copy page 2 → page 1 (mirrors copy2to1 in the original) */
  copy2to1() {
    this.copyPage(1, 0);
  }

  // ---------------------------------------------------------------------------
  //  Rendering to canvas
  // ---------------------------------------------------------------------------

  /** Blit the active page to the canvas */
  present() {
    const fb = this.pages[this.activePage];
    const data = this.imageData.data;
    const pal = this.palette;
    const W = this.WIDTH;
    const SY = this.SCALE_Y;

    for (let y = 0; y < this.HEIGHT; y++) {
      const srcOff = y * W;
      for (let x = 0; x < W; x++) {
        const ci = fb[srcOff + x];
        const [r, g, b] = pal[ci] || [0, 0, 0];
        // Write doubled scanlines
        for (let dy = 0; dy < SY; dy++) {
          const dstOff = ((y * SY + dy) * W + x) * 4;
          data[dstOff]     = r;
          data[dstOff + 1] = g;
          data[dstOff + 2] = b;
          data[dstOff + 3] = 255;
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /** Convenience: clear both pages and present black */
  blackout() {
    this.clearPage(0);
    this.clearPage(1);
    this.activePage = 0;
    this.present();
  }
}
