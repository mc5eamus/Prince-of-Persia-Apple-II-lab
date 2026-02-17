/**
 * screenshot-sweep.js — Automated Playwright screenshot sweep for all levels and rooms.
 *
 * Takes a screenshot of every room across all 15 levels (0–14) for visual
 * regression testing of the BG tile renderer.
 *
 * Prerequisites:
 *   - npm install playwright (or npx playwright install chromium)
 *   - http-server running on port 8082 from the project root:
 *       npx http-server . -p 8082 -c-1
 *
 * Usage:
 *   node tools/screenshot-sweep.js [--level N] [--port PORT]
 *
 * Output:
 *   tools/screenshots/levelN/roomR.png
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let targetLevel = null;
let port = 8082;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--level' && args[i + 1]) targetLevel = parseInt(args[++i]);
  if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i]);
}

const BASE_URL = `http://localhost:${port}/browser/levels.html`;
const OUT_DIR = path.join(__dirname, 'screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(msg.text());
    }
  });

  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // Wait for initial load
  await sleep(2000);

  const levels = targetLevel !== null ? [targetLevel] : Array.from({ length: 15 }, (_, i) => i);

  for (const levelNum of levels) {
    const levelDir = path.join(OUT_DIR, `level${levelNum}`);
    fs.mkdirSync(levelDir, { recursive: true });

    console.log(`\n=== Level ${levelNum} ===`);

    // Select level
    await page.selectOption('#level-select', `${levelNum}`);
    await sleep(1500); // Wait for level load + initial render

    // Get available rooms from the dropdown
    const roomValues = await page.$$eval('#room-select option', opts =>
      opts.map(o => parseInt(o.value))
    );

    console.log(`  Rooms: ${roomValues.join(', ')}`);

    for (const roomNum of roomValues) {
      // Select room
      await page.selectOption('#room-select', `${roomNum}`);
      await sleep(200); // Wait for render

      const filePath = path.join(levelDir, `room${roomNum}.png`);
      await page.screenshot({ path: filePath, type: 'png' });
      process.stdout.write(`  Room ${roomNum} ✓  `);
    }

    console.log(); // newline after room line
  }

  // Report errors
  if (errors.length > 0) {
    console.log(`\n⚠ Console errors encountered (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
  } else {
    console.log('\n✓ No JavaScript console errors detected.');
  }

  const totalScreenshots = levels.length * 24; // approximate
  console.log(`\nScreenshots saved to: ${OUT_DIR}`);

  await browser.close();
}

main().catch(err => {
  console.error('Sweep failed:', err);
  process.exit(1);
});
