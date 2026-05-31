// Fruit entity — wraps a Matter.js body + drawing data.

import { getFruit } from '../config/fruits.js';

let _idCounter = 1;

export class Fruit {
  constructor(body, level) {
    this.id = _idCounter++;
    this.body = body;
    this.level = level;
    this.config = getFruit(level);
    this.spawnTime = performance.now();
    this.merging = false; // flag while being consumed in a merge
    this.bornFromMerge = false;
    this.popScale = 1;
    this.popVel = 0;
    this.aboveLineSince = 0; // when did fruit cross danger line?
    this.glowPulse = 0;
    body.fruitRef = this;
    body.label = `fruit_${level}`;
  }

  // Trigger pop animation (over-scale then settle)
  pop(amount = 0.3) {
    this.popScale = 1 + amount;
    this.popVel = -2;
  }

  updateAnim(dt) {
    // simple spring back to 1.0
    const stiffness = 24;
    const damping = 6;
    const acc = (1 - this.popScale) * stiffness - this.popVel * damping;
    this.popVel += acc * dt;
    this.popScale += this.popVel * dt;
    this.glowPulse += dt;
  }
}
