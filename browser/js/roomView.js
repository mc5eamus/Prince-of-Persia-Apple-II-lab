/**
 * roomView.js — Room-level view controller.
 *
 * Handles loading levels, drawing rooms, and navigating between them.
 */

import { loadLevel, getKidStartPosition, TILE, TILE_NAMES } from './level.js';
import { drawRoom, drawLevelMap } from './bgRenderer.js';

// Level-to-tileset mapping (from MISC.S bgset[])
// 0 = Dungeon, 1 = Palace, 2 = Palace variant
const LEVEL_TILESET = [
  0,  // Level 0: Dungeon
  0,  // Level 1: Dungeon
  0,  // Level 2: Dungeon
  0,  // Level 3: Dungeon
  1,  // Level 4: Palace
  1,  // Level 5: Palace
  1,  // Level 6: Palace
  2,  // Level 7: Palace variant
  2,  // Level 8: Palace variant
  2,  // Level 9: Palace variant
  1,  // Level 10: Palace
  1,  // Level 11: Palace
  2,  // Level 12: Palace variant
  2,  // Level 13: Palace variant
  1,  // Level 14: Palace (final)
];

/**
 * Interactive level viewer.
 */
export class RoomView {
  /**
   * @param {import('./display.js').Display} display
   * @param {import('./text.js').TextRenderer} textRenderer
   */
  constructor(display, textRenderer) {
    this.display = display;
    this.text = textRenderer;
    this.level = null;
    this.levelNum = 0;
    this.currentRoom = 1;
    this.showMap = false;
    this.bgTables = null;
    this.flameFrame = 0;
    this._animTimer = null;
  }

  /**
   * Load a level and draw its starting room.
   *
   * @param {number} levelNum  Level number (0–14)
   */
  async loadLevel(levelNum) {
    this.levelNum = levelNum;

    const url = `../01 POP Source/Levels/LEVEL${levelNum}`;
    this.level = await loadLevel(url);

    // Determine starting room
    const kidStart = getKidStartPosition(this.level);
    this.currentRoom = kidStart?.room || 1;

    // Draw
    this.draw();
  }

  /**
   * Navigate to an adjacent room.
   *
   * @param {'left'|'right'|'up'|'down'} direction
   */
  navigate(direction) {
    if (!this.level || this.showMap) return;

    const room = this.level.rooms[this.currentRoom];
    if (!room) return;

    const target = room[direction];
    if (target > 0 && target <= 24 && this.level.rooms[target]) {
      this.currentRoom = target;
      this.draw();
    }
  }

  /**
   * Jump directly to a room number.
   *
   * @param {number} roomIdx
   */
  goToRoom(roomIdx) {
    if (!this.level) return;
    if (roomIdx > 0 && roomIdx <= 24 && this.level.rooms[roomIdx]) {
      this.currentRoom = roomIdx;
      this.showMap = false;
      this.draw();
    }
  }

  /**
   * Toggle the level map overview.
   */
  toggleMap() {
    this.showMap = !this.showMap;
    if (this.showMap) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
    this.draw();
  }

  /**
   * Start torch flame animation (~12 FPS, matching Apple II frame rate).
   */
  startAnimation() {
    if (this._animTimer) return;
    this._animTimer = setInterval(() => {
      this.flameFrame = (this.flameFrame + 1) % 18;
      if (!this.showMap) this.draw();
    }, 83); // ~12 FPS
  }

  /**
   * Stop animation loop.
   */
  stopAnimation() {
    if (this._animTimer) {
      clearInterval(this._animTimer);
      this._animTimer = null;
    }
  }

  /**
   * Draw current view.
   */
  draw() {
    // Draw everything on page 0, which is the active page
    const page = 0;
    this.display.activePage = 0;

    // Clear
    this.display.clearPage(page);

    if (this.showMap) {
      this.drawMapView(page);
    } else {
      this.drawRoomView(page);
    }

    this.display.present();
  }

  /** @private */
  drawRoomView(page) {
    const isPalace = LEVEL_TILESET[this.levelNum] > 0;

    drawRoom(this.display, this.level, this.currentRoom, {
      page,
      palace: isPalace,
      bgTables: this.bgTables,
      flameFrame: this.flameFrame,
    });

    // HUD: Level and room info
    const room = this.level.rooms[this.currentRoom];
    const info = `LEVEL ${this.levelNum}  ROOM ${this.currentRoom}`;
    this.text.drawText(info, 4, 4, 15, page);

    // Navigation hints
    const arrows = [];
    if (room.left > 0)  arrows.push(`L${room.left}`);
    if (room.right > 0) arrows.push(`R${room.right}`);
    if (room.up > 0)    arrows.push(`U${room.up}`);
    if (room.down > 0)  arrows.push(`D${room.down}`);
    if (arrows.length > 0) {
      this.text.drawText(arrows.join(' '), 4, 186, 10, page);
    }

    // Tile legend for this room
    const uniqueTiles = new Set();
    for (const t of room.tiles) {
      if (t.id !== TILE.space) uniqueTiles.add(t.id);
    }
    if (uniqueTiles.size > 0 && uniqueTiles.size <= 8) {
      const names = [...uniqueTiles].map(id => TILE_NAMES[id] || `?${id}`).join(', ');
      this.text.drawText(names, 250, 4, 5, page);
    }

    // Mark kid start if this room
    const kidStart = getKidStartPosition(this.level);
    if (kidStart && kidStart.room === this.currentRoom) {
      // Draw a small marker at kid start position
      // kidStart has {screen, x, y, face} - x is in SHires coords (58-based)
      const kx = kidStart.x * 2; // convert to DHires
      const ky = kidStart.y;
      // Small cross
      for (let d = -3; d <= 3; d++) {
        this.display.setPixel(kx + d, ky, 12, page);
        this.display.setPixel(kx, ky + d, 12, page);
      }
    }
  }

  /** @private */
  drawMapView(page) {
    this.text.drawText(`LEVEL ${this.levelNum} MAP`, 4, 4, 15, page);
    this.text.drawText('CLICK ROOM OR PRESS M', 4, 186, 10, page);

    drawLevelMap(this.display, this.level, page);
  }
}
