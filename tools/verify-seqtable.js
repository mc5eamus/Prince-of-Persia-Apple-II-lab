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
console.log('Dispatch table: 114 entries x 2 bytes = 228 bytes');

// Verify all dispatch entries point to valid offsets
const dispatchNames = [
  '', 'startrun','stand','standjump','runjump','turn','runturn','stepfall',
  'jumphangMed','hang','climbup','hangdrop','freefall','runstop','jumpup',
  'fallhang','jumpbackhang','softland','jumpfall','stepfall2','medland',
  'rjumpfall','hardland','hangfall','jumphangLong','hangstraight','rdiveroll',
  'sdiveroll','highjump','step1','step2','step3','step4','step5','step6',
  'step7','step8','step9','step10','step11','step12','step13','fullstep',
  'turnrun','testfoot','bumpfall','hardbump','bump','superhijump','standup',
  'stoop','impale','crush','deadfall','halve','engarde','advance','retreat',
  'strike','flee','turnengarde','strikeblock','readyblock','landengarde',
  'bumpengfwd','bumpengback','blocktostrike','strikeadv','climbdown',
  'blockedstrike','climbstairs','dropdead','stepback','climbfail','stabbed',
  'faststrike','strikeret','alertstand','drinkpotion','crawl','alertturn',
  'fightfall','efightfall','efightfallfwd','running','stabkill','fastadvance',
  'goalertstand','arise','turndraw','guardengarde','pickupsword','resheathe',
  'fastsheathe','Pstand','Vstand','Vwalk','Vstop','Palert','Pback','Vexit',
  'Mclimb','Vraise','Plie','patchfall','Mscurry','Mstop','Mleave','Pembrace',
  'Pwaiting','Pstroke','Prise','Pcrouch','Pslump','Mraise'
];

let errors = 0;
for (let i = 1; i <= 114; i++) {
  const lo = values[(i-1)*2], hi = values[(i-1)*2+1];
  const offs = lo | (hi << 8);
  if (offs < 228 || offs >= values.length) {
    console.log('  ERROR: seq ' + i + ' (' + dispatchNames[i] + ') points to invalid offset ' + offs);
    errors++;
  }
}
console.log('Dispatch table: ' + (errors === 0 ? 'ALL 114 ENTRIES VALID' : errors + ' ERRORS'));

// Verify running@228: [act,1,goto,runcyc1_lo,runcyc1_hi]
console.log('\n--- Sequence spot checks ---');
console.log('running@228: [0x' + values[228].toString(16) + ', ' + values[229] + ', 0x' + values[230].toString(16) + ', ' + values[231] + ', ' + values[232] + ']');
console.log('  runcyc1 ref = ' + (values[231] | (values[232]<<8)) + ' (expected 247)');

// stand@278: [act,0,15,goto,stand_lo,stand_hi]
console.log('stand@278: [0x' + values[278].toString(16) + ', ' + values[279] + ', ' + values[280] + ', 0x' + values[281].toString(16) + ', ' + values[282] + ', ' + values[283] + ']');
console.log('  stand loop ref = ' + (values[282] | (values[283]<<8)) + ' (expected 278)');

// climbstairs@2136: do 0 block should be skipped
console.log('climbstairs@2136: starts [0x' + values[2136].toString(16) + ', ' + values[2137] + '] (expected act,5)');
console.log('  nextlevel@2224: 0x' + values[2224].toString(16) + ' (expected 0xF1)');
console.log('  loop@2225: [' + values[2225] + ', 0x' + values[2226].toString(16) + ', ' + values[2227] + ', ' + values[2228] + ']');
console.log('  loop ref = ' + (values[2227] | (values[2228]<<8)) + ' (expected 2225)');

// step1 (seq 29) and fullstep (seq 42)
const s1 = values[56] | (values[57]<<8);
const fs2 = values[82] | (values[83]<<8);
console.log('step1 (seq29) -> offset ' + s1 + ' (expected 1815)');
console.log('fullstep (seq42) -> offset ' + fs2 + ' (expected 1526)');

// Verify goto targets in a few sequences
function readGotoTarget(off) { return values[off+1] | (values[off+2]<<8); }

// Find all goto opcodes and verify they point within bounds
let gotoCount = 0, ifwCount = 0, badRef = 0;
for (let i = 228; i < values.length; i++) {
  if (values[i] === 0xFF) { // goto
    if (i + 2 < values.length) {
      const target = values[i+1] | (values[i+2] << 8);
      if (target < 228 || target >= values.length) {
        console.log('  BAD goto target at offset ' + i + ': ' + target);
        badRef++;
      }
      gotoCount++;
    }
  }
  if (values[i] === 0xF7) { // ifwtless
    if (i + 2 < values.length) {
      const target = values[i+1] | (values[i+2] << 8);
      if (target < 228 || target >= values.length) {
        console.log('  BAD ifwtless target at offset ' + i + ': ' + target);
        badRef++;
      }
      ifwCount++;
    }
  }
}
console.log('\nBranch analysis: ' + gotoCount + ' gotos, ' + ifwCount + ' ifwtless, ' + badRef + ' bad refs');
console.log(badRef === 0 ? 'ALL BRANCH TARGETS VALID' : 'ERRORS FOUND');
