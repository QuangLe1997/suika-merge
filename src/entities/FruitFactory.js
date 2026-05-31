// FruitFactory — creates Matter.js bodies + Fruit wrapper.

import { Fruit } from './Fruit.js';
import { getFruit } from '../config/fruits.js';

const M = window.Matter;

export class FruitFactory {
  constructor(engine) {
    this.engine = engine;
  }

  create(level, x, y, opts = {}) {
    const cfg = getFruit(level);
    const body = M.Bodies.circle(x, y, cfg.radius, {
      label: `fruit_${level}`,
      restitution: 0.18,
      friction: 0.18,
      frictionAir: 0.001,
      density: 0.0014 + level * 0.00012,
      slop: 0.04,
      render: { visible: false },
      ...opts,
    });
    const fruit = new Fruit(body, level);
    M.World.add(this.engine.world, body);
    return fruit;
  }

  destroy(fruit) {
    if (!fruit || !fruit.body) return;
    M.World.remove(this.engine.world, fruit.body);
    fruit.body.fruitRef = null;
  }
}
