# Prince of Persia — Browser Reimplementation Plan

## Goal

Faithful browser-based reimplementation of Prince of Persia for the Apple II, using the original binary assets and source code as ground truth.

---

## Phase 1: Foundation ✅

- [x] Display system — 560×192 Double Hi-Res framebuffer (`display.js`)
- [x] 16-color Apple II palette (`colors.js`)
- [x] Text rendering from IMG.ALPHA font table (`text.js`)
- [x] Image table parser for Apple II binary format (`imageLoader.js`)
- [x] Level data parser — 30 tiles/room, 24 rooms/level, link tables (`level.js`)
- [x] PNG sprite export tooling (925 sprites extracted)

## Phase 2: Intro / Attract Loop ✅

- [x] Title screen attract sequence (`attract.js`)
- [x] Cutscene rendering (`cutscene.js`)
- [x] Animation frame sequencing (`animation.js`)
- [x] Main entry point with attract loop (`main.js`)

## Phase 3: Background Tile Rendering (Current) 🔧

- [x] Procedural tile renderer — colored rectangles as placeholder (`bgRenderer.js`)
- [x] Room view controller with cross-room tile lookups (`roomView.js`)
- [x] Level viewer page with room navigation (`levelViewer.js`, `levels.html`)
- [x] Sprite-based tile rendering using IMG.BGTAB1/BGTAB2 image data
- [x] Piece tables replicated from BGDATA.S (piecea/b/c/d, maska/b, fronti, etc.)
- [x] Full RedBlockSure rendering pipeline: drawc → domaskb → drawb → bstripe → drawd → addamask → adda → drawfrnt
- [x] 1-based image indexing fix (Apple II `setimage` computes `IMAGE*2-1`)
- [x] AND mask polarity fix (bit=0 clears, bit=1 preserves)
- [x] B-section variant tables (spaceb, floorb, blockb, panelb)
- [x] Block/panel C-section and D-section variant tables
- [x] Palace vs dungeon tileset switching
- [x] Verify rendering against screenshots for all 15 levels
- [x] Special A-section handling for animated tiles (spikes, slicer, flask, sword)
- [x] `drawma` — movable A-section (spike animation frames, slicer blade, flask glow, sword shine)
- [x] `drawmc` — movable C-section
- [x] `drawmd` — movable D-section (gate opening/closing)
- [x] Front piece STA/ORA mode per tile type (dungeon posts, archtops)
- [x] `archpanel` special case (archtop1 left of panelwof)
- [x] Torch flame animation overlay
- [x] `drawmb` — movable B-section (gate bars, spike B, loose B, exit stairs/door)
- [x] Slicer front piece (`drawslicerf`) with `maddfore` two-pass draw
- [x] `getpiecea` loose floor override (state-based A-section image)

## Phase 4: Character Sprite Rendering

- [ ] Character image tables (IMG.CHTAB1–7) loading
- [ ] Character sprite drawing with proper layering (behind/in front of tiles)
- [ ] Kid sprite rendering at start position from level data
- [ ] Guard sprite rendering at guard start positions
- [ ] Foreground/midground/background Z-ordering (original uses `fast` image list system)
- [ ] Sprite masking against background (character behind walls)
- [ ] `addmidez` / `addfore` layering from FRAMEADV.S

## Phase 5: Animation & Sequence Engine

- [ ] Sequence table interpreter (SEQTABLE.S — goto, chx, chy, act, setfall, etc.)
- [ ] Frame definition tables (FRAMEDEF.S — per-frame image, dx, dy, sword position)
- [ ] Movement system — running, walking, jumping, climbing, falling
- [ ] Sword fighting sequences (advance, retreat, strike, block, parry)
- [ ] Special sequences (drinking potion, dying, mirror jump)

## Phase 6: Game Logic

- [ ] Keyboard input (CTRL.S / SPECIALK.S)
- [ ] Collision detection (COLL.S — wall checks, edge checks, floor checks)
- [ ] Mover system (MOVER.S — falling floors, gates, pressure plates, chompers)
- [ ] Loose floor shake animation (rendering code ready — needs mover state machine to drive tile.spec)
- [ ] Guard AI (CTRLSUBS.S — auto-control sequences)
- [ ] Sound effects (SOUND.S — can use Web Audio API for Apple II square wave synthesis)
- [ ] Timer / game clock (minutes remaining)
- [ ] Health / hit points system
- [ ] Potion effects (health, slow-fall, flip, poison)
- [ ] Level progression and win/lose conditions

## Phase 7: Polish

- [ ] Inter-room scrolling transitions
- [ ] Screen shake effects
- [ ] Mouse / shadow character AI (AUTO.S)
- [ ] Mirror level (level 4 shadow creation)
- [ ] Final battle (level 12) special logic
- [ ] Princess cutscenes between levels
- [ ] End game sequence
- [ ] Save/load game state

---

## Architecture

```
browser/
├── index.html          — Main game page (attract loop)
├── levels.html         — Level viewer / debug tool
├── style.css           — Minimal styling
└── js/
    ├── main.js         — Entry point, attract loop
    ├── display.js      — 560×192 framebuffer, setPixel, present
    ├── colors.js       — 16-color Apple II DHires palette
    ├── text.js         — Font rendering from IMG.ALPHA
    ├── imageLoader.js  — Binary image table parser
    ├── level.js        — Level data parser, TILE constants, getTile()
    ├── bgRenderer.js   — BG tile renderer (piece tables + drawRoom)
    ├── renderer.js     — Character sprite renderer
    ├── roomView.js     — Room view controller
    ├── levelViewer.js  — Level viewer UI
    ├── attract.js      — Title screen attract sequence
    ├── cutscene.js     — Cutscene rendering
    └── animation.js    — Animation frame sequencing
```

## Key Source Files (Apple II originals)

| File | Purpose |
|------|---------|
| `FRAMEADV.S` | BG tile rendering pipeline (SURE, RedBlockSure, draw/mask routines) |
| `BGDATA.S` | All piece lookup tables (piecea/b/c/d, maska/b, fronti, etc.) |
| `HIRES.S` | Low-level drawing (setimage, add/ORA/STA/AND, GETWIDTH) |
| `SEQTABLE.S` | Animation sequence definitions |
| `FRAMEDEF.S` | Per-frame image/offset definitions |
| `COLL.S` | Collision detection |
| `MOVER.S` | Interactive object logic (gates, traps, falling floors) |
| `CTRL.S` | Player input handling |
| `CTRLSUBS.S` | Guard AI |
| `AUTO.S` | Shadow / mouse AI |
| `GAMEBG.S` | Game-mode BG rendering entry points |
| `EQ.S` | Global equates and memory map |

## Key Lessons Learned

1. **Image indexing is 1-based** — Apple II `setimage` uses `IMAGE*2-1`. Always subtract 1 when indexing parsed arrays.
2. **AND mask polarity** — `screen = screen AND mask`. Bit=0 clears, bit=1 preserves. Do NOT invert.
3. **Y means bottom** — `YCO`/`srcY` is the bottom scanline of the image, not the top.
4. **Image data is bottom-to-top** — Data row 0 = bottom row on screen.
5. **B-section from left neighbor** — The wall face comes from `PRECED` (tile to the left), not the current tile.
6. **C-section from below-left** — `BELOW[colno]` = tile at `(col-1, row+1)`.
7. **Mask A at `ay`**, body A at `ay + pieceay[id]` — different Y positions.
8. **Variant tables matter** — Space/floor/block/panel tiles use spec-indexed variant tables for B/C/D sections.
9. **bstripe is palace-only** — Only drawn when `BGset1 == 1` (palace tileset).
10. **Keep rendering code simple** — Follow the assembly flow directly; complex helper abstractions introduce interacting bugs.
