# Prince of Persia Apple II — Browser Reimplementation

## Project Overview

This project is a browser-based reimplementation of Prince of Persia for the Apple II, using the original source code and binary assets from the `01 POP Source/` directory. The browser code lives in `browser/`.

## Apple II Image Table Format

Image tables (IMG.BGTAB1.DUN, IMG.BGTAB2.DUN, IMG.BGTAB1.PAL, IMG.BGTAB2.PAL, IMG.CHTAB*) use this binary format:

- **Byte 0**: max image index (count = byte0 + 1)
- **Bytes 1..count×2**: 2-byte LE absolute pointers for each image
- **Each image**: byte 0 = width (in bytes, 7 pixels each), byte 1 = height (scanlines), bytes 2+ = pixel data

**Critical**: Image numbers in the piece tables are **1-based**, not 0-based. The Apple II `setimage` routine in HIRES.S computes `offset = IMAGE * 2 - 1`, so image 1 maps to pointer index 0. When indexing into parsed `images[]` arrays, always subtract 1 from the image number.

### Pixel Data Layout

- Stored **bottom-to-top**: data row 0 is the bottom scanline of the image on screen
- Each byte encodes 7 pixels (bits 0–6); bit 7 is unused/high-bit flag
- `YCO` / `srcY` specifies the **bottom** of the image on screen (not the top)

### Image Number Encoding

- Bit 7 clear (0x00–0x7F): image is in **bgtable1**
- Bit 7 set (0x80–0xFF): image is in **bgtable2** (mask off bit 7 for the index)

## BG Tile Rendering Pipeline (FRAMEADV.S)

The `SURE` routine draws 3 rows × 10 columns. For each block, `RedBlockSure` draws sections in this exact order:

1. **drawc** — C-section from tile **below and to left** `(col-1, row+1)`. Only visible when current tile is space, pillartop, panelwof, or archtop.
2. **domaskb** — AND mask of left neighbor (applied after C-section)
3. **drawb** — B-section of piece to **left** (wall face behind current column)
4. **bstripe** — Vertical wall stripe, **palace tileset only**, drawn at `ay - 32`
5. **drawd** — D-section of current piece (floor surface), drawn at `blockBot`
6. **addamask** — AND mask A, only when left neighbor is intrusive (panelwif, panelwof, pillartop, block). Applied at `ay` (NOT `ay + pieceay`).
7. **adda** — A-section body of current piece, drawn at `ay + pieceay[id]`
8. **drawfrnt** — Front piece of current tile

### Key Variables and Coordinates

- `XCO = colno * 4` (byte offset; each block is 4 bytes = 28 SHires pixels = 56 DHires pixels)
- `BlockBot = Dy` = bottom of block on screen
- `Ay = Dy - 3 = BlockBot - 3`
- Block height = 63 scanlines per row
- Screen = 280 SHires pixels wide (560 DHires), 192 scanlines tall
- `PRECED` = objid of the tile to the LEFT (left neighbor)
- `BELOW[colno]` = tile at `(colno-1, row+1)` — "below and to left"

### Drawing Modes (OPACITY)

- **ORA** (default for most pieces): transparent background — only set pixels are drawn, zero pixels are skipped
- **STA** (overwrite): all pixels drawn including zeros — used for D-section (floor), some front pieces
- **AND** (mask): `screen = screen AND mask`. Bit=0 **clears** the pixel, bit=1 **preserves** it. This polarity is critical — do NOT invert it.

### B-Section Variant Tables

The B-section uses variant tables based on tile type and spec value:

- `space` → `spaceb[spec]` with Y offset `spaceby[spec]`
- `floor` → `floorb[spec]` with Y offset `floorby[spec]`
- `block` → `blockb[spec]` (spec < NUMBLOX)
- `panel` (pieceb = 0x9E) → `panelb[spec]` (spec < NUMPANS)
- Other tiles → `pieceb[leftId]` directly

### Block/Panel Variant Tables

- D-section: `blockd[spec]` for blocks
- C-section: `blockc_var[spec]` for blocks, `panelc_var[spec]` for panels (when piecec = 0x9F)
- Front: `blockfr[spec]` for blocks

## BGDATA.S Piece Tables

All piece lookup tables are defined in `01 POP Source/Source/BGDATA.S`. These tables are indexed by tile ID (objid). The `browser/js/bgRenderer.js` file replicates these tables. When updating, always verify values against the original assembly source.

Key tables: `piecea`, `pieceay`, `pieceb`, `pieceby`, `piecec`, `pieced`, `maska`, `maskb`, `bstripe`, `fronti`, `frontx`, `fronty`

## Tileset Selection

- Levels 0–3: Dungeon tileset (IMG.BGTAB1.DUN, IMG.BGTAB2.DUN)
- Levels 4+: Palace tileset (IMG.BGTAB1.PAL, IMG.BGTAB2.PAL)

The `palace` flag affects: bstripe visibility, color scheme, and some front piece drawing modes.

## Display System

- Framebuffer: 560×192 pixels (Double Hi-Res)
- Each SHires pixel maps to 2 DHires pixels: `setPixel(sx*2, y, color, page)` and `setPixel(sx*2+1, y, color, page)`
- 16-color palette
- `setPixel` includes bounds checking

## Level Data Format

- 30 tiles per room (3 rows × 10 columns), each tile = 5 bits id + 5 bits spec (packed)
- 24 rooms per level with left/right/up/down room links
- Cross-room tile lookups use `getTile(level, roomIdx, col, row)` which handles wrapping

## Common Pitfalls

1. **Off-by-one image indexing**: Apple II image numbers are 1-based. Always subtract 1 when indexing parsed arrays.
2. **AND mask polarity**: Bit=0 clears, bit=1 preserves. Do NOT invert.
3. **Y coordinate meaning**: `srcY`/`YCO` = bottom of image, not top. Top = `srcY - height + 1`.
4. **Bottom-to-top image data**: Row 0 in data = bottom row on screen.
5. **B-section comes from LEFT neighbor**, not current tile.
6. **C-section comes from BELOW-LEFT** `(col-1, row+1)`, not directly below.
7. **Mask A position**: Applied at `ay`, while A-body is at `ay + pieceay[id]`.
8. **bstripe**: Palace-only, drawn at `ay - 32`.
