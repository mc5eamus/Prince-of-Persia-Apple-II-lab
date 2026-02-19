/**
 * roomView.js — Room-level view controller.
 *
 * Handles loading levels, drawing rooms, and navigating between them.
 * Integrates the Phase 5 animation engine: character state + sequence interpreter.
 */

import { loadLevel, getKidStartPosition, TILE, TILE_NAMES } from './level.js';
import { drawRoom, drawFrontPieces, drawLevelMap } from './bgRenderer.js';
import { drawCharFrame, cropChar, KID_COLOR, getGuardColor } from './charRenderer.js';
import { createKid, createGuard, jumpSeq, applyGravity, addFall } from './charState.js';
import { animTick, animChar } from './seqInterpreter.js';
import { SEQ, SEQ_NAMES } from './seqtable.js';

// ── Phase 6: Play mode imports ──
import { initInput, readInput, clrjstk } from './input.js';
import { playerCtrl } from './playerCtrl.js';
import { checkFloor } from './floorCheck.js';
import { cutcheck, createCutState } from './roomTransition.js';
import { rereadblocks } from './positionMath.js';

// ── Phase 6B: Movers, traps, health ──
import { createHealthState, decstr, addstr, boostmeter, chgmeters, isAlive, INIT_MAX_STR } from './health.js';
import {
  createMoverState, initMovers, animtrans, animmobs, addslicers,
  checkpress, checkspikes, checkimpale, checkslice, shakeloose,
} from './mover.js';

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
    this.chtables = null; // [CHTAB1, CHTAB2, CHTAB3, CHTAB4.*, CHTAB5]
    this.flameFrame = 0;
    this._animTimer = null;

    // ── Phase 5: Animation state ──
    this.kidState = null;      // CharState for the kid
    this.guardState = null;    // CharState for the guard in current room
    this.animPaused = false;   // Pause toggle
    this.activeSeqNum = 0;     // Currently selected sequence (0 = level default)
    this.frameCount = 0;       // Animation frame counter

    // ── Phase 6: Play mode state ──
    this.playMode = false;     // true = keyboard controls, false = sequence viewer
    this.inputState = null;    // Keyboard input state
    this.cutState = null;      // Room transition cooldown state
    this._onRoomChange = null; // Callback when room changes

    // ── Phase 6B: Mover & health state ──
    this.moverState = null;    // TROB/MOB lists
    this.healthState = null;   // Kid HP tracking

    // ── Death restart state ──
    this.deathTimer = -1;      // -1 = alive, 0+ = frames since death

    // ── Pickup & potion state ──
    this.lastpotion = 0;       // Potion type from last pickup (-1=sword, 0=none, 1–5=potion types)
    this.weightless = 0;       // Frames remaining of weightless effect
    this.gotsword = false;     // Whether kid has picked up the sword
    this.lightning = 0;        // Frames of lightning flash remaining
    this.lightColor = 0;       // Color index for lightning flash

    // ── Level progression state ──
    this.nextLevel = -1;       // -1 = no pending transition, 0+ = target level number
    this._onLevelChange = null; // Callback when level advances (for external UI updates)
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

    // ── Phase 5: Initialize character states ──
    this.kidState = createKid(this.level, levelNum);
    // Run first animChar tick to get the initial frame
    animTick(this.kidState);
    this.initGuardState();
    this.frameCount = 0;
    this.activeSeqNum = 0;

    // Draw
    this.draw();
  }

  /**
   * Initialize guard state for the current room.
   * @private
   */
  initGuardState() {
    this.guardState = createGuard(this.level, this.currentRoom, this.levelNum);
    if (this.guardState) {
      if (!animTick(this.guardState)) {
        this.guardState._seqDone = true;
      }
    }
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
      this.initGuardState();
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
      this.initGuardState();
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
   * Start animation loop (~12 FPS, matching Apple II frame rate).
   * Drives both torch flames and character sequence playback.
   * In play mode, runs the full DoKid pipeline with input/physics.
   */
  startAnimation() {
    if (this._animTimer) return;
    this._animTimer = setInterval(() => {
      this.flameFrame = (this.flameFrame + 1) % 18;

      // ── Phase 6: Play mode — full DoKid pipeline ──
      if (this.playMode && !this.animPaused) {
        this.gameTick();
      }
      // ── Phase 5: Passive animation (sequence viewer) ──
      else if (!this.animPaused) {
        if (this.kidState && !this.kidState._seqDone) {
          if (!animTick(this.kidState)) {
            this.kidState._seqDone = true;
          }
          this.frameCount++;
        }
        if (this.guardState && !this.guardState._seqDone) {
          if (!animTick(this.guardState)) {
            this.guardState._seqDone = true;
          }
        }
      }

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

  // ── Phase 6: Play mode ──────────────────────────────────────────────────

  /**
   * Toggle between play mode (keyboard controls) and view mode (sequence viewer).
   */
  togglePlayMode() {
    this.playMode = !this.playMode;

    if (this.playMode) {
      // Initialize input if not already done
      if (!this.inputState) {
        this.inputState = initInput(document);
      }
      if (!this.cutState) {
        this.cutState = createCutState();
      }

      // Reset kid to standing at start position
      if (this.level) {
        this.kidState = createKid(this.level, this.levelNum);
        animChar(this.kidState, {});  // advance to first frame
        this.kidState._seqDone = false;
        this.currentRoom = this.kidState.charScrn;
        this.initGuardState();
        this.cutState.cooldown = 0;

        // Initialize movers and health
        this.moverState = createMoverState();
        initMovers(this.moverState, this.level, this.currentRoom);
        this.healthState = createHealthState(INIT_MAX_STR);
      }
    }

    this.draw();
  }

  /**
   * Run one frame of the DoKid pipeline (play mode).
   *
   * Order matches the Apple II TOPCTRL.S execution:
   *   0. ANIMMOBS + ANIMTRANS (movers — before player)
   *   1. Read input + CLRJSTK
   *   2. rereadblocks (pre)
   *   3. PLAYERCTRL (GenCtrl state machine)
   *   4. ANIMCHAR (sequence interpreter — 1 frame)
   *   5. GRAVITY
   *   6. ADDFALL
   *   7. rereadblocks (post)
   *   8. CHECKFLOOR
   *   9. CHECKPRESS + CHECKSPIKES + CHECKIMPALE + CHECKSLICE + SHAKELOOSE
   *  10. CUTCHECK (room transitions)
   *  11. CHGMETERS (health)
   */
  gameTick() {
    const kid = this.kidState;
    if (!kid || !this.level) return;

    // ── Death restart timer ──
    if (this.deathTimer >= 0) {
      this.deathTimer++;
      // Continue animating to show death sequence
      if (!kid._seqDone) {
        kid._seqDone = !animChar(kid, {});
      }
      // Decay screen shake even while dead
      const mv = this.moverState;
      if (mv && mv.shakeScreen > 0) mv.shakeScreen--;
      if (this.deathTimer >= 90) {
        this.restartLevel();
      }
      return;
    }

    // Start death timer as soon as kid is dead
    if (kid.charLife >= 0) {
      this.deathTimer = 0;
      return;
    }

    const inp = this.inputState;
    const level = this.level;
    const mv = this.moverState;

    // 0. Animate movers (gates, spikes, slicers, loose floors) BEFORE player
    if (mv) {
      animmobs(mv, level, this.currentRoom);
      animtrans(mv, level, this.currentRoom);
    }

    // 1. Read input
    readInput(inp);
    clrjstk(inp);

    // 2. Pre-rereadblocks
    rereadblocks(kid);

    // 3. Player control (GenCtrl state machine)
    playerCtrl(kid, {
      level,
      input: inp,
      setLastPotion: (v) => { this.lastpotion = v; },
    });

    // 4. Animate one frame
    kid._seqDone = !animChar(kid, {
      onEffect: (char, fx) => { if (fx === 1) this.potionEffect(); },
      onNextLevel: () => { this.nextLevel = this.levelNum + 1; },
      weightless: this.weightless > 0,
    });

    // 5. Gravity (skip if weightless)
    applyGravity(kid, this.weightless > 0);

    // 6. Apply fall
    addFall(kid);

    // 7. Post-rereadblocks
    rereadblocks(kid);

    // 8. Floor check (pass health context for medium-landing HP loss)
    const hp = this.healthState;
    const healthCtx = hp ? {
      decstr: (amount) => decstr(hp, amount),
    } : null;
    checkFloor(kid, { level, input: inp, health: healthCtx });

    // 9. Collision checks (pressure plates, spikes, slicers, loose floors)
    if (mv && kid.charLife < 0) {
      // Check pressure plates
      checkpress(kid, mv, level);

      // Trigger spikes under kid
      checkspikes(kid, mv, level);

      // Check spike impalement
      if (checkimpale(kid, level)) {
        // Impaled! Kill the kid
        if (this.healthState) {
          const dead = decstr(this.healthState, 100);
          if (dead) {
            kid.charLife = 0;
            kid.alive = false;
          }
        }
      }

      // Check slicer
      if (checkslice(kid, level)) {
        // Sliced! Kill the kid
        if (this.healthState) {
          const dead = decstr(this.healthState, 100);
          if (dead) {
            kid.charLife = 0;
            kid.alive = false;
          }
        }
      }

      // Shake loose floors under kid
      shakeloose(kid, mv, level);
    }

    // 10. Room transitions
    const result = cutcheck(kid, level, this.cutState);
    if (result.cut) {
      this.currentRoom = result.newRoom;
      this.initGuardState();
      // Add slicers for the new room
      if (mv) addslicers(mv, level, this.currentRoom);
      if (this._onRoomChange) this._onRoomChange(this.currentRoom);
    }

    // Handle falling off screen — start death restart
    if (result.fellOff) {
      kid.charLife = 0;
      kid.alive = false;
      this.deathTimer = 0;
    }

    // 11. Apply health changes
    if (this.healthState) {
      if (chgmeters(this.healthState)) {
        kid.charLife = 0;
        kid.alive = false;
      }
    }

    // Decay weightless timer
    if (this.weightless > 0) this.weightless--;

    // Decay screen shake
    if (mv && mv.shakeScreen > 0) mv.shakeScreen--;

    this.frameCount++;

    // Guard passive animation (no AI yet)
    if (this.guardState && !this.guardState._seqDone) {
      if (!animTick(this.guardState)) {
        this.guardState._seqDone = true;
      }
    }

    // 12. Level progression check
    if (this.nextLevel >= 0) {
      this.advanceLevel(this.nextLevel);
    }
  }

  /**
   * Apply potion effect when drinkpotion/pickupsword animation triggers `effect 1`.
   *
   * Ported from MISC.S POTIONEFFECT.
   * Dispatches on this.lastpotion:
   *  -1 = sword (set gotsword, white flash),
   *   0 = nothing,
   *   1 = heal (+1 HP, orange flash),
   *   2 = boost (+1 max HP, orange flash),
   *   3 = weightless (200 frames),
   *   4 = invert (deferred),
   *   5 = poison (-1 HP)
   */
  potionEffect() {
    const lp = this.lastpotion;
    if (lp === 0) return;

    const hp = this.healthState;

    if (lp < 0) {
      // Sword (-1)
      this.gotsword = true;
      this.lightColor = 0xF; // white
      this.lightning = 3;
      return;
    }

    switch (lp) {
      case 1: // Recharge (heal 1 HP)
        if (hp && hp.kidStr < hp.maxStr) {
          addstr(hp);
          this.lightColor = 0x9; // orange
          this.lightning = 2;
        }
        break;

      case 2: // Boost (increase max HP by 1)
        if (hp) {
          boostmeter(hp);
          this.lightColor = 0x9; // orange
          this.lightning = 5;
        }
        break;

      case 3: // Weightless (200 frames)
        this.weightless = 200;
        break;

      case 4: // Invert/flip (deferred — needs display inversion support)
        break;

      case 5: // Poison (-1 HP)
        if (hp) {
          decstr(hp, 1);
        }
        break;
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

    // Apply screen shake offset before presenting
    if (this.playMode && this.moverState && this.moverState.shakeScreen > 0) {
      this.display.shakeY = (this.moverState.shakeScreen & 1) ? 2 : -2;
    } else {
      this.display.shakeY = 0;
    }

    // Lightning flash (potion/sword pickup effect)
    if (this.lightning > 0) {
      this.display.pages[page].fill(this.lightColor & 0x0F);
      this.lightning--;
    }

    this.display.present();
  }

  /** @private */
  drawRoomView(page) {
    const isPalace = LEVEL_TILESET[this.levelNum] > 0;

    const roomOpts = {
      page,
      palace: isPalace,
      bgTables: this.bgTables,
      flameFrame: this.flameFrame,
    };

    // ── Layer 1: Background (back) — tiles without front pieces ──
    drawRoom(this.display, this.level, this.currentRoom, {
      ...roomOpts,
      skipFront: true,
    });

    // ── Layer 2: Mid — character sprites ──
    this.drawCharacters(page);

    // ── Layer 3: Foreground — front pieces drawn on top ──
    drawFrontPieces(this.display, this.level, this.currentRoom, roomOpts);

    // HUD: Level and room info
    const room = this.level.rooms[this.currentRoom];
    const modeTag = this.playMode ? 'PLAY' : 'VIEW';
    const info = `${modeTag}  LEVEL ${this.levelNum}  ROOM ${this.currentRoom}`;
    this.text.drawText(info, 4, 4, 15, page);

    // HUD: Health display (play mode only)
    if (this.playMode && this.healthState) {
      const hp = this.healthState;
      const hpStr = 'HP:' + '!'.repeat(hp.kidStr) + '.'.repeat(Math.max(0, hp.maxStr - hp.kidStr));
      const hpColor = hp.flash > 0 ? 1 : 4; // flash red on damage, else dark red
      this.text.drawText(hpStr, 4, 186, hpColor, page);
    }

    // Animation info (Phase 5)
    if (this.kidState && this.kidState.charScrn === this.currentRoom) {
      const seqName = this.activeSeqNum > 0
        ? (SEQ_NAMES[this.activeSeqNum] || `SEQ${this.activeSeqNum}`)
        : 'DEFAULT';
      const frameInfo = `F${this.kidState.charPosn} SEQ:${seqName}`;
      this.text.drawText(frameInfo, 250, 186, 14, page);
    }

    // Navigation hints (view mode only — play mode shows HP here instead)
    if (!this.playMode) {
      const arrows = [];
      if (room.left > 0)  arrows.push(`L${room.left}`);
      if (room.right > 0) arrows.push(`R${room.right}`);
      if (room.up > 0)    arrows.push(`U${room.up}`);
      if (room.down > 0)  arrows.push(`D${room.down}`);
      if (arrows.length > 0) {
        this.text.drawText(arrows.join(' '), 4, 186, 10, page);
      }
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
  }

  /**
   * Draw all characters in the current room using animated state.
   * @private
   */
  drawCharacters(page) {
    if (!this.chtables) return;

    // ── Kid ──
    if (this.kidState && this.kidState.charScrn === this.currentRoom) {
      const k = this.kidState;
      if (k.charPosn > 0) {
        const kidCrop = cropChar(
          this.level, this.currentRoom,
          k.charX, k.charY,
          k.charFace, k.charPosn, k.charId, this.chtables
        );
        drawCharFrame(
          this.display,
          this.chtables,
          k.charX,
          k.charY,
          k.charFace,
          k.charPosn,
          k.charId,
          KID_COLOR,
          kidCrop,
          page,
          k.charSword
        );
      }
    }

    // ── Guard ──
    if (this.guardState) {
      const g = this.guardState;
      if (g.charPosn > 0) {
        const guardColor = getGuardColor(this.levelNum);
        const guardCrop = cropChar(
          this.level, this.currentRoom,
          g.charX, g.charY,
          g.charFace, g.charPosn, g.charId, this.chtables
        );
        drawCharFrame(
          this.display,
          this.chtables,
          g.charX,
          g.charY,
          g.charFace,
          g.charPosn,
          g.charId,
          guardColor,
          guardCrop,
          page,
          g.charSword
        );
      }
    }
  }

  /** @private */
  drawMapView(page) {
    this.text.drawText(`LEVEL ${this.levelNum} MAP`, 4, 4, 15, page);
    this.text.drawText('CLICK ROOM OR PRESS M', 4, 186, 10, page);

    drawLevelMap(this.display, this.level, page);
  }

  // ── Phase 5: Animation control methods ──

  /**
   * Play a specific sequence on the kid.
   * Resets kid to start position and begins the sequence.
   *
   * @param {number} seqNum  1-based sequence number (0 = reset to level default)
   */
  playSequence(seqNum) {
    if (!this.level || !this.kidState) return;

    this.activeSeqNum = seqNum;
    this.frameCount = 0;

    // Reset kid to start position
    const kidStart = getKidStartPosition(this.level);
    this.kidState.charX      = kidStart.x;
    this.kidState.charY      = kidStart.y;
    this.kidState.charFace   = kidStart.face;
    this.kidState.charBlockX = kidStart.col;
    this.kidState.charBlockY = kidStart.row;
    this.kidState.charScrn   = kidStart.room;
    this.kidState.charAction = 0;
    this.kidState.charXVel   = 0;
    this.kidState.charYVel   = 0;
    this.kidState.charLife   = -1;
    this.kidState.charRepeat = 0;

    if (seqNum > 0) {
      jumpSeq(this.kidState, seqNum);
    } else {
      // Default sequence for this level
      jumpSeq(this.kidState, SEQ.stand);
    }

    // Advance to first frame
    this.kidState._seqDone = false;
    animTick(this.kidState);

    // Make sure we're viewing the kid's room
    this.currentRoom = this.kidState.charScrn;
    this.initGuardState();
    this.animPaused = false;
    this.draw();
  }

  /**
   * Toggle pause/resume of character animation.
   */
  togglePause() {
    this.animPaused = !this.animPaused;
  }

  /**
   * Advance one frame while paused.
   */
  stepFrame() {
    if (!this.kidState) return;
    if (this.kidState.charScrn === this.currentRoom) {
      animTick(this.kidState);
      this.frameCount++;
    }
    if (this.guardState) {
      animTick(this.guardState);
    }
    this.draw();
  }

  /**
   * Reset current sequence to beginning.
   */
  resetSequence() {
    this.playSequence(this.activeSeqNum);
  }

  /**
   * Advance to the next level.
   *
   * Preserves HP (maxStr carries over as origStrength, matching TOPCTRL.S).
   * gotsword persists (except reset on level 1).
   * Everything else resets.
   *
   * @param {number} targetLevel  Level number to advance to
   */
  advanceLevel(targetLevel) {
    // Save state that persists across levels
    const origStrength = this.healthState ? this.healthState.maxStr : INIT_MAX_STR;
    const hadSword = this.gotsword;

    // Clear pending transition
    this.nextLevel = -1;

    // Cap at level 14 (game won)
    if (targetLevel > 14) {
      // Show win message for now (final cutscene is Phase 7)
      this.display.blackout();
      this.text.drawCentered('YOU HAVE COMPLETED', 70, 15, 0);
      this.text.drawCentered('PRINCE OF PERSIA', 90, 15, 0);
      this.display.present();
      this.playMode = false;
      return;
    }

    // Notify external UI (levelViewer) to handle asset loading
    if (this._onLevelChange) {
      this._onLevelChange(targetLevel, origStrength, hadSword);
      return;
    }

    // Fallback: direct level load (no asset reload)
    this._doAdvanceLevel(targetLevel, origStrength, hadSword);
  }

  /**
   * Internal: apply level advancement after assets are loaded.
   *
   * @param {number} targetLevel  Level number
   * @param {number} origStrength  Max HP to carry over
   * @param {boolean} hadSword    Whether kid had sword
   */
  _doAdvanceLevel(targetLevel, origStrength, hadSword) {
    // Reset kid to new level start position
    this.kidState = createKid(this.level, this.levelNum);
    animChar(this.kidState, {});
    this.kidState._seqDone = false;
    this.currentRoom = this.kidState.charScrn;

    // Reinitialize movers
    this.moverState = createMoverState();
    initMovers(this.moverState, this.level, this.currentRoom);

    // Restore health from origStrength (HP carries over)
    this.healthState = createHealthState(origStrength);

    // Restore gotsword (reset on level 1 — sword must be found there)
    this.gotsword = targetLevel === 1 ? false : hadSword;

    // Reset transient state
    this.deathTimer = -1;
    this.lastpotion = 0;
    this.weightless = 0;
    this.lightning = 0;
    if (this.cutState) this.cutState.cooldown = 0;

    this.initGuardState();
    if (this._onRoomChange) this._onRoomChange(this.currentRoom);
  }

  /**
   * Restart the current level after death.
   * Resets kid to start position, reinitializes movers and health.
   */
  restartLevel() {
    this.deathTimer = -1;

    // Reset kid to start position
    this.kidState = createKid(this.level, this.levelNum);
    animChar(this.kidState, {});
    this.kidState._seqDone = false;
    this.currentRoom = this.kidState.charScrn;

    // Reinitialize movers (gates/traps back to initial state)
    this.moverState = createMoverState();
    initMovers(this.moverState, this.level, this.currentRoom);

    // Reset health
    this.healthState = createHealthState(INIT_MAX_STR);

    // Reset pickup/potion state
    this.lastpotion = 0;
    this.weightless = 0;
    this.lightning = 0;
    // Note: gotsword persists across restarts (once you have the sword, you keep it)

    // Reset room transition cooldown
    if (this.cutState) this.cutState.cooldown = 0;

    this.initGuardState();
    if (this._onRoomChange) this._onRoomChange(this.currentRoom);
  }
}
