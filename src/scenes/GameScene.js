// GameScene — core gameplay loop, rendering, input.

import { PLAY_AREA, CONTAINER, DROP, DIFFICULTY, DANGER_LINE_OFFSET, SCORING } from '../config/constants.js';
import { FRUITS, getFruit, randomDropLevel } from '../config/fruits.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { MergeSystem } from '../systems/MergeSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { FruitFactory } from '../entities/FruitFactory.js';
import { ParticleSystem } from '../effects/Particles.js';
import { PopupSystem } from '../effects/Popups.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { AudioManager } from '../managers/AudioManager.js';
import { SaveManager } from '../managers/SaveManager.js';
import { EconomyManager } from '../managers/EconomyManager.js';
import { AssetManager } from '../managers/AssetManager.js';

const M = window.Matter;

export class GameScene {
  constructor() {
    this.hudEl = document.getElementById('hud');
    this.pauseEl = document.getElementById('pause');
    this.btnPause = document.getElementById('btnPause');
    this.btnResume = document.getElementById('btnResume');
    this.btnRestart = document.getElementById('btnRestart');
    this.btnToMenu = document.getElementById('btnToMenu');
    this.scoreEl = document.getElementById('hudScore');
    this.bestEl = document.getElementById('hudBest');
    this.nextEl = document.getElementById('hudNext');
    this.comboEl = document.getElementById('comboBanner');
    this.hammerEl = document.getElementById('boostHammer');
    this.bombEl = document.getElementById('boostBomb');
    this.freezeEl = document.getElementById('boostFreeze');
    this.boosterBtns = document.querySelectorAll('.booster-btn');

    this.optMusic = document.getElementById('optMusic');
    this.optSfx = document.getElementById('optSfx');
    this.optVibe = document.getElementById('optVibe');

    // shared
    this.particles = new ParticleSystem();
    this.popups = new PopupSystem();
    this.shake = new ScreenShake();

    // bindings
    this.btnPause.addEventListener('click', () => this.pause());
    this.btnResume.addEventListener('click', () => this.resume());
    this.btnRestart.addEventListener('click', () => { this.resume(); this._restart(); });
    this.btnToMenu.addEventListener('click', () => { this.resume(); this._mgr.switchTo('menu'); });

    this.optMusic.addEventListener('change', () => this._applySettings());
    this.optSfx.addEventListener('change', () => this._applySettings());
    this.optVibe.addEventListener('change', () => this._applySettings());

    this.boosterBtns.forEach(btn => {
      btn.addEventListener('click', () => this._toggleBooster(btn.dataset.booster, btn));
    });

    // pointer input
    this._setupInput();
  }

  // ----- lifecycle -----
  enter() {
    this.hudEl.classList.remove('hidden');
    this._loadSettingsIntoUI();
    this._initNewGame();
    AudioManager.resume();
    AudioManager.startMusic();
  }

  exit() {
    this.hudEl.classList.add('hidden');
    this.pauseEl.classList.add('hidden');
    AudioManager.stopMusic();
  }

  _loadSettingsIntoUI() {
    const s = SaveManager.getSettings();
    this.optMusic.checked = !!s.music;
    this.optSfx.checked = !!s.sfx;
    this.optVibe.checked = !!s.vibe;
  }

  _applySettings() {
    AudioManager.setSettings({
      music: this.optMusic.checked,
      sfx: this.optSfx.checked,
      vibe: this.optVibe.checked,
    });
  }

  _initNewGame() {
    this.mode = SaveManager.getMode();
    const diff = DIFFICULTY[this.mode] || DIFFICULTY.normal;
    this.diff = diff;
    this.scale = diff.containerScale;
    this.dangerHoldTime = diff.dangerHoldTime;

    // physics + factory
    this.physics = new PhysicsSystem();
    this.factory = new FruitFactory(this.physics.engine);

    // container — center horizontally in play area
    this.container = this.physics.setupContainer(
      PLAY_AREA.width / 2,
      PLAY_AREA.height - CONTAINER.innerHeight * this.scale - CONTAINER.bottomOffset,
      this.scale,
    );
    this.dangerLineY = this.container.interiorTop + DANGER_LINE_OFFSET * this.scale;

    // score
    this.score = new ScoreSystem();

    // merge
    this.merge = new MergeSystem(this.physics, this.factory, {
      onMerge: (fromLvl, newLvl, x, y, mergedFruit) => this._onMerge(fromLvl, newLvl, x, y, mergedFruit),
    });

    // state
    this.gameOver = false;
    this.paused = false;
    this.dropX = PLAY_AREA.width / 2;
    this.dropCooldown = 0;
    this.currentDropLevel = randomDropLevel();
    this.nextDropLevel = randomDropLevel();
    this.activeBooster = null;
    this.revivesUsed = 0;

    // boosters: load from economy, but apply min starting per difficulty
    this.boosters = { ...EconomyManager.getBoosters() };
    Object.entries(this.diff.startingBoosters).forEach(([k, v]) => {
      if (!this.boosters[k]) this.boosters[k] = v;
    });

    // UI
    this._updateHUD();
    this._refreshBoosterUI();
    this._refreshNextPreview();

    // best score
    this.bestEl.textContent = SaveManager.getHighScore(this.mode);
  }

  _restart() {
    this._initNewGame();
  }

  // ----- input -----
  _setupInput() {
    const canvas = document.getElementById('game');
    this.canvas = canvas;

    const getPos = (evt) => {
      const rect = canvas.getBoundingClientRect();
      const t = (evt.touches ? evt.touches[0] : evt);
      const cx = t.clientX - rect.left;
      // map canvas px → play-area coordinates
      return cx * (PLAY_AREA.width / rect.width);
    };

    const handleMove = (evt) => {
      if (this.paused || this.gameOver) return;
      evt.preventDefault();
      const x = getPos(evt);
      this._setDropX(x);
    };

    const handleDown = (evt) => {
      if (this.paused || this.gameOver) return;
      AudioManager.resume();
      evt.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = (evt.touches ? evt.touches[0] : evt);
      const xPx = t.clientX - rect.left;
      const yPx = t.clientY - rect.top;
      const x = xPx * (PLAY_AREA.width / rect.width);
      const y = yPx * (PLAY_AREA.height / rect.height);
      this._setDropX(x);

      if (this.activeBooster) {
        this._applyBoosterAt(x, y);
        return;
      }

      this._tryDrop();
    };

    canvas.addEventListener('pointermove', handleMove, { passive: false });
    canvas.addEventListener('pointerdown', handleDown, { passive: false });
  }

  _setDropX(x) {
    if (!this.container) return;
    const cfg = getFruit(this.currentDropLevel);
    const r = cfg.radius;
    const min = this.container.interiorLeft + r + 2;
    const max = this.container.interiorRight - r - 2;
    this.dropX = Math.max(min, Math.min(max, x));
  }

  _tryDrop() {
    if (this.dropCooldown > 0) return;
    const lvl = this.currentDropLevel;
    const cfg = getFruit(lvl);
    const fruit = this.factory.create(lvl, this.dropX, DROP.spawnY);
    this.merge.register(fruit);
    AudioManager.playDrop();
    this.particles.drop(this.dropX, DROP.spawnY + cfg.radius);
    this.dropCooldown = DROP.cooldownMs;
    this.currentDropLevel = this.nextDropLevel;
    this.nextDropLevel = randomDropLevel();
    this._refreshNextPreview();
  }

  // ----- merge callback -----
  _onMerge(fromLvl, newLvl, x, y, mergedFruit) {
    const cfg = getFruit(newLvl);
    const { added, combo } = this.score.addMerge(newLvl);

    // sfx + pitch
    AudioManager.playMerge(newLvl);
    if (combo >= 2) AudioManager.playCombo(combo);

    // visuals
    this.particles.burst(x, y, cfg.glow, newLvl);
    if (newLvl >= 8) this.particles.confetti(x, y);
    this.shake.trigger(Math.min(3 + newLvl * 0.8, 14), 0.18 + newLvl * 0.015);
    this.popups.add(`+${added}`, x, y - cfg.radius * 0.4, { color: cfg.glow, size: 22 + newLvl });

    if (combo >= 2) {
      this._showCombo(combo);
    }

    if (newLvl >= 11) {
      // ultimate watermelon!
      this.popups.add('WATERMELON!', PLAY_AREA.width / 2, PLAY_AREA.height / 2, { color: '#06d6a0', size: 36 });
      this.particles.confetti(x, y);
      this.particles.confetti(x - 60, y - 30);
      this.particles.confetti(x + 60, y - 30);
      this.shake.trigger(18, 0.5);
    }

    this._updateHUD();
  }

  _showCombo(n) {
    this.comboEl.textContent = `COMBO ×${n}!`;
    this.comboEl.classList.remove('hidden');
    this.comboEl.style.animation = 'none';
    // force reflow then animate
    void this.comboEl.offsetWidth;
    this.comboEl.style.animation = 'pop-in 0.35s cubic-bezier(0.17, 0.85, 0.4, 1.6) both';
    clearTimeout(this._comboTo);
    this._comboTo = setTimeout(() => this.comboEl.classList.add('hidden'), 900);
  }

  // ----- boosters -----
  _toggleBooster(key, btn) {
    if (!this.boosters[key]) {
      this._toast('No more ' + key);
      return;
    }
    AudioManager.playClick();
    if (this.activeBooster === key) {
      this.activeBooster = null;
      btn.classList.remove('active');
    } else {
      this.boosterBtns.forEach(b => b.classList.remove('active'));
      this.activeBooster = key;
      btn.classList.add('active');
    }
  }

  _applyBoosterAt(x, y) {
    const key = this.activeBooster;
    if (!key || !this.boosters[key]) return;

    if (key === 'hammer') {
      // remove the topmost fruit at this position
      const target = this._fruitAt(x, y);
      if (!target) {
        this._toast('Tap a fruit to smash');
        return;
      }
      this.particles.burst(target.body.position.x, target.body.position.y, target.config.glow, target.level);
      this.shake.trigger(8, 0.2);
      AudioManager.playMerge(target.level);
      this.factory.destroy(target);
      this.merge.unregister(target);
      this.boosters.hammer -= 1;
    }
    else if (key === 'bomb') {
      const r = 110;
      let any = false;
      for (const f of [...this.merge.fruits]) {
        const dx = f.body.position.x - x;
        const dy = f.body.position.y - y;
        if (dx * dx + dy * dy < r * r) {
          this.particles.burst(f.body.position.x, f.body.position.y, f.config.glow, f.level);
          this.factory.destroy(f);
          this.merge.unregister(f);
          any = true;
        }
      }
      if (any) {
        this.shake.trigger(16, 0.35);
        AudioManager.playGameOver();
        this.boosters.bomb -= 1;
      } else {
        this._toast('Boom landed empty 😅');
      }
    }
    else if (key === 'freeze') {
      this.physics.freeze(5);
      this.popups.add('FROZEN 5s', PLAY_AREA.width / 2, PLAY_AREA.height / 2, { color: '#7ad7f0', size: 28 });
      AudioManager.playWoosh();
      this.boosters.freeze -= 1;
    }

    this.activeBooster = null;
    this.boosterBtns.forEach(b => b.classList.remove('active'));
    this._refreshBoosterUI();
    EconomyManager.setBoosters(this.boosters);
  }

  _fruitAt(x, y) {
    // pick the fruit whose body contains (x,y), preferring the topmost (smallest y).
    let best = null;
    for (const f of this.merge.fruits) {
      const dx = f.body.position.x - x;
      const dy = f.body.position.y - y;
      if (dx * dx + dy * dy < f.config.radius * f.config.radius) {
        if (!best || f.body.position.y < best.body.position.y) best = f;
      }
    }
    return best;
  }

  // ----- update / draw -----
  update(dt) {
    if (this.paused || this.gameOver) return;

    // cooldown
    if (this.dropCooldown > 0) this.dropCooldown = Math.max(0, this.dropCooldown - dt * 1000);

    // physics
    this.physics.update(dt);

    // soft constraint: if a fruit drifts outside the container (rare collision-resolution
    // squeezes), nudge it back so it cannot escape into the drop area / off-screen
    const c = this.container;
    if (c) {
      const toRemove = [];
      for (const f of this.merge.fruits) {
        const r = f.config.radius;
        const p = f.body.position;
        let nx = p.x, ny = p.y, fixed = false;
        if (nx - r < c.interiorLeft) { nx = c.interiorLeft + r; fixed = true; }
        if (nx + r > c.interiorRight) { nx = c.interiorRight - r; fixed = true; }
        if (ny + r > c.interiorBottom) { ny = c.interiorBottom - r; fixed = true; }
        if (fixed) {
          M.Body.setPosition(f.body, { x: nx, y: ny });
          M.Body.setVelocity(f.body, { x: f.body.velocity.x * 0.3, y: 0 });
        }
        // anything launched far above the container interior is a physics-resolution runaway → remove
        // (legitimate stacking + drop fruits live at y ≥ DROP.spawnY ≈ 64; container interior starts at ≈ 130)
        if (ny < c.interiorTop - 90) toRemove.push(f);
      }
      for (const f of toRemove) {
        this.factory.destroy(f);
        this.merge.unregister(f);
      }
    }

    // process pending merges
    this.merge.process();

    // score tick (combo expiry)
    this.score.tick();

    // animations on each fruit
    for (const f of this.merge.fruits) f.updateAnim(dt);

    // effects
    this.particles.update(dt);
    this.popups.update(dt);
    this.shake.update(dt);

    // danger / game over check
    this._checkDanger(dt);
  }

  _checkDanger(dt) {
    const isFrozen = this.physics.isFrozen();
    let anyOverflow = false;
    for (const f of this.merge.fruits) {
      // grace period for any newly spawned fruit (drop OR merge) — it shouldn't insta-end
      const settled = performance.now() - f.spawnTime > 700;
      const aboveLine = (f.body.position.y - f.config.radius) < this.dangerLineY;
      if (aboveLine && settled) {
        if (!isFrozen) f.aboveLineSince += dt;
        anyOverflow = true;
      } else {
        f.aboveLineSince = 0;
      }
      if (f.aboveLineSince >= this.dangerHoldTime) {
        this._triggerGameOver();
        return;
      }
    }
    this._overflowing = anyOverflow && !isFrozen;
  }

  draw(ctx) {
    const W = PLAY_AREA.width;
    const H = PLAY_AREA.height;

    // background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1e1448');
    grad.addColorStop(0.55, '#150a36');
    grad.addColorStop(1, '#0a0524');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // soft stars
    this._drawStars(ctx);

    // shake
    const [sx, sy] = this.shake.getOffset();
    ctx.save();
    ctx.translate(sx, sy);

    // container
    this._drawContainer(ctx);

    // danger line
    this._drawDangerLine(ctx);

    // drop guide
    this._drawDropGuide(ctx);

    // fruits
    for (const f of this.merge.fruits) {
      this._drawFruit(ctx, f);
    }

    // effects
    this.particles.draw(ctx);
    this.popups.draw(ctx);

    ctx.restore();
  }

  _drawStars(ctx) {
    if (!this._stars) {
      this._stars = Array.from({ length: 50 }, () => ({
        x: Math.random() * PLAY_AREA.width,
        y: Math.random() * PLAY_AREA.height * 0.6,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.5 + 0.2,
      }));
    }
    ctx.save();
    for (const s of this._stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawContainer(ctx) {
    const c = this.container;
    if (!c) return;
    const t = c.thickness;
    const r = CONTAINER.cornerRadius;

    // glow shadow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 209, 102, 0.18)';
    ctx.shadowBlur = 30;

    // back panel inside walls (subtle)
    const grad = ctx.createLinearGradient(0, c.interiorTop, 0, c.interiorBottom);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(c.interiorLeft, c.interiorTop, c.width, c.height);

    // walls (rounded outer)
    ctx.fillStyle = '#3a2466';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;

    // left wall
    this._roundRect(ctx, c.interiorLeft - t, c.interiorTop, t, c.height + t, [r, 0, 0, r]);
    ctx.fill();
    ctx.stroke();
    // right wall
    this._roundRect(ctx, c.interiorRight, c.interiorTop, t, c.height + t, [0, r, r, 0]);
    ctx.fill();
    ctx.stroke();
    // floor
    this._roundRect(ctx, c.interiorLeft - t, c.interiorBottom, c.width + 2 * t, t, [0, 0, r, r]);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, radii) {
    const [tl, tr, br, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  _drawDangerLine(ctx) {
    const y = this.dangerLineY;
    const c = this.container;
    const isFrozen = this.physics.isFrozen();
    const color = this._overflowing ? '#ef476f' : (isFrozen ? '#7ad7f0' : '#ffd166');
    const alpha = 0.45 + 0.4 * Math.abs(Math.sin(performance.now() * 0.005));
    ctx.save();
    ctx.globalAlpha = this._overflowing ? alpha : 0.4;
    ctx.strokeStyle = color;
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.interiorLeft, y);
    ctx.lineTo(c.interiorRight, y);
    ctx.stroke();
    ctx.restore();
  }

  _drawDropGuide(ctx) {
    const cfg = getFruit(this.currentDropLevel);
    const x = this.dropX;
    const y = DROP.spawnY;

    // vertical guide (down to top of next fruit / danger line)
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = cfg.glow;
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + cfg.radius);
    ctx.lineTo(x, this.container.interiorBottom);
    ctx.stroke();
    ctx.restore();

    // current fruit at top (preview)
    this._drawFruitAt(ctx, x, y, cfg, 1, Math.sin(performance.now() * 0.005) * 0.05);
  }

  _drawFruit(ctx, f) {
    const { x, y } = f.body.position;
    const r = f.config.radius;

    // soft contact shadow — drawn in world space so it always points down,
    // independent of the fruit's spin. Low alpha to avoid muddy overlaps in the pile.
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.7, r * 0.72, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // dampen the visual spin a touch so the cute faces stay mostly readable
    this._drawFruitAt(ctx, x, y, f.config, f.popScale, f.body.angle * 0.6);
  }

  _drawFruitAt(ctx, x, y, cfg, scale = 1, rot = 0) {
    const r = cfg.radius * scale;
    const img = AssetManager.get(cfg.sprite);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    if (img && img.complete && img.naturalWidth) {
      // realistic cut-out fills its frame tightly; draw close to the collision diameter
      const size = r * 2 * 1.06;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      // fallback: simple glossy circle (no colored halo)
      const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r);
      grad.addColorStop(0, this._lighten(cfg.glow, 0.25));
      grad.addColorStop(0.55, cfg.color);
      grad.addColorStop(1, this._darken(cfg.color, 0.25));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  _lighten(hex, amt) {
    return this._mix(hex, '#ffffff', amt);
  }

  _darken(hex, amt) {
    return this._mix(hex, '#000000', amt);
  }

  _mix(hexA, hexB, t) {
    const a = this._parse(hexA);
    const b = this._parse(hexB);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  _parse(c) {
    if (c.startsWith('rgb')) {
      return c.match(/\d+/g).map(Number);
    }
    const h = c.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  // ----- HUD -----
  _updateHUD() {
    this.scoreEl.textContent = this.score.score;
  }

  _refreshNextPreview() {
    const cfg = getFruit(this.nextDropLevel);
    // use the sprite if available, otherwise fall back to a color swatch
    if (AssetManager.get(cfg.sprite)) {
      this.nextEl.style.background = `center / contain no-repeat url("${cfg.sprite}")`;
      this.nextEl.style.boxShadow = 'none';
    } else {
      this.nextEl.style.background = `radial-gradient(circle at 30% 30%, ${this._lighten(cfg.glow, 0.25)}, ${cfg.color} 60%, ${this._darken(cfg.color, 0.25)})`;
    }
  }

  _refreshBoosterUI() {
    this.hammerEl.textContent = this.boosters.hammer || 0;
    this.bombEl.textContent = this.boosters.bomb || 0;
    this.freezeEl.textContent = this.boosters.freeze || 0;
  }

  // ----- pause -----
  pause() {
    if (this.gameOver) return;
    this.paused = true;
    this.pauseEl.classList.remove('hidden');
    AudioManager.stopMusic();
  }

  resume() {
    this.paused = false;
    this.pauseEl.classList.add('hidden');
    AudioManager.startMusic();
  }

  // ----- game over -----
  _triggerGameOver() {
    this.gameOver = true;
    AudioManager.playGameOver();
    this.shake.trigger(14, 0.6);
    // persist boosters
    EconomyManager.setBoosters(this.boosters);
    // grant coins based on score
    const coinReward = Math.round(this.score.score * 0.1 * this.diff.coinReward);
    if (coinReward > 0) EconomyManager.addCoins(coinReward);

    // record high score
    const isNew = SaveManager.setHighScore(this.mode, this.score.score);

    setTimeout(() => {
      this._mgr.switchTo('gameover', {
        score: this.score.score,
        coins: coinReward,
        newRecord: isNew,
        mode: this.mode,
        revive: () => this._reviveFromAd(),
      });
    }, 600);
  }

  async _reviveFromAd() {
    if (this.revivesUsed >= 1) return false;
    this.revivesUsed++;
    // remove the topmost 3 fruits to give the player breathing room
    const sorted = [...this.merge.fruits].sort((a, b) => a.body.position.y - b.body.position.y);
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const f = sorted[i];
      this.particles.burst(f.body.position.x, f.body.position.y, f.config.glow, f.level);
      this.factory.destroy(f);
      this.merge.unregister(f);
    }
    this.gameOver = false;
    this.shake.trigger(6, 0.3);
    AudioManager.playReward();
    this.hudEl.classList.remove('hidden');
    return true;
  }

  _toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1400);
  }
}
