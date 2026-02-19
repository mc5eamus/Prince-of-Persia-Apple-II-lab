/**
 * mini-sweep.js — Check a handful of levels for JS errors.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  let count = 0;

  // Test levels 0, 1, 4 (dungeon + palace) — 72 rooms total
  for (const lv of [0, 1, 4]) {
    const page = await browser.newPage();
    let lastRoom = 0;
    page.on('pageerror', e => {
      errors.push(`L${lv}R${lastRoom}: ${e.message}`);
    });

    for (let rm = 1; rm <= 24; rm++) {
      lastRoom = rm;
      try {
        await page.goto(
          `http://localhost:8082/browser/levels.html#level=${lv}&room=${rm}`,
          { waitUntil: 'domcontentloaded', timeout: 8000 }
        );
        await page.waitForTimeout(250);
      } catch (e) {
        errors.push(`L${lv}R${rm}: nav error`);
      }
      count++;
    }
    await page.close();
  }

  const result = [`Tested ${count} rooms`];
  if (errors.length) {
    result.push(`ERRORS (${errors.length}):`);
    [...new Set(errors)].forEach(e => result.push(`  - ${e}`));
  } else {
    result.push('No JS errors');
  }

  fs.writeFileSync(path.join(__dirname, 'mini-result.txt'), result.join('\n'));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
