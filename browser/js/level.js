/**
 * level.js — Prince of Persia level file parser.
 *
 * Level files are 2304-byte binaries with this layout (from EQ.S):
 *
 *   Offset  Size  Content
 *   $000    720   BLUETYPE[24][30] — tile type for each block in rooms 1–24
 *   $2D0    720   BLUESPEC[24][30] — tile modifier/state for each block
 *   $5A0    256   LINKLOC[] — pressplate link locations
 *   $6A0    256   LINKMAP[] — pressplate link targets
 *   $7A0     96   MAP[24][4] — room adjacency (Left, Right, Up, Down)
 *   $800    256   INFO — starting positions, guard data
 *
 * Each room has 10 columns × 3 rows = 30 tiles.
 * Tile index = row*10 + col  (row 0=top, 2=bottom; col 0=left, 9=right).
 *
 * BLUETYPE byte encoding:
 *   bits 0–4 (idmask $1F): tile type ID (0–29)
 *   bit 5    (reqmask $20): modifier flag
 *   bits 6–7 (secmask $C0): section flags
 *
 * INFO block layout (offset from INFO start = file offset $800):
 *   $00:       number of rooms + 1
 *   $40:       KidStartScrn
 *   $41:       KidStartBlock
 *   $42:       KidStartFace
 *   $44:       SwStartScrn
 *   $45:       SwStartBlock
 *   $47–$5E:   GdStartBlock[24]
 *   $5F–$76:   GdStartFace[24]
 *   $A7–$BE:   GdStartProg[24] (guard skill)
 */

// Tile type constants
export const TILE = {
  space:        0,
  floor:        1,
  spikes:       2,
  posts:        3,
  gate:         4,
  dpressplate:  5,
  pressplate:   6,
  panelwif:     7,   // wall panel with floor
  pillarbottom: 8,
  pillartop:    9,
  flask:       10,
  loose:       11,
  panelwof:    12,   // wall panel without floor
  mirror:      13,
  rubble:      14,
  upressplate: 15,
  exit:        16,
  exit2:       17,
  slicer:      18,
  torch:       19,
  block:       20,
  bones:       21,
  sword:       22,
  window:      23,
  window2:     24,
  archbot:     25,
  archtop1:    26,
  archtop2:    27,
  archtop3:    28,
  archtop4:    29,
};

// Reverse lookup
export const TILE_NAMES = {};
for (const [name, id] of Object.entries(TILE)) {
  TILE_NAMES[id] = name;
}

// Bit masks
const ID_MASK  = 0x1F;
const REQ_MASK = 0x20;
const SEC_MASK = 0xC0;

/**
 * Parsed level data structure.
 *
 * @typedef {Object} Level
 * @property {number}   numRooms
 * @property {Room[]}   rooms        — rooms[0] is unused (null screen), rooms[1]–rooms[24]
 * @property {Uint8Array} linkLoc
 * @property {Uint8Array} linkMap
 * @property {{ screen: number, block: number, face: number }} kidStart
 * @property {{ screen: number, block: number }} swordStart
 * @property {GuardStart[]} guards   — guards[0] unused, guards[1]–guards[24]
 *
 * @typedef {Object} Room
 * @property {number}   index        — room number (1–24)
 * @property {Tile[]}   tiles        — 30 tiles (row-major, 10 cols × 3 rows)
 * @property {number}   left         — neighbor room # (0 = none)
 * @property {number}   right
 * @property {number}   up
 * @property {number}   down
 *
 * @typedef {Object} Tile
 * @property {number}   id           — tile type (0–29)
 * @property {number}   modifier     — req flag (bit 5 of BLUETYPE)
 * @property {number}   section      — section flags (bits 6–7)
 * @property {number}   spec         — BLUESPEC value
 * @property {number}   col          — column 0–9
 * @property {number}   row          — row 0–2
 *
 * @typedef {Object} GuardStart
 * @property {number}   block        — ≥30 means no guard
 * @property {number}   face
 * @property {number}   skill
 */

/**
 * Parse a level file from an ArrayBuffer.
 *
 * @param {ArrayBuffer} buffer  Raw 2304-byte level file
 * @returns {Level}
 */
export function parseLevel(buffer) {
  const data = new Uint8Array(buffer);
  const expectedSize = 2304; // 9 pages × 256 bytes
  if (data.length < expectedSize) {
    console.warn(`Level file is ${data.length} bytes, expected ${expectedSize}`);
  }

  // Offsets
  const OFF_BLUETYPE = 0x000;
  const OFF_BLUESPEC = 0x2D0;
  const OFF_LINKLOC  = 0x5A0;
  const OFF_LINKMAP  = 0x6A0;
  const OFF_MAP      = 0x7A0;
  const OFF_INFO     = 0x800;

  // Parse rooms 1–24
  const rooms = [null]; // room 0 = null screen
  for (let r = 0; r < 24; r++) {
    const roomIdx = r + 1;
    const typeBase = OFF_BLUETYPE + r * 30;
    const specBase = OFF_BLUESPEC + r * 30;

    const tiles = [];
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const typeByte = data[typeBase + i] || 0;
      const specByte = data[specBase + i] || 0;

      tiles.push({
        id:       typeByte & ID_MASK,
        modifier: (typeByte & REQ_MASK) ? 1 : 0,
        section:  (typeByte & SEC_MASK) >> 6,
        spec:     specByte,
        col,
        row,
      });
    }

    // Room connections
    const mapBase = OFF_MAP + r * 4;
    rooms.push({
      index: roomIdx,
      tiles,
      left:  data[mapBase]     || 0,
      right: data[mapBase + 1] || 0,
      up:    data[mapBase + 2] || 0,
      down:  data[mapBase + 3] || 0,
    });
  }

  // Number of rooms
  const numRooms = (data[OFF_INFO] || 1) - 1;

  // Kid start
  const kidStart = {
    screen: data[OFF_INFO + 0x40] || 1,
    block:  data[OFF_INFO + 0x41] || 0,
    face:   data[OFF_INFO + 0x42] === 0xFF ? -1 : 1,
  };

  // Sword start
  const swordStart = {
    screen: data[OFF_INFO + 0x44] || 0,
    block:  data[OFF_INFO + 0x45] || 0,
  };

  // Guards
  const guards = [null]; // guard[0] unused
  for (let i = 0; i < 24; i++) {
    guards.push({
      block: data[OFF_INFO + 0x47 + i] || 0xFF,
      face:  data[OFF_INFO + 0x5F + i] === 0xFF ? -1 : 1,
      skill: data[OFF_INFO + 0xA7 + i] || 0,
    });
  }

  // Link data
  const linkLoc = data.slice(OFF_LINKLOC, OFF_LINKLOC + 256);
  const linkMap = data.slice(OFF_LINKMAP, OFF_LINKMAP + 256);

  return {
    numRooms,
    rooms,
    linkLoc,
    linkMap,
    kidStart,
    swordStart,
    guards,
  };
}

/**
 * Get a tile from a room, with neighbor-room wrapping.
 * If col < 0 → left neighbor, col ≥ 10 → right neighbor, etc.
 *
 * @param {Level} level
 * @param {number} roomIdx  Current room number (1–24)
 * @param {number} col      Column (-1 to 10)
 * @param {number} row      Row (-1 to 3)
 * @returns {Tile|null}
 */
export function getTile(level, roomIdx, col, row) {
  let room = level.rooms[roomIdx];
  if (!room) return null;

  // Wrap to neighbor rooms
  if (col < 0) {
    room = level.rooms[room.left];
    col = 9; // rightmost col of left neighbor
  } else if (col >= 10) {
    room = level.rooms[room.right];
    col = 0; // leftmost col of right neighbor
  }

  if (row < 0) {
    room = room ? level.rooms[level.rooms[roomIdx].up] : null;
    row = 2; // bottom row of above room
  } else if (row >= 3) {
    room = room ? level.rooms[level.rooms[roomIdx].down] : null;
    row = 0; // top row of below room
  }

  if (!room) return null;
  return room.tiles[row * 10 + col] || null;
}

/**
 * Load a level file from a URL.
 *
 * @param {string} url
 * @returns {Promise<Level>}
 */
export async function loadLevel(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load level: ${url} (${resp.status})`);
  const buffer = await resp.arrayBuffer();
  return parseLevel(buffer);
}

/**
 * Compute the starting position in pixels from kid start data.
 *
 * @param {Level} level
 * @returns {{ screen: number, x: number, y: number, face: number }}
 */
export function getKidStartPosition(level) {
  const { screen, block, face } = level.kidStart;
  const col = block % 10;
  const row = Math.floor(block / 10);

  // BlockEdge: x = 58 + col*14 (center of block = +7)
  const x = 58 + col * 14 + 7;

  // FloorY from TABLES.S:
  //   Row 0 (top):    FloorY[1] = ScrnBot - Blox2 - VertDist = 191 - 126 - 10 = 55
  //   Row 1 (middle): FloorY[2] = ScrnBot - Blox1 - VertDist = 191 - 63 - 10  = 118
  //   Row 2 (bottom): FloorY[3] = ScrnBot - VertDist          = 191 - 10      = 181
  const FLOOR_Y = [55, 118, 181];
  const y = FLOOR_Y[row] || 118;

  return { room: screen, col, row, x, y, face };
}
