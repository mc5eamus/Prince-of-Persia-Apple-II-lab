/**
 * health.js — Health / hit-points system.
 *
 * Ported from SUBS.S (decstr, addstr, rechargemeter, boostmeter, chgmeters).
 *
 * Tracks KidStrength (current HP), MaxKidStr (max HP), and ChgKidStr
 * (pending delta applied at end of frame).
 *
 * Constants from EQ.S:
 *   initmaxstr = 3   (starting max HP)
 *   maxmaxstr  = 10  (absolute cap)
 */

// ── Constants ──────────────────────────────────────────────────────────────
export const INIT_MAX_STR  = 3;   // starting max HP (levels 1–3)
export const MAX_MAX_STR   = 10;  // absolute HP cap
export const GUARD_HP      = 4;   // default guard HP (varies by skill)

/**
 * Create health state for a character.
 *
 * @param {number} [maxHP=INIT_MAX_STR]  Maximum hit points
 * @returns {HealthState}
 */
export function createHealthState(maxHP = INIT_MAX_STR) {
  return {
    kidStr:    maxHP,   // current HP
    maxStr:    maxHP,   // current max HP
    chgStr:    0,       // pending delta (applied end-of-frame)
    flash:     0,       // frames of damage-flash remaining
  };
}

/**
 * Decrease strength.
 *
 * From SUBS.S "decstr":
 *   amount=1 → normal hit / medium fall
 *   amount=100 → instant kill (hard fall, crushed, impaled)
 *
 * @param {HealthState} hp
 * @param {number} amount  HP to subtract
 * @returns {boolean}  true if character is now dead
 */
export function decstr(hp, amount) {
  hp.kidStr -= amount;
  if (hp.kidStr <= 0) {
    hp.kidStr = 0;
    return true; // dead
  }
  hp.flash = 8; // visual feedback frames
  return false;
}

/**
 * Add 1 HP (small potion — addstr from SUBS.S).
 *
 * Heals 1 point up to current max. Does nothing if already at max.
 *
 * @param {HealthState} hp
 */
export function addstr(hp) {
  if (hp.kidStr < hp.maxStr) {
    hp.kidStr++;
    hp.flash = 6;
  }
}

/**
 * Recharge meter — heal to max (big potion effect).
 *
 * From SUBS.S "rechargemeter": sets KidStr = MaxStr.
 *
 * @param {HealthState} hp
 */
export function rechargemeter(hp) {
  hp.kidStr = hp.maxStr;
  hp.flash = 10;
}

/**
 * Boost meter — increase max HP by 1 then heal to new max.
 *
 * From SUBS.S "boostmeter". Capped at MAX_MAX_STR.
 *
 * @param {HealthState} hp
 */
export function boostmeter(hp) {
  if (hp.maxStr < MAX_MAX_STR) {
    hp.maxStr++;
  }
  hp.kidStr = hp.maxStr;
  hp.flash = 12;
}

/**
 * Apply pending HP change (called end-of-frame).
 *
 * From SUBS.S "chgmeters": applies ChgKidStr accumulator.
 *
 * @param {HealthState} hp
 * @returns {boolean}  true if character is dead after applying changes
 */
export function chgmeters(hp) {
  if (hp.chgStr !== 0) {
    hp.kidStr += hp.chgStr;
    hp.chgStr = 0;
    if (hp.kidStr <= 0) {
      hp.kidStr = 0;
      return true;
    }
    if (hp.kidStr > hp.maxStr) {
      hp.kidStr = hp.maxStr;
    }
  }
  // Decay flash
  if (hp.flash > 0) hp.flash--;
  return false;
}

/**
 * Check if character is alive.
 *
 * @param {HealthState} hp
 * @returns {boolean}
 */
export function isAlive(hp) {
  return hp.kidStr > 0;
}
