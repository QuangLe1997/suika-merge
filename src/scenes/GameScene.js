// GameScene — core gameplay loop, rendering, input.

import { PLAY_AREA, CONTAINER, DROP, DIFFICULTY, DANGER_LINE_OFFSET, SCORING } from '../config/constants.js';
import { FRUITS, getFruit, randomDropLevel, DROPPABLE_LEVELS } from '../config/fruits.js';
import { THEMES, levelForScore, themeForLevel, difficultyForLevel, nextThreshold } from '../config/themes.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { MergeSystem } from '../systems/MergeSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { FruitFactory } from '../entities/FruitFactory.js';
import { ParticleSystem } from '../effects/Particles.js';
import { PopupSystem } from '../effects/Popups.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { CoinFly } from '../effects/CoinFly.js';
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

    // level + wallet HUD
    this.walletEl = document.getElementById('hudWallet');
    this.walletCountEl = document.getElementById('hudWalletCount');
    this.levelEl = document.getElementById('hudLevel');
    this.levelFillEl = document.getElementById('hudLevelFill');
    this.levelBanner = document.getElementById('levelBanner');

    this.optMusic = document.getElementById('optMusic');
    this.optSfx = document.getElementById('optSfx');
    this.optVibe = document.getElementById('optVibe');

    // shared
    this.particles = new ParticleSystem();
    this.popups = new PopupSystem();
    this.shake = new ScreenShake();
    this.coinFly = new CoinFly();

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
      onImpact: (fruit, speed) => {
        // soft thud on hard landings (throttled inside Fruit.onImpact already)
        if (speed > 12 && fruit && performance.now() - (this._lastThud || 0) > 70) {
          this._lastThud = performance.now();
          AudioManager.playThud?.(Math.min(1, speed / 40), fruit.level);
        }
      },
    });

    // level + theme
    this.level = 1;
    this.theme = themeForLevel(1);
    this.levelDiff = difficultyForLevel(1);
    this.bgImg = AssetManager.get(this.theme.bg);
    this.bgPrev = null;          // crossfade source
    this.bgFade = 1;             // 1 = fully on current bg
    this.dangerHoldTime = this.diff.dangerHoldTime * this.levelDiff.dangerHoldMul;

    // coins earned this run (animated into wallet)
    this.runCoins = 0;
    this.walletCount = EconomyManager.coins;
    this._updateWalletUI();

    // state
    this.gameOver = false;
    this.paused = false;
    this.dropX = PLAY_AREA.width / 2;
    this.dropCooldown = 0;
    this.currentDropLevel = this._randomDrop();
    this.nextDropLevel = this._randomDrop();
    this.activeBooster = null;
    this.revivesUsed = 0;
    this.coinFly.clear();

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

  _randomDrop() {
    // weighted toward smaller fruit; widen range as level rises
    const max = (this.levelDiff && this.levelDiff.dropMax) || DROPPABLE_LEVELS.length;
    const pool = DROPPABLE_LEVELS.slice(0, max);
    // mild bias toward lower levels (keeps the game flowing & scoring)
    const idx = Math.floor(Math.pow(Math.random(), 1.35) * pool.length);
    return pool[Math.min(idx, pool.length - 1)];
  }

  _tryDrop() {
    if (this.dropCooldown > 0) return;
    const lvl = this.currentDropLevel;
    const cfg = getFruit(lvl);
    const fruit = this.factory.create(lvl, this.dropX, DROP.spawnY);
    this.merge.register(fruit);
    AudioManager.playDrop();
    this.particles.drop(this.dropX, DROP.spawnY + cfg.radius, this.theme.glow);
    this.dropCooldown = DROP.cooldownMs;
    this.currentDropLevel = this.nextDropLevel;
    this.nextDropLevel = this._randomDrop();
    this._refreshNextPreview();
  }

  // ----- merge callback -----
  _onMerge(fromLvl, newLvl, x, y, mergedFruit) {
    const cfg = getFruit(newLvl);
    const { added, combo } = this.score.addMerge(newLvl);

    // sfx + pitch
    AudioManager.playMerge(newLvl);
    if (combo >= 2) AudioManager.playCombo(combo);

    // ---- WOW merge effect: flash → shockwave ring → burst → sparkle ----
    const themeCols = this.theme.particles;
    this.particles.flash(x, y, cfg.radius * 1.6, 'rgba(255,255,255,0.9)');
    this.particles.shockwave(x, y, cfg.glow, cfg.radius * 2.4, 5);
    if (newLvl >= 6) this.particles.shockwave(x, y, this.theme.accent2, cfg.radius * 3.2, 3);
    this.particles.burst(x, y, [cfg.glow, ...themeCols], newLvl);
    this.shake.trigger(Math.min(3 + newLvl * 0.9, 15), 0.16 + newLvl * 0.016);

    // pop the new fruit a bit harder for big merges
    if (mergedFruit) mergedFruit.pop(0.5 + newLvl * 0.02);

    // score popup — color & size scale with combo, tasteful
    const popColor = combo >= 3 ? '#ffd35c' : (combo >= 2 ? cfg.glow : '#ffffff');
    this.popups.add(`+${added}`, x, y - cfg.radius * 0.5, {
      color: popColor, size: 20 + newLvl + combo * 2, life: 1.1,
    });

    if (combo >= 2) this._showCombo(combo);

    // earn coins on bigger merges → fly into wallet
    if (newLvl >= 5) {
      const coins = Math.round((newLvl - 4) * 1.5 * (this.diff.coinReward || 1));
      if (coins > 0) this._flyCoins(coins, x, y);
    }

    if (newLvl >= 8) this.particles.confetti(x, y, themeCols);

    if (newLvl >= 11) {
      // ultimate watermelon celebration
      this.popups.add('WATERMELON!', PLAY_AREA.width / 2, PLAY_AREA.height * 0.42, { color: this.theme.glow, size: 40, life: 1.6 });
      this.particles.flash(x, y, 240, 'rgba(255,255,255,0.9)');
      this.particles.shockwave(x, y, '#ffffff', 320, 6);
      this.particles.confetti(x, y, themeCols);
      this.particles.confetti(x - 70, y - 30, themeCols);
      this.particles.confetti(x + 70, y - 30, themeCols);
      this.shake.trigger(20, 0.55);
      this._flyCoins(20, x, y);
    }

    this._updateHUD();
    this._checkLevelUp();
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

  // ----- coins & wallet -----
  _walletTargetCoords() {
    // convert the wallet HUD element's center → play-area coordinates
    if (!this.walletEl || !this.canvas) return { x: PLAY_AREA.width - 60, y: 40 };
    const wr = this.walletEl.getBoundingClientRect();
    const cr = this.canvas.getBoundingClientRect();
    const sx = PLAY_AREA.width / cr.width;
    const sy = PLAY_AREA.height / cr.height;
    return {
      x: (wr.left + wr.width / 2 - cr.left) * sx,
      y: (wr.top + wr.height / 2 - cr.top) * sy,
    };
  }

  _flyCoins(amount, x, y) {
    if (amount <= 0) return;
    const target = this._walletTargetCoords();
    const n = Math.min(amount, 16); // visual cap; still credit full amount
    this.runCoins += amount;
    EconomyManager.addCoins(amount); // credit immediately (persists even mid-run)
    this.coinFly.spawn(n, x, y, target.x, target.y, {
      stagger: 0.04,
      onArrive: () => {
        this.walletCount += Math.max(1, Math.round(amount / n));
        this._updateWalletUI();
        this._bumpWallet();
        AudioManager.playCoin();
        const t = this._walletTargetCoords();
        this.particles.flash(t.x, t.y, 22, 'rgba(255,211,92,0.9)');
      },
      onAllDone: () => {
        this.walletCount = EconomyManager.coins; // sync exact
        this._updateWalletUI();
      },
    });
  }

  _updateWalletUI() {
    if (this.walletCountEl) this.walletCountEl.textContent = this.walletCount;
  }

  _bumpWallet() {
    if (!this.walletEl) return;
    this.walletEl.classList.remove('bump');
    void this.walletEl.offsetWidth;
    this.walletEl.classList.add('bump');
  }

  // ----- level / theme -----
  _checkLevelUp() {
    const newLevel = levelForScore(this.score.score);
    if (newLevel > this.level) {
      this._levelUp(newLevel);
    }
  }

  _levelUp(newLevel) {
    this.level = newLevel;
    const theme = themeForLevel(newLevel);
    this.levelDiff = difficultyForLevel(newLevel);
    this.dangerHoldTime = this.diff.dangerHoldTime * this.levelDiff.dangerHoldMul;

    // crossfade background if the theme changed
    if (theme.key !== this.theme.key) {
      this.bgPrev = this.bgImg;
      this.theme = theme;
      this.bgImg = AssetManager.get(theme.bg);
      this.bgFade = 0; // animate 0 → 1
    } else {
      this.theme = theme;
    }

    AudioManager.playLevelUp();
    this.shake.trigger(8, 0.4);
    this.particles.flash(PLAY_AREA.width / 2, PLAY_AREA.height / 2, 320, 'rgba(255,255,255,0.5)');

    // level reward coins
    this._flyCoins(15 + newLevel * 3, PLAY_AREA.width / 2, PLAY_AREA.height * 0.5);

    // banner
    this._showLevelBanner(newLevel, theme);
    this._updateHUD();
  }

  _showLevelBanner(level, theme) {
    if (!this.levelBanner) return;
    this.levelBanner.textContent = `LEVEL ${level} · ${theme.name}`;
    this.levelBanner.style.setProperty('--lvl-accent', theme.accent2);
    this.levelBanner.classList.remove('hidden', 'show');
    void this.levelBanner.offsetWidth;
    this.levelBanner.classList.add('show');
    clearTimeout(this._lvlTo);
    this._lvlTo = setTimeout(() => this.levelBanner.classList.remove('show'), 2000);
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
        // a runaway is a fruit physically launched OFF the top of the play area
        // (y well above the visible top at 0). Must NOT depend on container top —
        // in Hard the box sits lower (~197) while fruits still spawn at y≈64, so a
        // container-relative threshold would cull every freshly dropped fruit.
        if (ny < -80) toRemove.push(f);
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
    this.coinFly.update(dt);

    // background crossfade on theme change
    if (this.bgFade < 1) this.bgFade = Math.min(1, this.bgFade + dt / 0.8);

    // danger / game over check
    this._checkDanger(dt);
  }

  // coins keep flying after game over too (so the wallet finishes filling)
  updateOverlayFx(dt) {
    this.coinFly.update(dt);
    this.particles.update(dt);
    this.popups.update(dt);
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

    // ---- themed background (image cover + crossfade + scrim) ----
    this._drawBackground(ctx, W, H);

    // shake
    const [sx, sy] = this.shake.getOffset();
    ctx.save();
    ctx.translate(sx, sy);

    this._drawContainer(ctx);
    this._drawDangerLine(ctx);
    this._drawDropGuide(ctx);

    for (const f of this.merge.fruits) this._drawFruit(ctx, f);

    this.particles.draw(ctx);
    this.coinFly.draw(ctx);
    this.popups.draw(ctx);

    ctx.restore();
  }

  _drawBackground(ctx, W, H) {
    // COLOURED themed base (not black) — top a touch lighter, deeper toward bottom
    const f = this.theme.field || '#0e0a22';
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, this._lighten(f, 0.14));
    base.addColorStop(0.45, f);
    base.addColorStop(1, this._darken(f, 0.5));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    // decorative theme image, drawn DIMMED so it adds atmosphere without
    // competing with the fruit
    const dim = this.theme.dim ?? 0.5;
    if (this.bgPrev && this.bgFade < 1) {
      ctx.globalAlpha = dim;
      this._drawImageCover(ctx, this.bgPrev, W, H);
    }
    if (this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth) {
      ctx.globalAlpha = (this.bgPrev ? this.bgFade : 1) * dim;
      this._drawImageCover(ctx, this.bgImg, W, H);
    }
    ctx.globalAlpha = 1;

    // soft tinted vignette (same hue, not black) — focuses the eye on the play
    // field while keeping the screen colourful
    const deep = this._darken(f, 0.5);
    const scrim = ctx.createRadialGradient(W / 2, H * 0.56, H * 0.14, W / 2, H * 0.56, H * 0.9);
    scrim.addColorStop(0, this._rgba(deep, 0.0));
    scrim.addColorStop(1, this._rgba(deep, 0.55));
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
  }

  _rgba(color, a) {
    const [r, g, b] = this._parse(color);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  _drawImageCover(ctx, img, W, H) {
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = W / H;
    let dw, dh;
    if (ir > cr) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  _drawContainer(ctx) {
    const c = this.container;
    if (!c) return;
    const t = c.thickness;
    const r = CONTAINER.cornerRadius + 4;
    const edge = this.theme.wallEdge || 'rgba(255,255,255,0.4)';
    const wall = this.theme.wall || 'rgba(70,44,120,0.55)';

    ctx.save();

    // inner well — a recessed POOL of the theme colour, a bit deeper than the
    // surrounding field so it matches the backdrop yet still makes fruit pop
    const fld = this.theme.field || '#0e0a22';
    const well = ctx.createLinearGradient(0, c.interiorTop, 0, c.interiorBottom);
    well.addColorStop(0, this._rgba(this._darken(fld, 0.30), 0.55));
    well.addColorStop(0.5, this._rgba(this._darken(fld, 0.45), 0.62));
    well.addColorStop(1, this._rgba(this._darken(fld, 0.62), 0.72));
    ctx.fillStyle = well;
    ctx.fillRect(c.interiorLeft, c.interiorTop, c.width, c.height);

    // glassy walls with theme tint + outer glow
    ctx.shadowColor = edge;
    ctx.shadowBlur = 22;
    ctx.fillStyle = wall;

    // left / right / floor as one rounded U via three rounded rects
    this._roundRect(ctx, c.interiorLeft - t, c.interiorTop, t, c.height + t, [r, 0, 0, r]); ctx.fill();
    this._roundRect(ctx, c.interiorRight, c.interiorTop, t, c.height + t, [0, r, r, 0]); ctx.fill();
    this._roundRect(ctx, c.interiorLeft - t, c.interiorBottom, c.width + 2 * t, t, [0, 0, r, r]); ctx.fill();

    // crisp inner rim light (left, right, floor)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(c.interiorLeft, c.interiorTop);
    ctx.lineTo(c.interiorLeft, c.interiorBottom);
    ctx.lineTo(c.interiorRight, c.interiorBottom);
    ctx.lineTo(c.interiorRight, c.interiorTop);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // top highlight caps on the two wall tops
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    this._roundRect(ctx, c.interiorLeft - t + 2, c.interiorTop, t - 4, 4, [2, 2, 0, 0]); ctx.fill();
    this._roundRect(ctx, c.interiorRight + 2, c.interiorTop, t - 4, 4, [2, 2, 0, 0]); ctx.fill();

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
    const color = this._overflowing ? '#ff4d6d' : (isFrozen ? '#7ad7f0' : this.theme.accent2);
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

    // realistic spin damped a touch; squash-&-stretch from impacts
    this._drawFruitAt(ctx, x, y, f.config, f.scaleX, f.body.angle * 0.6, f.scaleY);
  }

  _drawFruitAt(ctx, x, y, cfg, scaleX = 1, rot = 0, scaleY = null) {
    if (scaleY === null) scaleY = scaleX;
    const r = cfg.radius;
    const img = AssetManager.get(cfg.sprite);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);

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
    if (this.levelEl) this.levelEl.textContent = this.level;
    // level progress bar (toward next threshold)
    if (this.levelFillEl) {
      const next = nextThreshold(this.level);
      if (next === null) {
        this.levelFillEl.style.width = '100%';
      } else {
        const prev = nextThreshold(this.level - 1) ?? 0;
        const pct = Math.max(0, Math.min(100, ((this.score.score - prev) / (next - prev)) * 100));
        this.levelFillEl.style.width = pct + '%';
      }
    }
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
    // coins were already credited live as they flew into the wallet during play;
    // show the run total on the game-over screen
    const coinReward = this.runCoins;

    // record high score
    const isNew = SaveManager.setHighScore(this.mode, this.score.score);

    setTimeout(() => {
      this._mgr.switchTo('gameover', {
        score: this.score.score,
        coins: coinReward,
        level: this.level,
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
