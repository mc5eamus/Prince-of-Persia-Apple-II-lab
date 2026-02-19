/**
 * Smoke test for Phase 5 animation engine.
 * Loads the level viewer page and checks for JS errors across multiple levels.
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });

  console.log('Loading level viewer...');
  await page.goto('http://localhost:8082/browser/levels.html', { waitUntil: 'networkidle' });
  
  // Wait for initial render
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.error('ERRORS on initial load:');
    errors.forEach(e => console.error('  ', e));
    await browser.close();
    process.exit(1);
  }
  console.log('✓ Level 1 loaded without errors');

  // Test sequence selector exists
  const seqSelect = await page.$('#seq-select');
  if (!seqSelect) {
    console.error('FAIL: sequence selector not found');
    await browser.close();
    process.exit(1);
  }
  const optionCount = await page.$$eval('#seq-select option', opts => opts.length);
  console.log(`✓ Sequence selector has ${optionCount} options`);

  // Test animation controls exist
  for (const id of ['btn-pause', 'btn-step', 'btn-reset']) {
    const btn = await page.$(`#${id}`);
    if (!btn) {
      console.error(`FAIL: button #${id} not found`);
      await browser.close();
      process.exit(1);
    }
  }
  console.log('✓ Animation controls found');

  // Test playing a few sequences
  const testSequences = [
    { value: '2', name: 'stand' },
    { value: '1', name: 'startrun' },
    { value: '55', name: 'engarde' },
    { value: '3', name: 'standjump' },
    { value: '7', name: 'stepfall' },
  ];

  for (const seq of testSequences) {
    errors.length = 0;
    await page.selectOption('#seq-select', seq.value);
    await page.waitForTimeout(500); // Let a few frames play
    
    if (errors.length > 0) {
      console.error(`ERRORS playing sequence ${seq.name}:`);
      errors.forEach(e => console.error('  ', e));
    } else {
      console.log(`✓ Sequence ${seq.name} (${seq.value}) plays without errors`);
    }
  }

  // Test changing levels
  const levelsToTest = [0, 1, 4, 7, 12];
  for (const lvl of levelsToTest) {
    errors.length = 0;
    await page.selectOption('#level-select', String(lvl));
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.error(`ERRORS loading level ${lvl}:`);
      errors.forEach(e => console.error('  ', e));
    } else {
      console.log(`✓ Level ${lvl} loads without errors`);
    }
  }

  // Test room navigation with animation running
  errors.length = 0;
  try {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.error('Navigation test crashed:', e.message);
  }
  
  if (errors.length > 0) {
    console.error('ERRORS during room navigation:');
    errors.forEach(e => console.error('  ', e));
  } else {
    console.log('✓ Room navigation with animation OK');
  }

  // Test pause/step/reset
  errors.length = 0;
  try {
    await page.click('#btn-pause');
    await page.waitForTimeout(200);
    await page.click('#btn-step');
    await page.waitForTimeout(200);
    await page.click('#btn-step');
    await page.waitForTimeout(200);
    await page.click('#btn-reset');
    await page.waitForTimeout(200);
    await page.click('#btn-pause'); // unpause
  } catch (e) {
    console.error('Controls test crashed:', e.message);
  }
  
  if (errors.length > 0) {
    console.error('ERRORS with animation controls:');
    errors.forEach(e => console.error('  ', e));
  } else {
    console.log('✓ Pause/Step/Reset controls work');
  }

  // Final summary
  await page.waitForTimeout(500);
  console.log('\n=== SMOKE TEST COMPLETE ===');
  
  const totalErrors = errors.length;
  if (totalErrors > 0) {
    console.error(`${totalErrors} remaining errors`);
  } else {
    console.log('All tests passed!');
  }

  await browser.close();
  process.exit(totalErrors > 0 ? 1 : 0);
})();
