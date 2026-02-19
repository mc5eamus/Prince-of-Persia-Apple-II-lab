/**
 * input.js — Keyboard input system.
 *
 * Ported from SPECIALK.S / GRAFIX.S.
 * Maps browser keyboard events to the Apple II virtual joystick:
 *   JSTKX (-1/0/+1), JSTKY (-1/0/+1), btn (boolean)
 * Plus fresh-press tri-state tracking: clrF, clrB, clrU, clrD, clrbtn.
 */

// ── Key-to-direction mapping ────────────────────────────────────────────────
// Original Apple II: I=up, K=down, J=left, L=right, U=upleft, O=upright
// Modern:           ArrowUp/Down/Left/Right, Shift=button
const KEY_DIRS = {
  // Arrow keys
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
  ArrowUp:    { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 },
  // IJKL / UO (original Apple II)
  j: { x: -1, y:  0 },
  J: { x: -1, y:  0 },
  l: { x:  1, y:  0 },
  L: { x:  1, y:  0 },
  i: { x:  0, y: -1 },
  I: { x:  0, y: -1 },
  k: { x:  0, y:  1 },
  K: { x:  0, y:  1 },
  u: { x: -1, y: -1 },
  U: { x: -1, y: -1 },
  o: { x:  1, y: -1 },
  O: { x:  1, y: -1 },
};

// Button keys: Shift (matches original Apple II open-apple / button)
const BUTTON_KEYS = new Set(['Shift', 'ShiftLeft', 'ShiftRight']);
// Check keydown event for Shift — e.shiftKey is more reliable
function isBtnKey(e) {
  return e.shiftKey || e.key === 'Shift';
}

/**
 * Tri-state fresh-press flag values.
 *
 * From CLRJSTK in SPECIALK.S (line 830):
 *   0  = idle (no press detected)
 *  -1  = fresh unused press (available for consumption)
 *  +1  = consumed (used this frame, waiting for release)
 */
const FRESH   = -1;
const CONSUMED = 1;
const IDLE     = 0;

/**
 * Input state object.
 *
 * Raw state:
 *   JSTKX, JSTKY: -1/0/+1 directional
 *   btn: true when button is held down
 *
 * Fresh-press tracking:
 *   clrF, clrB, clrU, clrD, clrbtn: tri-state (0/-1/+1)
 */
export function createInputState() {
  return {
    // ── Raw directional state ──
    JSTKX: 0,
    JSTKY: 0,
    btn:   false,

    // ── Fresh-press tracking (CLRJSTK) ──
    clrF:   IDLE,    // forward
    clrB:   IDLE,    // backward
    clrU:   IDLE,    // up
    clrD:   IDLE,    // down
    clrbtn: IDLE,    // button

    // ── Internal: raw keys currently held ──
    _keysDown: new Set(),
    _btnDown: false,
  };
}

/**
 * Attach keyboard event listeners and return an input state.
 *
 * @param {HTMLElement|Document} target  Element to listen on
 * @returns {InputState}
 */
export function initInput(target = document) {
  const state = createInputState();

  target.addEventListener('keydown', (e) => {
    // Ignore if input element is focused
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    if (isBtnKey(e)) {
      state._btnDown = true;
    }
    if (KEY_DIRS[e.key]) {
      state._keysDown.add(e.key);
      // Prevent browser scrolling
      e.preventDefault();
    }
  });

  target.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      state._btnDown = false;
    }
    state._keysDown.delete(e.key);
    // Also remove case-swapped variant (handles shift release)
    if (e.key.length === 1) {
      state._keysDown.delete(e.key.toLowerCase());
      state._keysDown.delete(e.key.toUpperCase());
    }
  });

  // Handle window blur (release all keys)
  window.addEventListener('blur', () => {
    state._keysDown.clear();
    state._btnDown = false;
  });

  return state;
}

/**
 * Read current input state from held keys.
 *
 * Replicates KREAD + GETSELECT: computes JSTKX/JSTKY/btn from raw keys.
 * Call this once per frame BEFORE clrjstk().
 *
 * @param {InputState} state
 */
export function readInput(state) {
  let x = 0, y = 0;

  for (const key of state._keysDown) {
    const dir = KEY_DIRS[key];
    if (dir) {
      x += dir.x;
      y += dir.y;
    }
  }

  // Clamp to -1/0/+1
  state.JSTKX = Math.sign(x);
  state.JSTKY = Math.sign(y);
  state.btn   = state._btnDown;
}

/**
 * Update fresh-press tracking flags.
 *
 * Replicates CLRJSTK from SPECIALK.S (line 830–930).
 * Must be called once per frame AFTER readInput().
 *
 * The tri-state protocol:
 *   When direction IS pressed:
 *     idle (0)     → fresh (-1)   — new press detected
 *     fresh (-1)   → fresh (-1)   — still available
 *     consumed (1) → consumed (1) — waiting for release
 *   When direction NOT pressed:
 *     consumed (1) → idle (0)     — released, can detect next press
 *     fresh (-1)   → fresh (-1)   — was pressed, wasn't consumed yet
 *     idle (0)     → idle (0)     —
 *
 * @param {InputState} state
 */
export function clrjstk(state) {
  // Forward (JSTKX < 0 in face-normalized space, but here we track raw left)
  // NOTE: clrF/clrB are raw directions (Left/Right), NOT face-relative.
  // facejstk() is called in playerCtrl to make them face-relative.
  _updateClr(state, 'clrF', state.JSTKX < 0);  // left = raw forward default
  _updateClr(state, 'clrB', state.JSTKX > 0);  // right = raw backward default
  _updateClr(state, 'clrU', state.JSTKY < 0);
  _updateClr(state, 'clrD', state.JSTKY > 0);
  _updateClr(state, 'clrbtn', state.btn);
}

function _updateClr(state, field, isDown) {
  if (isDown) {
    if (state[field] === IDLE) state[field] = FRESH;
    // fresh and consumed stay as they are
  } else {
    if (state[field] === CONSUMED) state[field] = IDLE;
    // fresh stays fresh (pressed but not yet consumed)
    // idle stays idle
  }
}

/**
 * Normalize input for character facing direction.
 *
 * Replicates FACEJSTK from CTRL.S (line 607–620):
 * When facing right, negate JSTKX and swap clrF/clrB so that
 * GenCtrl always sees "forward" as JSTKX < 0.
 *
 * @param {InputState} state
 * @param {number} charFace  -1=left, +1=right
 */
export function facejstk(state, charFace) {
  if (charFace > 0) {
    // Facing right: negate X, swap forward/backward
    state.JSTKX = -state.JSTKX;
    const tmp = state.clrF;
    state.clrF = state.clrB;
    state.clrB = tmp;
  }
}

/**
 * Restore input after facejstk (call after GenCtrl returns).
 *
 * @param {InputState} state
 * @param {number} charFace
 */
export function unfacejstk(state, charFace) {
  // Same operation is its own inverse
  facejstk(state, charFace);
}
