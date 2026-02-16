/**
 * main.js — Entry point for the Prince of Persia browser edition.
 *
 * Initializes the display, loads image assets, and starts the attract loop.
 */

import { Display } from './display.js';
import { TextRenderer } from './text.js';
import { loadImageTable } from './imageLoader.js';
import { attractLoop } from './attract.js';

// Path to original image files (served from repo root)
const IMAGE_BASE = '../01 POP Source/Images/';

async function main() {
  // --- Set up display ---
  const canvas = document.getElementById('game-canvas');
  const display = new Display(canvas);
  const text = new TextRenderer(display);

  // --- Show loading message ---
  display.blackout();
  text.drawCentered('LOADING...', 90, 15, 0);
  display.present();

  // --- Load image tables needed for cutscene ---
  let imageTables = { CHTAB6B: null, CHTAB7: null };

  try {
    const [chtab6b, chtab7] = await Promise.all([
      loadImageTable(IMAGE_BASE + 'IMG.CHTAB6.B'),
      loadImageTable(IMAGE_BASE + 'IMG.CHTAB7'),
    ]);
    imageTables.CHTAB6B = chtab6b;
    imageTables.CHTAB7 = chtab7;
    console.log(`Loaded CHTAB6.B: ${chtab6b.count} images`);
    console.log(`Loaded CHTAB7:   ${chtab7.count} images`);
  } catch (err) {
    console.warn('Could not load image tables — cutscene will run without sprites.');
    console.warn(err);
  }

  // --- Start attract loop ---
  display.blackout();
  await attractLoop(display, text, imageTables);
}

// Go!
main().catch(err => console.error('Fatal error:', err));
