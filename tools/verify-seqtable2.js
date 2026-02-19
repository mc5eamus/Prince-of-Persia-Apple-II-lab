const fs = require('fs');
const src = fs.readFileSync('c:/playground/Prince-of-Persia-Apple-II-lab/browser/js/seqtable.js','utf8');

// Extract SEQ_DATA array values
const match = src.match(/new Uint8Array\(\[([\s\S]*?)\]\)/);
const arrayStr = match[1].replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/gm, '');
const values = arrayStr.split(',').map(s => s.trim()).filter(s => s).map(s => {
  if (s.startsWith('0x')) return parseInt(s, 16);
  return parseInt(s, 10);
});

console.log('Total bytes: ' + values.length);

// Extract all labels for reverse lookup
const labelsMatch = src.match(/SEQ_ALL_LABELS\s*=\s*\{([\s\S]*?)\}/);
const labelsByOffset = {};
if (labelsMatch) {
  const re = /'([^']+)':\s*(\d+)/g;
  let m;
  while ((m = re.exec(labelsMatch[1])) !== null) {
    const off = parseInt(m[2]);
    if (!labelsByOffset[off]) labelsByOffset[off] = [];
    labelsByOffset[off].push(m[1]);
  }
}

// Proper instruction stream decoder
// Opcodes and their operand byte counts:
// 0xFF goto: 2 bytes (LE address)
// 0xFE aboutface: 0
// 0xFD up: 0
// 0xFC down: 0
// 0xFB chx: 1 (signed byte)
// 0xFA chy: 1 (signed byte)
// 0xF9 act: 1 (unsigned byte)
// 0xF8 setfall: 2 (signed byte xvel, signed byte yvel)
// 0xF7 ifwtless: 2 (LE address)
// 0xF6 die: 0
// 0xF5 jaru: 0
// 0xF4 jard: 0
// 0xF3 effect: 1
// 0xF2 tap: 1
// 0xF1 nextlevel: 0

const opcodeNames = {
  0xFF: 'goto', 0xFE: 'aboutface', 0xFD: 'up', 0xFC: 'down',
  0xFB: 'chx', 0xFA: 'chy', 0xF9: 'act', 0xF8: 'setfall',
  0xF7: 'ifwtless', 0xF6: 'die', 0xF5: 'jaru', 0xF4: 'jard',
  0xF3: 'effect', 0xF2: 'tap', 0xF1: 'nextlevel'
};

const opcodeOperands = {
  0xFF: 2, 0xFE: 0, 0xFD: 0, 0xFC: 0,
  0xFB: 1, 0xFA: 1, 0xF9: 1, 0xF8: 2,
  0xF7: 2, 0xF6: 0, 0xF5: 0, 0xF4: 0,
  0xF3: 1, 0xF2: 1, 0xF1: 0
};

// Decode a sequence starting at offset, return list of instructions
function decodeSequence(startOff, maxBytes) {
  const instrs = [];
  let off = startOff;
  const limit = Math.min(startOff + (maxBytes || 500), values.length);
  
  while (off < limit) {
    const b = values[off];
    if (b >= 0xF1) {
      // It's an opcode
      const name = opcodeNames[b];
      const nops = opcodeOperands[b];
      const operands = [];
      for (let i = 0; i < nops; i++) {
        operands.push(values[off + 1 + i]);
      }
      instrs.push({ off, opcode: name, operands });
      off += 1 + nops;
      
      // goto and die are terminators
      if (b === 0xFF || b === 0xF6 || b === 0xF1) break;
    } else {
      // Frame number
      instrs.push({ off, frame: b });
      off++;
    }
  }
  return instrs;
}

// Verify all 114 sequences
let totalErrors = 0;
let totalGotos = 0;
let totalIfwtless = 0;

for (let seq = 1; seq <= 114; seq++) {
  const tableIdx = (seq - 1) * 2;
  const startOff = values[tableIdx] | (values[tableIdx + 1] << 8);
  
  // Follow the sequence, decoding until we hit goto/die/nextlevel
  // We may need to decode multiple segments (goto chains)
  const visited = new Set();
  let off = startOff;
  let errors = [];
  
  // Just verify the first segment
  const instrs = decodeSequence(off, 300);
  
  for (const instr of instrs) {
    if (instr.opcode === 'goto' || instr.opcode === 'ifwtless') {
      const target = instr.operands[0] | (instr.operands[1] << 8);
      if (target < 228 || target >= values.length) {
        errors.push('  BAD ' + instr.opcode + ' target at offset ' + instr.off + ': ' + target);
        totalErrors++;
      }
      if (instr.opcode === 'goto') totalGotos++;
      if (instr.opcode === 'ifwtless') totalIfwtless++;
      
      // Verify target has a label
      const targetLabels = labelsByOffset[target];
      if (!targetLabels) {
        // Not necessarily an error, could be an anonymous location
      }
    }
  }
  
  if (errors.length > 0) {
    const name = labelsByOffset[startOff] || ['?'];
    console.log('Seq ' + seq + ' (' + name[0] + ') at offset ' + startOff + ':');
    errors.forEach(e => console.log(e));
  }
}

console.log('\nProperly parsed: ' + totalGotos + ' gotos, ' + totalIfwtless + ' ifwtless');
console.log(totalErrors === 0 ? 'ALL BRANCH TARGETS VALID' : totalErrors + ' ERRORS FOUND');

// Also follow internal goto chains for a few key sequences
console.log('\n--- Tracing key sequences ---');
function traceSeq(name, startOff) {
  const instrs = decodeSequence(startOff, 500);
  const parts = [];
  for (const instr of instrs) {
    if (instr.frame !== undefined) {
      parts.push('frame(' + instr.frame + ')');
    } else {
      let s = instr.opcode;
      if (instr.operands && instr.operands.length > 0) {
        if (instr.opcode === 'goto' || instr.opcode === 'ifwtless') {
          const target = instr.operands[0] | (instr.operands[1] << 8);
          const tl = labelsByOffset[target];
          s += '->' + (tl ? tl[0] : target);
        } else {
          s += '(' + instr.operands.map(v => v > 127 ? (v - 256) : v).join(',') + ')';
        }
      }
      parts.push(s);
    }
  }
  console.log(name + '@' + startOff + ': ' + parts.join(', '));
}

traceSeq('running', 228);
traceSeq('stand', 278);
traceSeq('startrun', 233);
traceSeq('engarde', 314);
traceSeq('strike', 434);
traceSeq('step1', 1815);
traceSeq('climbstairs', 2136);
traceSeq('Pstand', 2324);
