/**
 * attract.js — Attract mode (self-running intro loop).
 *
 * Reimplements the AttractLoop from MASTER.S (lines 683–970):
 *
 *   1. SetupDHires — clear to black
 *   2. PubCredit  — show splash, overlay "Broderbund Software Presents",
 *                    pause, clean
 *   3. AuthorCredit — overlay "A Game by Jordan Mechner", pause, clean
 *   4. TitleScreen — overlay "Prince of Persia" title, pause, clean
 *   5. Prolog1    — show prologue screen with story text
 *   6. PrincessScene — PlayCut0 cutscene (princess + vizier)
 *   7. SetupDHires
 *   8. Prolog2    — show summary text screen
 *   9. SilentTitle — show title again briefly
 *  10. Demo       — (skipped; loop back to start)
 *
 * Timing: tpause unit ≈ 50 ms.  Frame rate ≈ 18.2 fps (55 ms/frame).
 */

import { Display } from './display.js';
import { TextRenderer } from './text.js';
import { loadImageTable } from './imageLoader.js';
import { playCut0 } from './cutscene.js';

const TPAUSE_MS = 50;     // milliseconds per tpause unit
const FRAME_MS  = 55;     // milliseconds per animation frame

/**
 * Wait for a given number of tpause units.
 * @param {number} units
 * @returns {Promise<void>}
 */
function tpause(units) {
  return new Promise(resolve => setTimeout(resolve, units * TPAUSE_MS));
}

/**
 * Wait for one animation frame.
 */
function frameDelay() {
  return new Promise(resolve => setTimeout(resolve, FRAME_MS));
}

/**
 * Run the full attract loop. Loops forever until the page is closed or
 * a key / click is detected (TODO: start game on keypress).
 *
 * @param {Display} display
 * @param {TextRenderer} text
 * @param {Object} imageTables   Pre-loaded image tables
 */
export async function attractLoop(display, text, imageTables) {
  while (true) {
    // ---- 1. SetupDHires ----
    display.blackout();
    await tpause(10);

    // ---- 2. PubCredit — "Broderbund Software Presents" ----
    await pubCredit(display, text);

    // ---- 3. AuthorCredit — "A Game by Jordan Mechner" ----
    await authorCredit(display, text);

    // ---- 4. TitleScreen — "Prince of Persia" ----
    await titleScreen(display, text);

    // ---- 5. Prolog1 — story text ----
    await prolog1(display, text);

    // ---- 6. PrincessScene ----
    display.blackout();
    await tpause(10);
    await princessScene(display, imageTables);

    // ---- 7. SetupDHires ----
    display.blackout();
    await tpause(5);

    // ---- 8. Prolog2 — summary text ----
    await prolog2(display, text);

    // ---- 9. SilentTitle ----
    await silentTitle(display, text);

    // ---- 10. Demo (skip — loop) ----
    display.blackout();
    await tpause(30);
  }
}

// =========================================================================
//  Individual attract-mode screens
// =========================================================================

/**
 * PubCredit: Show splash bg, overlay "Broderbund Software Presents"
 */
async function pubCredit(display, text) {
  // Draw a dark splash background (placeholder for packed splash screen)
  drawSplashBackground(display, 0);
  drawSplashBackground(display, 1);
  display.activePage = 0;
  display.present();

  await tpause(44);

  // Overlay credit text on page 0
  text.drawCentered('BRODERBUND', 80, 15, 0);
  text.drawCentered('SOFTWARE', 94, 15, 0);
  text.drawCentered('PRESENTS', 112, 15, 0);
  display.activePage = 0;
  display.present();

  // Wait for "song" duration (~80 tpause)
  await tpause(80);

  // CleanScreen: switch to page 1 (no credit text), then copy back
  display.activePage = 1;
  display.present();
  display.copy2to1();
  display.activePage = 0;
  display.present();
}

/**
 * AuthorCredit: overlay "A Game by Jordan Mechner"
 */
async function authorCredit(display, text) {
  await tpause(42);

  text.drawCentered('A GAME BY', 80, 15, 0);
  text.drawCentered('JORDAN MECHNER', 96, 15, 0);
  display.present();

  await tpause(80);

  // Clean: show page 1, copy back
  display.activePage = 1;
  display.present();
  display.copy2to1();
  display.activePage = 0;
  display.present();
}

/**
 * TitleScreen: overlay "Prince of Persia"
 */
async function titleScreen(display, text) {
  await tpause(38);

  // Draw the title in large text (we'll center a big "PRINCE OF PERSIA")
  text.drawCentered('PRINCE OF PERSIA', 70, 15, 0);

  // Decorative line
  for (let x = 140; x < 420; x++) {
    display.setPixel(x, 64, 9, 0);  // orange line above
    display.setPixel(x, 86, 9, 0);  // orange line below
  }

  display.present();

  await tpause(140);

  // Clean screen
  display.activePage = 1;
  display.present();
  display.copy2to1();
  display.activePage = 0;
  display.present();
}

/**
 * Prolog1: Story text screen
 */
async function prolog1(display, text) {
  display.clearPage(0);
  display.clearPage(1);
  display.activePage = 0;

  const lines = [
    'IN THE SULTAN\'S ABSENCE',
    'THE GRAND VIZIER JAFFAR',
    'HAS SEIZED THE REINS',
    'OF POWER.',
    '',
    'HE HAS THROWN THE',
    'PRINCESS INTO THE',
    'DUNGEON TOWER AND',
    'GIVEN HER BUT 60',
    'MINUTES TO DECIDE:',
    '',
    'MARRY JAFFAR...',
    'OR DIE.',
  ];

  text.drawMultiCentered(lines, 20, 12, 15, 0);
  display.present();

  await tpause(250);
}

/**
 * Princess cutscene: PlayCut0
 */
async function princessScene(display, imageTables) {
  display.clearPage(0);
  display.activePage = 0;

  const gen = playCut0(display, imageTables);

  // Drive the coroutine one frame at a time
  while (true) {
    const { done } = gen.next();
    if (done) break;
    await frameDelay();
  }

  await tpause(30);
}

/**
 * Prolog2: Summary text
 */
async function prolog2(display, text) {
  display.clearPage(0);
  display.activePage = 0;

  const lines = [
    'YOU ARE THE ONLY ONE',
    'WHO CAN SAVE HER.',
    '',
    'BUT LOCKED IN THE',
    'DUNGEON BELOW,',
    'YOU HAVE ONLY',
    '60 MINUTES',
    'TO REACH THE',
    'PRINCESS HERE',
    'AT THE TOP',
    'OF THE TOWER.',
  ];

  text.drawMultiCentered(lines, 24, 12, 15, 0);
  display.present();

  await tpause(250);
}

/**
 * SilentTitle: Brief title screen redux
 */
async function silentTitle(display, text) {
  display.clearPage(0);
  drawSplashBackground(display, 0);
  display.copy1to2();
  display.activePage = 0;
  display.present();

  await tpause(20);

  text.drawCentered('PRINCE OF PERSIA', 70, 15, 0);
  for (let x = 140; x < 420; x++) {
    display.setPixel(x, 64, 9, 0);
    display.setPixel(x, 86, 9, 0);
  }
  display.present();

  await tpause(160);
}

// =========================================================================
//  Background drawing helpers
// =========================================================================

/**
 * Draw a placeholder splash background (representing the packed DHires
 * splash screen from disk tracks 22-28 that we don't have).
 *
 * Creates a dark atmospheric background similar to the original.
 */
function drawSplashBackground(display, page) {
  // Dark gradient background
  for (let y = 0; y < display.HEIGHT; y++) {
    for (let x = 0; x < display.WIDTH; x++) {
      // Dark reddish-brown gradient to suggest the palace
      const intensity = Math.floor(y / display.HEIGHT * 3);
      let color;
      if (intensity === 0) color = 0;       // black at top
      else if (intensity === 1) color = 1;  // dark red
      else color = 0;                       // black at bottom
      display.setPixel(x, y, color, page);
    }
  }

  // Stars / dots in the dark sky (upper portion)
  const starSeed = 42;
  let rng = starSeed;
  for (let i = 0; i < 30; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7FFFFFFF;
    const sx = rng % display.WIDTH;
    rng = (rng * 1103515245 + 12345) & 0x7FFFFFFF;
    const sy = rng % 60;
    display.setPixel(sx, sy, 15, page);
  }
}
