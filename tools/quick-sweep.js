/**
 * quick-sweep.js — Fast JS error check across all 360 rooms.
 * No screenshots, just loads each room and checks for page errors.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const resultFile = path.join(__dirname, 'sweep-result.txt');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const errors = [];
  const LEVELS = 15;
  const ROOMS = 24;
  let count = 0;
  const lines = [];

  for (let lv = 0; lv < LEVELS; lv++) {
    const page = await browser.newPage();
    let lastRoom = 0;
    page.on('pageerror', e => {
      errors.push(`L${lv}R${lastRoom}: ${e.message}`);
    });

    for (let rm = 1; rm <= ROOMS; rm++) {
      lastRoom = rm;
      const url = `http://localhost:8082/browser/levels.html#level=${lv}&room=${rm}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(300);
      } catch (e) {
        errors.push(`L${lv}R${rm}: navigation - ${e.message.split('\n')[0]}`);
      }
      count++;
    }
    await page.close();
    lines.push(`Level ${lv} done (${count} rooms)`);
  }

  lines.push(`Tested ${count} rooms`);
  if (errors.length > 0) {
    lines.push(`ERRORS (${errors.length}):`);
    const unique = [...new Set(errors)];
    unique.forEach(e => lines.push(`  - ${e}`));
  } else {
    lines.push('No JS errors');
  }

  fs.writeFileSync(resultFile, lines.join('\n') + '\n');
  console.log(lines.join('\n'));

  await browser.close();
})();
