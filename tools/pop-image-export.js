/**
 * Prince of Persia (Apple II) — Image Table Exporter
 *
 * Extracts sprite and background tile images from the binary IMG.* files
 * in the repository and exports them as individual PNGs and sprite sheets.
 *
 * Image table binary format (from HIRES.S `setimage` / `GETWIDTH`):
 *   Byte 0:      max image index (number of images = byte0 + 1)
 *   Bytes 1-2:   LE pointer for image #1 (absolute address)
 *   Bytes 3-4:   LE pointer for image #2
 *   ...
 *   Bytes (N*2-1)-(N*2): LE pointer for image #N
 *   --- image data follows ---
 *   Per image:
 *     Byte 0:    width (in bytes; each byte = 7 pixels)
 *     Byte 1:    height (in scan lines)
 *     Byte 2+:   pixel data, left-to-right, top-to-bottom
 *                Each byte: bits 0-6 = 7 pixels (bit 0 = leftmost),
 *                           bit 7 = palette/color group select
 *
 * Usage:
 *   node pop-image-export.js <IMG-file> [output-dir] [--color] [--scale=N] [--sheet]
 *
 * Requires: npm install pngjs
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// ── Apple II NTSC artifact color palette ──
// Approximate NTSC artifact colors for the two hi-res color groups.
// In the real Apple II, colors depend on even/odd pixel column position.

const COLORS = {
  mono: {
    bg:  [0, 0, 0, 0],        // transparent black
    fg:  [255, 255, 255, 255], // white
  },
  ntsc: {
    // Group 0 (bit 7 = 0): black, purple (odd), green (even)
    group0: {
      even: [20, 245, 60, 255],    // green
      odd:  [255, 68, 253, 255],   // purple
    },
    // Group 1 (bit 7 = 1): black, blue (odd), orange (even)
    group1: {
      even: [255, 106, 60, 255],   // orange
      odd:  [20, 207, 253, 255],   // blue
    },
    bg: [0, 0, 0, 0],
  },
};

// ── Parse an image table file ──

/**
 * @param {Buffer} data - Raw contents of an IMG.* file
 * @returns {{ numImages: number, baseAddr: number, images: ImageEntry[] }}
 */
function parseImageTable(data) {
  if (data.length < 5) {
    throw new Error('File too small to be an image table');
  }

  // Byte 0 = max image index (0-based), so number of images = byte0 + 1
  const maxIndex = data[0];
  const numImages = maxIndex + 1;

  // Read first pointer to compute base address
  const firstPtr = data.readUInt16LE(1);
  const ptrTableSize = 1 + numImages * 2; // byte0 + N × 2-byte pointers
  const baseAddr = firstPtr - ptrTableSize;

  const images = [];

  for (let i = 1; i <= numImages; i++) {
    const ptrOffset = i * 2 - 1; // setimage: IMAGE*2 - 1
    if (ptrOffset + 1 >= data.length) break;

    const absPtr = data.readUInt16LE(ptrOffset);
    const fileOffset = absPtr - baseAddr;

    if (fileOffset < 0 || fileOffset + 2 > data.length) {
      images.push({ index: i, valid: false, width: 0, height: 0, widthPx: 0, pixelData: Buffer.alloc(0) });
      continue;
    }

    const width = data[fileOffset];       // bytes
    const height = data[fileOffset + 1];  // scan lines

    if (width === 0 || height === 0 || width > 40 || height > 192) {
      images.push({ index: i, valid: false, width, height, widthPx: width * 7, pixelData: Buffer.alloc(0) });
      continue;
    }

    const dataStart = fileOffset + 2;
    const dataLen = width * height;

    if (dataStart + dataLen > data.length) {
      images.push({ index: i, valid: false, width, height, widthPx: width * 7, pixelData: Buffer.alloc(0) });
      continue;
    }

    const pixelData = data.slice(dataStart, dataStart + dataLen);
    images.push({ index: i, valid: true, width, height, widthPx: width * 7, pixelData });
  }

  return { numImages, baseAddr, images };
}

// ── Render image to RGBA buffer ──

/**
 * @param {ImageEntry} img
 * @param {{ color: boolean, scale: number }} opts
 * @returns {{ rgba: Buffer, width: number, height: number }}
 */
function renderImage(img, opts = {}) {
  const { color = false, scale = 1 } = opts;
  const { width, height, pixelData } = img;
  const pxW = width * 7;
  const outW = pxW * scale;
  const outH = height * scale;
  const rgba = Buffer.alloc(outW * outH * 4);

  // Image data is stored bottom-to-top: the first row in the data
  // corresponds to the bottom of the sprite on screen (HIRES.S LAY
  // starts at YCO and decrements). We flip Y so row 0 of data maps
  // to the last row of the output image.

  for (let y = 0; y < height; y++) {
    const outY = height - 1 - y; // flip vertical

    for (let byteX = 0; byteX < width; byteX++) {
      const b = pixelData[y * width + byteX];
      const hibit = (b >> 7) & 1;

      for (let bit = 0; bit < 7; bit++) {
        const pixel = (b >> bit) & 1;
        const globalPixelX = byteX * 7 + bit;

        let r, g, bl, a;
        if (!pixel) {
          [r, g, bl, a] = COLORS.mono.bg;
        } else if (!color) {
          [r, g, bl, a] = COLORS.mono.fg;
        } else {
          // NTSC artifact color depends on even/odd pixel column and hi-bit
          const group = hibit ? COLORS.ntsc.group1 : COLORS.ntsc.group0;
          const c = (globalPixelX % 2 === 0) ? group.even : group.odd;
          [r, g, bl, a] = c;
        }

        // Write scaled pixel
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const ox = globalPixelX * scale + sx;
            const oy = outY * scale + sy;
            const idx = (oy * outW + ox) * 4;
            rgba[idx] = r;
            rgba[idx + 1] = g;
            rgba[idx + 2] = bl;
            rgba[idx + 3] = a;
          }
        }
      }
    }
  }

  return { rgba, width: outW, height: outH };
}

// ── Save to PNG ──

function savePNG(filePath, rgba, width, height) {
  const png = new PNG({ width, height });
  rgba.copy(png.data);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

// ── Build sprite sheet ──

function buildSpriteSheet(images, opts = {}) {
  const padding = 2;
  const rendered = images.filter(i => i.valid).map(img => ({
    ...renderImage(img, opts),
    index: img.index,
  }));

  if (rendered.length === 0) return null;

  // Arrange in rows with max width ~800px
  const maxRowWidth = 800;
  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;

  for (const r of rendered) {
    if (currentRowWidth + r.width + padding > maxRowWidth && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentRowWidth = 0;
    }
    currentRow.push(r);
    currentRowWidth += r.width + padding;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const totalWidth = Math.max(...rows.map(row =>
    row.reduce((s, r) => s + r.width + padding, -padding)
  ));
  const totalHeight = rows.reduce((s, row) =>
    s + Math.max(...row.map(r => r.height)) + padding, -padding
  );

  const sheet = Buffer.alloc(totalWidth * totalHeight * 4);

  let yOff = 0;
  for (const row of rows) {
    const rowHeight = Math.max(...row.map(r => r.height));
    let xOff = 0;
    for (const r of row) {
      for (let y = 0; y < r.height; y++) {
        for (let x = 0; x < r.width; x++) {
          const srcIdx = (y * r.width + x) * 4;
          const dstIdx = ((yOff + y) * totalWidth + xOff + x) * 4;
          if (dstIdx + 3 < sheet.length) {
            sheet[dstIdx] = r.rgba[srcIdx];
            sheet[dstIdx + 1] = r.rgba[srcIdx + 1];
            sheet[dstIdx + 2] = r.rgba[srcIdx + 2];
            sheet[dstIdx + 3] = r.rgba[srcIdx + 3];
          }
        }
      }
      xOff += r.width + padding;
    }
    yOff += rowHeight + padding;
  }

  return { rgba: sheet, width: totalWidth, height: totalHeight };
}

// ── CLI ──

function printUsage() {
  console.log(`
Prince of Persia (Apple II) Image Table Exporter

Usage:
  node pop-image-export.js <IMG-file> [output-dir] [options]

Options:
  --color       Use NTSC artifact colors (default: monochrome white)
  --scale=N     Scale factor for output (default: 1)
  --sheet       Also generate a combined sprite sheet
  --no-singles  Skip individual image PNGs (only generate sheet)

Examples:
  node pop-image-export.js "../01 POP Source/Images/IMG.CHTAB1" ./exported
  node pop-image-export.js "../01 POP Source/Images/IMG.BGTAB1.DUN" ./exported --color --scale=2 --sheet
`);
}

function main() {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const positional = args.filter(a => !a.startsWith('--'));

  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const inputFile = positional[0];
  const outputDir = positional[1] || './exported';
  const color = flags.includes('--color');
  const scale = parseInt((flags.find(f => f.startsWith('--scale=')) || '--scale=1').split('=')[1]) || 1;
  const sheet = flags.includes('--sheet');
  const noSingles = flags.includes('--no-singles');

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const data = fs.readFileSync(inputFile);
  const baseName = path.basename(inputFile);
  console.log(`\nParsing ${baseName} (${data.length} bytes)...`);

  const table = parseImageTable(data);
  const validImages = table.images.filter(i => i.valid);
  console.log(`  Base address: $${table.baseAddr.toString(16).toUpperCase()}`);
  console.log(`  Images found: ${validImages.length} / ${table.numImages}\n`);

  const renderOpts = { color, scale };

  // Export individual images
  if (!noSingles) {
    for (const img of validImages) {
      const { rgba, width, height } = renderImage(img, renderOpts);
      const outPath = path.join(outputDir, `${baseName}_${String(img.index).padStart(3, '0')}.png`);
      savePNG(outPath, rgba, width, height);
      console.log(`  #${String(img.index).padStart(3)}: ${img.width}×${img.height} bytes → ${img.widthPx}×${img.height} px → ${path.basename(outPath)}`);
    }
  }

  // Export sprite sheet
  if (sheet || noSingles) {
    console.log('');
    const result = buildSpriteSheet(validImages, renderOpts);
    if (result) {
      const sheetPath = path.join(outputDir, `${baseName}_sheet.png`);
      savePNG(sheetPath, result.rgba, result.width, result.height);
      console.log(`  Sprite sheet: ${result.width}×${result.height} px → ${path.basename(sheetPath)}`);
    }
  }

  console.log('\nDone!');
}

// ── Module exports (for programmatic use) ──

module.exports = { parseImageTable, renderImage, savePNG, buildSpriteSheet };

// Run CLI if executed directly
if (require.main === module) {
  main();
}
