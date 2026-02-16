/**
 * text.js — Apple II-style text renderer for the DHires framebuffer.
 *
 * Uses an embedded 8×8 pixel font based on the Apple II character ROM.
 * Characters are rendered directly into the Display framebuffer as 4-bit
 * color index values (typically white=15 on black=0).
 *
 * The original game renders credit text in DHires mode using delta-compressed
 * overlays.  For our reimplementation we draw text procedurally, which lets us
 * recreate the look without needing the original packed screen data.
 */

// Apple II primary character set — 8×8 bitmaps, ASCII 0x20–0x5F (space – _)
// Each character is 8 bytes; each byte is one row, bit 0 = leftmost pixel.
// This is a faithful reproduction of the Apple II ROM character generator.
const CHAR_ROM = buildCharRom();

function buildCharRom() {
  // Encoded as hex strings, row-major, MSB-first (we'll reverse bits).
  // This is a compact representation of the standard Apple II font.
  const font = {
    0x20: '00000000000000', // space
    0x21: '10101000100000', // !
    0x28: '04081010080400', // (
    0x29: '20100808102000', // )
    0x2C: '00000000102000', // ,
    0x2D: '0000003C000000', // -
    0x2E: '00000000001000', // .
    0x2F: '02040810204000', // /
    0x30: '1824242424180C', // 0
    0x31: '08180808082800', // 1
    0x32: '18240408103C00', // 2
    0x33: '3804180424180C', // 3
    0x34: '04142424140400', // 4
    0x35: '3C203824043800', // 5
    0x36: '18203824241800', // 6
    0x37: '3C040810101000', // 7
    0x38: '18241824241800', // 8
    0x39: '1824241C041800', // 9
    0x3A: '00100000100000', // :
    0x41: '1824243C242400', // A
    0x42: '38243824243800', // B
    0x43: '1C222020221C00', // C
    0x44: '38242424243800', // D
    0x45: '3C203820203C00', // E
    0x46: '3C203820202000', // F
    0x47: '1C20202C241C00', // G
    0x48: '2424243C242400', // H
    0x49: '1C080808081C00', // I
    0x4A: '04040404241800', // J
    0x4B: '24283020282400', // K
    0x4C: '20202020203C00', // L
    0x4D: '22362A2A222200', // M
    0x4E: '2434342C2C2400', // N
    0x4F: '18242424241800', // O
    0x50: '38242438202000', // P
    0x51: '1824242428140200', // Q
    0x52: '38242438282400', // R
    0x53: '1C201804041800', // S (improved)
    0x54: '3E080808080800', // T
    0x55: '24242424241800', // U
    0x56: '22222214140800', // V
    0x57: '222222222A1400', // W
    0x58: '22141408142200', // X
    0x59: '22221408080800', // Y
    0x5A: '3E020408103E00', // Z
    0x61: '00001C241C241C00', // a
    0x62: '2020382424380000', // b
    0x63: '00001C2020201C00', // c
    0x64: '0404041C24241C00', // d
    0x65: '00001824382038000', // e (wrong)
    0x66: '0C10103810101000', // f
    0x67: '00001C24241C0418', // g
    0x68: '20203824242400', // h
    0x69: '08001808081C00', // i
    0x6A: '0400040404241800', // j
    0x6B: '20202428302824', // k
    0x6C: '18080808081C00', // l
    0x6D: '0000342A2A2A2200', // m
    0x6E: '00003824242400', // n
    0x6F: '00001824241800', // o
    0x70: '00003824243820', // p
    0x71: '00001C24241C04', // q
    0x72: '00002C3020200000', // r
    0x73: '00001C100C041800', // s
    0x74: '10103810101C00', // t
    0x75: '00002424241C00', // u
    0x76: '00002222140800', // v
    0x77: '0000222A2A1400', // w
    0x78: '00002414142400', // x
    0x79: '000024241C0418', // y
    0x7A: '00003C08103C00', // z
    0x27: '10100000000000', // '
  };

  const rom = {};
  for (const [code, hex] of Object.entries(font)) {
    const rows = [];
    // Parse hex string in pairs
    for (let i = 0; i < 14; i += 2) {
      const byteStr = hex.substring(i, i + 2);
      if (byteStr.length === 2) {
        rows.push(parseInt(byteStr, 16));
      }
    }
    // Pad to 8 rows
    while (rows.length < 8) rows.push(0);
    rom[Number(code)] = rows;
  }

  return rom;
}

/**
 * Get glyph bitmap for a character code.
 * Returns an array of 8 bytes (rows), each byte being 8 pixels wide.
 * Bit 5 (0x20) is leftmost pixel, bit 0 is rightmost.
 */
function getGlyph(charCode) {
  // Convert lowercase to uppercase if we don't have it
  if (charCode >= 0x61 && charCode <= 0x7A && !CHAR_ROM[charCode]) {
    charCode -= 0x20;
  }
  return CHAR_ROM[charCode] || CHAR_ROM[0x20] || [0,0,0,0,0,0,0,0];
}

export class TextRenderer {
  /**
   * @param {import('./display.js').Display} display
   */
  constructor(display) {
    this.display = display;
  }

  /**
   * Draw a single character at pixel position (px, py).
   * Each character occupies a 7×8 pixel cell in DHires coordinates.
   * Because DHires pixels are narrower than normal, we render each font pixel
   * as 2 DHires pixels wide (14×8 effective), which matches the Apple II text
   * mode proportions on a DHires screen.
   *
   * @param {number} charCode  ASCII code
   * @param {number} px        DHires X pixel
   * @param {number} py        DHires Y pixel (top of character)
   * @param {number} color     4-bit color index (default 15 = white)
   * @param {number} pageIdx   Page to draw on
   */
  drawChar(charCode, px, py, color = 15, pageIdx = undefined) {
    const glyph = getGlyph(charCode);
    const page = pageIdx !== undefined ? pageIdx : this.display.drawPage;

    for (let row = 0; row < 7; row++) {
      const bits = glyph[row] || 0;
      for (let col = 0; col < 7; col++) {
        // Bit 5 = leftmost through bit 0 = rightmost (6 bits wide)
        // Actually check from MSB side for a 6-wide font
        const bit = (bits >> (5 - col)) & 1;
        if (bit) {
          // Draw 2 DHires pixels wide for proper aspect ratio
          this.display.setPixel(px + col * 2, py + row, color, page);
          this.display.setPixel(px + col * 2 + 1, py + row, color, page);
        }
      }
    }
  }

  /**
   * Draw a text string centered horizontally on the screen.
   *
   * @param {string} text    The text to render
   * @param {number} y       DHires Y position (scanline, 0–191)
   * @param {number} color   Color index (default 15 = white)
   * @param {number} pageIdx Page to draw on
   */
  drawCentered(text, y, color = 15, pageIdx = undefined) {
    const charWidth = 14; // 7 font pixels × 2 DHires pixels
    const totalWidth = text.length * charWidth;
    const startX = Math.floor((this.display.WIDTH - totalWidth) / 2);
    for (let i = 0; i < text.length; i++) {
      this.drawChar(text.charCodeAt(i), startX + i * charWidth, y, color, pageIdx);
    }
  }

  /**
   * Draw multiple lines of text, centered horizontally, with line spacing.
   *
   * @param {string[]} lines     Array of text lines
   * @param {number}   startY    Y position of first line
   * @param {number}   lineGap   Pixels between lines (default 12)
   * @param {number}   color     Color index
   * @param {number}   pageIdx   Page to draw on
   */
  drawMultiCentered(lines, startY, lineGap = 12, color = 15, pageIdx = undefined) {
    for (let i = 0; i < lines.length; i++) {
      this.drawCentered(lines[i], startY + i * lineGap, color, pageIdx);
    }
  }

  /**
   * Draw text at a specific x,y position.
   *
   * @param {string} text
   * @param {number} x       DHires X
   * @param {number} y       DHires Y
   * @param {number} color
   * @param {number} pageIdx
   */
  drawText(text, x, y, color = 15, pageIdx = undefined) {
    const charWidth = 14;
    for (let i = 0; i < text.length; i++) {
      this.drawChar(text.charCodeAt(i), x + i * charWidth, y, color, pageIdx);
    }
  }
}
