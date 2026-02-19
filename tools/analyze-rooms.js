/**
 * Analyze all level files to find 20 representative test rooms.
 */
const fs = require('fs');
const path = require('path');

const TILE_NAMES = {
  0: 'space', 1: 'floor', 2: 'spikes', 3: 'posts', 4: 'gate',
  5: 'dpressplate', 6: 'pressplate', 7: 'panelwif', 8: 'pillarbottom', 9: 'pillartop',
  10: 'flask', 11: 'loose', 12: 'panelwof', 13: 'mirror', 14: 'rubble',
  15: 'upressplate', 16: 'exit', 17: 'exit2', 18: 'slicer', 19: 'torch',
  20: 'block', 21: 'bones', 22: 'sword', 23: 'window', 24: 'window2',
  25: 'archbot', 26: 'archtop1', 27: 'archtop2', 28: 'archtop3', 29: 'archtop4'
};

const ID_MASK = 0x1F;
const OFF_BLUETYPE = 0x000;
const OFF_BLUESPEC = 0x2D0;
const OFF_MAP = 0x7A0;
const OFF_INFO = 0x800;

function parseLevel(buffer) {
  const data = new Uint8Array(buffer);

  const rooms = [null];
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
        id: typeByte & ID_MASK,
        spec: specByte,
        col, row
      });
    }
    const mapBase = OFF_MAP + r * 4;
    rooms.push({
      index: roomIdx,
      tiles,
      left: data[mapBase] || 0,
      right: data[mapBase + 1] || 0,
      up: data[mapBase + 2] || 0,
      down: data[mapBase + 3] || 0,
    });
  }

  const numRooms = (data[OFF_INFO] || 1) - 1;
  const kidStart = {
    screen: data[OFF_INFO + 0x40] || 1,
    block: data[OFF_INFO + 0x41] || 0,
    face: data[OFF_INFO + 0x42] === 0xFF ? -1 : 1,
  };
  const swordStart = {
    screen: data[OFF_INFO + 0x44] || 0,
    block: data[OFF_INFO + 0x45] || 0,
  };

  const guards = [null];
  for (let i = 0; i < 24; i++) {
    guards.push({
      block: data[OFF_INFO + 0x47 + i],
      face: data[OFF_INFO + 0x5F + i] === 0xFF ? -1 : 1,
      skill: data[OFF_INFO + 0xA7 + i] || 0,
    });
  }

  return { numRooms, rooms, kidStart, swordStart, guards };
}

function analyzeRoom(level, levelIdx, roomIdx) {
  const room = level.rooms[roomIdx];
  if (!room) return null;

  const tileCounts = {};
  const tileTypes = new Set();
  for (const tile of room.tiles) {
    const name = TILE_NAMES[tile.id] || `unknown(${tile.id})`;
    tileCounts[name] = (tileCounts[name] || 0) + 1;
    tileTypes.add(tile.id);
  }

  const isKidStart = level.kidStart.screen === roomIdx;
  const guard = level.guards[roomIdx];
  const hasGuard = guard && guard.block < 30;
  const hasSword = level.swordStart.screen === roomIdx;

  return {
    level: levelIdx,
    room: roomIdx,
    tileCounts,
    tileTypeSet: tileTypes,
    numDistinctTypes: tileTypes.size,
    isKidStart,
    hasGuard,
    hasSword,
    guardSkill: hasGuard ? guard.skill : -1,
    palace: levelIdx >= 4,
    neighbors: { left: room.left, right: room.right, up: room.up, down: room.down },
  };
}

// Load all levels
const levelsDir = path.join(__dirname, '..', '01 POP Source', 'Levels');
const allRooms = [];

for (let lv = 0; lv <= 14; lv++) {
  const fname = path.join(levelsDir, `LEVEL${lv}`);
  const buf = fs.readFileSync(fname);
  const level = parseLevel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  console.log(`\n=== LEVEL ${lv} (${lv < 4 ? 'DUNGEON' : 'PALACE'}) ===`);
  console.log(`  Rooms: ${level.numRooms}, Kid start: room ${level.kidStart.screen} block ${level.kidStart.block}`);
  if (level.swordStart.screen) console.log(`  Sword: room ${level.swordStart.screen} block ${level.swordStart.block}`);

  for (let r = 1; r <= level.numRooms; r++) {
    const info = analyzeRoom(level, lv, r);
    if (!info) continue;
    allRooms.push(info);

    // Print rooms with interesting features
    const specials = [];
    if (info.isKidStart) specials.push('KID_START');
    if (info.hasGuard) specials.push(`GUARD(skill=${info.guardSkill})`);
    if (info.hasSword) specials.push('SWORD');

    const interestingTiles = [];
    for (const [name, count] of Object.entries(info.tileCounts)) {
      if (!['space', 'floor', 'block'].includes(name)) {
        interestingTiles.push(`${name}×${count}`);
      }
    }

    if (specials.length || interestingTiles.length) {
      console.log(`  Room ${r}: ${specials.join(', ')} | tiles: ${interestingTiles.join(', ')} | distinct: ${info.numDistinctTypes}`);
    }
  }
}

// Now find good representative rooms
console.log('\n\n========= ROOM ANALYSIS SUMMARY =========\n');

// All tile types seen
const allTilesSeen = new Set();
for (const r of allRooms) {
  for (const id of r.tileTypeSet) allTilesSeen.add(id);
}
console.log('All tile types seen across all levels:');
for (const id of [...allTilesSeen].sort((a, b) => a - b)) {
  console.log(`  ${id}: ${TILE_NAMES[id]}`);
}

// Find rooms with rare tiles
const rareTiles = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29];
console.log('\nRooms containing rare/special tiles:');
for (const tileId of rareTiles) {
  const name = TILE_NAMES[tileId];
  const roomsWithTile = allRooms.filter(r => r.tileTypeSet.has(tileId));
  if (roomsWithTile.length > 0) {
    console.log(`  ${name} (${tileId}): ${roomsWithTile.map(r => `L${r.level}R${r.room}`).join(', ')}`);
  }
}

// Rooms with most distinct tile types
console.log('\nRooms with most distinct tile types:');
const sortedByVariety = [...allRooms].sort((a, b) => b.numDistinctTypes - a.numDistinctTypes);
for (const r of sortedByVariety.slice(0, 15)) {
  console.log(`  L${r.level}R${r.room}: ${r.numDistinctTypes} types — ${Object.entries(r.tileCounts).map(([n, c]) => `${n}×${c}`).join(', ')}`);
}

// Kid start rooms
console.log('\nKid start rooms:');
for (const r of allRooms.filter(r => r.isKidStart)) {
  console.log(`  L${r.level}R${r.room} (${r.palace ? 'palace' : 'dungeon'})`);
}

// Guard rooms
console.log('\nRooms with guards:');
for (const r of allRooms.filter(r => r.hasGuard)) {
  console.log(`  L${r.level}R${r.room} skill=${r.guardSkill} (${r.palace ? 'palace' : 'dungeon'})`);
}
