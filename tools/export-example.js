/**
 * Export example — Extract all image tables from the POP source to PNG files.
 *
 * Run:  npm install && node export-example.js
 *
 * Creates an "exported/" folder with subfolders for each image table,
 * containing individual sprite PNGs and a combined sprite sheet.
 */

const fs = require('fs');
const path = require('path');
const { parseImageTable, renderImage, savePNG, buildSpriteSheet } = require('./pop-image-export');

const IMAGES_DIR = path.join(__dirname, '..', '01 POP Source', 'Images');
const OUTPUT_DIR = path.join(__dirname, 'exported');

// All image table files and their descriptions
const IMAGE_FILES = [
  { file: 'IMG.CHTAB1',      desc: 'Kid — running, standing, turning' },
  { file: 'IMG.CHTAB2',      desc: 'Kid — climbing, jumping, falling' },
  { file: 'IMG.CHTAB3',      desc: 'Sword fight frames' },
  { file: 'IMG.CHTAB4.FAT',  desc: 'Fat guard' },
  { file: 'IMG.CHTAB4.GD',   desc: 'Standard guard' },
  { file: 'IMG.CHTAB4.SHAD', desc: 'Shadow man' },
  { file: 'IMG.CHTAB4.SKEL', desc: 'Skeleton' },
  { file: 'IMG.CHTAB4.VIZ',  desc: 'Vizier / Jaffar' },
  { file: 'IMG.CHTAB5',      desc: 'Additional characters' },
  { file: 'IMG.CHTAB6.A',    desc: 'BG detail sprites (set A)' },
  { file: 'IMG.CHTAB6.B',    desc: 'BG detail sprites (set B)' },
  { file: 'IMG.CHTAB7',      desc: 'More BG detail sprites' },
  { file: 'IMG.BGTAB1.DUN',  desc: 'Dungeon background tiles (set 1)' },
  { file: 'IMG.BGTAB1.PAL',  desc: 'Palace background tiles (set 1)' },
  { file: 'IMG.BGTAB2.DUN',  desc: 'Dungeon background tiles (set 2)' },
  { file: 'IMG.BGTAB2.PAL',  desc: 'Palace background tiles (set 2)' },
];

function exportTable(entry, opts) {
  const filePath = path.join(IMAGES_DIR, entry.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] ${entry.file} — file not found`);
    return;
  }

  const data = fs.readFileSync(filePath);
  const table = parseImageTable(data);
  const valid = table.images.filter(i => i.valid);

  if (valid.length === 0) {
    console.log(`  [SKIP] ${entry.file} — no valid images`);
    return;
  }

  const outDir = path.join(OUTPUT_DIR, entry.file);
  fs.mkdirSync(outDir, { recursive: true });

  // Export individual sprites
  let exported = 0;
  for (const img of valid) {
    const { rgba, width, height } = renderImage(img, opts);
    const outPath = path.join(outDir, `${String(img.index).padStart(3, '0')}.png`);
    savePNG(outPath, rgba, width, height);
    exported++;
  }

  // Export sprite sheet
  const sheet = buildSpriteSheet(valid, opts);
  if (sheet) {
    const sheetPath = path.join(outDir, '_sheet.png');
    savePNG(sheetPath, sheet.rgba, sheet.width, sheet.height);
  }

  console.log(`  [OK]   ${entry.file.padEnd(18)} — ${exported} sprites exported  (${entry.desc})`);
}

// ── Main ──

console.log('Prince of Persia (Apple II) — Image Export\n');
console.log(`Source:  ${IMAGES_DIR}`);
console.log(`Output:  ${OUTPUT_DIR}\n`);

const opts = { color: false, scale: 2 };

console.log('Exporting (monochrome, 2× scale):\n');

for (const entry of IMAGE_FILES) {
  exportTable(entry, opts);
}

// Also do a color version of the kid sprites
console.log('\nExporting NTSC color versions of character sprites:\n');

const colorOpts = { color: true, scale: 2 };
const colorDir = path.join(OUTPUT_DIR, '_color');

for (const entry of IMAGE_FILES.slice(0, 5)) {
  const filePath = path.join(IMAGES_DIR, entry.file);
  if (!fs.existsSync(filePath)) continue;

  const data = fs.readFileSync(filePath);
  const table = parseImageTable(data);
  const valid = table.images.filter(i => i.valid);
  if (valid.length === 0) continue;

  const outDir = path.join(colorDir, entry.file);
  fs.mkdirSync(outDir, { recursive: true });

  const sheet = buildSpriteSheet(valid, colorOpts);
  if (sheet) {
    const sheetPath = path.join(outDir, '_sheet.png');
    savePNG(sheetPath, sheet.rgba, sheet.width, sheet.height);
    console.log(`  [OK]   ${entry.file.padEnd(18)} — color sprite sheet  (${entry.desc})`);
  }
}

console.log('\nDone! Check the exported/ folder for results.');
