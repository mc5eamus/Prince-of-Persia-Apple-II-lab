/**
 * animation.js — Character animation engine for the cutscene.
 *
 * Implements a simplified version of the original sequence table interpreter.
 * Each character (princess, vizier) has:
 *   - CharID, position (x, y), facing direction
 *   - A current sequence (list of frame indices + commands)
 *   - A frame pointer within that sequence
 *
 * Sequence commands (from SEQTABLE.S):
 *   goto(addr)    — loop to address (we use label index)
 *   aboutface     — reverse facing direction
 *   chx(n)        — add n to X position
 *   chy(n)        — add n to Y position
 *   act(n)        — trigger action (ignored for now)
 *   Frame number  — display this frame from the character's alt set
 */

/**
 * Sequence definition language — simplified for our purposes.
 * Each entry is either:
 *   - A positive number: frame index (into ALTSET2)
 *   - { cmd: 'goto', target: labelIdx }
 *   - { cmd: 'aboutface' }
 *   - { cmd: 'chx', value: n }
 *   - { cmd: 'chy', value: n }
 *   - { cmd: 'act', value: n }
 */

// Sequence definitions from SEQTABLE.S, translated for ALTSET2 frames
// Frame numbers correspond to the :N entries in ALTSET2 (FRAMEDEF.S)

export const SEQ = {
  // Princess sequences
  Pstand: [11, { cmd: 'goto', target: 0 }],

  Palert: [
    2, 3, 4, 5, 6, 7, 8, 9,
    { cmd: 'aboutface' }, { cmd: 'chx', value: 9 },
    11, { cmd: 'goto', target: 10 }  // goto Pstand-like loop
  ],

  Pback: [
    { cmd: 'aboutface' }, { cmd: 'chx', value: 11 },
    12,
    { cmd: 'chx', value: 1 }, 13,
    { cmd: 'chx', value: 1 }, 14,
    { cmd: 'chx', value: 3 }, 15,
    { cmd: 'chx', value: 1 }, 16,
    17, { cmd: 'goto', target: 11 }  // loop on 17
  ],

  Pslump: [
    1, 18, { cmd: 'goto', target: 1 }  // loop on 18
  ],

  // Vizier sequences
  Vstand: [54, { cmd: 'goto', target: 0 }],

  Vapproach: [  // Vwalk
    { cmd: 'chx', value: 1 },
    48, { cmd: 'chx', value: 2 },
    49, { cmd: 'chx', value: 6 },
    50, { cmd: 'chx', value: 1 },
    51, { cmd: 'chx', value: -1 },
    52, { cmd: 'chx', value: 1 },
    53, { cmd: 'chx', value: 1 },
    { cmd: 'goto', target: 1 }  // loop walk cycle from frame 48
  ],

  Vstop: [
    { cmd: 'chx', value: 1 },
    55, 56,
    { cmd: 'goto', target: -1 }  // → Vstand (special handling)
  ],

  Vraise: [
    85, 67, 67, 67, 67, 67, 67,
    68, 69, 70, 71, 72, 73, 74, 75, 83, 84,
    76, { cmd: 'goto', target: 17 }  // loop on 76
  ],

  Vexit: [
    77, 78, 79, 80, 81, 82,
    { cmd: 'chx', value: 1 },
    54, 54, 54, 54, 54, 54,  // standing
    57, 58, 59, 60,
    61, { cmd: 'chx', value: 2 },
    62, { cmd: 'chx', value: -1 },
    63, { cmd: 'chx', value: -3 },
    64,
    65, { cmd: 'chx', value: -1 },
    66,
    { cmd: 'aboutface' }, { cmd: 'chx', value: 16 },
    { cmd: 'chx', value: 3 },
    // Then walks off — loop on walk
    49, { cmd: 'chx', value: 6 },
    50, { cmd: 'chx', value: 1 },
    51, { cmd: 'chx', value: -1 },
    52, { cmd: 'chx', value: 1 },
    53, { cmd: 'chx', value: 1 },
    48, { cmd: 'chx', value: 2 },
    { cmd: 'goto', target: 27 }  // loop walk
  ],
};

/**
 * ALTSET2 frame definitions from FRAMEDEF.S.
 * Each frame: { image, dx, dy, flags }
 * image = the 7-bit image index within chtable6 (IMG.CHTAB6.B)
 * For vizier frames ≥67 that use chtable7, we mark the table.
 */
export const ALTSET2_FRAMES = buildAltset2();

function buildAltset2() {
  // From FRAMEDEF.S ALTSET2 — frame number : {Fimage(raw), Fsword, Fdx, Fdy, Fcheck}
  // We decode Fimage to get the actual image index.
  // Fimage bit7 + Fsword bits7-6 combine for 3-bit table number:
  //   table 4 = chtable5, 5 = chtable6, 6 = chtable7
  // Fimage bits 0-6 = image number
  const raw = {
    1:  { fi: 0x8A, fs: 0x40 },  // pslump-1
    2:  { fi: 0x9A, fs: 0x40 },  // pturn-4
    3:  { fi: 0x9B, fs: 0x40 },  // pturn-5
    4:  { fi: 0x9C, fs: 0x40 },  // pturn-6
    5:  { fi: 0x9D, fs: 0x40 },  // pturn-7
    6:  { fi: 0x9E, fs: 0x40 },  // pturn-8
    7:  { fi: 0x9F, fs: 0x40 },  // pturn-9
    8:  { fi: 0xA0, fs: 0x40 },  // pturn-10
    9:  { fi: 0xA1, fs: 0x40 },  // pturn-11
    10: { fi: 0xA2, fs: 0x40 },  // unused
    11: { fi: 0x99, fs: 0x40 },  // pstand (pturn-15)
    12: { fi: 0xA3, fs: 0x40 },  // pback-3
    13: { fi: 0xA4, fs: 0x40 },  // pback-5
    14: { fi: 0xA5, fs: 0x40 },  // pback-7
    15: { fi: 0xA6, fs: 0x40 },  // pback-9
    16: { fi: 0xA7, fs: 0x40 },  // pback-11
    17: { fi: 0xA8, fs: 0x40 },  // pback-13 (stand)
    18: { fi: 0x8B, fs: 0x40 },  // pslump-1
    19: { fi: 0xA9, fs: 0x40 },  // plie
    // 20-33: embrace frames
    // 34-47: prise frames
    48: { fi: 0xCA, fs: 0x40 },  // vwalk-8
    49: { fi: 0xCB, fs: 0x40 },  // vwalk-9
    50: { fi: 0xCC, fs: 0x40 },  // vwalk-10
    51: { fi: 0xCD, fs: 0x40 },  // vwalk-11
    52: { fi: 0xCE, fs: 0x40 },  // vwalk-12
    53: { fi: 0xCF, fs: 0x40 },  // vwalk-13
    54: { fi: 0xD0, fs: 0x40 },  // vstand-3
    55: { fi: 0xD1, fs: 0x40 },  // vstand-2
    56: { fi: 0xD2, fs: 0x40 },  // vstand-1
    57: { fi: 0xD3, fs: 0x40 },  // vturn-5
    58: { fi: 0xD4, fs: 0x40 },  // vturn-6
    59: { fi: 0xD5, fs: 0x40 },  // vturn-7
    60: { fi: 0xD6, fs: 0x40 },  // vturn-8
    61: { fi: 0xD7, fs: 0x40 },  // vturn-9
    62: { fi: 0xD8, fs: 0x40 },  // vturn-10
    63: { fi: 0xD9, fs: 0x40 },  // vturn-11
    64: { fi: 0xDA, fs: 0x40 },  // vturn-12
    65: { fi: 0xDB, fs: 0x40 },  // vturn-13
    66: { fi: 0xDC, fs: 0x40 },  // vturn-14
    67: { fi: 0xDD, fs: 0x40 },  // vcast-2
    68: { fi: 0xDE, fs: 0x40 },  // vcast-3
    69: { fi: 0xDF, fs: 0x40 },  // vcast-4
    70: { fi: 0xE0, fs: 0x40 },  // vcast-5
    71: { fi: 0xE1, fs: 0x40 },  // vcast-6
    72: { fi: 0xE2, fs: 0x40 },  // vcast-7
    73: { fi: 0xE3, fs: 0x40 },  // vcast-8
    74: { fi: 0xE4, fs: 0x40 },  // vcast-9
    75: { fi: 0xE5, fs: 0x40 },  // vcast-10
    76: { fi: 0xE6, fs: 0x40 },  // vcast-11 (held)
    77: { fi: 0xE7, fs: 0x40 },  // vcast-13
    78: { fi: 0x81, fs: 0x80 },  // vcast-14 (chtable7!)
    79: { fi: 0x82, fs: 0x80 },  // vcast-15
    80: { fi: 0x83, fs: 0x80 },  // vcast-16
    81: { fi: 0x84, fs: 0x80 },  // vcast-17
    82: { fi: 0x85, fs: 0x80 },  // vcast-18
    83: { fi: 0x86, fs: 0x80 },  // vcast-10a
    84: { fi: 0x87, fs: 0x80 },  // vcast-10b
    85: { fi: 0x88, fs: 0x80 },  // vcast-1
  };

  const frames = {};
  for (const [num, { fi, fs }] of Object.entries(raw)) {
    // Decode: table = (fi>>7)<<2 | (fs>>6)
    const tableBits = ((fi >> 7) << 2) | ((fs >> 6) & 3);
    const imageIdx  = fi & 0x7F;
    // table 5 = chtable6 (IMG.CHTAB6.B), table 6 = chtable7 (IMG.CHTAB7)
    const tableFile = tableBits === 5 ? 'CHTAB6B' : tableBits === 6 ? 'CHTAB7' : `TABLE${tableBits}`;
    frames[Number(num)] = { imageIdx, tableFile };
  }
  return frames;
}

/**
 * A Character instance that can step through sequences.
 */
export class Character {
  constructor(id, x, y, face) {
    this.id = id;        // 5 = princess, 6 = vizier
    this.x = x;          // pixel X position
    this.y = y;          // pixel Y position
    this.face = face;    // -1 = facing left, 1 = facing right
    this.seq = null;     // current sequence array
    this.seqIdx = 0;     // position within sequence
    this.currentFrame = null; // current ALTSET2 frame number
    this.done = false;   // true when sequence ends (no loop)
  }

  /**
   * Set a new sequence.
   */
  setSequence(seqName) {
    const seq = SEQ[seqName];
    if (!seq) {
      console.warn(`Unknown sequence: ${seqName}`);
      return;
    }
    this.seq = seq;
    this.seqIdx = 0;
    this.done = false;
  }

  /**
   * Advance one frame.  Processes commands until the next frame number is hit.
   * Returns the ALTSET2 frame number to display, or null if done/looping.
   */
  step() {
    if (!this.seq || this.done) return null;

    while (this.seqIdx < this.seq.length) {
      const entry = this.seq[this.seqIdx];

      if (typeof entry === 'number') {
        // It's a frame number
        this.currentFrame = entry;
        this.seqIdx++;
        return entry;
      }

      // It's a command
      this.seqIdx++;

      switch (entry.cmd) {
        case 'goto':
          if (entry.target === -1) {
            // Special: jump to Vstand
            this.seq = SEQ.Vstand;
            this.seqIdx = 0;
          } else {
            this.seqIdx = entry.target;
          }
          break;

        case 'aboutface':
          this.face = -this.face;
          break;

        case 'chx':
          this.x += entry.value * this.face;
          break;

        case 'chy':
          this.y += entry.value;
          break;

        case 'act':
          // Action triggers — ignore for now
          break;
      }
    }

    // Fell off end of sequence
    this.done = true;
    return null;
  }
}
