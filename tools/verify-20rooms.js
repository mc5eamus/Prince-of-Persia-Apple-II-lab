/**
 * Phase 5 Verification — 20 representative rooms test suite.
 *
 * Tests that each room loads, renders, and animates correctly.
 * Each room gets a fresh page to avoid cross-contamination.
 *
 * Usage:  node verify-20rooms.js [--screenshots]
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8082/browser/levels.html';

const TEST_ROOMS = [
  // ── Dungeon kid starts ──
  { level: 0, room: 1, reason: "L0 kid start — torches, spikes, upressplate, posts" },
  { level: 1, room: 1, reason: "L1 kid start — posts, torches, rubble, loose (stepfall seq)" },
  { level: 2, room: 5, reason: "L2 kid start — pillars, exit/exit2 door, rubble" },

  // ── Palace kid starts ──
  { level: 5, room: 7, reason: "L5 kid start — flask, gates, panelwof, torches, pillars" },
  { level: 7, room: 17, reason: "L7 kid start — minimal: only space+floor" },
  { level: 10, room: 1, reason: "L10 kid start — 4 gates, loose, posts, exit, panels" },

  // ── Dungeon guard rooms ──
  { level: 0, room: 4, reason: "First guard (skill 5) — posts, torches, loose, gate" },
  { level: 2, room: 7, reason: "Guard (skill 2) — gate, posts, torches, spikes" },

  // ── Palace guard rooms ──
  { level: 4, room: 2, reason: "Guard (skill 4) — full arch colonnade (archtop1-4+archbot)" },
  { level: 8, room: 5, reason: "Guard (skill 7) — spikes, torches, hard combat" },
  { level: 13, room: 1, reason: "Jaffar fight (skill 9) — torches + 6 loose floors" },

  // ── Special tile rooms ──
  { level: 6, room: 18, reason: "Window+window2 tiles (rare), panelwof, gate" },
  { level: 1, room: 15, reason: "Sword+bones pickup — iconic sword room" },
  { level: 3, room: 16, reason: "3 slicers + flask + posts — multi-slicer" },

  // ── High variety rooms ──
  { level: 1, room: 5, reason: "11 tile types — pressplate, gates, flask, loose, block" },
  { level: 9, room: 22, reason: "10 tile types — spikes, gate, panels, posts" },

  // ── Arch/colonnade ──
  { level: 5, room: 16, reason: "Guard + full arch colonnade, loose, upressplate" },

  // ── Edge cases ──
  { level: 10, room: 18, reason: "9 loose floors — extreme edge case" },
  { level: 11, room: 7, reason: "6 loose + panelwof + panelwif mixed" },

  // ── Palace sword room ──
  { level: 12, room: 15, reason: "Sword in palace tileset, torches, loose, upressplate" },
];

const doScreenshots = process.argv.includes('--screenshots');
const screenshotDir = path.join(__dirname, 'screenshots');

async function testRoom(roomDef, index) {
  const { level, room, reason } = roomDef;
  const label = `[${index+1}/20] L${level}R${room}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const result = { level, room, reason, errors: [], warnings: [] };

  page.on('crash', () => result.errors.push('PAGE_CRASHED'));
  page.on('pageerror', err => result.errors.push(`JS: ${err.message.substring(0, 200)}`));
  page.on('console', msg => {
    if (msg.type() === 'error') result.errors.push(`Console: ${msg.text().substring(0, 200)}`);
    else if (msg.type() === 'warning') result.warnings.push(msg.text().substring(0, 150));
  });

  try {
    // 1. Load page
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // 2. Select level
    await page.selectOption('#level-select', String(level));

    // 3. Wait for level to load (give it up to 5s)
    await Promise.race([
      page.waitForTimeout(2000),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Level load timeout')), 5000))
    ]);

    // 4. Navigate to specific room
    if (room !== 1) {
      await page.selectOption('#room-select', String(room));
      await page.waitForTimeout(500);
    }

    // 5. Let animation run for 1 second (~12 frames)
    await page.waitForTimeout(1000);

    // 6. Check canvas has content (not blank)
    const canvasCheck = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      if (!canvas) return { error: 'no canvas' };
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0) nonBlack++;
      }
      return { width: canvas.width, height: canvas.height, nonBlackPixels: nonBlack };
    });

    if (canvasCheck.error) {
      result.errors.push(canvasCheck.error);
    } else if (canvasCheck.nonBlackPixels < 100) {
      result.errors.push(`Canvas nearly blank (${canvasCheck.nonBlackPixels} non-black pixels)`);
    } else {
      result.pixelCount = canvasCheck.nonBlackPixels;
    }

    // 7. Check page is still responsive
    const responsive = await Promise.race([
      page.evaluate(() => 'alive'),
      new Promise(r => setTimeout(() => r('dead'), 2000))
    ]);
    if (responsive !== 'alive') {
      result.errors.push('Page became unresponsive');
    }

    // 8. Take screenshot if requested
    if (doScreenshots) {
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      const filename = path.join(screenshotDir, `L${level}R${room}.png`);
      await page.screenshot({ path: filename, clip: { x: 0, y: 0, width: 560, height: 192 } });
    }

    // 9. Check for excessive warnings (likely bad sequences)
    if (result.warnings.length > 20) {
      result.errors.push(`Excessive warnings: ${result.warnings.length}`);
    }
  } catch (e) {
    result.errors.push(`Exception: ${e.message.split('\n')[0]}`);
  }

  try { await browser.close(); } catch (e) {}

  // Report
  const status = result.errors.length === 0 ? '✓' : '✗';
  const extra = result.pixelCount ? ` (${result.pixelCount} px)` : '';
  const warnNote = result.warnings.length > 0 ? ` [${result.warnings.length} warns]` : '';
  console.log(`${status} ${label}: ${reason}${extra}${warnNote}`);
  if (result.errors.length > 0) {
    for (const err of result.errors) console.log(`    ERROR: ${err}`);
  }

  return result;
}

(async () => {
  console.log('Phase 5 Verification — 20 Representative Rooms');
  console.log('================================================\n');

  let passed = 0, failed = 0;
  const results = [];

  for (let i = 0; i < TEST_ROOMS.length; i++) {
    const result = await testRoom(TEST_ROOMS[i], i);
    results.push(result);
    if (result.errors.length === 0) passed++; else failed++;
  }

  console.log('\n================================================');
  console.log(`Results: ${passed} passed, ${failed} failed out of ${TEST_ROOMS.length}`);

  // Summary of unique warnings
  const allWarnings = new Set();
  for (const r of results) {
    for (const w of r.warnings) allWarnings.add(w);
  }
  if (allWarnings.size > 0) {
    console.log(`\nUnique warnings (${allWarnings.size}):`);
    for (const w of [...allWarnings].slice(0, 10)) {
      console.log(`  - ${w}`);
    }
    if (allWarnings.size > 10) console.log(`  ... and ${allWarnings.size - 10} more`);
  }

  process.exit(failed > 0 ? 1 : 0);
})();
