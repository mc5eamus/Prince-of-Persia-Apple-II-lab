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

## Phase 3: Background Tile Rendering ✅

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

## Phase 4: Character Sprite Rendering ✅

- [x] Character image tables (IMG.CHTAB1–7) loading
- [x] Character sprite drawing with proper layering (behind/in front of tiles)
- [x] Kid sprite rendering at start position from level data
- [x] Guard sprite rendering at guard start positions
- [x] Foreground/midground/background Z-ordering (original uses `fast` image list system)
- [x] Sprite masking against background (character behind walls)
- [x] `addmidez` / `addfore` layering from FRAMEADV.S

## Phase 5: Animation & Sequence Engine ✅

- [x] Sequence table interpreter (`seqInterpreter.js` — goto, chx, chy, act, setfall, jmpfall, etc.)
- [x] Sequence definition tables (`seqtable.js` — all SEQ constants and action tables from SEQTABLE.S)
- [x] Frame definition tables (`frameDef.js` — per-frame image, dx, dy, sword position from FRAMEDEF.S)
- [x] Character state machine (`charState.js` — CharState, animChar, advanceSequence, action dispatch)
- [x] Character renderer (`charRenderer.js` — sprite drawing with CHTAB selection, facing, layering)
- [x] Movement system — running, walking (Shift+direction), jumping, climbing, falling
- [ ] Sword fighting sequences (advance, retreat, strike, block, parry)
- [x] Special sequences — dying (death timer, restart), drinking potion (pickup + animation), stair climbing (climbstairs sequence)
- [x] Sword overlay gated by en garde mode (`charSword === 2`) — prevents sword showing during normal standing

## Phase 6: Game Logic 🔧

### Player Control ✅
- [x] Keyboard input (`input.js` — arrow keys, Shift=button, tri-state fresh-press tracking from CTRL.S)
- [x] Player control state machine (`playerCtrl.js` — GenCtrl: standing, running, turning, jumping, falling, hanging, crouching from CTRL.S)
- [x] Walk vs run via button modifier (Shift+direction = careful step, direction alone = run — matches original Apple II open-apple key)
- [x] Position math utilities (`positionMath.js` — block/pixel coordinate conversion)
- [x] Room transitions (`roomTransition.js` — cross-room movement when player exits screen bounds)

### Collision ✅
- [x] Floor collision detection (`floorCheck.js` — checkFloor, edge detection, landing classification from COLL.S)
- [x] Block reader (`blockReader.js` — tile lookup for collision queries)
- [x] Wall checks, edge checks, barrier detection

### Movers & Traps ✅
- [x] Mover system (`mover.js` — TROB/MOB lists, animtrans/animmobs dispatch from MOVER.S)
- [x] Gate animation (open/close/jam states, GMAX_VAL=188, fast-close velocity table)
- [x] Spike system (extend/retract/timer states, impalement check)
- [x] Slicer system (15-frame cycle, staggered sync, blood flag, slice check)
- [x] Loose floor state machine (wiggle → detach → MOB falling debris → crumble)
- [x] Pressure plates (LINKLOC/LINKMAP decoding, trigger chains, push/jam)
- [x] MOB falling debris physics (acceleration, terminal velocity, knockloose, makerubble)

### Health ✅
- [x] Health / hit points system (`health.js` — KidStrength/MaxKidStr/ChgKidStr, decstr, addstr, rechargemeter, boostmeter)
- [x] HP HUD display in play mode
- [x] Medium-landing HP loss integration with floor checks

### Object Pickup & Potions ✅
- [x] Object pickup system (`playerCtrl.js` — tryPickup/pickItUp/removeObj, triggered from standing+btn and crouching+clrbtn)
- [x] Potion effects (`roomView.js` — potionEffect dispatches on lastpotion: heal, life boost, slow-fall/weightless, upside-down/flip, poison)
- [x] Sword pickup (gotsword flag, sword tile removal)
- [x] Lightning flash effect on life-boost potion
- [x] Weightless timer for slow-fall potion (ifwtless opcode support in seqInterpreter)

### Level Progression ✅
- [x] Level advancement via `nextlevel` sequence opcode (0xF1 in climbstairs at offset 2224)
- [x] `onNextLevel` callback wired in gameTick animChar context
- [x] `advanceLevel()` / `_doAdvanceLevel()` in roomView.js
- [x] HP preservation across levels via `origStrength` pattern (from TOPCTRL.S)
- [x] `_onLevelChange` callback in levelViewer.js for async asset reload (BG tables, CHTAB4)
- [x] gotsword persistence across levels (reset on level 1)
- [x] Dungeon→palace tileset switch on level 4+

### Death & Restart ✅
- [x] Death timer (30-frame countdown after kid dies, then restartLevel)
- [x] restartLevel reloads level data, resets kid position, preserves HP
- [x] Attract-to-game transition (press any key during attract → start level 1)

### Not Yet Implemented
- [ ] Guard AI (CTRLSUBS.S — auto-control sequences)
- [ ] Combat system (en garde, sword fighting, FightCtrl state machine)
- [ ] Sound effects (SOUND.S — can use Web Audio API for Apple II square wave synthesis)
- [ ] Timer / game clock (minutes remaining)

## Phase 7: Polish

- [ ] Inter-room scrolling transitions
- [x] Screen shake effects (`shakeY` offset in roomView.js, triggered by loose floor landing)
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
├── index.html              — Main game page (attract loop)
├── levels.html             — Level viewer / debug tool (auto-enters play mode)
├── style.css               — Minimal styling
└── js/
    ├── main.js             — Entry point, attract loop
    ├── display.js          — 560×192 framebuffer, setPixel, present
    ├── colors.js           — 16-color Apple II DHires palette
    ├── text.js             — Font rendering from IMG.ALPHA
    ├── imageLoader.js      — Binary image table parser
    ├── level.js            — Level data parser, TILE constants, getTile()
    ├── bgRenderer.js       — BG tile renderer (piece tables + drawRoom)
    ├── renderer.js         — Character sprite renderer (legacy)
    ├── charRenderer.js     — Character sprite renderer (CHTAB-based)
    ├── charState.js        — Character state machine (animChar, sequence advance)
    ├── roomView.js         — Room view controller + game loop
    ├── levelViewer.js      — Level viewer UI
    ├── attract.js          — Title screen attract sequence
    ├── cutscene.js         — Cutscene rendering
    ├── animation.js        — Animation frame sequencing
    ├── input.js            — Keyboard input (arrows, Shift=button)
    ├── playerCtrl.js       — Player control state machine (GenCtrl)
    ├── seqInterpreter.js   — Sequence table interpreter
    ├── seqtable.js         — Sequence definitions (from SEQTABLE.S)
    ├── frameDef.js         — Frame definitions (from FRAMEDEF.S)
    ├── positionMath.js     — Block/pixel coordinate utilities
    ├── roomTransition.js   — Cross-room movement handling
    ├── blockReader.js      — Tile lookup for collision queries
    ├── floorCheck.js       — Floor collision detection
    ├── mover.js            — Mover system (TROB/MOB, gates, traps)
    └── health.js           — Health/HP system
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
11. **Walk vs run is button-modified** — Original Apple II uses open-apple key (mapped to Shift), not tap-vs-hold timing. Shift+direction = careful step, direction alone = run.
12. **Mover state in tile.spec** — Gates, spikes, slicers, and loose floors store animation state in the tile's spec field, which the renderer reads to pick the correct image.
13. **TROB vs MOB** — TROB = tile-resident objects (gates, spikes, slicers, loose floors in situ). MOB = mobile objects (detached debris falling through space). Both animated each frame.
14. **Pressure plate link encoding** — LINKLOC packs tile position (bits 0–4) + screen lo (bits 5–6) + last flag (bit 7). LINKMAP packs timer (bits 0–4) + screen hi (bits 5–7).
15. **Sword overlay needs en garde gate** — Frame definitions encode Fsword for many frames (e.g. standing frame 15 has Fsword=9). The original game only renders the sword overlay when `charSword === 2` (en garde mode).
16. **Level progression uses sequence opcode** — The `nextlevel` opcode (0xF1) fires inside the `climbstairs` sequence. The game loop checks a flag set by the callback, not inline level-change logic.
17. **HP preservation pattern** — `origStrength` is saved from current `maxStr` before level change and used as the initial HP for the next level (from TOPCTRL.S `GoneUpstairs`/`RESTART`).
