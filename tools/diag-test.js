/**
 * Minimal diagnostic test — loads each level one at a time
 * and checks for page crashes.
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  for (const lvl of [0, 1, 2, 3, 4, 5, 7, 12]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('crash', () => errors.push('PAGE CRASHED'));
    
    try {
      await page.goto('http://localhost:8082/browser/levels.html', { 
        waitUntil: 'networkidle',
        timeout: 10000
      });
      
      // Wait for default level to load
      await page.waitForTimeout(1500);
      
      if (lvl !== 1) {
        // Change to target level
        await page.selectOption('#level-select', String(lvl));
        await page.waitForTimeout(3000);
      }
      
      // Check for accumulated errors
      if (errors.length > 0) {
        console.error(`✗ Level ${lvl}: ${errors.join('; ')}`);
      } else {
        // Get kid frame info from the page
        const info = await page.evaluate(() => {
          // Access the viewer through the module scope - not directly available
          return document.querySelector('#game-canvas') ? 'canvas OK' : 'no canvas';
        });
        console.log(`✓ Level ${lvl}: OK (${info})`);
      }
    } catch (e) {
      console.error(`✗ Level ${lvl}: ${e.message.split('\n')[0]}`);
    }
    
    await page.close();
  }
  
  await browser.close();
  console.log('\nDone.');
})();
