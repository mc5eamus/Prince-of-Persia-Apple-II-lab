// AUTO-GENERATED from SEQTABLE.S — do not edit manually
// Assembled from Apple II Prince of Persia source code
// Total size: 2545 bytes (228-byte dispatch table + 2317 bytes sequence data)

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
  startrun: 1,
  stand: 2,
  standjump: 3,
  runjump: 4,
  turn: 5,
  runturn: 6,
  stepfall: 7,
  jumphangMed: 8,
  hang: 9,
  climbup: 10,
  hangdrop: 11,
  freefall: 12,
  runstop: 13,
  jumpup: 14,
  fallhang: 15,
  jumpbackhang: 16,
  softland: 17,
  jumpfall: 18,
  stepfall2: 19,
  medland: 20,
  rjumpfall: 21,
  hardland: 22,
  hangfall: 23,
  jumphangLong: 24,
  hangstraight: 25,
  rdiveroll: 26,
  sdiveroll: 27,
  highjump: 28,
  step1: 29,
  step2: 30,
  step3: 31,
  step4: 32,
  step5: 33,
  step6: 34,
  step7: 35,
  step8: 36,
  step9: 37,
  step10: 38,
  step11: 39,
  step12: 40,
  step13: 41,
  fullstep: 42,
  turnrun: 43,
  testfoot: 44,
  bumpfall: 45,
  hardbump: 46,
  bump: 47,
  superhijump: 48,
  standup: 49,
  stoop: 50,
  impale: 51,
  crush: 52,
  deadfall: 53,
  halve: 54,
  engarde: 55,
  advance: 56,
  retreat: 57,
  strike: 58,
  flee: 59,
  turnengarde: 60,
  strikeblock: 61,
  readyblock: 62,
  landengarde: 63,
  bumpengfwd: 64,
  bumpengback: 65,
  blocktostrike: 66,
  strikeadv: 67,
  climbdown: 68,
  blockedstrike: 69,
  climbstairs: 70,
  dropdead: 71,
  stepback: 72,
  climbfail: 73,
  stabbed: 74,
  faststrike: 75,
  strikeret: 76,
  alertstand: 77,
  drinkpotion: 78,
  crawl: 79,
  alertturn: 80,
  fightfall: 81,
  efightfall: 82,
  efightfallfwd: 83,
  running: 84,
  stabkill: 85,
  fastadvance: 86,
  goalertstand: 87,
  arise: 88,
  turndraw: 89,
  guardengarde: 90,
  pickupsword: 91,
  resheathe: 92,
  fastsheathe: 93,
  Pstand: 94,
  Vstand: 95,
  Vwalk: 96,
  Vstop: 97,
  Palert: 98,
  Pback: 99,
  Vexit: 100,
  Mclimb: 101,
  Vraise: 102,
  Plie: 103,
  patchfall: 104,
  Mscurry: 105,
  Mstop: 106,
  Mleave: 107,
  Pembrace: 108,
  Pwaiting: 109,
  Pstroke: 110,
  Prise: 111,
  Pcrouch: 112,
  Pslump: 113,
  Mraise: 114,
};

/**
 * Maps sequence number to name string (for UI/debugging)
 */
export const SEQ_NAMES = [
  /* 0 */ '',
  /* 1 */ 'startrun',
  /* 2 */ 'stand',
  /* 3 */ 'standjump',
  /* 4 */ 'runjump',
  /* 5 */ 'turn',
  /* 6 */ 'runturn',
  /* 7 */ 'stepfall',
  /* 8 */ 'jumphangMed',
  /* 9 */ 'hang',
  /* 10 */ 'climbup',
  /* 11 */ 'hangdrop',
  /* 12 */ 'freefall',
  /* 13 */ 'runstop',
  /* 14 */ 'jumpup',
  /* 15 */ 'fallhang',
  /* 16 */ 'jumpbackhang',
  /* 17 */ 'softland',
  /* 18 */ 'jumpfall',
  /* 19 */ 'stepfall2',
  /* 20 */ 'medland',
  /* 21 */ 'rjumpfall',
  /* 22 */ 'hardland',
  /* 23 */ 'hangfall',
  /* 24 */ 'jumphangLong',
  /* 25 */ 'hangstraight',
  /* 26 */ 'rdiveroll',
  /* 27 */ 'sdiveroll',
  /* 28 */ 'highjump',
  /* 29 */ 'step1',
  /* 30 */ 'step2',
  /* 31 */ 'step3',
  /* 32 */ 'step4',
  /* 33 */ 'step5',
  /* 34 */ 'step6',
  /* 35 */ 'step7',
  /* 36 */ 'step8',
  /* 37 */ 'step9',
  /* 38 */ 'step10',
  /* 39 */ 'step11',
  /* 40 */ 'step12',
  /* 41 */ 'step13',
  /* 42 */ 'fullstep',
  /* 43 */ 'turnrun',
  /* 44 */ 'testfoot',
  /* 45 */ 'bumpfall',
  /* 46 */ 'hardbump',
  /* 47 */ 'bump',
  /* 48 */ 'superhijump',
  /* 49 */ 'standup',
  /* 50 */ 'stoop',
  /* 51 */ 'impale',
  /* 52 */ 'crush',
  /* 53 */ 'deadfall',
  /* 54 */ 'halve',
  /* 55 */ 'engarde',
  /* 56 */ 'advance',
  /* 57 */ 'retreat',
  /* 58 */ 'strike',
  /* 59 */ 'flee',
  /* 60 */ 'turnengarde',
  /* 61 */ 'strikeblock',
  /* 62 */ 'readyblock',
  /* 63 */ 'landengarde',
  /* 64 */ 'bumpengfwd',
  /* 65 */ 'bumpengback',
  /* 66 */ 'blocktostrike',
  /* 67 */ 'strikeadv',
  /* 68 */ 'climbdown',
  /* 69 */ 'blockedstrike',
  /* 70 */ 'climbstairs',
  /* 71 */ 'dropdead',
  /* 72 */ 'stepback',
  /* 73 */ 'climbfail',
  /* 74 */ 'stabbed',
  /* 75 */ 'faststrike',
  /* 76 */ 'strikeret',
  /* 77 */ 'alertstand',
  /* 78 */ 'drinkpotion',
  /* 79 */ 'crawl',
  /* 80 */ 'alertturn',
  /* 81 */ 'fightfall',
  /* 82 */ 'efightfall',
  /* 83 */ 'efightfallfwd',
  /* 84 */ 'running',
  /* 85 */ 'stabkill',
  /* 86 */ 'fastadvance',
  /* 87 */ 'goalertstand',
  /* 88 */ 'arise',
  /* 89 */ 'turndraw',
  /* 90 */ 'guardengarde',
  /* 91 */ 'pickupsword',
  /* 92 */ 'resheathe',
  /* 93 */ 'fastsheathe',
  /* 94 */ 'Pstand',
  /* 95 */ 'Vstand',
  /* 96 */ 'Vwalk',
  /* 97 */ 'Vstop',
  /* 98 */ 'Palert',
  /* 99 */ 'Pback',
  /* 100 */ 'Vexit',
  /* 101 */ 'Mclimb',
  /* 102 */ 'Vraise',
  /* 103 */ 'Plie',
  /* 104 */ 'patchfall',
  /* 105 */ 'Mscurry',
  /* 106 */ 'Mstop',
  /* 107 */ 'Mleave',
  /* 108 */ 'Pembrace',
  /* 109 */ 'Pwaiting',
  /* 110 */ 'Pstroke',
  /* 111 */ 'Prise',
  /* 112 */ 'Pcrouch',
  /* 113 */ 'Pslump',
  /* 114 */ 'Mraise',
];

/**
 * Internal label byte offsets (for verification and cross-references)
 */
export const SEQ_LABELS = {
  runcyc1: 247,
  runcyc2: 250,
  runcyc3: 253,
  runcyc4: 258,
  runcyc5: 261,
  runcyc6: 264,
  runcyc7: 267,
  runcyc8: 272,
  runstt1: 235,
  runstt2: 236,
  runstt3: 237,
  runstt4: 238,
  runstt5: 241,
  runstt6: 244,
  ready: 328,
  guy3: 442,
  guy4: 443,
  guy5: 446,
  guy6: 447,
  guy7: 448,
  guy8: 451,
  guy9: 454,
  blocking: 469,
  fall1: 857,
  hang1: 1049,
  finishturn: 700,
  sjland: 550,
  rjlandrun: 625,
  step10a: 1653,
  stepfloat: 891,
  bumpfloat: 1438,
  landrun: 1973,
  Vwalk1: 2256,
  Vwalk2: 2259,
  Mscurry1: 2502,
};

/**
 * All label offsets (complete map for debugging)
 */
export const SEQ_ALL_LABELS = {
  'running': 228,
  'startrun': 233,
  'runstt1': 235,
  'runstt2': 236,
  'runstt3': 237,
  'runstt4': 238,
  'runstt5': 241,
  'runstt6': 244,
  'runcyc1': 247,
  'runcyc2': 250,
  'runcyc3': 253,
  'runcyc4': 258,
  'runcyc5': 261,
  'runcyc6': 264,
  'runcyc7': 267,
  'runcyc8': 272,
  'stand': 278,
  'goalertstand': 284,
  'alertstand': 286,
  'alertstand:loop': 286,
  'arise': 290,
  'guardengarde': 311,
  'engarde': 314,
  'ready': 328,
  'ready:loop': 334,
  'stabbed': 338,
  'strikeadv': 367,
  'strikeret': 381,
  'advance': 393,
  'fastadvance': 408,
  'retreat': 420,
  'strike': 434,
  'faststrike': 440,
  'guy3': 442,
  'guy4': 443,
  'guy5': 446,
  'guy6': 447,
  'guy7': 448,
  'guy8': 451,
  'guy9': 454,
  'blockedstrike': 458,
  'blocktostrike': 464,
  'readyblock': 468,
  'blocking': 469,
  'strikeblock': 473,
  'landengarde': 478,
  'bumpengfwd': 484,
  'bumpengback': 491,
  'flee': 498,
  'turnengarde': 505,
  'alertturn': 513,
  'standjump': 521,
  'sjland': 550,
  'runjump': 579,
  'rjlandrun': 625,
  'rdiveroll': 634,
  'rdiveroll:crouch': 652,
  'sdiveroll': 656,
  'crawl': 656,
  'crawl:crouch': 670,
  'turndraw': 674,
  'turn': 686,
  'finishturn': 700,
  'turnrun': 712,
  'runturn': 719,
  'fightfall': 762,
  'efightfall': 790,
  'efightfallfwd': 820,
  'stepfall': 848,
  'fall1': 857,
  'patchfall': 879,
  'stepfall2': 886,
  'stepfloat': 891,
  'jumpfall': 913,
  'rjumpfall': 941,
  'jumphangMed': 969,
  'jumphangLong': 990,
  'jumpbackhang': 1017,
  'hang': 1046,
  'hang1': 1049,
  'hangstraight': 1094,
  'hangstraight:loop': 1103,
  'climbfail': 1107,
  'climbdown': 1123,
  'climbup': 1145,
  'hangdrop': 1178,
  'hangfall': 1197,
  'freefall': 1216,
  'freefall:loop': 1218,
  'runstop': 1222,
  'jumpup': 1247,
  'highjump': 1268,
  'superhijump': 1298,
  'fallhang': 1389,
  'bump': 1397,
  'bumpfall': 1407,
  'bumpfloat': 1438,
  'hardbump': 1460,
  'testfoot': 1490,
  'stepback': 1521,
  'fullstep': 1526,
  'step14': 1526,
  'step13': 1557,
  'step12': 1588,
  'step11': 1619,
  'step10': 1648,
  'step10a': 1653,
  'step9': 1676,
  'step8': 1682,
  'step7': 1708,
  'step6': 1729,
  'step5': 1750,
  'step4': 1771,
  'step3': 1787,
  'step2': 1803,
  'step1': 1815,
  'stoop': 1824,
  'stoop:crouch': 1832,
  'standup': 1836,
  'pickupsword': 1859,
  'resheathe': 1875,
  'fastsheathe': 1908,
  'drinkpotion': 1922,
  'softland': 1954,
  'softland:crouch': 1969,
  'landrun': 1973,
  'medland': 2005,
  'hardland': 2071,
  'hardland:dead': 2080,
  'stabkill': 2084,
  'dropdead': 2089,
  'dropdead:dead': 2101,
  'impale': 2105,
  'impale:dead': 2112,
  'halve': 2116,
  'halve:dead': 2120,
  'crush': 2124,
  'deadfall': 2127,
  'deadfall:loop': 2132,
  'climbstairs': 2136,
  'climbstairs:loop': 2225,
  'Vstand': 2229,
  'Vraise': 2233,
  'Vraise:loop': 2250,
  'Vwalk': 2254,
  'Vwalk1': 2256,
  'Vwalk2': 2259,
  'Vstop': 2277,
  'Vexit': 2284,
  'Pstand': 2324,
  'Palert': 2328,
  'Pback': 2343,
  'Pback:loop': 2359,
  'Plie': 2363,
  'Pwaiting': 2367,
  'Pwaiting:loop': 2367,
  'Pembrace': 2371,
  'Pembrace:loop': 2401,
  'Pstroke': 2405,
  'Pstroke:loop': 2405,
  'Prise': 2409,
  'Prise:loop': 2423,
  'Pcrouch': 2427,
  'Pcrouch:loop': 2491,
  'Pslump': 2495,
  'Pslump:loop': 2496,
  'Mscurry': 2500,
  'Mscurry1': 2502,
  'Mscurry1:loop': 2502,
  'Mstop': 2514,
  'Mstop:loop': 2514,
  'Mraise': 2518,
  'Mraise:loop': 2518,
  'Mleave': 2522,
  'Mclimb': 2541,
};

/**
 * The complete sequence table byte stream
 * Bytes 0-227: dispatch table (114 entries × 2-byte LE offsets)
 * Bytes 228+: sequence data (opcodes and frame numbers)
 */
export const SEQ_DATA = new Uint8Array([
  /*    0 */ 233,  0, 22,  1,  9,  2, 67,  2,174,  2,207,  2, 80,  3,201,  3,
  /*   16 */  22,  4,121,  4,154,  4,192,  4,198,  4,223,  4,109,  5,0xF9,  3,
  /*   32 */ 162,  7,145,  3,118,  3,213,  7,173,  3, 23,  8,173,  4,222,  3,
  /*   48 */  70,  4,122,  2,144,  2,0xF4,  4, 23,  7, 11,  7,0xFB,  6,235,  6,
  /*   64 */ 214,  6,193,  6,172,  6,146,  6,140,  6,112,  6, 83,  6, 52,  6,
  /*   80 */  21,  6,0xF6,  5,200,  2,210,  5,127,  5,180,  5,117,  5, 18,  5,
  /*   96 */  44,  7, 32,  7, 57,  8, 76,  8, 79,  8, 68,  8, 58,  1,137,  1,
  /*  112 */ 164,  1,178,  1,0xF2,  1,0xF9,  1,217,  1,212,  1,222,  1,228,  1,
  /*  128 */ 235,  1,208,  1,111,  1, 99,  4,202,  1, 88,  8, 41,  8,0xF1,  5,
  /*  144 */  83,  4, 82,  1,184,  1,125,  1, 30,  1,130,  7,144,  2,  1,  2,
  /*  160 */ 0xFA,  2, 22,  3, 52,  3,228,  0, 36,  8,152,  1, 28,  1, 34,  1,
  /*  176 */ 162,  2, 55,  1, 67,  7, 83,  7,116,  7, 20,  9,181,  8,206,  8,
  /*  192 */ 229,  8, 24,  9, 39,  9,236,  8,237,  9,185,  8, 59,  9,111,  3,
  /*  208 */ 196,  9,210,  9,218,  9, 67,  9, 63,  9,101,  9,105,  9,123,  9,
  /*  224 */ 191,  9,214,  9,0xF9,  1,0xFF,0xF7,  0,0xF9,  1,  1,  2,  3,  4,0xFB, // running@228, startrun@233, runstt1@235, runstt2@236, runstt3@237, runstt4@238
  /*  240 */   8,  5,0xFB,  3,  6,0xFB,  3,  7,0xFB,  5,  8,0xFB,  1,0xF2,  1,  9, // runstt5@241, runstt6@244, runcyc1@247, runcyc2@250, runcyc3@253
  /*  256 */ 0xFB,  2, 10,0xFB,  4, 11,0xFB,  5, 12,0xFB,  2,0xF2,  1, 13,0xFB,  3, // runcyc4@258, runcyc5@261, runcyc6@264, runcyc7@267
  /*  272 */  14,0xFB,  4,0xFF,0xF7,  0,0xF9,  0, 15,0xFF, 22,  1,0xF9,  1,166,0xFF, // runcyc8@272, stand@278, goalertstand@284, alertstand@286, alertstand:loop@286
  /*  288 */  30,  1,0xF9,  5,0xFB, 10,177,177,0xFB,0xF9,0xFA,0xFE,178,0xFB,  5,0xFA, // arise@290
  /*  304 */   2,166,0xFB,0xFF,0xFF, 72,  1,0xFF, 72,  1,0xF9,  1,0xFB,  2,207,208, // guardengarde@311, engarde@314
  /*  320 */ 0xFB,  2,209,0xFB,  2,210,0xFB,  3,0xF9,  1,0xF2,  0,158,170,171,0xFF, // ready@328, ready:loop@334
  /*  336 */  78,  1,0xF9,  5,0xF8,0xFF,  0,172,0xFB,0xFF,0xFA,  1,173,0xFB,0xFF,174, // stabbed@338
  /*  352 */ 0xFB,0xFF,0xFA,  2,0xFB,0xFE,0xFA,  1,0xFB,0xFB,0xFA,0xFC,0xFF,195,  1,0xF9, // strikeadv@367
  /*  368 */   1,0xF8,  1,  0,155,0xFB,  2,165,0xFB,0xFE,0xFF, 72,  1,0xF9,  1,0xF8, // strikeret@381
  /*  384 */ 0xFF,  0,155,156,157,158,0xFF,164,  1,0xF9,  1,0xF8,  1,  0,0xFB,  2, // advance@393
  /*  400 */ 163,0xFB,  4,164,165,0xFF, 72,  1,0xF9,  1,0xF8,  1,  0,0xFB,  6,164, // fastadvance@408
  /*  416 */ 165,0xFF, 72,  1,0xF9,  1,0xF8,0xFF,  0,0xFB,0xFD,160,0xFB,0xFE,157,0xFF, // retreat@420
  /*  432 */  72,  1,0xF9,  1,0xF8,0xFF,  0,168,0xF9,  1,151,0xF9,  1,152,153,154, // strike@434, faststrike@440, guy3@442, guy4@443, guy5@446, guy6@447
  /*  448 */ 0xF9,  5,155,0xF9,  1,156,157,0xFF, 72,  1,0xF9,  1,167,0xFF,192,  1, // guy7@448, guy8@451, guy9@454, blockedstrike@458
  /*  464 */ 162,0xFF,187,  1,169,150,0xFF, 72,  1,159,160,0xFF,213,  1,0xF9,  1, // blocktostrike@464, readyblock@468, blocking@469, strikeblock@473, landengarde@478
  /*  480 */ 0xF4,0xFF, 72,  1,0xF9,  5,0xFB,0xF8,0xFF, 72,  1,0xF9,  5,160,157,0xFF, // bumpengfwd@484, bumpengback@491
  /*  496 */  72,  1,0xF9,  7,0xFB,0xF8,0xFF,174,  2,0xF9,  5,0xFE,0xFB,  5,0xFF,164, // flee@498, turnengarde@505
  /*  512 */   1,0xF9,  5,0xFE,0xFB, 18,0xFF, 28,  1,0xF9,  1, 16, 17,0xFB,  2, 18, // alertturn@513, standjump@521
  /*  528 */ 0xFB,  2, 19,0xFB,  2, 20,0xFB,  2, 21,0xFB,  2, 22,0xFB,  7, 23,0xFB,
  /*  544 */   9, 24,0xFB,  5,0xFA,0xFA, 25,0xFB,  1,0xFA,  6, 26,0xFB,  4,0xF4,0xF2, // sjland@550
  /*  560 */   1, 27,0xFB,0xFD, 28,0xFB,  5, 29,0xF2,  1, 30, 31, 32, 33,0xFB,  1,
  /*  576 */ 0xFF, 22,  1,0xF9,  1,0xF2,  1, 34,0xFB,  5, 35,0xFB,  6, 36,0xFB,  3, // runjump@579
  /*  592 */  37,0xFB,  5,0xF2,  1, 38,0xFB,  7, 39,0xFB, 12,0xFA,0xFD, 40,0xFB,  8,
  /*  608 */ 0xFA,0xF7, 41,0xFB,  8,0xFA,0xFE, 42,0xFB,  4,0xFA, 11, 43,0xFB,  4,0xFA,
  /*  624 */   3, 44,0xFB,  5,0xF4,0xF2,  1,0xFF,0xF7,  0,0xF9,  1,0xFB,  1,107,0xFB, // rjlandrun@625, rdiveroll@634
  /*  640 */   2,0xFB,  2,108,0xFB,  2,109,0xFB,  2,109,0xFB,  2,109,0xFF,140,  2, // rdiveroll:crouch@652
  /*  656 */ 0xF9,  1,0xFB,  1,110,111,0xFB,  2,112,0xFB,  2,108,0xFB,  2,109,0xFF, // sdiveroll@656, crawl@656, crawl:crouch@670
  /*  672 */ 158,  2,0xF9,  7,0xFE,0xFB,  6, 45,0xFB,  1, 46,0xFF, 58,  1,0xF9,  7, // turndraw@674, turn@686
  /*  688 */ 0xFE,0xFB,  6, 45,0xFB,  1, 46,0xFB,  2, 47,0xFB,0xFF, 48,0xFB,  1, 49, // finishturn@700
  /*  704 */ 0xFB,0xFE, 50, 51, 52,0xFF, 22,  1,0xF9,  1,0xFB,0xFF,0xFF,235,  0,0xF9, // turnrun@712, runturn@719
  /*  720 */   1,0xFB,  1, 53,0xFB,  1,0xF2,  1, 54,0xFB,  8, 55,0xF2,  1, 56,0xFB,
  /*  736 */   7, 57,0xFB,  3, 58,0xFB,  1, 59, 60,0xFB,  2, 61,0xFB,0xFF, 62, 63,
  /*  752 */  64,0xFB,0xFF, 65,0xFB,0xF2,0xFE,0xFF, 11,  1,0xF9,  3,0xFA,0xFF,102,0xFB, // fightfall@762
  /*  768 */ 0xFE,0xFA,  6,103,0xFB,0xFE,0xFA,  9,104,0xFB,0xFF,0xFA, 12,105,0xFB,0xFD,
  /*  784 */ 0xF8,  0, 15,0xFF,192,  4,0xF9,  3,0xFA,0xFF,0xFB,0xFE,102,0xFB,0xFD,0xFA, // efightfall@790
  /*  800 */   6,103,0xFB,0xFD,0xFA,  9,104,0xFB,0xFE,0xFA, 12,105,0xFB,0xFD,0xF8,  0,
  /*  816 */  15,0xFF,192,  4,0xF9,  3,0xFB,  1,0xFA,0xFF,102,0xFB,  2,0xFA,  6,103, // efightfallfwd@820
  /*  832 */ 0xFB,0xFF,0xFA,  9,104,0xFA, 12,105,0xFB,0xFE,0xF8,  1, 15,0xFF,192,  4,
  /*  848 */ 0xF9,  3,0xFB,  1,0xFA,  3,0xF7,123,  3,102,0xFB,  2,0xFA,  6,103,0xFB, // stepfall@848, fall1@857
  /*  864 */ 0xFF,0xFA,  9,104,0xFA, 12,105,0xFB,0xFE,0xF8,  1, 15,0xFF,192,  4,0xFB, // patchfall@879
  /*  880 */ 0xFF,0xFA,0xFD,0xFF, 89,  3,0xFB,  1,0xFF, 80,  3,102,0xFB,  2,0xFA,  3, // stepfall2@886, stepfloat@891
  /*  896 */ 103,0xFB,0xFF,0xFA,  4,104,0xFA,  5,105,0xFB,0xFE,0xF8,  1,  6,0xFF,192,
  /*  912 */   4,0xF9,  3,0xFB,  1,0xFA,  3,102,0xFB,  2,0xFA,  6,103,0xFB,  1,0xFA, // jumpfall@913
  /*  928 */   9,104,0xFB,  2,0xFA, 12,105,0xF8,  2, 15,0xFF,192,  4,0xF9,  3,0xFB, // rjumpfall@941
  /*  944 */   1,0xFA,  3,102,0xFB,  3,0xFA,  6,103,0xFB,  2,0xFA,  9,104,0xFB,  3,
  /*  960 */ 0xFA, 12,105,0xF8,  3, 15,0xFF,192,  4,0xF9,  1, 67, 68, 69, 70, 71, // jumphangMed@969
  /*  976 */  72, 73, 74, 75, 76, 77,0xF9,  2, 78, 79, 80,0xFF, 22,  4,0xF9,  1, // jumphangLong@990
  /*  992 */  67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,0xF9,  2,0xFB,  1, 78,
  /* 1008 */ 0xFB,  2, 79,0xFB,  1, 80,0xFF, 22,  4,0xF9,  1, 67, 68, 69, 70, 71, // jumpbackhang@1017
  /* 1024 */  72, 73, 74, 75, 76,0xFB,0xFF, 77,0xF9,  2,0xFB,0xFE, 78,0xFB,0xFF, 79,
  /* 1040 */ 0xFB,0xFF, 80,0xFF, 22,  4,0xF9,  2, 91, 90, 89, 88, 87, 87, 87, 88, // hang@1046, hang1@1049
  /* 1056 */  89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 97, 96, 95, 94, 93,
  /* 1072 */  92, 91, 90, 89, 88, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 95,
  /* 1088 */  94, 93, 92,0xFF,154,  4,0xF9,  6,0xF2,  2, 92, 93, 93, 92, 92, 91, // hangstraight@1094, hangstraight:loop@1103
  /* 1104 */ 0xFF, 79,  4,135,136,137,137,138,138,138,138,137,136,135,0xFB,0xF9, // climbfail@1107
  /* 1120 */ 0xFF,154,  4,0xF9,  1,148,145,144,143,142,141,0xFB,0xFB,0xFA, 63,0xFC, // climbdown@1123
  /* 1136 */ 0xF9,  3,140,138,136, 91,0xFF, 25,  4,0xF9,  1,135,136,137,138,139, // climbup@1145
  /* 1152 */ 140,0xFB,  5,0xFA,193,0xFD,141,142,143,144,145,146,147,148,0xF9,  5,
  /* 1168 */ 149,0xF9,  1,118,119,0xFB,  1,0xFF, 22,  1,0xF9,  0, 81, 82,0xF9,  5, // hangdrop@1178
  /* 1184 */  83,0xF9,  1,0xF4,0xF2,  0, 84, 85,0xFB,  3,0xFF, 22,  1,0xF9,  3, 81, // hangfall@1197
  /* 1200 */ 0xFA,  6, 81,0xFA,  9, 81,0xFA, 12,0xFB,  2,0xF8,  0, 12,0xFF,192,  4,
  /* 1216 */ 0xF9,  4,106,0xFF,194,  4,0xF9,  1, 53,0xFB,  2,0xF2,  1, 54,0xFB,  7, // freefall@1216, freefall:loop@1218, runstop@1222
  /* 1232 */  55,0xF2,  1, 56,0xFB,  2, 49,0xFB,0xFE, 50, 51, 52,0xFF, 22,  1,0xF9, // jumpup@1247
  /* 1248 */   1, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,0xF9,  0,0xF5,
  /* 1264 */  79,0xFF,154,  4,0xF9,  1, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, // highjump@1268
  /* 1280 */  77, 78, 79,0xFA,0xFC, 79,0xFA,0xFE, 79, 79,0xFA,  2, 79,0xFA,  4,0xFF,
  /* 1296 */ 154,  4, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,0xFA,0xFF, 77,0xFA, // superhijump@1298
  /* 1312 */ 0xFD, 78,0xFA,0xFC, 79,0xFA,0xF6, 79,0xFA,0xF7, 79,0xFA,0xF8, 79,0xFA,0xF9,
  /* 1328 */  79,0xFA,0xFA, 79,0xFA,0xFB, 79,0xFA,0xFC, 79,0xFA,0xFD, 79,0xFA,0xFE, 79,
  /* 1344 */ 0xFA,0xFE, 79,0xFA,0xFF, 79,0xFA,0xFF, 79,0xFA,0xFF, 79, 79, 79, 79,0xFA,
  /* 1360 */   1, 79,0xFA,  1, 79,0xFA,  2, 79,0xFA,  2, 79,0xFA,  3, 79,0xFA,  4,
  /* 1376 */  79,0xFA,  5, 79,0xFA,  6, 79,0xF8,  0,  6,0xFF,192,  4,0xF9,  3, 80, // fallhang@1389
  /* 1392 */ 0xF2,  1,0xFF, 22,  4,0xF9,  5,0xFB,0xFC, 50, 51, 52,0xFF, 22,  1,0xF9, // bump@1397, bumpfall@1407
  /* 1408 */   5,0xFB,  1,0xFA,  3,0xF7,158,  5,102,0xFB,  2,0xFA,  6,103,0xFB,0xFF,
  /* 1424 */ 0xFA,  9,104,0xFA, 12,105,0xFB,0xFE,0xF8,  0, 15,0xFF,192,  4,102,0xFB, // bumpfloat@1438
  /* 1440 */   2,0xFA,  3,103,0xFB,0xFF,0xFA,  4,104,0xFA,  5,105,0xFB,0xFE,0xF8,  0,
  /* 1456 */   6,0xFF,192,  4,0xF9,  5,0xFB,0xFF,0xFA,0xFC,102,0xFB,0xFF,0xFA,  3,0xFB, // hardbump@1460
  /* 1472 */ 0xFD,0xFA,  1,0xF4,0xFB,  1,0xF2,  1,107,0xFB,  2,108,0xF2,  1,109,0xFF,
  /* 1488 */  44,  7,121,0xFB,  1,122,123,0xFB,  2,124,0xFB,  4,125,0xFB,  3,126, // testfoot@1490
  /* 1504 */ 0xFB,0xFC, 86,0xF2,  1,0xF4,0xFB,0xFC,116,0xFB,0xFE,117,118,119,0xFF, 22,
  /* 1520 */   1,0xFB,0xFB,0xFF, 22,  1,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB, // stepback@1521, fullstep@1526, step14@1526
  /* 1536 */   3,124,0xFB,  4,125,0xFB,  3,126,0xFB,0xFF,0xFB,  3,127,128,129,130,
  /* 1552 */ 131,132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB,  3, // step13@1557
  /* 1568 */ 124,0xFB,  4,125,0xFB,  3,126,0xFB,0xFF,0xFB,  2,127,128,129,130,131,
  /* 1584 */ 132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB,  3,124, // step12@1588
  /* 1600 */ 0xFB,  4,125,0xFB,  3,126,0xFB,0xFF,0xFB,  1,127,128,129,130,131,132,
  /* 1616 */ 0xFF, 22,  1,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB,  3,124,0xFB, // step11@1619
  /* 1632 */   4,125,0xFB,  3,126,0xFB,0xFF,127,128,129,130,131,132,0xFF, 22,  1,
  /* 1648 */ 0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB,  3,124,0xFB,  4,125,0xFB, // step10@1648, step10a@1653
  /* 1664 */   3,126,0xFB,0xFE,128,129,130,131,132,0xFF, 22,  1,0xF9,  1,121,0xFF, // step9@1676
  /* 1680 */ 117,  6,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB,  3,124,0xFB,  4, // step8@1682
  /* 1696 */ 125,0xFB,0xFF,127,128,129,130,131,132,0xFF, 22,  1,0xF9,  1,121,0xFB, // step7@1708
  /* 1712 */   1,122,0xFB,  1,123,0xFB,  3,124,0xFB,  2,129,130,131,132,0xFF, 22,
  /* 1728 */   1,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB,  2,124,0xFB,  2,129, // step6@1729
  /* 1744 */ 130,131,132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1,122,0xFB,  1,123,0xFB, // step5@1750
  /* 1760 */   2,124,0xFB,  1,129,130,131,132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1, // step4@1771
  /* 1776 */ 122,0xFB,  1,123,0xFB,  2,131,132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1, // step3@1787
  /* 1792 */ 122,0xFB,  1,123,0xFB,  1,131,132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1, // step2@1803
  /* 1808 */ 122,0xFB,  1,132,0xFF, 22,  1,0xF9,  1,121,0xFB,  1,132,0xFF, 22,  1, // step1@1815
  /* 1824 */ 0xF9,  1,0xFB,  1,107,0xFB,  2,108,109,0xFF, 40,  7,0xF9,  5,0xFB,  1, // stoop@1824, stoop:crouch@1832, standup@1836
  /* 1840 */ 110,111,0xFB,  2,112,113,0xFB,  1,114,115,116,0xFB,0xFC,117,118,119,
  /* 1856 */ 0xFF, 22,  1,0xF9,  1,0xF3,  1,229,229,229,229,229,229,230,231,232, // pickupsword@1859
  /* 1872 */ 0xFF, 83,  7,0xF9,  1,0xFB,0xFB,233,234,235,236,237,238,239,240,133, // resheathe@1875
  /* 1888 */ 133,134,134,134, 48,0xFB,  1, 49,0xFB,0xFE,0xF9,  5, 50,0xF9,  1, 51,
  /* 1904 */  52,0xFF, 22,  1,0xF9,  1,0xFB,0xFB,234,236,238,240,134,0xFB,0xFF,0xFF, // fastsheathe@1908
  /* 1920 */  22,  1,0xF9,  1,0xFB,  4,191,192,193,194,195,196,197,198,199,200, // drinkpotion@1922
  /* 1936 */ 201,202,203,204,205,205,205,0xF3,  1,205,205,201,198,0xFB,0xFC,0xFF,
  /* 1952 */  22,  1,0xF9,  5,0xF4,0xFB,  1,0xF2,  1,107,0xFB,  2,108,0xF2,  1,0xF9, // softland@1954
  /* 1968 */   1,109,0xFF,177,  7,0xF9,  1,0xFA,0xFE,0xFB,  1,107,0xFB,  2,108,109, // softland:crouch@1969, landrun@1973
  /* 1984 */ 0xFB,  1,110,111,0xFB,  2,112,113,0xFB,  1,0xFA,  1,114,0xFA,  1,115,
  /* 2000 */ 0xFB,0xFE,0xFF,238,  0,0xF9,  5,0xF4,0xFA,0xFE,0xFB,  1,0xFB,  2,108,109, // medland@2005
  /* 2016 */ 109,109,109,109,109,109,109,109,109,109,109,109,109,109,109,109,
  /* 2032 */ 109,109,109,109,109,109,109,109,109,109,109,109,0xFB,  1,110,110,
  /* 2048 */ 110,111,0xFB,  2,112,113,0xFB,  1,0xFA,  1,114,0xFA,  1,115,116,0xFB,
  /* 2064 */ 0xFC,117,118,119,0xFF, 22,  1,0xF9,  5,0xF4,0xFA,0xFE,0xFB,  3,185,0xF6, // hardland@2071
  /* 2080 */ 185,0xFF, 32,  8,0xF9,  5,0xFF, 41,  8,0xF9,  1,0xF6,179,180,181,182, // hardland:dead@2080, stabkill@2084, dropdead@2089
  /* 2096 */ 0xFB,  1,183,0xFB,0xFC,185,0xFF, 53,  8,0xF9,  1,0xF4,0xFB,  4,177,0xF6, // dropdead:dead@2101, impale@2105
  /* 2112 */ 177,0xFF, 64,  8,0xF9,  1,178,0xF6,178,0xFF, 72,  8,0xFF,213,  7,0xF8, // impale:dead@2112, halve@2116, halve:dead@2120, crush@2124, deadfall@2127
  /* 2128 */   0,  0,0xF9,  4,185,0xFF, 84,  8,0xF9,  5,0xFB,0xFB,0xFA,0xFF,0xF2,  1, // deadfall:loop@2132, climbstairs@2136
  /* 2144 */ 217,218,219,0xFB,  1,220,0xFB,0xFC,0xFA,0xFD,0xF2,  1,221,0xFB,0xFC,0xFA,
  /* 2160 */ 0xFE,222,222,0xFB,0xFE,0xFA,0xFD,223,223,0xFB,0xFD,0xFA,0xF8,0xF2,  1,224,
  /* 2176 */ 224,0xFB,0xFF,0xFA,0xFF,225,225,0xFB,0xFD,0xFA,0xFC,226,226,0xFB,0xFF,0xFA,
  /* 2192 */ 0xFB,0xF2,  1,227,227,0xFB,0xFE,0xFA,0xFF,228,228,  0,0xF2,  1,  0,  0,
  /* 2208 */   0,  0,0xF2,  1,  0,  0,  0,  0,0xF2,  1,  0,  0,  0,  0,0xF2,  1,
  /* 2224 */ 0xF1,  0,0xFF,177,  8, 54,0xFF,181,  8, 85, 67, 67, 67, 67, 67, 67, // climbstairs:loop@2225, Vstand@2229, Vraise@2233
  /* 2240 */  68, 69, 70, 71, 72, 73, 74, 75, 83, 84, 76,0xFF,202,  8,0xFB,  1, // Vraise:loop@2250, Vwalk@2254
  /* 2256 */  48,0xFB,  2, 49,0xFB,  6, 50,0xFB,  1, 51,0xFB,0xFF, 52,0xFB,  1, 53, // Vwalk1@2256, Vwalk2@2259
  /* 2272 */ 0xFB,  1,0xFF,208,  8,0xFB,  1, 55, 56,0xFF,181,  8, 77, 78, 79, 80, // Vstop@2277, Vexit@2284
  /* 2288 */  81, 82,0xFB,  1, 54, 54, 54, 54, 54, 54, 57, 58, 59, 60, 61,0xFB,
  /* 2304 */   2, 62,0xFB,0xFF, 63,0xFB,0xFD, 64, 65,0xFB,0xFF, 66,0xFE,0xFB, 16,0xFB,
  /* 2320 */   3,0xFF,211,  8, 11,0xFF, 20,  9,  2,  3,  4,  5,  6,  7,  8,  9, // Pstand@2324, Palert@2328
  /* 2336 */ 0xFE,0xFB,  9, 11,0xFF, 20,  9,0xFE,0xFB, 11, 12,0xFB,  1, 13,0xFB,  1, // Pback@2343
  /* 2352 */  14,0xFB,  3, 15,0xFB,  1, 16, 17,0xFF, 55,  9, 19,0xFF, 59,  9, 20, // Pback:loop@2359, Plie@2363, Pwaiting@2367, Pwaiting:loop@2367
  /* 2368 */ 0xFF, 63,  9, 21,0xFB,  1, 22, 23, 24,0xFB,  1, 25,0xFB,0xFD, 26,0xFB, // Pembrace@2371
  /* 2384 */ 0xFE, 27,0xFB,0xFC, 28,0xFB,0xFD, 29,0xFB,0xFE, 30,0xFB,0xFD, 31,0xFB,0xFF,
  /* 2400 */  32, 33,0xFF, 97,  9, 37,0xFF,101,  9, 37, 38, 39, 40, 41, 42, 43, // Pembrace:loop@2401, Pstroke@2405, Pstroke:loop@2405, Prise@2409
  /* 2416 */  44, 45, 46, 47,0xFE,0xFB, 13, 11,0xFF,119,  9, 11, 11,0xFE,0xFB, 13, // Prise:loop@2423, Pcrouch@2427
  /* 2432 */  47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 36, 36, 35, 35,
  /* 2448 */  35, 34, 34, 34, 34, 34, 34, 34, 35, 35, 36, 36, 36, 35, 35, 35,
  /* 2464 */  34, 34, 34, 34, 34, 34, 34, 35, 35, 36, 36, 36, 35, 35, 35, 34,
  /* 2480 */  34, 34, 34, 34, 34, 34, 34, 34, 35, 35, 35, 36,0xFF,187,  9,  1, // Pcrouch:loop@2491, Pslump@2495
  /* 2496 */  18,0xFF,192,  9,0xF9,  1,186,0xFB,  5,186,0xFB,  3,187,0xFB,  4,0xFF, // Pslump:loop@2496, Mscurry@2500, Mscurry1@2502, Mscurry1:loop@2502
  /* 2512 */ 198,  9,186,0xFF,210,  9,188,0xFF,214,  9,0xF9,  0,186,186,186,188, // Mstop@2514, Mstop:loop@2514, Mraise@2518, Mraise:loop@2518, Mleave@2522
  /* 2528 */ 188,188,188,188,188,188,188,0xFE,0xFB,  8,0xFF,198,  9,186,0xFF,237, // Mclimb@2541
  /* 2544 */   9,
]);

/**
 * Reads the dispatch table to get the byte offset for a given sequence number.
 * @param {number} seqNum - 1-based sequence number (1-114)
 * @returns {number} byte offset into SEQ_DATA where the sequence starts
 */
export function getSeqPointer(seqNum) {
  if (seqNum < 1 || seqNum > 114) {
    throw new Error(`Invalid sequence number: ${seqNum} (must be 1-114)`);
  }
  const tableIdx = (seqNum - 1) * 2;
  return SEQ_DATA[tableIdx] | (SEQ_DATA[tableIdx + 1] << 8);
}
