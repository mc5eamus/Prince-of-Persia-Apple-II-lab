#!/usr/bin/env node
/**
 * Assembles SEQTABLE.S into a JavaScript module.
 * Two-pass assembler: pass 1 collects labels, pass 2 emits bytes.
 */

const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', '01 POP Source', 'Source', 'SEQTABLE.S');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

// Opcode constants (as signed values, stored as unsigned bytes)
const OPCODES = {
  goto: -1,
  aboutface: -2,
  up: -3,
  down: -4,
  chx: -5,
  chy: -6,
  act: -7,
  setfall: -8,
  ifwtless: -9,
  die: -10,
  jaru: -11,
  jard: -12,
  effect: -13,
  tap: -14,
  nextlevel: -15,
};

function signedToUnsigned(v) {
  if (v < 0) return v + 256;
  return v & 0xFF;
}

// Parse a single value token - could be a number, symbol name, or opcode
function parseValue(token, symbols) {
  token = token.trim();
  if (token === '') return null;

  // Check if it's an opcode name
  if (OPCODES.hasOwnProperty(token)) {
    return signedToUnsigned(OPCODES[token]);
  }

  // Check if it's a numeric literal (decimal or hex)
  if (/^-?\$[0-9a-fA-F]+$/.test(token)) {
    const v = parseInt(token.replace('$', token.startsWith('-') ? '-0x' : '0x'), 16);
    return signedToUnsigned(v);
  }
  if (/^-?[0-9]+$/.test(token)) {
    const v = parseInt(token, 10);
    return signedToUnsigned(v);
  }

  // It's a symbol reference - return as placeholder
  if (symbols && symbols.hasOwnProperty(token)) {
    return signedToUnsigned(symbols[token]);
  }

  return { symbolRef: token };
}

function assemble(pass, labels) {
  let offset = 0;
  const bytes = [];
  const currentLabels = {}; // labels defined in this pass
  let inDoZero = false; // track `do 0` ... `fin` blocks
  let currentScope = ''; // for local labels like :loop

  // The dispatch table entries (from lines with :N dw label)
  const dispatchEntries = []; // {index, label}
  // Sequence name mapping
  const seqNames = {};

  // All sequence names from the dispatch table
  const dispatchLabels = [];

  function emitByte(b) {
    if (pass === 2) {
      bytes.push(b & 0xFF);
    }
    offset++;
  }

  function emitWord(val) {
    // Little-endian 16-bit
    emitByte(val & 0xFF);
    emitByte((val >> 8) & 0xFF);
  }

  function resolveLabel(name) {
    if (labels && labels.hasOwnProperty(name)) {
      return labels[name];
    }
    return null;
  }

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    let line = lines[lineNum];

    // Remove comment after semicolon (but not inside strings)
    const semiIdx = line.indexOf(';');
    if (semiIdx >= 0) {
      line = line.substring(0, semiIdx);
    }

    // Trim
    line = line.trim();

    // Skip empty lines and full-line comments
    if (!line || line.startsWith('*') || line.startsWith(';')) continue;

    // Skip assembler directives we don't need
    if (line.startsWith('org') || line.startsWith('tr ') || line.startsWith('lst') ||
        line.startsWith('lstdo') || line.startsWith('ds ') || line.startsWith('usr ')) continue;

    // Handle opcode definitions (symbol = value)
    if (/^[a-zA-Z]\w*\s*=\s*/.test(line)) continue; // already handled

    // Handle `do 0` ... `fin` conditional assembly (disabled block)
    if (/^\s*do\s+0\s*$/.test(line) || line === 'do 0') {
      inDoZero = true;
      continue;
    }
    if (line === 'fin') {
      inDoZero = false;
      continue;
    }
    if (inDoZero) continue;

    // Handle dispatch table entries: :N dw label
    const dispatchMatch = line.match(/^:(\d+)\s+dw\s+(\w+)$/);
    if (dispatchMatch) {
      const idx = parseInt(dispatchMatch[1], 10);
      const label = dispatchMatch[2];
      if (pass === 1) {
        dispatchEntries.push({ index: idx, label });
        dispatchLabels.push({ index: idx, label });
      }
      // Emit 2 bytes for the word
      if (pass === 2) {
        const addr = resolveLabel(label);
        if (addr === null) {
          console.error(`Unresolved dispatch label: ${label} at line ${lineNum + 1}`);
          emitWord(0);
        } else {
          emitWord(addr);
        }
      } else {
        offset += 2;
      }
      continue;
    }

    // Check for label definition at start of line
    // Labels: identifier at column 0 (not starting with space/tab), optionally followed by instruction
    // Also handle local labels like :loop, :crouch, :dead
    let restOfLine = line;

    // Check for global label (starts with letter, at column 0 in original)
    // In our trimmed line, a label is a word followed by nothing or by db/dw
    // But we need to check the ORIGINAL line to see if it starts at column 0
    const origLine = lines[lineNum];
    const startsAtCol0 = origLine.length > 0 && origLine[0] !== ' ' && origLine[0] !== '\t' &&
                         origLine[0] !== '*' && origLine[0] !== ';';

    if (startsAtCol0) {
      // Could be a label definition
      const labelMatch = line.match(/^([a-zA-Z]\w*)(\s+(.*))?$/);
      if (labelMatch) {
        const labelName = labelMatch[1];
        // Exclude known directives
        if (!['db', 'dw', 'org', 'do', 'fin', 'tr', 'lst', 'lstdo', 'ds', 'usr'].includes(labelName) &&
            !OPCODES.hasOwnProperty(labelName)) {
          currentLabels[labelName] = offset;
          currentScope = labelName;
          restOfLine = labelMatch[3] || '';
          restOfLine = restOfLine.trim();
        }
      }
    }

    // Check for local label (:name)
    const localLabelMatch = restOfLine.match(/^:(\w+)\s*(.*)/);
    if (localLabelMatch) {
      const localName = currentScope + ':' + localLabelMatch[1];
      currentLabels[localName] = offset;
      restOfLine = localLabelMatch[2] || '';
      restOfLine = restOfLine.trim();
    }

    if (!restOfLine) continue;

    // Parse instruction
    // Handle `db` directive
    if (restOfLine.startsWith('db ') || restOfLine.startsWith('db\t')) {
      const args = restOfLine.substring(3).trim();
      // Split by comma, being careful
      const tokens = args.split(',').map(t => t.trim());

      for (const token of tokens) {
        if (!token) continue;
        const val = parseValue(token, pass === 2 ? labels : null);
        if (val === null) continue;
        if (typeof val === 'object' && val.symbolRef) {
          if (pass === 2) {
            console.error(`Unresolved symbol in db: ${val.symbolRef} at line ${lineNum + 1}`);
          }
          emitByte(0);
        } else {
          emitByte(val);
        }
      }
      continue;
    }

    // Handle `dw` directive (always after a `db goto` or `db ifwtless` or dispatch entry)
    if (restOfLine.startsWith('dw ') || restOfLine.startsWith('dw\t')) {
      const label = restOfLine.substring(3).trim();
      let resolvedLabel = label;

      // Handle local label references
      if (label.startsWith(':')) {
        resolvedLabel = currentScope + label;
      }

      if (pass === 2) {
        const addr = resolveLabel(resolvedLabel);
        if (addr === null) {
          console.error(`Unresolved label in dw: ${resolvedLabel} (original: ${label}) at line ${lineNum + 1}`);
          emitWord(0);
        } else {
          emitWord(addr);
        }
      } else {
        offset += 2;
      }
      continue;
    }

    // If we get here, unhandled line
    if (restOfLine && !restOfLine.startsWith('*')) {
      // Could be more label+instruction combos on same line that we missed
      // console.error(`Unhandled line ${lineNum + 1}: "${restOfLine}"`);
    }
  }

  return { labels: currentLabels, bytes, dispatchEntries, dispatchLabels, offset };
}

// Pass 1: collect all labels
console.log('Pass 1: collecting labels...');
const pass1 = assemble(1, null);
console.log(`Pass 1 complete. Total bytes: ${pass1.offset}`);
console.log(`Labels found: ${Object.keys(pass1.labels).length}`);

// Pass 2: emit bytes with resolved labels
console.log('Pass 2: emitting bytes...');
const pass2 = assemble(2, pass1.labels);
console.log(`Pass 2 complete. Total bytes: ${pass2.bytes.length}`);

// Verify
if (pass1.offset !== pass2.bytes.length) {
  console.error(`Size mismatch: pass1=${pass1.offset} pass2=${pass2.bytes.length}`);
}

// Build the SEQ constants from dispatch entries
const seqMap = {};
for (const entry of pass1.dispatchLabels) {
  seqMap[entry.label] = entry.index;
}

// Build SEQ_NAMES
const seqNames = new Array(115).fill('');
for (const entry of pass1.dispatchLabels) {
  seqNames[entry.index] = entry.label;
}

// Collect important internal labels for export
const internalLabels = [
  'runcyc1', 'runcyc2', 'runcyc3', 'runcyc4', 'runcyc5', 'runcyc6', 'runcyc7', 'runcyc8',
  'runstt1', 'runstt2', 'runstt3', 'runstt4', 'runstt5', 'runstt6',
  'ready', 'guy3', 'guy4', 'guy5', 'guy6', 'guy7', 'guy8', 'guy9',
  'blocking', 'fall1', 'hang1',
  'finishturn', 'sjland', 'rjlandrun',
  'step10a',
  'stepfloat', 'bumpfloat',
  'landrun',
  'Vwalk1', 'Vwalk2', 'Mscurry1',
];

// Generate output
let output = `// AUTO-GENERATED from SEQTABLE.S — do not edit manually
// Assembled from Apple II Prince of Persia source code
// Total size: ${pass2.bytes.length} bytes (228-byte dispatch table + ${pass2.bytes.length - 228} bytes sequence data)

/**
 * Sequence opcodes (negative values stored as unsigned bytes)
 */
export const SEQ_OPCODES = {
  goto:      0xFF, // -1, followed by 2-byte LE offset
  aboutface: 0xFE, // -2
  up:        0xFD, // -3
  down:      0xFC, // -4
  chx:       0xFB, // -5, followed by 1 signed byte
  chy:       0xFA, // -6, followed by 1 signed byte
  act:       0xF9, // -7, followed by 1 unsigned byte
  setfall:   0xF8, // -8, followed by 2 signed bytes (xvel, yvel)
  ifwtless:  0xF7, // -9, followed by 2-byte LE offset
  die:       0xF6, // -10
  jaru:      0xF5, // -11
  jard:      0xF4, // -12
  effect:    0xF3, // -13, followed by 1 byte
  tap:       0xF2, // -14, followed by 1 byte
  nextlevel: 0xF1, // -15
};

/**
 * Sequence number constants (1-based, matching dispatch table indices)
 */
export const SEQ = {
`;

// Add SEQ constants
for (const entry of pass1.dispatchLabels) {
  output += `  ${entry.label}: ${entry.index},\n`;
}
output += `};\n\n`;

// SEQ_NAMES
output += `/**\n * Maps sequence number to name string (for UI/debugging)\n */\nexport const SEQ_NAMES = [\n`;
for (let i = 0; i < seqNames.length; i++) {
  if (seqNames[i]) {
    output += `  /* ${i} */ '${seqNames[i]}',\n`;
  } else {
    output += `  /* ${i} */ '',\n`;
  }
}
output += `];\n\n`;

// Internal label offsets
output += `/**\n * Internal label byte offsets (for verification and cross-references)\n */\nexport const SEQ_LABELS = {\n`;
for (const name of internalLabels) {
  if (pass1.labels.hasOwnProperty(name)) {
    output += `  ${name}: ${pass1.labels[name]},\n`;
  }
}
// Also add all labels for completeness
output += `};\n\n`;

// All labels (for debugging)
output += `/**\n * All label offsets (complete map for debugging)\n */\nexport const SEQ_ALL_LABELS = {\n`;
const sortedLabels = Object.entries(pass1.labels).sort((a, b) => a[1] - b[1]);
for (const [name, off] of sortedLabels) {
  output += `  '${name}': ${off},\n`;
}
output += `};\n\n`;

// The actual byte data
output += `/**\n * The complete sequence table byte stream\n * Bytes 0-227: dispatch table (114 entries × 2-byte LE offsets)\n * Bytes 228+: sequence data (opcodes and frame numbers)\n */\nexport const SEQ_DATA = new Uint8Array([\n`;

// Format bytes in rows of 16 with offset comments
const COLS = 16;
for (let i = 0; i < pass2.bytes.length; i += COLS) {
  const chunk = pass2.bytes.slice(i, Math.min(i + COLS, pass2.bytes.length));

  // Find any labels at offsets in this row
  const rowLabels = [];
  for (let j = i; j < i + chunk.length; j++) {
    for (const [name, off] of sortedLabels) {
      if (off === j) {
        rowLabels.push(`${name}@${off}`);
      }
    }
  }

  // Format bytes: use hex for opcodes (>=0xF1), decimal for frame numbers
  const formatted = chunk.map(b => {
    if (b >= 0xF1) {
      return '0x' + b.toString(16).toUpperCase().padStart(2, '0');
    }
    return b.toString().padStart(3, ' ');
  });

  const comment = rowLabels.length > 0 ? ` // ${rowLabels.join(', ')}` : '';
  output += `  /* ${i.toString().padStart(4)} */ ${formatted.join(',')},${comment}\n`;
}

output += `]);\n\n`;

// getSeqPointer function
output += `/**
 * Reads the dispatch table to get the byte offset for a given sequence number.
 * @param {number} seqNum - 1-based sequence number (1-114)
 * @returns {number} byte offset into SEQ_DATA where the sequence starts
 */
export function getSeqPointer(seqNum) {
  if (seqNum < 1 || seqNum > 114) {
    throw new Error(\`Invalid sequence number: \${seqNum} (must be 1-114)\`);
  }
  const tableIdx = (seqNum - 1) * 2;
  return SEQ_DATA[tableIdx] | (SEQ_DATA[tableIdx + 1] << 8);
}
`;

// Write output
const outPath = path.join(__dirname, '..', 'browser', 'js', 'seqtable.js');
fs.writeFileSync(outPath, output);
console.log(`\nOutput written to: ${outPath}`);

// Verification: check all dispatch entries point to valid labels
console.log('\n--- Verification ---');
for (const entry of pass1.dispatchLabels) {
  const labelOff = pass1.labels[entry.label];
  // Read back from bytes
  const tableIdx = (entry.index - 1) * 2;
  const readBack = pass2.bytes[tableIdx] | (pass2.bytes[tableIdx + 1] << 8);
  const match = readBack === labelOff ? 'OK' : `MISMATCH (got ${readBack}, expected ${labelOff})`;
  if (match !== 'OK') {
    console.log(`  :${entry.index} ${entry.label} = ${labelOff} -> ${match}`);
  }
}
console.log('Dispatch table verification complete.');

// Print some key label offsets for manual verification
console.log('\nKey label offsets:');
const keyLabels = ['running', 'startrun', 'stand', 'runcyc1', 'ready', 'guy4', 'guy7', 'guy8',
  'blocking', 'fall1', 'hang1', 'freefall', 'stepfall', 'stepfloat', 'climbstairs'];
for (const name of keyLabels) {
  if (pass1.labels[name] !== undefined) {
    console.log(`  ${name}: ${pass1.labels[name]} (0x${(pass1.labels[name] + 0x3000).toString(16)})`);
  }
}
