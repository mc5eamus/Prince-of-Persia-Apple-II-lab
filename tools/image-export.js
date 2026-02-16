// pop-image-export.js — Extract Prince of Persia Apple II sprites to PNG
// Usage: node pop-image-export.js <image-table-file> [output-dir]
//
// Requires: npm install pngjs

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// ── Apple II hi-res color palette ──
// The Apple II NTSC artifact colors (commonly used mapping).
// Bit 7 of each byte selects between two color groups.
// Pixel bits within a byte: bits 0–6, LSB = leftmost pixel.

const PALETTE_GROUP0 = [
  [0, 0, 0],       // 0 = black
  [0, 255, 0],     // 1 = green
];
const PALETTE_GROUP1 = [
  [0, 0, 0],       // 0 = black
  [255, 106, 0],   // 1 = orange
];

// Monochrome (white-on-black) palette — often cleaner for sprites
const PALETTE_MONO = [
  [0, 0, 0],       // 0 = black
  [255, 255, 255], // 1 = white
];

// ── Parse an image table ──

function parseImageTable(data) {
  const images = [];

  // The table starts with 2-byte LE pointers.
  // Image #1 starts at the offset pointed to by bytes 0–1.
  // We detect the number of images by looking at the first pointer
  // (which tells us the size of the pointer table).

  const firstPtr = data.readUInt16LE(0);
  if (firstPtr < 2 || firstPtr >= data.length) return images;

  // Pointers are to images 1..N; stored at offsets 0, 2, 4...
  // Image 1 is at index 1 in the original code (1-based),
  // but the pointer array is 0-based with a quirk:
  //   setimage: IMAGE = IMAGE * 2 - 1  → pointer at byte offset (img*2 - 1)
  // So image #1's pointer is at byte offset 1 (odd-aligned).
  // The table layout: byte 0 is unused/padding, then pairs at odd offsets.

  // Actually, looking at setimage more carefully:
  //   lda IMAGE; asl; sec; sbc #1 → index = image*2 - 1
  //   lda (TABLE),y → low byte at TABLE + image*2 - 1
  //   iny           → high byte at TABLE + image*2
  // So image #1 → offset 1,2; image #2 → offset 3,4; etc.

  // Detect number of images from the first pointer
  const numImages = Math.floor(firstPtr / 2);

  for (let i = 1; i <= numImages; i++) {
    const ptrOffset = i * 2 - 1;
    if (ptrOffset + 1 >= data.length) break;

    const imgStart = data.readUInt16LE(ptrOffset);
    // Handle tables where pointers are relative to a base address
    // For raw file data, pointers are typically absolute (from the load address).
    // We derive the file-relative offset.
    // The load address is the table's base (e.g., $6000 for chtable1).
    // We'll auto-detect: if the first image pointer > data.length,
    // it's an absolute address and we need to subtract the base.
    let base = 0;
    if (imgStart >= data.length) {
      // Absolute pointers — infer base from first image pointer
      const firstImgPtr = data.readUInt16LE(1);
      base = firstImgPtr - firstPtr; // should equal the load address
    }

    const offset = imgStart - base;
    if (offset < 0 || offset + 2 > data.length) continue;

    const width = data[offset];       // width in bytes
    const height = data[offset + 1];  // height in scan lines

    if (width === 0 || height === 0 || width > 40 || height > 192) continue;
    if (offset + 2 + width * height > data.length) continue;

    const pixelData = data.slice(offset + 2, offset + 2 + width * height);
    images.push({ index: i, width, height, pixelData, widthPixels: width * 7 });
  }

  return images;
}

// ── Render a single sprite image to RGBA pixel buffer ──

function renderImage(img, monochrome = true) {
  const { width, height, pixelData } = img;
  const pxWidth = width * 7; // 7 pixels per byte
  const rgba = Buffer.alloc(pxWidth * height * 4);

  for (let y = 0; y < height; y++) {
    for (let byteX = 0; byteX < width; byteX++) {
      const b = pixelData[y * width + byteX];
      const hibit = (b >> 7) & 1;
      const palette = monochrome ? PALETTE_MONO
        : (hibit ? PALETTE_GROUP1 : PALETTE_GROUP0);

      for (let bit = 0; bit < 7; bit++) {
        const pixel = (b >> bit) & 1;
        const color = palette[pixel];
        const px = byteX * 7 + bit;
        const idx = (y * pxWidth + px) * 4;
        rgba[idx + 0] = color[0];
        rgba[idx + 1] = color[1];
        rgba[idx + 2] = color[2];
        rgba[idx + 3] = pixel ? 255 : 0; // transparent background
      }
    }
  }

  return { rgba, pxWidth, height };
}

// ── Export to PNG ──

function savePNG(filePath, rgba, width, height) {
  const png = new PNG({ width, height });
  rgba.copy(png.data);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

// ── Build a sprite sheet of all images in a table ──

function buildSpriteSheet(images, monochrome = true) {
  const rendered = images.map(img => renderImage(img, monochrome));
  const padding = 2;

  // Arrange in a row
  const totalWidth = rendered.reduce((s, r) => s + r.pxWidth + padding, -padding);
  const maxHeight = Math.max(...rendered.map(r => r.height));

  const sheet = Buffer.alloc(totalWidth * maxHeight * 4); // transparent

  let xOff = 0;
  for (const r of rendered) {
    for (let y = 0; y < r.height; y++) {
      for (let x = 0; x < r.pxWidth; x++) {
        const srcIdx = (y * r.pxWidth + x) * 4;
        const dstIdx = (y * totalWidth + xOff + x) * 4;
        r.rgba.copy(sheet, dstIdx, srcIdx, srcIdx + 4);
      }
    }
    xOff += r.pxWidth + padding;
  }

  return { rgba: sheet, width: totalWidth, height: maxHeight };
}

// ── Main ──

function main() {
  const inputFile = process.argv[2];
  const outputDir = process.argv[3] || './exported';

  if (!inputFile) {
    console.log('Usage: node pop-image-export.js <IMG.CHTAB file> [output-dir]');
    console.log('Example: node pop-image-export.js "01 POP Source/Images/IMG.CHTAB1" ./sprites');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const data = fs.readFileSync(inputFile);
  const baseName = path.basename(inputFile);
  console.log(`Parsing ${baseName} (${data.length} bytes)...`);

  const images = parseImageTable(data);
  console.log(`Found ${images.length} images`);

  // Export individual sprites
  for (const img of images) {
    const { rgba, pxWidth, height } = renderImage(img);
    const outPath = path.join(outputDir, `${baseName}_${String(img.index).padStart(3, '0')}.png`);
    savePNG(outPath, rgba, pxWidth, height);
    console.log(`  #${img.index}: ${img.width}×${img.height} bytes (${pxWidth}×${height} px) → ${outPath}`);
  }

  // Export sprite sheet
  if (images.length > 1) {
    const sheet = buildSpriteSheet(images);
    const sheetPath = path.join(outputDir, `${baseName}_sheet.png`);
    savePNG(sheetPath, sheet.rgba, sheet.width, sheet.height);
    console.log(`\nSprite sheet → ${sheetPath} (${sheet.width}×${sheet.height})`);
  }
}

main();