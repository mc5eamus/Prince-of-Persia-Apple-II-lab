/**
 * Apple II Double Hi-Res color palette.
 *
 * DHires uses a 4-bit (16-color) palette.  The exact RGB values depend on the
 * monitor — these are the commonly-accepted "idealized NTSC" values used by
 * most emulators (AppleWin / Virtual ][).
 */
export const DHIRES_COLORS = [
  [0x00, 0x00, 0x00], //  0 — Black
  [0xDD, 0x00, 0x33], //  1 — Deep Red  (Magenta)
  [0x00, 0x00, 0x99], //  2 — Dark Blue
  [0xDD, 0x22, 0xDD], //  3 — Purple    (Violet)
  [0x00, 0x77, 0x22], //  4 — Dark Green
  [0x55, 0x55, 0x55], //  5 — Gray 1
  [0x22, 0x22, 0xFF], //  6 — Medium Blue
  [0x66, 0xAA, 0xFF], //  7 — Light Blue
  [0x88, 0x55, 0x00], //  8 — Brown
  [0xFF, 0x66, 0x00], //  9 — Orange
  [0xAA, 0xAA, 0xAA], // 10 — Gray 2
  [0xFF, 0x99, 0x88], // 11 — Pink
  [0x11, 0xDD, 0x00], // 12 — Green     (Light Green)
  [0xFF, 0xFF, 0x00], // 13 — Yellow
  [0x44, 0xFF, 0x99], // 14 — Aquamarine
  [0xFF, 0xFF, 0xFF], // 15 — White
];

/**
 * Monochrome green-screen palette (two entries: off / on).
 */
export const MONO_GREEN = [
  [0x00, 0x00, 0x00],
  [0x33, 0xFF, 0x33],
];

/**
 * Monochrome white palette.
 */
export const MONO_WHITE = [
  [0x00, 0x00, 0x00],
  [0xFF, 0xFF, 0xFF],
];
