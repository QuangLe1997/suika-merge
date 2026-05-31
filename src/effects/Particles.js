// Lightweight particle system rendered on Canvas 2D.
// Object pool to avoid GC.

const POOL_SIZE = 600;

class Particle {
  constructor() {
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.color = '#fff';
    this.size = 4;
    this.gravity = 0;
    this.fade = true;
    this.shape = 'circle'; // 'circle' | 'star' | 'sparkle'
  }
}

export class ParticleSystem {
  constructor() {
    this.pool = Array.from({ length: POOL_SIZE }, () => new Particle());
    this.activeCount = 0;
  }

  _spawn() {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.alive) {
        p.alive = true;
        this.activeCount++;
        return p;
      }
    }
    return null;
  }

  burst(x, y, color, level = 1) {
    // big colorful burst on merge
    const count = Math.min(28, 12 + level * 1.5);
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      if (!p) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 80 + Math.random() * 220 + level * 8;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 60;
      p.maxLife = 0.5 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.color = color;
      p.size = 3 + Math.random() * 4;
      p.gravity = 600;
      p.fade = true;
      p.shape = Math.random() < 0.5 ? 'circle' : 'sparkle';
    }
  }

  confetti(x, y) {
    const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ffadad'];
    for (let i = 0; i < 24; i++) {
      const p = this._spawn();
      if (!p) break;
      p.x = x + (Math.random() - 0.5) * 60;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 360;
      p.vy = -200 - Math.random() * 200;
      p.maxLife = 0.9 + Math.random() * 0.6;
      p.life = p.maxLife;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.size = 4 + Math.random() * 5;
      p.gravity = 700;
      p.shape = 'rect';
    }
  }

  drop(x, y) {
    for (let i = 0; i < 6; i++) {
      const p = this._spawn();
      if (!p) break;
      const a = Math.random() * Math.PI - Math.PI;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * 40;
      p.vy = Math.sin(a) * 20 - 20;
      p.maxLife = 0.3;
      p.life = p.maxLife;
      p.color = '#ffffff';
      p.size = 2;
      p.gravity = 200;
      p.shape = 'circle';
    }
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.activeCount--;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // air friction
      p.vx *= 0.985;
    }
  }

  draw(ctx) {
    ctx.save();
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      const a = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'sparkle') {
        // 4-point star
        ctx.beginPath();
        const s = p.size;
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.4, p.y - s * 0.4);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x + s * 0.4, p.y + s * 0.4);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.4, p.y + s * 0.4);
        ctx.lineTo(p.x - s, p.y);
        ctx.lineTo(p.x - s * 0.4, p.y - s * 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
