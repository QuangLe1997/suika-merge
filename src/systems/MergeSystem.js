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
    // adjacency of same-level, mergeable fruit touching THIS step
    const adj = new Map(); // fruit -> Set(neighbours)
    const involved = new Set();
    const link = (fa, fb) => {
      if (!adj.has(fa)) adj.set(fa, new Set());
      if (!adj.has(fb)) adj.set(fb, new Set());
      adj.get(fa).add(fb);
      adj.get(fb).add(fa);
      involved.add(fa);
      involved.add(fb);
    };

    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const fa = a.fruitRef;
      const fb = b.fruitRef;

      // squash-&-stretch on ANY fruit contact (fruit-fruit or fruit-wall)
      const impact = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (fa) fa.onImpact(impact);
      if (fb) fb.onImpact(impact);
      if (this.cb.onImpact && impact > 6) this.cb.onImpact(fa || fb, impact);

      if (!fa || !fb) continue;
      if (fa.merging || fb.merging) continue;
      if (fa.level !== fb.level) continue;
      if (fa.level >= MAX_LEVEL) continue;
      link(fa, fb);
    }

    if (!involved.size) return;

    // group touching same-level fruit into clusters (connected components).
    // cluster of 2 → normal merge; 3+ → TRIPLE merge (skips a tier) for a big "wow".
    const visited = new Set();
    for (const start of involved) {
      if (visited.has(start)) continue;
      const group = [];
      const queue = [start];
      visited.add(start);
      while (queue.length) {
        const f = queue.shift();
        group.push(f);
        for (const nb of adj.get(f)) {
          if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
        }
      }
      if (group.length < 2) continue;

      let sx = 0, sy = 0, vx = 0, vy = 0;
      for (const f of group) {
        f.merging = true;
        sx += f.body.position.x;
        sy += f.body.position.y;
        vx += f.body.velocity.x;
        vy += f.body.velocity.y;
        this.pendingRemovals.push(f);
      }
      const n = group.length;
      const fromLevel = group[0].level;
      const triple = n >= 3;
      // triple jumps TWO tiers (a satisfying jackpot); pair jumps one
      const newLevel = triple ? Math.min(fromLevel + 2, MAX_LEVEL) : getNextLevel(fromLevel);

      this.pendingSpawns.push({
        x: sx / n,
        y: sy / n,
        fromLevel,
        newLevel,
        count: n,
        triple,
        momentum: { x: (vx / n) * 0.15, y: 0 },
      });
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
      if (this.cb.onMerge) this.cb.onMerge(s.fromLevel, s.newLevel, s.x, s.y, fruit, { triple: s.triple, count: s.count });
    }
    this.pendingSpawns.length = 0;
  }
}
