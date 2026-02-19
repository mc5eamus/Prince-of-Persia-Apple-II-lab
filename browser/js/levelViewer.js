/**
 * levelViewer.js — Entry point for the level viewer page.
 *
 * Loads a level file, renders rooms, allows navigation.
 */

import { Display } from './display.js';
import { TextRenderer } from './text.js';
import { RoomView } from './roomView.js';
import { loadImageTable } from './imageLoader.js';
import { getChtab4Name } from './charRenderer.js';
import { SEQ, SEQ_NAMES } from './seqtable.js';

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
  const chtabCache = {}; // keyed by filename
  let sharedChtabs = null; // [CHTAB1, CHTAB2, CHTAB3, null, CHTAB5]

  async function loadSharedChtabs() {
    if (sharedChtabs) return sharedChtabs;
    const base = '../01 POP Source/Images/';
    const [ch1, ch2, ch3, ch5] = await Promise.all([
      loadImageTable(base + 'IMG.CHTAB1'),
      loadImageTable(base + 'IMG.CHTAB2'),
      loadImageTable(base + 'IMG.CHTAB3'),
      loadImageTable(base + 'IMG.CHTAB5'),
    ]);
    sharedChtabs = [ch1, ch2, ch3, null, ch5]; // slot 3 = CHTAB4 per-level
    return sharedChtabs;
  }

  async function loadChtab4(levelNum) {
    const name = getChtab4Name(levelNum);
    if (!chtabCache[name]) {
      const base = '../01 POP Source/Images/';
      chtabCache[name] = await loadImageTable(base + name);
    }
    return chtabCache[name];
  }

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
      const [bgTables, chtabs, chtab4] = await Promise.all([
        loadBgTables(num),
        loadSharedChtabs(),
        loadChtab4(num),
      ]);
      // Build chtables array: [CHTAB1, CHTAB2, CHTAB3, CHTAB4.*, CHTAB5]
      const chtables = [...chtabs];
      chtables[3] = chtab4;

      viewer.bgTables = bgTables;
      viewer.chtables = chtables;
      viewer.levelNum = num; // ensure levelNum is set before loadLevel
      await viewer.loadLevel(num);
      updateRoomSelect();
      viewer.startAnimation();

      // Auto-enter play mode if not already in it
      if (!viewer.playMode) {
        viewer.togglePlayMode();
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) btnPlay.textContent = 'View (P)';
      }
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
    // In play mode, arrow keys go to player character — don't handle here
    if (viewer.playMode) {
      // Only handle non-gameplay keys in play mode
      switch (e.key) {
        case 'm':
        case 'M':
          viewer.toggleMap();
          break;
        case 'p':
        case 'P':
          viewer.togglePlayMode();
          break;
        case ' ':
          viewer.togglePause();
          e.preventDefault();
          break;
        case 'Escape':
          viewer.togglePlayMode();
          break;
      }
      return;
    }

    // View mode: arrow keys navigate rooms
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
      case ' ':
        viewer.togglePause();
        e.preventDefault();
        break;
      case 'n':
      case 'N':
        viewer.stepFrame();
        break;
      case 'r':
      case 'R':
        viewer.resetSequence();
        break;
      case 'p':
      case 'P':
        viewer.togglePlayMode();
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

  // ── Populate sequence selector ──
  const seqSelect = document.getElementById('seq-select');

  // Group sequences by category for easier navigation
  const SEQ_GROUPS = {
    'Movement': [1, 2, 84, 13, 43, 5, 6, 80, 87, 77],
    'Steps': [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 72, 44],
    'Jump': [3, 4, 14, 28, 48],
    'Fall': [7, 19, 12, 45, 46, 47, 17, 20, 22, 53],
    'Hang/Climb': [8, 24, 16, 9, 25, 10, 68, 73, 11, 23, 15],
    'Crouch/Roll': [50, 49, 26, 27, 79],
    'Sword': [55, 90, 56, 86, 57, 58, 75, 76, 67, 62, 63, 69, 66, 61, 59, 60],
    'Sword Hit': [74, 85, 64, 65],
    'Death': [71, 51, 54, 52, 22],
    'Special': [91, 92, 93, 78, 70, 88, 89],
    'Fall/Fight': [81, 82, 83, 18, 21],
  };

  // "Default" option
  const defOpt = document.createElement('option');
  defOpt.value = 0;
  defOpt.textContent = '(level default)';
  seqSelect.appendChild(defOpt);

  for (const [group, nums] of Object.entries(SEQ_GROUPS)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    for (const num of nums) {
      const name = SEQ_NAMES[num] || `seq${num}`;
      const opt = document.createElement('option');
      opt.value = num;
      opt.textContent = `${num}: ${name}`;
      optgroup.appendChild(opt);
    }
    seqSelect.appendChild(optgroup);
  }

  seqSelect.addEventListener('change', () => {
    viewer.playSequence(parseInt(seqSelect.value));
  });

  // ── Animation control buttons ──
  document.getElementById('btn-pause').addEventListener('click', () => {
    viewer.togglePause();
  });

  document.getElementById('btn-step').addEventListener('click', () => {
    viewer.stepFrame();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    viewer.resetSequence();
  });

  // ── Phase 6: Play mode button ──
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      viewer.togglePlayMode();
      btnPlay.textContent = viewer.playMode ? 'View (P)' : 'Play (P)';
    });
  }

  // Room select update callback
  viewer._onRoomChange = (roomIdx) => {
    updateRoomSelect();
  };

  // Level progression callback — reload assets and advance
  viewer._onLevelChange = async (targetLevel, origStrength, hadSword) => {
    try {
      const [bgTables, chtabs, chtab4] = await Promise.all([
        loadBgTables(targetLevel),
        loadSharedChtabs(),
        loadChtab4(targetLevel),
      ]);
      const chtables = [...chtabs];
      chtables[3] = chtab4;

      viewer.bgTables = bgTables;
      viewer.chtables = chtables;
      viewer.levelNum = targetLevel;
      await viewer.loadLevel(targetLevel);

      // Apply preserved state after level loaded
      viewer._doAdvanceLevel(targetLevel, origStrength, hadSword);

      updateRoomSelect();
      levelSelect.value = String(targetLevel);
    } catch (err) {
      console.error(`Failed to advance to level ${targetLevel}:`, err);
    }
  };

  // ── Load level 1 by default ──
  levelSelect.value = '1';
  await changeLevel(1);
}

main().catch(err => {
  console.error('Level viewer failed:', err);
});
