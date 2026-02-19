/**
 * frameDef.js — Character frame definition tables.
 *
 * Ported from FRAMEDEF.S. Each frame = 5 bytes:
 *   Fimage  — image index (bits 0–6) + table select bit 2 (bit 7)
 *   Fsword  — sword frame # (bits 0–5) + table select bits 0–1 (bits 6–7)
 *   Fdx     — X offset (signed, 140-res pixels)
 *   Fdy     — Y offset (signed, scanlines)
 *   Fcheck  — collision/parity byte
 *
 * Table select encoding (decodeim):
 *   tableIndex = ((Fimage & 0x80) >> 1 | (Fsword & 0xC0)) >> 5
 *   imageIndex = Fimage & 0x7F
 *
 * Table index → CHTAB mapping:
 *   0 → IMG.CHTAB1  (kid body)
 *   1 → IMG.CHTAB2  (kid body continued)
 *   2 → IMG.CHTAB3  (swords)
 *   3 → IMG.CHTAB4.* (guard bodies)
 *   4 → IMG.CHTAB5  (extra frames)
 */

// ─── Main frame definition table (Fdef) — 240 frames ────────────────────────
// Indexed by CharPosn (1-based). Entry 0 is unused.
// Each entry: [Fimage, Fsword, Fdx, Fdy, Fcheck]
// Fdx/Fdy are signed bytes — values > 127 are negative (two's complement).

function s(v) { return v > 127 ? v - 256 : v; }

const FDEF_RAW = [
  null, // 0: unused
  // 1–14: run cycle
  [0x01, 0, 1, 0, 0xC4],     // 1: run-4
  [0x02, 0, 1, 0, 0x44],     // 2: run-5
  [0x03, 0, 3, 0, 0x47],     // 3: run-6
  [0x04, 0, 4, 0, 0x48],     // 4: run-7
  [0x05, 0, 0, 0, 0xE6],     // 5: run-8
  [0x06, 0, 0, 0, 0x49],     // 6: run-9
  [0x07, 0, 0, 0, 0x4A],     // 7: run-10
  [0x08, 0, 0, 0, 0xC5],     // 8: run-11
  [0x09, 0, 0, 0, 0x44],     // 9: run-12
  [0x0A, 0, 0, 0, 0x47],     // 10: run-13
  [0x0B, 0, 0, 0, 0x4B],     // 11: run-14
  [0x0C, 0, 0, 0, 0x43],     // 12: run-15
  [0x0D, 0, 0, 0, 0xC3],     // 13: run-16
  [0x0E, 0, 0, 0, 0x47],     // 14: run-17
  // 15: standing
  [0x0F, 9, 0, 0, 0x43],     // 15: stand
  // 16–33: standing jump
  [0x10, 0, 0, 0, 0xC3],     // 16: standjump-9
  [0x11, 0, 0, 0, 0x44],     // 17: standjump-10
  [0x12, 0, 0, 0, 0x46],     // 18: standjump-11
  [0x13, 0, 0, 0, 0x48],     // 19: standjump-12
  [0x14, 0, 0, 0, 0x89],     // 20: standjump-13
  [0x15, 0, 0, 0, 0x0B],     // 21: standjump-14
  [0x16, 0, 0, 0, 0x8B],     // 22: standjump-15
  [0x17, 0, 0, 0, 0x11],     // 23: standjump-16
  [0x18, 0, 0, 0, 0x07],     // 24: standjump-17
  [0x19, 0, 0, 0, 0x05],     // 25: standjump-18
  [0x1A, 0, 0, 0, 0xC1],     // 26: standjump-19
  [0x1B, 0, 0, 0, 0xC6],     // 27: standjump-20
  [0x1C, 0, 0, 0, 0x43],     // 28: standjump-21
  [0x1D, 0, 0, 0, 0x48],     // 29: standjump-22
  [0x1E, 0, 0, 0, 0x42],     // 30: standjump-23
  [0x1F, 0, 0, 0, 0x42],     // 31: standjump-24
  [0x20, 0, 0, 0, 0xC2],     // 32: standjump-25
  [0x21, 0, 0, 0, 0xC2],     // 33: standjump-26
  // 34–44: running jump
  [0x22, 0, 0, 0, 0x43],     // 34: runjump-1
  [0x23, 0, 0, 0, 0x48],     // 35: runjump-2
  [0x24, 0, 0, 0, 0xCE],     // 36: runjump-3
  [0x25, 0, 0, 0, 0xC1],     // 37: runjump-4
  [0x26, 0, 0, 0, 0x45],     // 38: runjump-5
  [0x27, 0, 0, 0, 0x8E],     // 39: runjump-6
  [0x28, 0, 0, 0, 0x0B],     // 40: runjump-7
  [0x29, 0, 0, 0, 0x8B],     // 41: runjump-8
  [0x2A, 0, 0, 0, 0x8A],     // 42: runjump-9
  [0x2B, 0, 0, 0, 0x01],     // 43: runjump-10
  [0x2C, 0, 0, 0, 0xC4],     // 44: runjump-11
  // 45–52: turn
  [0x2D, 0, 0, 0, 0xC3],     // 45: turn-2
  [0x2E, 0, 0, 0, 0xC3],     // 46: turn-3
  [0x2F, 0, 0, 0, 0xA5],     // 47: turn-4
  [0x30, 0, 0, 0, 0xA4],     // 48: turn-5
  [0x31, 0, 0, 0, 0x66],     // 49: turn-6
  [0x32, 0, 4, 0, 0x67],     // 50: turn-7
  [0x33, 0, 3, 0, 0x66],     // 51: turn-8
  [0x34, 0, 1, 0, 0x44],     // 52: turn-10
  // 53–65: runturn
  [0x01, 0x40, 0, 0, 0xC2],  // 53: runturn-8
  [0x02, 0x40, 0, 0, 0x41],  // 54: runturn-9
  [0x03, 0x40, 0, 0, 0x42],  // 55: runturn-10
  [0x04, 0x40, 0, 0, 0x00],  // 56: runturn-11
  [0x05, 0x40, 0, 0, 0x00],  // 57: runturn-12
  [0x06, 0x40, 0, 0, 0x80],  // 58: runturn-13
  [0x07, 0x40, 0, 0, 0x00],  // 59: runturn-14
  [0x08, 0x40, 0, 0, 0x80],  // 60: runturn-15
  [0x09, 0x40, 0, 0, 0x00],  // 61: runturn-16
  [0x0A, 0x40, 0, 0, 0x80],  // 62: runturn-17
  [0x0B, 0x40, 0, 0, 0x00],  // 63: runturn-18
  [0x0C, 0x40, 0, 0, 0x00],  // 64: runturn-19
  [0x0D, 0x40, 0, 0, 0x80],  // 65: runturn-20
  // 66: unused
  [0, 0, 0, 0, 0],           // 66: unused
  // 67–99: jumphang / hangdrop
  [0x11, 0x40, -2, 0, 0x41], // 67: jumphang-2
  [0x12, 0x40, -2, 0, 0x41], // 68: jumphang-3
  [0x13, 0x40, -1, 0, 0xC2], // 69: jumphang-4
  [0x14, 0x40, -2, 0, 0x42], // 70: jumphang-5
  [0x15, 0x40, -2, 0, 0x41], // 71: jumphang-6
  [0x16, 0x40, -2, 0, 0x41], // 72: jumphang-7
  [0x17, 0x40, -2, 0, 0x41], // 73: jumphang-8
  [0x18, 0x40, -1, 0, 0x07], // 74: jumphang-9
  [0x19, 0x40, -1, 0, 0x05], // 75: jumphang-10
  [0x1A, 0x40, 2, 0, 0x07],  // 76: jumphang-11
  [0x1B, 0x40, 2, 0, 0x07],  // 77: jumphang-12
  [0x1C, 0x40, 2, -3, 0x00], // 78: jumphang-13
  [0x1D, 0x40, 2, -10, 0x00],// 79: jumphang-14
  [0x1E, 0x40, 2, -11, 0x80],// 80: jumphang-15
  [0x1F, 0x40, 3, -2, 0x43], // 81: hangdrop-4
  [0x20, 0x40, 3, 0, 0xC3],  // 82: hangdrop-5
  [0x21, 0x40, 3, 0, 0xC3],  // 83: hangdrop-6
  [0x22, 0x40, 3, 0, 0x63],  // 84: hangdrop-7
  [0x23, 0x40, 4, 0, 0xE3],  // 85: hangdrop-8
  [0x1D, 0, 0, 0, 0x00],     // 86: test w/foot
  [0x25, 0x40, 7, -14, 0x80],// 87: jumphang-22
  [0x26, 0x40, 7, -12, 0x80],// 88: jumphang-23
  [0x27, 0x40, 4, -12, 0x00],// 89: jumphang-24
  [0x28, 0x40, 3, -10, 0x80],// 90: jumphang-25
  [0x29, 0x40, 2, -10, 0x80],// 91: jumphang-26
  [0x2A, 0x40, 1, -10, 0x80],// 92: jumphang-27
  [0x2B, 0x40, 0, -11, 0x00],// 93: jumphang-28
  [0x2C, 0x40, -1, -12, 0x00],// 94: jumphang-29
  [0x2D, 0x40, -1, -14, 0x00],// 95: jumphang-30
  [0x2E, 0x40, -1, -14, 0x00],// 96: jumphang-31
  [0x2F, 0x40, -1, -15, 0x80],// 97: jumphang-32
  [0x30, 0x40, -1, -15, 0x80],// 98: jumphang-33
  [0x31, 0x40, 0, -15, 0x00],// 99: jumphang-34
  // 100–101: unused
  [0, 0, 0, 0, 0],           // 100: unused
  [0, 0, 0, 0, 0],           // 101: unused
  // 102–119: jumpfall
  [0x32, 0x40, 0, 0, 0xC6],  // 102: jumpfall-2
  [0x33, 0x40, 0, 0, 0x46],  // 103: jumpfall-3
  [0x34, 0x40, 0, 0, 0xC5],  // 104: jumpfall-4
  [0x35, 0x40, 0, 0, 0x45],  // 105: jumpfall-5
  [0x36, 0x40, 0, 0, 0xC2],  // 106: jumpfall-6
  [0x37, 0x40, 0, 0, 0xC4],  // 107: jumpfall-7
  [0x38, 0x40, 0, 0, 0xC5],  // 108: jumpfall-8
  [0x39, 0x40, 0, 0, 0x46],  // 109: jumpfall-9
  [0x3A, 0x40, 0, 0, 0x47],  // 110: jumpfall-10
  [0x3B, 0x40, 0, 0, 0x47],  // 111: jumpfall-11
  [0x3C, 0x40, 0, 0, 0x49],  // 112: jumpfall-12
  [0x3D, 0x40, 0, 0, 0xC8],  // 113: jumpfall-13
  [0x3E, 0x40, 0, 0, 0xC9],  // 114: jumpfall-14
  [0x3F, 0x40, 0, 0, 0x49],  // 115: jumpfall-15
  [0x40, 0x40, 0, 0, 0x45],  // 116: jumpfall-16
  [0x41, 0x40, 2, 0, 0x45],  // 117: jumpfall-17
  [0x42, 0x40, 2, 0, 0xC5],  // 118: jumpfall-18
  [0x43, 0x40, 0, 0, 0xC3],  // 119: jumpfall-19
  // 120: unused
  [0, 0, 0, 0, 0],           // 120: unused
  // 121–132: stepfwd
  [0x01, 0x80, 0, 0, 0x43],  // 121: stepfwd-1
  [0x02, 0x80, 0, 0, 0xC4],  // 122: stepfwd-2
  [0x03, 0x80, 0, 0, 0xC5],  // 123: stepfwd-3
  [0x04, 0x80, 0, 0, 0x48],  // 124: stepfwd-4
  [0x05, 0x80, 0, 0, 0x6C],  // 125: stepfwd-5
  [0x06, 0x80, 0, 0, 0xCF],  // 126: stepfwd-6 (was $DF)
  [0x07, 0x80, 0, 0, 0x63],  // 127: stepfwd-7
  [0x08, 0x80, 0, 0, 0xC3],  // 128: stepfwd-8
  [0x09, 0x80, 0, 0, 0x43],  // 129: stepfwd-9
  [0x0A, 0x80, 0, 0, 0x43],  // 130: stepfwd-10
  [0x0B, 0x80, 0, 0, 0x44],  // 131: stepfwd-11
  [0x0C, 0x80, 0, 0, 0x44],  // 132: stepfwd-12
  // 133–134: sheathe (tail)
  [0x3E, 0x80, 0, 1, 0xC1],  // 133: sheathe34
  [0x3F, 0x80, 0, 1, 0xC7],  // 134: sheathe37
  // 135–149: climbup
  [0x0D, 0x80, 0, -12, 0x01],  // 135: climbup-int1 (fdx=0, fdy=51-63=-12)
  [0x0E, 0x80, 0, -21, 0x00],  // 136: climbup-int2 (fdy=42-63=-21)
  [0x0F, 0x80, 1, -26, 0x80],  // 137: climbup-8 (fdx=-4+5=1, fdy=37-63=-26)
  [0x10, 0x80, 4, -32, 0x80],  // 138: climbup-10 (fdx=-1+5=4, fdy=31-63=-32)
  [0x11, 0x80, 6, -36, 0x81],  // 139: climbup-14 (fdx=1+5=6, fdy=27-63=-36)
  [0x12, 0x80, 7, -41, 0x82],  // 140: climbup-16 (fdx=2+5=7, fdy=22-63=-41)
  [0x13, 0x80, 2, 17, 0x42],   // 141: climbup-22
  [0x14, 0x80, 4, 9, 0xC4],    // 142: climbup-28
  [0x15, 0x80, 4, 5, 0xC9],    // 143: climbup-30
  [0x16, 0x80, 4, 4, 0xC8],    // 144: climbup-32
  [0x17, 0x80, 5, 0, 0x69],    // 145: climbup-34
  [0x18, 0x80, 5, 0, 0xC9],    // 146: climbup-35 (was $E9)
  [0x19, 0x80, 5, 0, 0xC8],    // 147: climbup-36 (was $E8)
  [0x1A, 0x80, 5, 0, 0x69],    // 148: climbup-37
  [0x1B, 0x80, 5, 0, 0x69],    // 149: climbup-38
  // 150–189: sword fighting / special (kid version — guards use ALTSET1)
  [0x8B, 16, 0, 2, 0x80],      // 150: missed block
  [0x81, 26, 0, 2, 0x80],      // 151
  [0x82, 18, 3, 2, 0x00],      // 152: guy4/rob20
  [0x83, 22, 7, 2, 0xC4],      // 153
  [0x84, 21, 10, 2, 0x00],     // 154: full ext
  [0x85, 23, 7, 2, 0x80],      // 155: guy-7
  [0x86, 25, 4, 2, 0x80],      // 156: guy-8
  [0x87, 24, 0, 2, 0xCE],      // 157: guy-9
  [0x88, 15, 0, 2, 0xCD],      // 158: guy-10 (ready)
  [0x89, 20, 3, 2, 0x00],      // 159: guy19
  [0x8A, 31, 3, 2, 0x00],      // 160: guy20
  [0x8B, 16, 0, 2, 0x80],      // 161: guy21 (blocking)
  [0x8C, 17, 0, 2, 0x80],      // 162: block-to-strike
  [0x8D, 32, 0, 2, 0x00],      // 163: advance
  [0x8E, 33, 0, 2, 0x80],      // 164
  [0x8F, 34, 2, 2, 0xC3],      // 165
  [0x0F, 0, 0, 0, 0x43],       // 166: stand (guard alert-stand uses kid stand img)
  [0x91, 19, 7, 2, 0x80],      // 167: blocked
  [0x92, 14, 1, 2, 0x80],      // 168: pre-strike
  [0x93, 27, 0, 2, 0x80],      // 169: begin block
  [0x88, 15, 0, 2, 0xCD],      // 170: ready (dup)
  [0x88, 15, 0, 2, 0xCD],      // 171: ready (dup)
  // 172–178: stabbed/impaled/halved
  [0x32, 0x6B, 0, 0, 0xC6],    // 172: jumpfall-2 (stabbed)
  [0x33, 0x6C, 0, 0, 0x46],    // 173: jumpfall-3
  [0x34, 0x6D, 0, 0, 0xC5],    // 174: jumpfall-4
  [0x35, 0x6E, 0, 0, 0x45],    // 175: jumpfall-5
  [0x34, 0x40, 0, 0, 0xC5],    // 176
  [0x0F, 0x40, 0, 3, 0x8A],    // 177: impaled
  [0x0E, 0x40, 4, 3, 0x87],    // 178: halves
  // 179–183: collapse
  [0xA8, 0, 0, 1, 0x44],       // 179: collapse15
  [0xA9, 0, 0, 1, 0x44],       // 180: collapse16
  [0xAA, 0, 0, 1, 0x44],       // 181: collapse17
  [0xAB, 0, 0, 1, 0x47],       // 182: collapse18
  [0xAC, 0, 0, 7, 0x4B],       // 183: collapse19
  // 184: unused
  [0, 0, 0, 0, 0],             // 184: unused
  // 185: dead
  [0x10, 0x40, 4, 7, 0x49],    // 185: dead
  // 186–188: mouse
  [0x44, 0x40, 0, 0, 0x44],    // 186: mouse-1
  [0x45, 0x40, 0, 0, 0x44],    // 187: mouse-2
  [0x46, 0x40, 0, 2, 0x44],    // 188: mouse crouch
  // 189–190: unused
  [0, 0, 0, 0, 0],             // 189: unused
  [0, 0, 0, 0, 0],             // 190: unused
  // 191–205: drinking
  [0x94, 0, 0, 0, 0x00],       // 191: drink4
  [0x95, 0, 0, 1, 0x00],       // 192: drink5
  [0x96, 0, 0, 0, 0x80],       // 193: drink6
  [0x97, 0, 0, 0, 0x00],       // 194: drink7
  [0x98, 0, -1, 0, 0x00],      // 195: drink8
  [0x99, 0, -1, 0, 0x00],      // 196: drink9
  [0x9A, 0, -1, 0, 0x00],      // 197: drink10
  [0x9B, 0, -4, 0, 0x00],      // 198: drink11
  [0x9C, 0, -4, 0, 0x80],      // 199: drink12
  [0x9D, 0, -4, 0, 0x00],      // 200: drink13
  [0x9E, 0, -4, 0, 0x00],      // 201: drink14
  [0x9F, 0, -4, 0, 0x00],      // 202: drink15
  [0xA0, 0, -4, 0, 0x00],      // 203: drink16
  [0xA1, 0, -5, 0, 0x00],      // 204: drink17
  [0xA2, 0, -5, 0, 0x00],      // 205: drink18
  // 206: unused
  [0xA3, 0, 0, 0, 0],          // 206: unused
  // 207–210: draw sword
  [0xA4, 0, 0, 1, 0x46],       // 207: draw5
  [0xA5, 0, 0, 1, 0xC6],       // 208: draw6
  [0xA6, 0, 0, 1, 0xC8],       // 209: draw7
  [0xA7, 0, 0, 1, 0x4A],       // 210: draw8
  // 211–216: unused
  [0, 0, 0, 0, 0],             // 211
  [0, 0, 0, 0, 0],             // 212
  [0, 0, 0, 0, 0],             // 213
  [0, 0, 0, 0, 0],             // 214
  [0, 0, 0, 0, 0],             // 215
  [0, 0, 0, 0, 0],             // 216
  // 217–228: climb stairs
  [0x35, 0, 0, 0, 0x80],       // 217: climbst2
  [0x36, 0, 0, 0, 0x00],       // 218: climbst3
  [0x37, 0, 0, 0, 0x00],       // 219: climbst4
  [0x38, 0, 0, 0, 0x00],       // 220: climbst5
  [0x39, 0, 0, 0, 0x80],       // 221: climbst6
  [0x3A, 0, 0, 0, 0x00],       // 222: climbst7
  [0x3B, 0, 0, 0, 0x00],       // 223: climbst8
  [0x3C, 0, 0, 0, 0x00],       // 224: climbst9
  [0x3D, 0, 0, 0, 0x80],       // 225: climbst10
  [0x3E, 0, 0, 0, 0x00],       // 226: climbst11
  [0x3F, 0, 0, 0, 0x80],       // 227: climbst12
  [0x40, 0, 0, 0, 0x00],       // 228: climbst13
  // 229–240: sheathing
  [0x32, 0x80 + 35, 1, 1, 0xC3],  // 229: sheathe22
  [0x33, 0x80 + 36, 0, 1, 0x49],  // 230: sheathe23
  [0x34, 0x80 + 37, 0, 1, 0xC3],  // 231: sheathe24
  [0x35, 0x80 + 38, 0, 1, 0x49],  // 232: sheathe25
  [0x36, 0x80 + 39, 0, 1, 0xC3],  // 233: sheathe26
  [0x37, 0x80 + 40, 1, 1, 0x49],  // 234: sheathe27
  [0x38, 0x80 + 41, 1, 1, 0x43],  // 235: sheathe28
  [0x39, 0x80 + 42, 1, 1, 0xC9],  // 236: sheathe29
  [0x3A, 0x80, 4, 1, 0xC6],       // 237: sheathe30
  [0x3B, 0x80, 3, 1, 0xCA],       // 238: sheathe31
  [0x3C, 0x80, 1, 1, 0x43],       // 239: sheathe32
  [0x3D, 0x80, 1, 1, 0xC8],       // 240: sheathe33
];

// ─── Alternate set 1 (ALTSET1) — guards, 40 frames (150–189) ────────────────
const ALTSET1_RAW = [
  null, // placeholder so index maps to frame - 150
  [0x0B, 0xCD, 2, 1, 0x00],    // 150: missed block
  [0x01, 0xC1, 3, 1, 0x00],    // 151: guy-3
  [0x02, 0xC2, 4, 1, 0x00],    // 152: guy-4
  [0x03, 0xC3, 7, 1, 0x44],    // 153: guy-5
  [0x04, 0xC4, 10, 1, 0x00],   // 154: full ext
  [0x05, 0xC5, 7, 1, 0x80],    // 155: guy-7
  [0x06, 0xC6, 4, 1, 0x80],    // 156: guy-8
  [0x07, 0xC7, 0, 1, 0x80],    // 157: guy-9
  [0x08, 0xC8, 0, 1, 0xCD],    // 158: guy-10 (ready)
  [0x09, 0xCB, 7, 1, 0x80],    // 159: guy-19
  [0x0A, 0xCC, 3, 1, 0x00],    // 160: guy-20
  [0x0B, 0xCD, 2, 1, 0x00],    // 161: guy-21 (blocking)
  [0x0C, 0xC0, 2, 1, 0x00],    // 162: guy-22
  [0x0D, 0xDC, 0, 1, 0x00],    // 163: advance
  [0x0E, 0xDD, 0, 1, 0x80],    // 164
  [0x0F, 0xDE, 2, 1, 0xC3],    // 165
  [0x10, 0xC9, -1, 1, 0x48],   // 166: alertstand
  [0x11, 0xCA, 7, 1, 0x80],    // 167: blocked
  [0x12, 0xCE, 3, 1, 0x80],    // 168: pre-strike
  [0x08, 0xC8, 0, 1, 0x80],    // 169: ready→block
  [0x13, 0xC8, 0, 1, 0xCD],    // 170: ready (variant)
  [0x14, 0xC8, 0, 1, 0xCD],    // 171: ready (variant)
  // 172–176: stabbed/falling
  [0x15, 0xEF, 0, 0, 0xC6],    // 172: jumpfall-2 (stabbed)
  [0x16, 0xF0, 0, 0, 0x46],    // 173
  [0x17, 0xF1, 0, 0, 0xC5],    // 174
  [0x17, 0xF1, 0, 0, 0xC5],    // 175
  [0x17, 0xF1, 0, 0, 0xC5],    // 176
  // 177–178: impaled/halved
  [0x19, 0xC0, 0, 3, 0x8A],    // 177: impaled
  [0x1A, 0xC0, 4, 4, 0x87],    // 178: halves
  // 179–183: collapse
  [0x1B, 0xC0, -2, 1, 0x44],   // 179: collapse15
  [0x1C, 0xC0, -2, 1, 0x44],   // 180
  [0x1D, 0xC0, -2, 1, 0x44],   // 181
  [0x1E, 0xC0, -2, 2, 0x47],   // 182
  [0x1F, 0xC0, -2, 2, 0x4A],   // 183: collapse19
  // 184: unused
  [0, 0, 0, 0, 0],             // 184
  // 185: dead
  [0x20, 0xC0, 3, 4, 0xC9],    // 185: dead
  // 186–189: unused
  [0, 0, 0, 0, 0],             // 186
  [0, 0, 0, 0, 0],             // 187
  [0, 0, 0, 0, 0],             // 188
  [0, 0, 0, 0, 0],             // 189
];

// ─── Sword table (SWORDTAB) — 50 entries ─────────────────────────────────────
// Each: [image, dx, dy] — image is from chtable3 (1-based)
// dx/dy are signed offsets relative to character position
const SWORDTAB_RAW = [
  null, // 0: unused (sword indices are 1-based)
  [0x1D, 0, -9],      // 1
  [0x22, -9, -29],     // 2
  [0x1E, 7, -25],      // 3
  [0x1F, 17, -26],     // 4
  [0x23, 7, -14],      // 5
  [0x24, 0, -5],       // 6
  [0x20, 17, -16],     // 7
  [0x21, 16, -19],     // 8
  [0x4B, 12, -9],      // 9: alertstand sword
  [0x26, 13, -34],     // 10
  [0x27, 7, -25],      // 11
  [0x28, 10, -16],     // 12
  [0x29, 10, -11],     // 13
  [0x2A, 22, -21],     // 14
  [0x2B, 28, -23],     // 15
  [0x2C, 13, -35],     // 16
  [0x2D, 0, -38],      // 17
  [0x2E, 0, -29],      // 18
  [0x2F, 21, -19],     // 19
  [0x30, 14, -23],     // 20
  [0x31, 21, -22],     // 21
  [0x31, 22, -23],     // 22
  [0x2F, 7, -13],      // 23
  [0x2F, 15, -18],     // 24
  [0x24, 0, -8],       // 25
  [0x1E, 7, -27],      // 26
  [0x48, 14, -28],     // 27
  [0x26, 7, -27],      // 28
  [0x21, 6, -23],      // 29
  [0x21, 9, -21],      // 30
  [0x28, 11, -18],     // 31
  [0x2B, 24, -23],     // 32
  [0x2B, 19, -23],     // 33
  [0x2B, 21, -23],     // 34
  // 35–42: sheathing
  [0x40, 7, -32],      // 35
  [0x41, 14, -32],     // 36
  [0x42, 14, -31],     // 37
  [0x43, 14, -29],     // 38
  [0x44, 28, -28],     // 39
  [0x45, 28, -28],     // 40
  [0x46, 21, -25],     // 41
  [0x47, 14, -22],     // 42
  // 43–46: kid stabbed
  [0x00, 14, -25],     // 43
  [0x00, 21, -25],     // 44
  [0x4A, 0, -16],      // 45
  [0x26, 8, -37],      // 46
  // 47–50: enemy stabbed
  [0x4C, 14, -24],     // 47
  [0x4D, 14, -24],     // 48
  [0x4E, 7, -14],      // 49
  [0x26, 8, -37],      // 50
];

// ─── Constants ───────────────────────────────────────────────────────────────

export const SCRN_LEFT = 58;
export const SCRN_TOP  = 0;
export const VERT_DIST = 10;
export const BLOCK_HEIGHT = 63;

// FloorY[row+1] = where character feet touch for each block row
export const FLOOR_Y = [-8, 55, 118, 181, 244];

// Guard character set per level (MISC.S chset[])
// 0=GD, 1=SKEL, 2=FAT, 3=SHAD, 4=VIZ, 5=VIZ2
export const CHSET_FOR_LEVEL = [0, 0, 0, 1, 2, 2, 3, 2, 2, 2, 2, 2, 4, 5, 5];

// Map chset index to CHTAB4 filename suffix
export const CHSET_FILE = ['GD', 'SKEL', 'FAT', 'SHAD', 'VIZ', 'VIZ'];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Decode Fimage + Fsword into table index and image index.
 *
 * @param {number} fimage  Raw Fimage byte
 * @param {number} fsword  Raw Fsword byte
 * @returns {{ tableIndex: number, imageIndex: number }}
 */
export function decodeim(fimage, fsword) {
  // tableIndex = ((Fimage & 0x80) | ((Fsword & 0xC0) >> 1)) >> 5
  const tableBit2 = (fimage & 0x80);       // 0 or 0x80
  const tableBits01 = (fsword & 0xC0) >> 1; // 0, 0x20, 0x40, or 0x60
  const tableIndex = (tableBit2 | tableBits01) >> 5;
  const imageIndex = fimage & 0x7F;
  return { tableIndex, imageIndex };
}

/**
 * Get frame definition for a character.
 *
 * @param {number} charPosn  Frame number (1-based)
 * @param {number} charId    Character ID: 0=kid, 1-4=guard, 24=mouse
 * @returns {{ fimage, fsword, fdx, fdy, fcheck } | null}
 */
export function getFrameDef(charPosn, charId) {
  if (charPosn < 1 || charPosn > 240) return null;

  let entry;
  // Guards (charId 1-4) use ALTSET1 for frames 150-189
  if (charId >= 1 && charId <= 4 && charPosn >= 150 && charPosn <= 189) {
    const idx = charPosn - 150 + 1; // +1 because ALTSET1_RAW[0] is null
    entry = ALTSET1_RAW[idx];
  } else {
    entry = FDEF_RAW[charPosn];
  }

  if (!entry) return null;

  return {
    fimage: entry[0],
    fsword: entry[1],
    fdx:    s(entry[2]),  // sign-extend
    fdy:    s(entry[3]),  // sign-extend
    fcheck: entry[4],
  };
}

/**
 * Get sword definition for a sword frame number.
 *
 * @param {number} swordNum  Sword frame (1–50, from Fsword & 0x3F)
 * @returns {{ image: number, dx: number, dy: number } | null}
 */
export function getSwordDef(swordNum) {
  if (swordNum < 1 || swordNum >= SWORDTAB_RAW.length) return null;
  const entry = SWORDTAB_RAW[swordNum];
  if (!entry) return null;
  return {
    image: entry[0],
    dx: s(entry[1]),
    dy: s(entry[2]),
  };
}

/**
 * Compute character screen coordinates from game coordinates.
 * Replicates SETUPCHAR from CTRLSUBS.S.
 *
 * @param {number} charX     X in 140-resolution
 * @param {number} charY     Y in screen scanlines (foot position)
 * @param {number} charFace  -1=left, 1=right
 * @param {number} charPosn  Frame number
 * @param {number} charId    Character ID
 * @returns {Object|null}
 */
export function setupChar(charX, charY, charFace, charPosn, charId) {
  const fdef = getFrameDef(charPosn, charId);
  if (!fdef) return null;

  const { fimage, fsword, fdx, fdy, fcheck } = fdef;
  const { tableIndex, imageIndex } = decodeim(fimage, fsword);

  // Adjust fdx for face direction (negate if facing left)
  const fdxAdj = (charFace < 0) ? -fdx : fdx;

  // FCharX in 280-resolution (doubled from 140-res)
  let fCharX = ((charX + fdxAdj) - SCRN_LEFT) * 2;

  // Parity check: Fcheck XOR face → if bit 6 set, add 1 for odd pixel alignment
  // Fcheck bit 7 encodes parity; face -1 = 0xFF, +1 = 0x00
  // The XOR checks if even/odd pixel alignment is needed
  const faceVal = (charFace < 0) ? 0x80 : 0x00;
  if ((fcheck ^ faceVal) & 0x80) {
    fCharX += 1;
  }

  const fCharY = charY + fdy;

  // Convert FCharX (280-res) to byte column + offset
  const xco = Math.floor(fCharX / 7);
  const offset = ((fCharX % 7) + 7) % 7;  // ensure non-negative modulo

  // Sword frame number (bits 0-5 of Fsword)
  const swordFrame = fsword & 0x3F;

  return {
    xco,
    offset,
    y: fCharY,
    tableIndex,
    imageIndex,
    face: charFace,
    swordFrame,
    fCharX,
  };
}
