// ScoreSystem — tracks score and combos.

import { SCORING } from '../config/constants.js';
import { getFruit } from '../config/fruits.js';

export class ScoreSystem {
  constructor() {
    this.score = 0;
    this.lastMergeAt = 0;
    this.combo = 0;
  }

  reset() {
    this.score = 0;
    this.lastMergeAt = 0;
    this.combo = 0;
  }

  // Returns { added, combo, comboBonus } for the caller to popup/sfx.
  addMerge(level) {
    const cfg = getFruit(level);
    const base = cfg.score;
    const now = performance.now();
    const inWindow = now - this.lastMergeAt < SCORING.comboWindowMs;
    this.combo = inWindow ? this.combo + 1 : 1;
    this.lastMergeAt = now;
    const comboMul = 1 + (this.combo - 1) * SCORING.comboBonusPerStep;
    const added = Math.round(base * SCORING.baseScoreMul * comboMul);
    this.score += added;
    return { added, combo: this.combo, base, comboMul };
  }

  // Called once per frame to expire stale combos in UI sense.
  tick() {
    if (this.combo > 0 && performance.now() - this.lastMergeAt > SCORING.comboWindowMs) {
      this.combo = 0;
    }
  }
}
