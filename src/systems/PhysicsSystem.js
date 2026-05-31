// PhysicsSystem — thin wrapper around Matter.js engine + container walls.

import { CONTAINER, PHYSICS } from '../config/constants.js';

const M = window.Matter;

export class PhysicsSystem {
  constructor() {
    this.engine = M.Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = PHYSICS.gravity;

    this.walls = [];
    this.containerBounds = null;
    this.frozenUntil = 0;
  }

  setupContainer(originX, topY, scale = 1) {
    // Build a U-shaped open container at (originX is center-x, topY is open-top y).
    // Returns { interiorTop, interiorBottom, interiorLeft, interiorRight }.
    const w = CONTAINER.innerWidth * scale;
    const h = CONTAINER.innerHeight * scale;
    const t = CONTAINER.wallThickness;

    // remove old walls
    this.walls.forEach(wll => M.World.remove(this.world, wll));
    this.walls = [];

    const leftX = originX - w / 2;
    const rightX = originX + w / 2;
    const floorY = topY + h;

    const floor = M.Bodies.rectangle(originX, floorY + t / 2, w + t * 2, t, {
      isStatic: true,
      friction: 0.4,
      label: 'wall_floor',
    });
    const left = M.Bodies.rectangle(leftX - t / 2, topY + h / 2, t, h + t, {
      isStatic: true,
      friction: 0.0,
      label: 'wall_left',
    });
    const right = M.Bodies.rectangle(rightX + t / 2, topY + h / 2, t, h + t, {
      isStatic: true,
      friction: 0.0,
      label: 'wall_right',
    });

    M.World.add(this.world, [floor, left, right]);
    this.walls = [floor, left, right];

    this.containerBounds = {
      interiorTop: topY,
      interiorBottom: floorY,
      interiorLeft: leftX,
      interiorRight: rightX,
      width: w,
      height: h,
      thickness: t,
    };
    return this.containerBounds;
  }

  update(dt) {
    // freeze handling (used by Freeze booster — we still simulate so fruits stay realistic
    // but the GameScene checks frozenUntil to pause danger timer).
    M.Engine.update(this.engine, dt * 1000);
  }

  freeze(durationSec) {
    this.frozenUntil = performance.now() + durationSec * 1000;
  }

  isFrozen() {
    return performance.now() < this.frozenUntil;
  }

  removeBody(body) {
    if (body) M.World.remove(this.world, body);
  }
}
