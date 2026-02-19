/**
 * bgRenderer.js — Background tile renderer for dungeon/palace rooms.
 *
 * Recreates the rendering from BGDATA.S, FRAMEADV.S, and GAMEBG.S.
 *
 * Each tile occupies a 4-byte-wide (28-pixel) × 63-pixel-tall block.
 * A room is 10 columns × 3 rows = 280×189 pixels filling the full
 * 280-pixel SHires screen (560 DHires pixels at 2× horizontal).
 *
 * Each tile is composed of up to 4 image sections:
 *   A: Main body    — drawn at (BlockLeft, Ay + pieceay[id])
 *   B: Left-side    — drawn at (BlockLeft, Ay + pieceby[leftId])
 *                     (the B of the LEFT neighbor, drawn in this column)
 *   C: Below-floor  — drawn at (BlockLeft, BlockBot)
 *   D: Floor base   — drawn at (BlockLeft, BlockBot)
 * Plus optional front pieces (columns, gate fronts, etc.)
 *
 * Tile images come from bgtable1 and bgtable2 (IMG.BGTAB1.* / IMG.BGTAB2.*).
 * Image numbers with bit 7 set → bgtable2, bit 7 clear → bgtable1.
 */

import { TILE, TILE_NAMES, getTile } from './level.js';

// ─── Geometry constants (from TABLES.S) ─────────────────────────────────────

const BLOCK_WIDTH_PX = 28;  // 4 bytes × 7 pixels per byte
const BLOCK_HEIGHT   = 63;  // scanlines per tile row
const SCREEN_BOT     = 191;
const D_HEIGHT       = 3;   // floor piece thickness

// ─── BGDATA.S piece tables ──────────────────────────────────────────────────
// Indexed by tile type ID (0–29). Image numbers with bit 7 = bgtable2.

// A section: main body image
const piecea = [
  0x00,0x01,0x05,0x07,0x0a,0x01,0x01,0x0a,0x10,0x00,0x01,0x00,0x00,0x14,0x20,0x4b,
  0x01,0x00,0x00,0x01,0x00,0x97,0x00,0x01,0x00,0xa7,0xa9,0xaa,0xac,0xad
];
// A section Y offset (signed)
const pieceay = [
  0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-4,-4,-4
];
// A section AND-mask image
const maska = [
  0x00,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x00,0x03,0x03,0x00,0x03,0x03,0x03,
  0x03,0x00,0x00,0x03,0x00,0x03,0x00,0x03,0x00,0x03,0x00,0x00,0x00,0x00
];

// B section: left-side image (of the LEFT neighbor, drawn in this column)
const pieceb = [
  0x00,0x02,0x06,0x08,0x0b,0x1b,0x02,0x9e,0x1a,0x1c,0x02,0x00,0x9e,0x4a,0x21,0x1b,
  0x4d,0x4e,0x02,0x51,0x84,0x98,0x02,0x91,0x92,0x02,0x00,0x00,0x00,0x00
];
// B section Y offset (signed)
const pieceby = [
  0, 0, 0, 0, 0, 1, 0, 3, 0, 3, 0, 0, 3, 0, 0,-1,
  0, 0, 0,-1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0
];

// B section AND-mask image
const maskb = [
  0x00,0x04,0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x00,0x04,0x00,0x00,0x04,0x04,0x04,
  0x00,0x04,0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x04,0x00,0x00,0x00,0x00
];

// B section stripe (palace bg set only)
const bstripe = [
  0x00,0x47,0x47,0x00,0x00,0x47,0x47,0x00,0x00,0x00,0x47,0x47,0x00,0x00,0x47,0x47,
  0x00,0x00,0x47,0x00,0x00,0x00,0x47,0x00,0x00,0x47,0x00,0x00,0x00,0x00
];

// C section: below-floor
const piecec = [
  0x00,0x00,0x00,0x09,0x0c,0x00,0x00,0x9f,0x00,0x1d,0x00,0x00,0x9f,0x00,0x00,0x00,
  0x4f,0x50,0x00,0x00,0x85,0x00,0x00,0x93,0x94,0x00,0x00,0x00,0x00,0x00
];

// D section: floor surface
const pieced = [
  0x00,0x15,0x15,0x15,0x15,0x18,0x19,0x16,0x15,0x00,0x15,0x00,0x17,0x15,0x2e,0x4c,
  0x15,0x15,0x15,0x15,0x86,0x15,0x15,0x15,0x15,0x15,0xab,0x00,0x00,0x00
];

// Front piece: image, Y offset, X offset (in bytes)
const fronti = [
  0x00,0x00,0x00,0x45,0x46,0x00,0x00,0x46,0x48,0x49,0x87,0x00,0x46,0x0f,0x13,0x00,
  0x00,0x00,0x00,0x00,0x83,0x00,0x00,0x00,0x00,0xa8,0x00,0xae,0xae,0xae
];
const fronty = [
  0, 0, 0,-1, 0, 0, 0, 0,-1, 3,-3, 0, 0,-1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,-1, 0,-36,-36,-36
];
const frontx = [
  0x00,0x00,0x00,0x01,0x03,0x00,0x00,0x03,0x01,0x01,0x02,0x00,0x03,0x01,0x00,0x00,
  0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x00
];

// ─── Variant tables (indexed by tile state/spec) ────────────────────────────

// B-section variants for space tiles (indexed by spec 0–3)
const spaceb  = [0x00, 0xa3, 0xa5, 0xa6];
const spaceby = [0, -20, -20, 0];

// B-section variants for floor tiles (indexed by spec 0–3)
const floorb  = [0x02, 0xa2, 0xa4, 0xa4];
const floorby = [0, 0, 0, 0];

// Panel variants (indexed by spec)
const panelb  = [0x9e, 0x9a, 0x81];
const panelc_var = [0x9f, 0x9b, 0x82]; // renamed to avoid conflict with piecec
const NUMPANS = 3;

// Block variants (indexed by spec)
const blockb  = [0x84, 0x6f];
const blockc_var = [0x85, 0x85];
const blockd  = [0x86, 0x86];
const blockfr = [0x83, 0x83];
const NUMBLOX = 2;

// ─── Special piece tables ───────────────────────────────────────────────────

// Spike animation frames (indexed by spec value 0–9)
const spikea = [0x00,0x22,0x24,0x26,0x28,0x2a,0x28,0x24,0x22,0x00];
const spikeb = [0x00,0x23,0x25,0x27,0x29,0x2b,0x29,0x25,0x23,0x00];

// Gate animation: 8 column-segment images
const gate8c = [0x2f,0x30,0x31,0x32,0x33,0x34,0x35,0x36];
const gate8b = [0x3e,0x3d,0x3c,0x3b,0x3a,0x39,0x38,0x37];

// Gate special images
const gatebotSTA = 0x43;
const gatebotORA = 0x44;
const gateB1     = 0x37;
const gatecmask  = 0x0d;
const gmaxval    = 47 * 4;

// Slicer animation tables
const slicerseq  = [4, 3, 1, 2, 5, 4, 4];
const slicerRet  = 6;
const slicertop  = [0x00, 0x58, 0x5a, 0x5c, 0x5e];
const slicerbot  = [0x57, 0x59, 0x5b, 0x5d, 0x5f];
const slicerbot2 = [0x8e, 0x8f, 0x90, 0x5d, 0x5f]; // smeared
const slicergap  = [0, 56, 70, 83, 85]; // decimal from dfb
const slicerfrnt = [0x65, 0x66, 0x67, 0x68, 0x69];

// Loose floor tables
const looseb_img = 0x1b;
const loosea = [0x01, 0x1e, 0x01, 0x1f, 0x1f, 0x01, 0x01, 0x01, 0x1f, 0x1f, 0x1f];
const looseby = [0, 1, 0, -1, -1, 0, 0, 0, -1, -1, -1];
const loosed = [0x15, 0x2c, 0x15, 0x2d, 0x2d, 0x15, 0x15, 0x15, 0x2d, 0x2d, 0x2d];
const Ffalling = 10;

// Special constants
const specialflask = 0x95;
const swordgleam0  = 0x99;
const swordgleam1  = 0xb3;
const archpanel    = 0xa1;
const spikeExt     = 5;

// Exit images
const stairs   = 0x6b;
const door      = 0x6c;
const doormask  = 0x6d;
const toprepair = 0x6e;

// Torch flame animation (GAMEBG.S torchflame table — 18 entries, bgtable1 images)
const torchflame = [
  0x52,0x53,0x54,0x55,0x56,0x61,0x62,0x63,0x64,
  0x52,0x54,0x56,0x63,0x61,0x55,0x53,0x64,0x62
];
const TORCH_LAST = 17;

// ─── Coordinate helpers ─────────────────────────────────────────────────────

/**
 * Compute pixel coordinates for a tile block.
 * @param {number} col  0–9
 * @param {number} row  0–2
 */
function blockCoords(col, row) {
  // Source X in SHires pixels (room fills full screen: 10 × 28 = 280)
  const srcX = col * BLOCK_WIDTH_PX;

  // BlockBot from TABLES.S:
  //   row 0 (top):    191 - 2*63 = 65
  //   row 1 (middle): 191 - 1*63 = 128
  //   row 2 (bottom): 191 - 0*63 = 191
  const bb = SCREEN_BOT - (2 - row) * BLOCK_HEIGHT;
  const ay = bb - D_HEIGHT;

  return { srcX, blockBot: bb, ay, blockTop: bb - BLOCK_HEIGHT + 1 };
}

// ─── Low-level BG image drawing ─────────────────────────────────────────────

/**
 * Get an image from the appropriate bg table.
 * @param {number} imgNum   Image number (bit 7 = bgtable2)
 * @param {Object} bg1      bgtable1 parsed image table
 * @param {Object} bg2      bgtable2 parsed image table
 */
function getBgImage(imgNum, bg1, bg2) {
  if (imgNum === 0) return null;
  // Image numbers in the piece tables are 1-based (see HIRES.S setimage:
  // offset = IMAGE*2 - 1).  Our parsed images[] array is 0-based, so subtract 1.
  if (imgNum & 0x80) {
    const idx = (imgNum & 0x7F) - 1;
    return idx >= 0 ? (bg2?.images?.[idx] || null) : null;
  }
  const idx = imgNum - 1;
  return idx >= 0 ? (bg1?.images?.[idx] || null) : null;
}

/**
 * Draw a BG image onto the display.
 *
 * @param {import('./display.js').Display} display
 * @param {Object}  image   { width, height, data }
 * @param {number}  srcX    X in source pixels (SHires), doubled for DHires output
 * @param {number}  srcY    Y position — BOTTOM of image on screen (0–191)
 * @param {number}  page    Page index
 * @param {boolean} [ora]   True = transparent bg (ORA). False = overwrite (STA).
 * @param {number}  [color] Color for set pixels (0–15). Default 15.
 */
function drawBgImage(display, image, srcX, srcY, page, ora = true, color = 15) {
  if (!image) return;

  const { width: wBytes, height, data } = image;
  const topY = srcY - height + 1;

  for (let row = 0; row < height; row++) {
    // Apple II convention: data row 0 = bottom of image on screen
    const srcRow = height - 1 - row;
    const screenY = topY + row;
    if (screenY < 0 || screenY >= 192) continue;

    for (let byteIdx = 0; byteIdx < wBytes; byteIdx++) {
      const b = data[srcRow * wBytes + byteIdx];

      for (let bit = 0; bit < 7; bit++) {
        const pixel = (b >> bit) & 1;
        if (!pixel && ora) continue; // transparent in ORA mode

        const colorIdx = pixel ? color : 0;
        const sx = srcX + byteIdx * 7 + bit;

        // Each source pixel → 2 DHires pixels
        display.setPixel(sx * 2,     screenY, colorIdx, page);
        display.setPixel(sx * 2 + 1, screenY, colorIdx, page);
      }
    }
  }
}

/**
 * Apply an AND mask: KEEPS pixels where mask bits are 1,
 * CLEARS pixels where mask bits are 0.
 * (screen = screen AND mask)
 */
function drawBgMask(display, image, srcX, srcY, page) {
  if (!image) return;

  const { width: wBytes, height, data } = image;
  const topY = srcY - height + 1;

  for (let row = 0; row < height; row++) {
    const srcRow = height - 1 - row;
    const screenY = topY + row;
    if (screenY < 0 || screenY >= 192) continue;

    for (let byteIdx = 0; byteIdx < wBytes; byteIdx++) {
      const b = data[srcRow * wBytes + byteIdx];

      for (let bit = 0; bit < 7; bit++) {
        if (!((b >> bit) & 1)) {  // mask bit is 0 → clear pixel
          const sx = srcX + byteIdx * 7 + bit;
          display.setPixel(sx * 2,     screenY, 0, page);
          display.setPixel(sx * 2 + 1, screenY, 0, page);
        }
      }
    }
  }
}

// ─── Color constants ────────────────────────────────────────────────────────

const DUNGEON_TILE_COLOR  = 10; // light gray
const DUNGEON_FLOOR_COLOR = 5;  // gray
const PALACE_TILE_COLOR   = 9;  // orange
const PALACE_FLOOR_COLOR  = 8;  // brown

// ─── Main draw function ────────────────────────────────────────────────────

/**
 * Draw a complete room onto the display framebuffer.
 *
 * Follows the SURE → RedBlockSure flow from FRAMEADV.S:
 *   For each block (L-R, T-B):
 *     drawc   → C-section of piece below & to left (if visible)
 *     domaskb → AND mask of left neighbor (after C)
 *     drawb   → B-section of piece to left
 *     drawd   → D-section of current piece
 *     drawa   → A-section (mask + body)
 *     drawfrnt→ front piece
 */
export function drawRoom(display, level, roomIdx, opts = {}) {
  const room = level.rooms[roomIdx];
  if (!room) return;

  const page = opts.page !== undefined ? opts.page : 0;
  const palace = !!opts.palace;
  const bg1 = opts.bgTables?.bgtable1 || null;
  const bg2 = opts.bgTables?.bgtable2 || null;

  const flameFrame = opts.flameFrame !== undefined ? opts.flameFrame : 0;
  const useSprites = !!(bg1 && bg2);
  const tileColor  = palace ? PALACE_TILE_COLOR  : DUNGEON_TILE_COLOR;
  const floorColor = palace ? PALACE_FLOOR_COLOR : DUNGEON_FLOOR_COLOR;

  display.clearPage(page);

  // Draw 3 rows × 10 columns
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const tile = room.tiles[row * 10 + col];
      const leftTile = getTile(level, roomIdx, col - 1, row);
      const coords = blockCoords(col, row);

      if (!useSprites) {
        drawTileProcedural(display, tile, leftTile, coords, page,
          palace ? PALACE_COLORS : DUNGEON_COLORS);
        continue;
      }

      const id = tile.id;
      const leftId  = leftTile ? leftTile.id   : 0;
      const leftSpec = leftTile ? leftTile.spec : 0;
      const { srcX, blockBot, ay } = coords;

      // ── drawc: C-section of piece below & to left ──
      // Only visible when current tile is space/pillartop/panelwof/archtop
      const cVisible = (id === TILE.space || id === TILE.pillartop ||
                        id === TILE.panelwof || id >= TILE.archtop1);
      if (cVisible) {
        // Get tile at (col, row+1) shifted left by 1 = (col-1, row+1)
        const belowLeft = getBelowLeftTile(level, roomIdx, col, row);
        if (belowLeft) {
          const blId = belowLeft.id;
          let cImgNum = piecec[blId];
          // Panel/block variants
          if (blId === TILE.block) {
            cImgNum = blockc_var[belowLeft.spec < NUMBLOX ? belowLeft.spec : 0];
          } else if (cImgNum === 0x9f && belowLeft.spec < NUMPANS) {
            cImgNum = panelc_var[belowLeft.spec];
          } else if (cImgNum === 0x9f) {
            cImgNum = 0; // invalid panel spec
          }
          const cImg = getBgImage(cImgNum, bg1, bg2);
          if (cImg) {
            drawBgImage(display, cImg, srcX, blockBot, page, true, tileColor);
          }
        }

        // domaskb: AND mask of left neighbor
        const mbImgNum = maskb[leftId];
        if (mbImgNum) {
          const mbImg = getBgImage(mbImgNum, bg1, bg2);
          if (mbImg) drawBgMask(display, mbImg, srcX, blockBot, page);
        }
      }

      // ── drawb: B-section of piece to left ──
      if (id !== TILE.block) {  // B hidden by solid block
        let bImgNum = 0;
        let bYOff = 0;

        if (leftId === TILE.space) {
          // Space variant: wall panel behind empty space
          const vi = (leftSpec < 4) ? leftSpec : 0;
          bImgNum = spaceb[vi];
          bYOff = spaceby[vi];
        } else if (leftId === TILE.floor) {
          // Floor variant: wall behind floor
          const vi = (leftSpec < 4) ? leftSpec : 0;
          bImgNum = floorb[vi];
          bYOff = floorby[vi];
        } else if (leftId === TILE.block) {
          // Block variant
          const vi = (leftSpec < NUMBLOX) ? leftSpec : 0;
          bImgNum = blockb[vi];
          bYOff = pieceby[leftId];
        } else if (pieceb[leftId] === 0x9e) {
          // Panel (panelwif/panelwof both have pieceb = $9E = panelb0)
          if (leftSpec < NUMPANS) {
            bImgNum = panelb[leftSpec];
          }
          bYOff = pieceby[leftId];
        } else {
          // Regular B-section
          bImgNum = pieceb[leftId];
          bYOff = pieceby[leftId];
        }

        if (bImgNum) {
          const bImg = getBgImage(bImgNum, bg1, bg2);
          if (bImg) {
            drawBgImage(display, bImg, srcX, ay + bYOff, page, true, tileColor);
          }
        }

        // bstripe: vertical wall stripe (palace bg set only)
        if (palace && bstripe[leftId]) {
          const bsImg = getBgImage(bstripe[leftId], bg1, bg2);
          if (bsImg) {
            drawBgImage(display, bsImg, srcX, ay - 32, page, true, tileColor);
          }
        }
      }

      // ── drawmb: movable B-section of left neighbor ──
      {
        if (leftId === TILE.gate) {
          drawGateB(display, leftTile, srcX, ay, blockBot, page, tileColor, bg1, bg2);
        } else if (leftId === TILE.spikes) {
          drawSpikeB(display, leftTile.spec, srcX, ay, page, tileColor, bg1, bg2);
        } else if (leftId === TILE.loose) {
          drawLooseB(display, leftTile.spec, srcX, ay, page, tileColor, bg1, bg2);
        } else if (leftId === TILE.exit) {
          drawExitB(display, leftTile, srcX, ay, blockBot, page, tileColor, bg1, bg2);
        }
        // drawtorchb: torch flame overlay (FRAMEADV.S / GAMEBG.S SETUPFLAME)
        if (leftId === TILE.torch && srcX > 0) {
          // spreced = left neighbor's spec, used as frame offset
          // desync: each torch starts with random spec, adding global flameFrame shifts animation
          const frame = (leftSpec + flameFrame) % (TORCH_LAST + 1);
          const flameImg = getBgImage(torchflame[frame], bg1, bg2);
          if (flameImg) {
            // XCO = blockxco + 1 byte = srcX + 7 SHires pixels
            // YCO = Ay - 43 (SETUPFLAME subtracts 43 from Ay)
            // OPACITY = STA (overwrite mode)
            drawBgImage(display, flameImg, srcX + 7, ay - 43, page, false, tileColor);
          }
        }
      }

      // ── drawmc: movable C-section (gate only) ──
      {
        const mcVisible = (id === TILE.space || id === TILE.panelwof ||
                           id === TILE.pillartop);
        if (mcVisible) {
          const belowLeft = getBelowLeftTile(level, roomIdx, col, row);
          if (belowLeft && belowLeft.id === TILE.gate) {
            drawGateC(display, belowLeft, srcX, blockBot, page, tileColor, bg1, bg2);
          }
        }
      }

      // ── drawd: D-section (floor surface) ──
      {
        let dImgNum;
        let dOra = false;
        if (id === TILE.block) {
          dImgNum = blockd[(tile.spec < NUMBLOX) ? tile.spec : 0];
        } else if (id === TILE.panelwof) {
          dImgNum = pieced[id];
          dOra = true;
        } else {
          dImgNum = pieced[id];
        }
        if (dImgNum) {
          const dImg = getBgImage(dImgNum, bg1, bg2);
          if (dImg) {
            drawBgImage(display, dImg, srcX, blockBot, page, dOra, floorColor);
          }
        }
      }

      // ── drawa: A-section (mask if intrusive left neighbor, then body) ──
      {
        // archpanel special case: archtop1 to left of panelwof
        if (leftId === TILE.archtop1 && id === TILE.panelwof) {
          // Draw archpanel image directly (no mask needed)
          const apImg = getBgImage(archpanel, bg1, bg2);
          if (apImg) {
            drawBgImage(display, apImg, srcX, ay + pieceay[id], page, true, tileColor);
          }
        } else {
          // Mask A only when left neighbor has intrusive B-section
          const needMask = (leftId === TILE.panelwif || leftId === TILE.panelwof ||
                            leftId === TILE.pillartop || leftId === TILE.block);
          if (needMask) {
            const maImgNum = maska[id];
            if (maImgNum) {
              const maImg = getBgImage(maImgNum, bg1, bg2);
              if (maImg) drawBgMask(display, maImg, srcX, ay, page);
            }
          }

          // A body — getpiecea: loose floor overrides based on state
          let aImgNum;
          if (id === TILE.loose) {
            const li = getLooseY(tile.spec);
            aImgNum = loosea[li];
          } else {
            aImgNum = piecea[id];
          }
          if (aImgNum) {
            const aImg = getBgImage(aImgNum, bg1, bg2);
            if (aImg) {
              drawBgImage(display, aImg, srcX, ay + pieceay[id], page, true, tileColor);
            }
          }
        }
      }

      // ── drawma: movable A-section (spikes, slicer, flask, sword) ──
      {
        if (id === TILE.spikes) {
          drawSpikeA(display, tile.spec, srcX, ay, page, tileColor, bg1, bg2);
        } else if (id === TILE.slicer) {
          drawSlicerA(display, tile.spec, srcX, ay, page, tileColor, bg1, bg2);
        } else if (id === TILE.sword) {
          drawSwordA(display, tile.spec, srcX, ay, page, bg1, bg2);
        }
        // flask bubbles require setupflask (animation) — skip for static viewer
      }

      // ── drawmd: movable D-section (loose floor) ──
      {
        if (id === TILE.loose) {
          const li = getLooseY(tile.spec);
          const ldImgNum = loosed[li];
          if (ldImgNum) {
            const ldImg = getBgImage(ldImgNum, bg1, bg2);
            if (ldImg) {
              drawBgImage(display, ldImg, srcX, blockBot, page, false, floorColor);
            }
          }
        }
      }

      // ── drawfrnt: front piece (skip if back-only pass) ──
      if (!opts.skipFront) {
        drawFrontPiece(display, id, tile.spec, srcX, ay, page,
                       palace, tileColor, bg1, bg2);
      }
    }
  }
}

/**
 * Draw only the front-piece (fore) layer for a room.
 * Call this AFTER drawing the mid-layer (characters) to composite
 * front pieces on top.
 *
 * @param {import('./display.js').Display} display
 * @param {Object} level        Parsed level data
 * @param {number} roomIdx      Room number (1–24)
 * @param {Object} [opts]       Same options as drawRoom
 */
export function drawFrontPieces(display, level, roomIdx, opts = {}) {
  const room = level.rooms[roomIdx];
  if (!room) return;

  const page = opts.page !== undefined ? opts.page : 0;
  const palace = !!opts.palace;
  const bg1 = opts.bgTables?.bgtable1 || null;
  const bg2 = opts.bgTables?.bgtable2 || null;

  const tileColor = palace ? PALACE_TILE_COLOR : DUNGEON_TILE_COLOR;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const tile = room.tiles[row * 10 + col];
      const id = tile.id;
      const { srcX, ay } = blockCoords(col, row);

      drawFrontPiece(display, id, tile.spec, srcX, ay, page,
                     palace, tileColor, bg1, bg2);
    }
  }
}

/**
 * Draw a single tile's front piece.
 * Extracted from drawRoom's drawfrnt section.
 */
function drawFrontPiece(display, id, spec, srcX, ay, page,
                        palace, tileColor, bg1, bg2) {
  if (id === TILE.slicer) {
    drawSlicerF(display, spec, srcX, ay, page, tileColor, bg1, bg2);
    return;
  }

  let fImgNum;
  let fUseOra = true;
  let fUseMask = false;

  if (id === TILE.block) {
    fImgNum = blockfr[(spec < NUMBLOX) ? spec : 0];
    fUseOra = false;
  } else if (id === TILE.flask) {
    const potionBits = (spec & 0xe0);
    if (potionBits !== 0xa0 && potionBits >= 0x40) {
      fImgNum = specialflask;
    } else {
      fImgNum = fronti[id];
    }
    fUseMask = true;
  } else if (id >= TILE.archtop2) {
    fImgNum = fronti[id];
    fUseOra = false;
  } else if (!palace && id === TILE.posts) {
    fImgNum = fronti[id];
    fUseOra = false;
  } else {
    fImgNum = fronti[id];
    if (fImgNum) fUseMask = true;
  }

  if (!fImgNum) return;

  const fX = srcX + frontx[id] * 7;
  const fY = ay + fronty[id];

  if (fUseMask) {
    const fMaskImg = getBgImage(fImgNum, bg1, bg2);
    if (fMaskImg) {
      drawBgMask(display, fMaskImg, fX, fY, page);
      drawBgImage(display, fMaskImg, fX, fY, page, true, tileColor);
    }
  } else if (fUseOra) {
    const fImg = getBgImage(fImgNum, bg1, bg2);
    if (fImg) drawBgImage(display, fImg, fX, fY, page, true, tileColor);
  } else {
    const fImg = getBgImage(fImgNum, bg1, bg2);
    if (fImg) drawBgImage(display, fImg, fX, fY, page, false, tileColor);
  }
}

/**
 * Get the tile at (col-1, row+1) — "below and to left".
 */
function getBelowLeftTile(level, roomIdx, col, row) {
  return getTile(level, roomIdx, col - 1, row + 1);
}

// ─── Movable section helpers ────────────────────────────────────────────────

/**
 * Map loose floor state to animation index.
 * Assembly: getloosey (FRAMEADV.S)
 * state >= 0 → Y = state; state < 0 (bit 7 set) → mask off bit 7,
 * clamp to Ffalling, use as index.  Default (static viewer): state=0 → index 0.
 */
function getLooseY(state) {
  if (state === undefined || state === null) return 0;
  let s = state & 0xFF;
  if (s & 0x80) {
    s = s & 0x7f;
    if (s >= Ffalling + 1) s = 1;
  }
  return Math.min(s, loosea.length - 1);
}

/**
 * Draw spike A-section.  state is used as frame index (0–9).
 * Assembly: drawspikea (FRAMEADV.S L1453)
 */
function drawSpikeA(display, state, srcX, ay, page, color, bg1, bg2) {
  let idx = (state || 0) & 0xFF;
  if (idx & 0x80) idx = spikeExt; // hibit set → fully extended
  if (idx >= spikea.length) idx = 0;
  const imgNum = spikea[idx];
  if (!imgNum) return;
  const img = getBgImage(imgNum, bg1, bg2);
  if (img) drawBgImage(display, img, srcX, ay - 1, page, true, color);
}

/**
 * Draw spike B-section (from left neighbor).
 * Assembly: drawspikeb (FRAMEADV.S L1478)
 */
function drawSpikeB(display, state, srcX, ay, page, color, bg1, bg2) {
  let idx = (state || 0) & 0xFF;
  if (idx & 0x80) idx = spikeExt;
  if (idx >= spikeb.length) idx = 0;
  const imgNum = spikeb[idx];
  if (!imgNum) return;
  const img = getBgImage(imgNum, bg1, bg2);
  if (img) drawBgImage(display, img, srcX, ay - 1, page, true, color);
}

/**
 * Draw slicer A-section (top + bottom blade halves).
 * Assembly: drawslicera (FRAMEADV.S L1548)
 */
function drawSlicerA(display, state, srcX, ay, page, color, bg1, bg2) {
  let s = ((state || 0) & 0x7f);
  if (s >= slicerRet) s = slicerRet;
  const seqIdx = slicerseq[s];
  const frameIdx = seqIdx - 1;

  // Bottom blade
  const smeared = ((state || 0) & 0x80) !== 0;
  const botImgNum = smeared ? slicerbot2[frameIdx] : slicerbot[frameIdx];
  if (botImgNum) {
    const botImg = getBgImage(botImgNum, bg1, bg2);
    if (botImg) drawBgImage(display, botImg, srcX, ay, page, true, color);
  }

  // Top blade
  const topImgNum = slicertop[frameIdx];
  if (topImgNum) {
    const topImg = getBgImage(topImgNum, bg1, bg2);
    if (topImg) drawBgImage(display, topImg, srcX, ay - slicergap[frameIdx], page, true, color);
  }
}

/**
 * Draw slicer front piece (blade in front of character).
 * Assembly: drawslicerf (FRAMEADV.S L1590) → maddfore (AND mask + ORA)
 */
function drawSlicerF(display, state, srcX, ay, page, color, bg1, bg2) {
  let s = ((state || 0) & 0x7f);
  if (s >= slicerRet) s = slicerRet;
  const seqIdx = slicerseq[s];
  const frameIdx = seqIdx - 1;

  const fImgNum = slicerfrnt[frameIdx];
  if (!fImgNum) return;
  const fImg = getBgImage(fImgNum, bg1, bg2);
  if (fImg) {
    // maddfore: AND mask pass then ORA pass
    drawBgMask(display, fImg, srcX, ay, page);
    drawBgImage(display, fImg, srcX, ay, page, true, color);
  }
}

/**
 * Draw sword A-section (toggles gleam based on state).
 * Assembly: drawsworda (FRAMEADV.S L1530)
 */
function drawSwordA(display, state, srcX, ay, page, bg1, bg2) {
  const imgNum = (state === 1) ? swordgleam1 : swordgleam0;
  const img = getBgImage(imgNum, bg1, bg2);
  if (img) drawBgImage(display, img, srcX, ay, page, false); // STA mode
}

/**
 * Draw loose floor B-section.
 * Assembly: drawlooseb (FRAMEADV.S L1389)
 */
function drawLooseB(display, state, srcX, ay, page, color, bg1, bg2) {
  const li = getLooseY(state);
  const img = getBgImage(looseb_img, bg1, bg2);
  if (img) drawBgImage(display, img, srcX, ay + looseby[li], page, true, color);
}

/**
 * Draw gate C-section.
 * Assembly: drawgatec (FRAMEADV.S L1701)
 * AND mask with gatecmask, then ORA with gate8c indexed by (state/4) mod 8
 */
function drawGateC(display, gateTile, srcX, blockBot, page, color, bg1, bg2) {
  // AND mask
  const maskImg = getBgImage(gatecmask, bg1, bg2);
  if (maskImg) drawBgMask(display, maskImg, srcX, blockBot, page);

  // gate state → frame index
  let gateState = (gateTile.spec || 0);
  if (gateState > gmaxval) gateState = gmaxval;
  const gateposn = gateState >> 2;
  // Y = (state/4) mod 8 computed as: ((gateposn & 0xf8) ^ 0xff + 1 + gateposn) & 0xff
  // Simplified: gateposn % 8
  const frameIdx = gateposn & 7;
  const cImgNum = gate8c[frameIdx];
  const cImg = getBgImage(cImgNum, bg1, bg2);
  if (cImg) drawBgImage(display, cImg, srcX, blockBot, page, true, color);
}

/**
 * Draw gate B-section (vertical bars).
 * Assembly: drawgateb (FRAMEADV.S L1814)
 * Draws bottom, middle sections, and top piece from bottom to top.
 */
function drawGateB(display, gateTile, srcX, ay, blockBot, page, color, bg1, bg2) {
  const blockthr = blockBot - 62; // topmost line of B-section

  let gateState = (gateTile.spec || 0);
  if (gateState > gmaxval) gateState = gmaxval;
  const gateposn = (gateState >> 2) + 1;
  const gatebot = ay - gateposn;

  // Bottom piece — check if overlaps floor line
  const botOverlap = gatebot + 12 >= ay;
  if (botOverlap) {
    // ORA mode (bottom piece overlaps floor)
    const botImg = getBgImage(gatebotORA, bg1, bg2);
    if (botImg) drawBgImage(display, botImg, srcX, gatebot - 2, page, true, color);
  } else {
    // STA mode
    const botImg = getBgImage(gatebotSTA, bg1, bg2);
    if (botImg) drawBgImage(display, botImg, srcX, gatebot, page, false, color);
  }

  // Middle pieces (gateB1, 8 lines each)
  const midImg = getBgImage(gateB1, bg1, bg2);
  if (midImg) {
    let y = gatebot - 12;
    while (y >= 0 && y < 192) {
      if (y - 7 < blockthr) break; // would stick out of block area
      drawBgImage(display, midImg, srcX, y, page, false, color);
      y -= 8;
      if (y <= 0) break;
    }

    // Top piece: remaining height 1–8 pixels from gate8b
    if (y >= blockthr && y < 192) {
      const topHeight = y - blockthr + 1;
      if (topHeight > 0 && topHeight < 9) {
        const topImgNum = gate8b[topHeight - 1];
        const topImg = getBgImage(topImgNum, bg1, bg2);
        if (topImg) drawBgImage(display, topImg, srcX, y, page, false, color);
      }
    }
  }
}

/**
 * Draw exit B-section (stairs + door).
 * Assembly: drawexitb (FRAMEADV.S L1616)
 */
function drawExitB(display, exitTile, srcX, ay, blockBot, page, color, bg1, bg2) {
  // Stairs (drawn at XCO+1, ay-12)
  if (srcX + 1 < 36) { // can't protrude off right edge
    const stairsImg = getBgImage(stairs, bg1, bg2);
    if (stairsImg) {
      drawBgImage(display, stairsImg, srcX + 7, ay - 12, page, false, color);
    }
  }

  // Door — draw from bottom to top using AND mask + ORA
  const blockthr = blockBot - 67;
  if (blockthr >= 192) return;

  const gateposn = (exitTile.spec || 0) >> 2;
  const doorTop = ay - 14 - gateposn;

  const doorMaskImg = getBgImage(doormask, bg1, bg2);
  const doorImg = getBgImage(door, bg1, bg2);

  let y = ay - 14;
  while (y >= blockthr && y < 192) {
    if (doorMaskImg) drawBgMask(display, doorMaskImg, srcX + 7, y, page);
    if (doorImg) drawBgImage(display, doorImg, srcX + 7, y, page, true, color);
    y -= 4;
  }

  // Top repair
  const repairY = ay - 64;
  if (repairY < 192) {
    const repairImg = getBgImage(toprepair, bg1, bg2);
    if (repairImg) drawBgImage(display, repairImg, srcX + 7, repairY, page, false, color);
  }
}

// ─── Procedural fallback (no BG images loaded) ─────────────────────────────

const DUNGEON_COLORS = {
  wall: 2, floor: 5, floorTop: 10, space: 0, pillar: 10,
  gate: 5, gateBar: 13, spikes: 1, torch: 9, torchFl: 13,
  potion: 6, sword: 15, exit: 8, loose: 10, slicer: 1,
  block: 2, mirror: 7, arch: 8, window: 7, bones: 15, rubble: 8,
};
const PALACE_COLORS = {
  wall: 1, floor: 8, floorTop: 9, space: 0, pillar: 9,
  gate: 5, gateBar: 13, spikes: 1, torch: 9, torchFl: 13,
  potion: 3, sword: 15, exit: 8, loose: 9, slicer: 1,
  block: 1, mirror: 7, arch: 9, window: 7, bones: 15, rubble: 8,
};

function drawTileProcedural(display, tile, tileLeft, coords, page, colors) {
  const { srcX, blockBot, ay, blockTop } = coords;
  const x = srcX * 2;         // DHires X
  const W = BLOCK_WIDTH_PX * 2; // 56 DHires px
  const id = tile.id;

  const hasFloor = tileHasFloor(id);
  const hasWall = tileHasWall(id);

  if (hasWall) fillBlock(display, x, blockTop, W, BLOCK_HEIGHT, colors.wall, page);
  if (hasFloor) {
    fillBlock(display, x, ay - 1, W, 1, colors.floorTop, page);
    fillBlock(display, x, ay, W, D_HEIGHT, colors.floor, page);
  }

  switch (id) {
    case TILE.posts:
      fillBlock(display, x + 20, blockTop, 16, BLOCK_HEIGHT - D_HEIGHT, colors.pillar, page);
      break;
    case TILE.gate: {
      const h = BLOCK_HEIGHT - Math.floor(Math.min(tile.spec || 0, 188) / 4);
      if (h > 0) {
        for (let bx = 4; bx < W - 4; bx += 12)
          fillBlock(display, x + bx, blockTop, 4, h, colors.gateBar, page);
        for (let by = 8; by < h; by += 16)
          fillBlock(display, x, blockTop + by, W, 2, colors.gate, page);
      }
      break;
    }
    case TILE.spikes:
      if (tile.spec >= 2 && tile.spec <= 7) {
        const sh = Math.min(12, tile.spec * 3);
        for (let s = 0; s < 4; s++)
          fillBlock(display, x + 8 + s * 12, ay - sh - 1, 4, sh, colors.spikes, page);
      }
      break;
    case TILE.torch:
      fillBlock(display, x + 20, blockTop + 15, 8, 20, colors.torch, page);
      fillBlock(display, x + 16, blockTop + 8, 16, 8, colors.torchFl, page);
      break;
    case TILE.flask:
      fillBlock(display, x + 20, ay - 10, 12, 8, getPotionColor(tile.spec), page);
      break;
    case TILE.sword:
      fillBlock(display, x + 12, ay - 4, 32, 3, colors.sword, page);
      break;
    case TILE.block:
      fillBlock(display, x, blockTop, W, BLOCK_HEIGHT, colors.block, page);
      break;
    case TILE.exit: case TILE.exit2:
      fillBlock(display, x + 4, blockTop + 4, W - 8, BLOCK_HEIGHT - D_HEIGHT - 8, 0, page);
      if (tile.spec === 0)
        fillBlock(display, x + 8, blockTop + 8, W - 16, BLOCK_HEIGHT - 16, colors.exit, page);
      break;
  }

  if (tileLeft && tileHasWall(tileLeft.id))
    fillBlock(display, x, blockTop, 4, BLOCK_HEIGHT - D_HEIGHT, colors.wall, page);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function tileHasFloor(id) {
  return [1,2,3,4,5,6,7,8,10,11,14,15,16,17,18,19,21,22,25].includes(id);
}

function tileHasWall(id) {
  return [1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].includes(id);
}

function getPotionColor(spec) {
  return [5, 12, 1, 3, 6, 6, 6, 6][(spec >> 5) & 7];
}

function fillBlock(display, x, y, w, h, color, page) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      display.setPixel(x + dx, y + dy, color, page);
}

// ─── Room map drawing (minimap overview) ────────────────────────────────────

export function drawLevelMap(display, level, page = 0) {
  const visited = new Set();
  const positions = new Map();
  const queue = [];

  const startRoom = level.kidStart.screen;
  if (!level.rooms[startRoom]) return;

  positions.set(startRoom, { col: 0, row: 0 });
  queue.push(startRoom);
  visited.add(startRoom);

  while (queue.length > 0) {
    const r = queue.shift();
    const pos = positions.get(r);
    const room = level.rooms[r];
    if (!room) continue;
    for (const [nIdx, nc, nr] of [
      [room.left, pos.col-1, pos.row], [room.right, pos.col+1, pos.row],
      [room.up, pos.col, pos.row-1], [room.down, pos.col, pos.row+1],
    ]) {
      if (nIdx > 0 && nIdx <= 24 && !visited.has(nIdx)) {
        visited.add(nIdx); positions.set(nIdx, { col: nc, row: nr }); queue.push(nIdx);
      }
    }
  }

  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const { col, row } of positions.values()) {
    minC = Math.min(minC, col); maxC = Math.max(maxC, col);
    minR = Math.min(minR, row); maxR = Math.max(maxR, row);
  }
  const cols = maxC - minC + 1, rows = maxR - minR + 1;
  const cW = Math.min(40, Math.floor(500 / cols));
  const cH = Math.min(20, Math.floor(170 / rows));
  const mL = Math.floor((display.WIDTH - cols * cW) / 2);
  const mT = Math.floor((display.HEIGHT - rows * cH) / 2);

  for (const [roomIdx, { col, row }] of positions) {
    const rx = mL + (col - minC) * cW, ry = mT + (row - minR) * cH;
    const color = roomIdx === startRoom ? 12 : 5;
    for (let dx = 0; dx < cW; dx++) {
      display.setPixel(rx + dx, ry, color, page);
      display.setPixel(rx + dx, ry + cH - 1, color, page);
    }
    for (let dy = 0; dy < cH; dy++) {
      display.setPixel(rx, ry + dy, color, page);
      display.setPixel(rx + cW - 1, ry + dy, color, page);
    }
    const s = String(roomIdx);
    const cx = rx + Math.floor(cW / 2) - s.length * 3;
    const cy = ry + Math.floor(cH / 2) - 3;
    for (let i = 0; i < s.length; i++) drawDigit(display, s.charCodeAt(i) - 48, cx + i * 6, cy, 15, page);
  }
}

const TINY_DIGITS = [
  [7,5,5,5,7],[2,6,2,2,7],[7,1,7,4,7],[7,1,7,1,7],[5,5,7,1,1],
  [7,4,7,1,7],[7,4,7,5,7],[7,1,2,4,4],[7,5,7,5,7],[7,5,7,1,7],
];
function drawDigit(display, d, x, y, color, page) {
  if (d < 0 || d > 9) return;
  const g = TINY_DIGITS[d];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 3; c++)
      if ((g[r] >> (2 - c)) & 1) display.setPixel(x + c, y + r, color, page);
}
