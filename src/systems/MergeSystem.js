// MergeSystem — listens for same-level fruit collisions and merges them.

import { getNextLevel, MAX_LEVEL } from '../config/fruits.js';

const M = window.Matter;

export class MergeSystem {
  constructor(physics, factory, callbacks = {}) {
    this.physics = physics;
    this.factory = factory;
    this.fruits = new Set();
    this.cb = callbacks; // { onMerge(fromLevel, toLevel, x, y, mergedFruit) }
    this.pendingRemovals = [];
    this.pendingSpawns = [];

    M.Events.on(this.physics.engine, 'collisionStart', (e) => this._onCollision(e));
  }

  register(fruit) { this.fruits.add(fruit); }
  unregister(fruit) { this.fruits.delete(fruit); }

  _onCollision(event) {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const fa = a.fruitRef;
      const fb = b.fruitRef;
      if (!fa || !fb) continue;
      if (fa.merging || fb.merging) continue;
      if (fa.level !== fb.level) continue;
      if (fa.level >= MAX_LEVEL) continue;

      // mark as merging now to avoid double-merge in same step
      fa.merging = true;
      fb.merging = true;

      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const newLevel = getNextLevel(fa.level);

      this.pendingRemovals.push(fa, fb);
      this.pendingSpawns.push({ x, y, fromLevel: fa.level, newLevel, momentum: {
        // tiny inheritance of horizontal motion only — no upward kick (was launching fruits out)
        // NOTE: Matter.Body.setVelocity expects {x, y} not {vx, vy}
        x: (a.velocity.x + b.velocity.x) * 0.15,
        y: 0,
      }});
    }
  }

  // Called once per game tick AFTER physics step.
  process() {
    if (this.pendingRemovals.length === 0 && this.pendingSpawns.length === 0) return;

    for (const f of this.pendingRemovals) {
      this.factory.destroy(f);
      this.unregister(f);
    }
    this.pendingRemovals.length = 0;

    for (const s of this.pendingSpawns) {
      // if both consumed fruits were already MAX_LEVEL we won't reach here (guarded above)
      const fruit = this.factory.create(s.newLevel, s.x, s.y);
      fruit.bornFromMerge = true;
      fruit.pop(0.55);
      // a little upward kick for that "pop" feel
      M.Body.setVelocity(fruit.body, s.momentum);
      this.register(fruit);
      if (this.cb.onMerge) this.cb.onMerge(s.fromLevel, s.newLevel, s.x, s.y, fruit);
    }
    this.pendingSpawns.length = 0;
  }
}
