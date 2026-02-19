/**
 * seqInterpreter.js — Sequence table bytecode interpreter.
 *
 * Ported from ANIMCHAR in COLL.S.
 * Reads bytes from the sequence table via charSeq pointer,
 * dispatches opcodes, and advances to the next frame.
 */

import { SEQ_DATA, SEQ_OPCODES } from './seqtable.js';
import { addCharX, applyGravity, addFall, ACTION } from './charState.js';

// ── Opcode constants (re-exported for readability) ─────────────────────────
const OP = SEQ_OPCODES;

// Safety limit to prevent infinite loops in malformed sequences
const MAX_OPCODES_PER_TICK = 200;

/**
 * Read one byte from the sequence stream and advance the pointer.
 *
 * Replicates GETSEQ from CTRLSUBS.S.
 *
 * @param {import('./charState.js').CharState} char
 * @returns {number} byte value (0–255)
 */
function getSeq(char) {
  const byte = SEQ_DATA[char.charSeq] || 0;
  char.charSeq++;
  return byte;
}

/**
 * Read a signed byte from the sequence stream.
 * Values > 127 are negative (two's complement).
 *
 * @param {import('./charState.js').CharState} char
 * @returns {number} signed value (-128..127)
 */
function getSeqSigned(char) {
  const b = getSeq(char);
  return b > 127 ? b - 256 : b;
}

/**
 * Read a 16-bit LE address from the sequence stream.
 *
 * @param {import('./charState.js').CharState} char
 * @returns {number} 16-bit address (byte offset into SEQ_DATA)
 */
function getSeqAddr(char) {
  const lo = getSeq(char);
  const hi = getSeq(char);
  return lo | (hi << 8);
}

/**
 * Advance one animation frame.
 *
 * Reads sequence bytes in a loop, processing all opcodes until
 * a positive frame number is encountered. That frame number is
 * stored in charPosn and the function returns.
 *
 * Replicates ANIMCHAR from COLL.S.
 *
 * @param {import('./charState.js').CharState} char
 * @param {AnimContext} [ctx]  Optional context for side effects
 * @returns {boolean} true if a frame was set, false if sequence ended abnormally
 */
export function animChar(char, ctx) {
  const context = ctx || {};
  let safety = MAX_OPCODES_PER_TICK;

  while (safety-- > 0) {
    // Bounds check
    if (char.charSeq < 0 || char.charSeq >= SEQ_DATA.length) {
      console.warn(`animChar: charSeq out of bounds (${char.charSeq})`);
      return false;
    }

    const byte = getSeq(char);

    // Apple II logic: bmi checks bit 7.
    // 0x00-0x7F (0-127) → frame number (including 0 = invisible).
    // 0x80-0xFF → check for opcodes (0xF1-0xFF), else treat as frame.
    if (byte < 0x80) {
      // Positive byte: it's a frame number
      char.charPosn = byte;
      return true;
    }

    // ── Opcode dispatch (0xF1-0xFF) ─────────────────────────────────
    switch (byte) {
      case OP.goto: {
        // 0xFF: jump to absolute address (2-byte LE)
        const addr = getSeqAddr(char);
        char.charSeq = addr;
        break;
      }

      case OP.aboutface:
        // 0xFE: flip facing direction
        char.charFace = -char.charFace;
        break;

      case OP.up:
        // 0xFD: move one block up
        char.charBlockY--;
        if (context.onBlockChange) context.onBlockChange(char, 'up');
        break;

      case OP.down:
        // 0xFC: move one block down
        char.charBlockY++;
        if (context.onBlockChange) context.onBlockChange(char, 'down');
        break;

      case OP.chx: {
        // 0xFB: change X by signed delta (direction-aware)
        const dx = getSeqSigned(char);
        addCharX(char, dx);
        break;
      }

      case OP.chy: {
        // 0xFA: change Y by signed delta
        const dy = getSeqSigned(char);
        char.charY += dy;
        break;
      }

      case OP.act: {
        // 0xF9: set action code
        const action = getSeq(char);
        char.charAction = action;
        break;
      }

      case OP.setfall: {
        // 0xF8: set fall velocities
        const xvel = getSeqSigned(char);
        const yvel = getSeq(char);
        char.charXVel = xvel;
        char.charYVel = yvel;
        break;
      }

      case OP.ifwtless: {
        // 0xF7: conditional jump if weightless
        const addr = getSeqAddr(char);
        if (context.weightless) {
          char.charSeq = addr;
        }
        // else: addr already consumed, continue
        break;
      }

      case OP.die:
        // 0xF6: pure no-op in ANIMCHAR (death state set by external logic)
        if (context.onDie) context.onDie(char);
        break;

      case OP.jaru:
        // 0xF5: jar floorboards above
        if (context.onJar) context.onJar(char, 'up');
        break;

      case OP.jard:
        // 0xF4: jar floorboards below
        if (context.onJar) context.onJar(char, 'down');
        break;

      case OP.effect: {
        // 0xF3: trigger effect
        const fx = getSeq(char);
        if (context.onEffect) context.onEffect(char, fx);
        break;
      }

      case OP.tap: {
        // 0xF2: sound/tap event
        const snd = getSeq(char);
        if (context.onTap) context.onTap(char, snd);
        break;
      }

      case OP.nextlevel:
        // 0xF1: trigger next level
        if (context.onNextLevel) context.onNextLevel(char);
        break;

      default:
        // Unrecognized byte >= 0x80 that's not an opcode.
        // Apple II fallthrough: treat as frame number.
        char.charPosn = byte;
        return true;
    }
  }

  console.warn('animChar: exceeded opcode limit (infinite loop?)');
  return false;
}

/**
 * Run one full animation tick for a character.
 *
 * This combines the per-frame pipeline:
 *   1. animChar  — advance sequence to next frame
 *   2. gravity   — accelerate fall if freefalling
 *   3. addFall   — apply velocity to position
 *
 * @param {import('./charState.js').CharState} char
 * @param {AnimContext} [ctx]
 * @returns {boolean} true if frame was set
 */
export function animTick(char, ctx) {
  const ok = animChar(char, ctx);
  if (!ok) return false;

  // Physics (only matters for falling sequences)
  applyGravity(char, ctx?.weightless);
  addFall(char);

  return true;
}

/**
 * @typedef {Object} AnimContext
 * @property {boolean}  [weightless]    - Is the character weightless?
 * @property {Function} [onBlockChange] - Called on up/down block transitions
 * @property {Function} [onDie]         - Called on die opcode
 * @property {Function} [onJar]         - Called on jaru/jard
 * @property {Function} [onEffect]      - Called on effect opcode
 * @property {Function} [onTap]         - Called on tap/sound opcode
 * @property {Function} [onNextLevel]   - Called on nextlevel opcode
 */
