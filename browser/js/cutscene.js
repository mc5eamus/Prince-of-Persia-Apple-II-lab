/**
 * cutscene.js — Princess cutscene (PlayCut0) reimplementation.
 *
 * Recreates the opening cutscene from SUBS.S PlayCut0 (lines 659–762):
 *   1. Set up princess (CharID 5) at x=120, facing left, seq Pstand
 *   2. Set up vizier  (CharID 6) at x=197, facing left, seq Vstand
 *   3. Animate 2 frames (princess standing, vizier off-screen right)
 *   4. Princess hears something → Palert sequence
 *   5. Vizier approaches (Vapproach / Vwalk)
 *   6. Vizier stops in front of princess
 *   7. Vizier raises arms (Vraise) — magic!
 *   8. Princess steps back (Pback)
 *   9. Hourglass appears
 *  10. Vizier exits (Vexit)
 *  11. Princess slumps (Pslump)
 *
 * This is implemented as an async generator that yields control each frame,
 * letting the attract loop drive the timing.
 */

import { Character, SEQ, ALTSET2_FRAMES } from './animation.js';
import { drawSprite, eraseSprite } from './renderer.js';

// Palace room floor Y position (in single hi-res coordinates)
// floorY = 141 in the original (SUBS.S)
const FLOOR_Y = 141;

/**
 * The cutscene is driven as a coroutine.  Each `yield` pauses for one
 * animation frame (~55 ms, 18.2 fps).  The caller advances by calling
 * next() on the generator.
 *
 * @param {import('./display.js').Display} display
 * @param {Object} imageTables  { CHTAB6B, CHTAB7 } — parsed image tables
 * @yields {void}
 */
export function* playCut0(display, imageTables) {
  const page = 0; // draw directly on visible page for simplicity

  // --- Draw palace room background ---
  drawPalaceRoom(display, page);

  // --- Create characters ---
  const princess = new Character(5, 120, FLOOR_Y, -1); // facing left
  const vizier   = new Character(6, 197, FLOOR_Y, -1); // facing left

  princess.setSequence('Pstand');
  vizier.setSequence('Vstand');

  // Helper to get image data for a frame
  function getFrameImage(frameNum) {
    const frameDef = ALTSET2_FRAMES[frameNum];
    if (!frameDef) return null;
    const table = frameDef.tableFile === 'CHTAB7'
      ? imageTables.CHTAB7
      : imageTables.CHTAB6B;
    if (!table) return null;
    return table.images[frameDef.imageIdx] || null;
  }

  // Helper to draw a character
  function drawChar(ch) {
    if (ch.currentFrame == null) return;
    const img = getFrameImage(ch.currentFrame);
    if (!img) return;
    drawSprite(display, img, ch.x, ch.y, {
      flip: ch.face > 0,
      page,
      color: 15,
    });
  }

  // Helper to erase a character's previous position
  function eraseChar(ch, prevX, prevFrame) {
    if (prevFrame == null) return;
    const img = getFrameImage(prevFrame);
    if (!img) return;
    eraseSprite(display, img, prevX, ch.y, { page });
  }

  // Helper: advance N frames for a character, rendering each
  function* playFrames(chars, n) {
    for (let i = 0; i < n; i++) {
      for (const ch of chars) {
        const prevX = ch.x;
        const prevFrame = ch.currentFrame;
        ch.step();
        eraseChar(ch, prevX, prevFrame);
        drawChar(ch);
      }
      display.present();
      yield; // wait one frame tick
    }
  }

  // Initial render
  princess.step();
  vizier.step();
  drawChar(princess);
  drawChar(vizier);
  display.present();

  // 1. Animate 2 frames standing
  yield* playFrames([princess, vizier], 2);

  // (Song: s_Princess — skipped, no audio)
  // Wait 8 frames for the song intro
  yield* playFrames([princess, vizier], 8);

  // 2. Animate 5 more frames
  yield* playFrames([princess, vizier], 5);

  // 3. Princess hears something: Palert
  princess.setSequence('Palert');
  yield* playFrames([princess, vizier], 9);

  // (Song: s_Squeek — door squeaks)
  // Wait a few frames
  yield* playFrames([princess, vizier], 5);

  // 4. Vizier approaches
  vizier.setSequence('Vapproach');
  yield* playFrames([princess, vizier], 6);

  // 5. Vizier stops
  vizier.setSequence('Vstop');
  yield* playFrames([princess, vizier], 4);

  // Wait 4 more frames
  yield* playFrames([princess, vizier], 4);

  // (Song: s_Vizier)
  yield* playFrames([princess, vizier], 4);

  // 6. Vizier approaches more
  vizier.setSequence('Vapproach');
  yield* playFrames([princess, vizier], 30);

  // 7. Vizier stops again
  vizier.setSequence('Vstop');
  yield* playFrames([princess, vizier], 4);

  // (Song: s_Buildup)
  yield* playFrames([princess, vizier], 25);

  // 8. Vizier raises arms
  vizier.setSequence('Vraise');
  yield* playFrames([princess, vizier], 1);

  // Princess backs away
  princess.setSequence('Pback');
  yield* playFrames([princess, vizier], 13);

  // 9. Hourglass appears (we'll draw a simple hourglass icon)
  drawHourglass(display, page, 0);

  // Lightning effect
  yield* playFrames([princess, vizier], 5);

  // Sand starts flowing
  drawHourglass(display, page, 1);

  yield* playFrames([princess, vizier], 8);

  // 10. Vizier exits
  vizier.setSequence('Vexit');
  yield* playFrames([princess, vizier], 17);

  // Hourglass fills
  drawHourglass(display, page, 2);
  yield* playFrames([princess, vizier], 12);

  // 11. Princess slumps
  princess.setSequence('Pslump');
  yield* playFrames([princess, vizier], 28);

  // Hold for a moment
  yield* playFrames([princess, vizier], 20);

  // Done
}

/**
 * Draw a simplified palace room background.
 * The original uses palace background tiles — we draw a minimalist version.
 */
function drawPalaceRoom(display, page) {
  const W = display.WIDTH;

  // Floor
  for (let x = 0; x < W; x++) {
    for (let y = FLOOR_Y + 1; y < FLOOR_Y + 5; y++) {
      display.setPixel(x, y, 8, page); // brown floor
    }
  }

  // Wall color (dark blue-ish palace)
  for (let y = 0; y < FLOOR_Y + 1; y++) {
    for (let x = 0; x < W; x++) {
      // Subtle pattern
      const c = (y % 4 === 0) ? 2 : 1;
      display.setPixel(x, y, c, page);
    }
  }

  // Archway outline
  const archL = 180;
  const archR = 260;
  const archTop = 40;
  for (let y = archTop; y <= FLOOR_Y; y++) {
    display.setPixel(archL, y, 8, page);
    display.setPixel(archR, y, 8, page);
  }
  for (let x = archL; x <= archR; x++) {
    display.setPixel(x, archTop, 8, page);
  }
  // Dark interior
  for (let y = archTop + 1; y <= FLOOR_Y; y++) {
    for (let x = archL + 1; x < archR; x++) {
      display.setPixel(x, y, 0, page);
    }
  }

  // Columns
  drawColumn(display, page, 80);
  drawColumn(display, page, 400);
}

function drawColumn(display, page, x) {
  for (let y = 20; y <= FLOOR_Y; y++) {
    for (let dx = 0; dx < 8; dx++) {
      const shade = (dx === 0 || dx === 7) ? 5 : (dx < 4 ? 10 : 7);
      display.setPixel(x + dx, y, shade, page);
    }
  }
  // Capital
  for (let dx = -2; dx < 10; dx++) {
    display.setPixel(x + dx, 20, 10, page);
    display.setPixel(x + dx, 21, 10, page);
  }
}

/**
 * Draw a simple hourglass icon.
 * @param {number} state  0 = just appeared, 1 = sand flowing, 2 = sand collected
 */
function drawHourglass(display, page, state) {
  const cx = 280; // center x
  const cy = 50;  // top y
  const w = 8;
  const h = 24;

  // Frame
  for (let dx = -w; dx <= w; dx++) {
    display.setPixel(cx + dx, cy, 13, page);       // top bar (yellow)
    display.setPixel(cx + dx, cy + h, 13, page);   // bottom bar
  }
  // Sides
  for (let dy = 1; dy < h; dy++) {
    const squeeze = Math.floor(Math.abs(dy - h/2) * w / (h/2));
    display.setPixel(cx - squeeze, cy + dy, 13, page);
    display.setPixel(cx + squeeze, cy + dy, 13, page);
  }

  // Sand (top)
  if (state === 0) {
    // Full top
    for (let dy = 2; dy < h/2 - 1; dy++) {
      const sw = Math.floor((h/2 - dy) * (w-1) / (h/2));
      for (let dx = -sw; dx <= sw; dx++) {
        display.setPixel(cx + dx, cy + dy, 9, page); // orange sand
      }
    }
  }

  // Sand flow
  if (state >= 1) {
    // Stream in middle
    for (let dy = 4; dy < h - 4; dy++) {
      display.setPixel(cx, cy + dy, 9, page);
    }
  }

  // Sand collected (bottom)
  if (state >= 2) {
    for (let dy = h - 4; dy < h; dy++) {
      const sw = Math.floor((dy - (h/2)) * (w-1) / (h/2));
      for (let dx = -sw; dx <= sw; dx++) {
        display.setPixel(cx + dx, cy + dy, 9, page);
      }
    }
  }
}
