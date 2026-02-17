/**
 * levelViewer.js — Entry point for the level viewer page.
 *
 * Loads a level file, renders rooms, allows navigation.
 */

import { Display } from './display.js';
import { TextRenderer } from './text.js';
import { RoomView } from './roomView.js';
import { loadImageTable } from './imageLoader.js';

async function main() {
  const canvas = document.getElementById('game-canvas');
  const display = new Display(canvas);
  const text = new TextRenderer(display);

  // Show loading message
  display.blackout();
  text.drawCentered('LEVEL VIEWER', 80, 15, 0);
  text.drawCentered('LOADING...', 100, 10, 0);
  display.present();

  const viewer = new RoomView(display, text);

  // ── Populate level selector ──
  const levelSelect = document.getElementById('level-select');
  for (let i = 0; i <= 14; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Level ${i}`;
    levelSelect.appendChild(opt);
  }

  // ── Populate room selector (updated when level changes) ──
  const roomSelect = document.getElementById('room-select');

  function updateRoomSelect() {
    roomSelect.innerHTML = '';
    if (!viewer.level) return;
    for (let r = 1; r <= 24; r++) {
      if (viewer.level.rooms[r]) {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = `Room ${r}`;
        if (r === viewer.currentRoom) opt.selected = true;
        roomSelect.appendChild(opt);
      }
    }
  }

  // ── BG image table cache ──
  // Level tileset: 0=Dungeon, 1/2=Palace
  const LEVEL_TILESET = [0,0,0,0,1,1,1,2,2,2,1,1,2,2,1];
  const bgCache = {}; // keyed by 'DUN' or 'PAL'

  async function loadBgTables(levelNum) {
    const tset = LEVEL_TILESET[levelNum] || 0;
    const suffix = tset === 0 ? 'DUN' : 'PAL';
    if (!bgCache[suffix]) {
      const base = '../01 POP Source/Images/';
      const [bg1, bg2] = await Promise.all([
        loadImageTable(base + 'IMG.BGTAB1.' + suffix),
        loadImageTable(base + 'IMG.BGTAB2.' + suffix),
      ]);
      bgCache[suffix] = { bgtable1: bg1, bgtable2: bg2 };
    }
    return bgCache[suffix];
  }

  // ── Level change ──
  async function changeLevel(num) {
    viewer.stopAnimation();
    display.blackout();
    text.drawCentered(`LOADING LEVEL ${num}...`, 90, 10, 0);
    display.present();

    try {
      const bgTables = await loadBgTables(num);
      viewer.bgTables = bgTables;
      await viewer.loadLevel(num);
      updateRoomSelect();
      viewer.startAnimation();
    } catch (err) {
      console.error(`Failed to load level ${num}:`, err);
      display.blackout();
      text.drawCentered(`FAILED TO LOAD LEVEL ${num}`, 80, 1, 0);
      text.drawCentered(err.message, 100, 5, 0);
      display.present();
    }
  }

  levelSelect.addEventListener('change', () => {
    changeLevel(parseInt(levelSelect.value));
  });

  roomSelect.addEventListener('change', () => {
    viewer.goToRoom(parseInt(roomSelect.value));
  });

  document.getElementById('btn-map').addEventListener('click', () => {
    viewer.toggleMap();
  });

  // ── Keyboard navigation ──
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        viewer.navigate('left');
        updateRoomSelect();
        e.preventDefault();
        break;
      case 'ArrowRight':
        viewer.navigate('right');
        updateRoomSelect();
        e.preventDefault();
        break;
      case 'ArrowUp':
        viewer.navigate('up');
        updateRoomSelect();
        e.preventDefault();
        break;
      case 'ArrowDown':
        viewer.navigate('down');
        updateRoomSelect();
        e.preventDefault();
        break;
      case 'm':
      case 'M':
        viewer.toggleMap();
        break;
      default:
        // Number keys to jump to room
        if (e.key >= '1' && e.key <= '9') {
          const r = parseInt(e.key);
          viewer.goToRoom(r);
          updateRoomSelect();
        }
        // Shift+number for rooms 10-19
        if (e.key === '!' || e.key === '@' || e.key === '#' ||
            e.key === '$' || e.key === '%') {
          const map = { '!': 11, '@': 12, '#': 13, '$': 14, '%': 15 };
          if (map[e.key]) {
            viewer.goToRoom(map[e.key]);
            updateRoomSelect();
          }
        }
        break;
    }
  });

  // ── Load level 1 by default ──
  levelSelect.value = '1';
  await changeLevel(1);
}

main().catch(err => {
  console.error('Level viewer failed:', err);
});
