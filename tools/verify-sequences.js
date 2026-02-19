/**
 * Phase 5 Verification — Sequence interpreter unit tests.
 *
 * Tests various sequences produce valid frame numbers and state changes.
 * Runs in Node.js by importing the ES modules via dynamic import.
 */

// We'll inject a test page that imports the modules and runs tests in-browser.
const { chromium } = require('playwright');

const SEQUENCE_TESTS = [
  // [seqName, seqNum, expectedFrames, description]
  ['stand', 2, [15], 'Single-frame looping idle → loops on frame 15'],
  ['startrun', 8, [67, 68, 69, 70, 71, 72, 73, 74], '8-frame run start'],
  ['turn', 5, [45, 46, 47, 48, 49, 50, 51, 52], '8-frame turn → ends at stand'],
  ['stepfall', 7, [102, 103, 104, 105, 106], 'Step off edge → fall (5 frames)'],
  ['standjump', 26, [107, 108, 109], 'Standing jump (3+ frames before repeat)'],
  ['guardengarde', 90, null, 'Guard → goto ready → loops on blocking/ready'],
  ['engarde', 55, [207, 208, 209, 210], 'En garde → falls into ready'],
  ['climbstairs', 39, null, 'Climb up sequence (multi-frame)'],
  ['arise', 88, [177, 177, 178, 166], 'Rise from rubble (4 frames)'],
  ['drinkpotion', 33, [121, 122, 123, 124, 129, 130, 131, 132], 'Drink potion anim'],
];

const testScript = `
import { SEQ, SEQ_DATA, SEQ_OPCODES, getSeqPointer } from './js/seqtable.js';
import { createCharState, jumpSeq, ACTION } from './js/charState.js';
import { animChar, animTick } from './js/seqInterpreter.js';

window._runSeqTests = function() {
  const results = [];
  const tests = ${JSON.stringify(SEQUENCE_TESTS)};

  for (const [name, seqNum, expectedFrames, desc] of tests) {
    const ch = createCharState();
    ch.charFace = -1;
    ch.charX = 100;
    ch.charY = 118;
    ch.charLife = -1;

    jumpSeq(ch, seqNum);

    const frames = [];
    const actions = [];
    let ok = true;
    let error = null;

    // Run up to 30 ticks to collect frames
    for (let tick = 0; tick < 30; tick++) {
      const before = ch.charSeq;
      const result = animChar(ch, {});
      if (!result) {
        error = 'animChar returned false at tick ' + tick;
        ok = false;
        break;
      }
      frames.push(ch.charPosn);
      actions.push(ch.charAction);

      // Detect loop (same sequence pointer = looping)
      if (ch.charSeq === before && frames.length >= 2) {
        break; // Hit a looping sequence
      }

      // If we have enough frames and expected list provided, stop
      if (expectedFrames && frames.length >= expectedFrames.length + 2) break;
    }

    // Validate expected frames if provided
    if (expectedFrames && ok) {
      for (let i = 0; i < Math.min(expectedFrames.length, frames.length); i++) {
        if (frames[i] !== expectedFrames[i]) {
          error = 'Frame ' + i + ': expected ' + expectedFrames[i] + ', got ' + frames[i];
          ok = false;
          break;
        }
      }
    }

    // Basic validity: all frames should be valid frame numbers (0-240)
    if (ok) {
      for (let i = 0; i < frames.length; i++) {
        if (frames[i] < 0 || frames[i] > 240) {
          error = 'Frame ' + i + ' out of range: ' + frames[i];
          ok = false;
          break;
        }
      }
    }

    results.push({
      name, seqNum, desc, ok, error,
      frames: frames.slice(0, 10),
      actions: [...new Set(actions)],
      totalFrames: frames.length,
    });
  }

  return results;
};
`;

(async () => {
  console.log('Phase 5 — Sequence Interpreter Tests');
  console.log('====================================\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', err => console.error('PAGE ERROR:', err.message.substring(0, 200)));

  // Navigate to the level viewer page (which loads all modules)
  await page.goto('http://localhost:8082/browser/levels.html', {
    waitUntil: 'networkidle', timeout: 15000
  });

  // Inject test module
  await page.addScriptTag({
    content: testScript,
    type: 'module',
  });
  await page.waitForTimeout(500);

  // Run tests
  const results = await page.evaluate(() => window._runSeqTests());

  if (!results) {
    console.error('Failed to run tests (module not loaded?)');
    await browser.close();
    process.exit(1);
  }

  let passed = 0, failed = 0;
  for (const r of results) {
    const status = r.ok ? '✓' : '✗';
    const frameStr = r.frames.map(f => f).join(',');
    console.log(`${status} SEQ ${r.seqNum} (${r.name}): ${r.desc}`);
    console.log(`  Frames: [${frameStr}]${r.totalFrames > 10 ? ` (${r.totalFrames} total)` : ''}`);
    console.log(`  Actions: [${r.actions.join(',')}]`);
    if (r.error) console.log(`  ERROR: ${r.error}`);
    if (r.ok) passed++; else failed++;
  }

  console.log(`\n====================================`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length}`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
