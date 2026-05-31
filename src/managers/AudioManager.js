// Synthesized SFX using WebAudio API (no external audio files needed)
import { SaveManager } from './SaveManager.js';

class _AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicOsc = null;
    this.musicNodes = [];
    this.settings = SaveManager.getSettings();
  }

  _ensureCtx() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.master);
    } catch (e) {
      // audio disabled
    }
  }

  resume() {
    this._ensureCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSettings(s) {
    this.settings = { ...s };
    SaveManager.setSettings(this.settings);
    if (!this.settings.music) this.stopMusic();
    else if (this.settings.music && !this.musicOsc) this.startMusic();
  }

  // ---------------- SFX ----------------
  _tone({ freq = 440, type = 'sine', dur = 0.2, attack = 0.005, decay = 0.18, vol = 0.4, freqEnd = null }) {
    if (!this.settings.sfx) return;
    this._ensureCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + attack + decay + 0.05);
  }

  playDrop() {
    this._tone({ freq: 180, type: 'triangle', dur: 0.12, decay: 0.12, vol: 0.25, freqEnd: 120 });
  }

  // Higher fruit level → higher pitch (do-re-mi feeling)
  playMerge(level) {
    if (!this.settings.sfx) return;
    // C major pentatonic feel: C D E G A C D E G A C
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const idx = Math.max(0, Math.min(scale.length - 1, level - 1));
    const f = scale[idx];

    this._tone({ freq: f, type: 'triangle', dur: 0.3, decay: 0.28, vol: 0.32 });
    // little harmonic sparkle
    setTimeout(() => this._tone({ freq: f * 1.5, type: 'sine', dur: 0.18, decay: 0.18, vol: 0.18 }), 35);

    // haptic
    if (this.settings.vibe && navigator.vibrate) {
      navigator.vibrate(Math.min(40 + level * 4, 90));
    }
  }

  playCombo(step) {
    if (!this.settings.sfx) return;
    const f = 440 + step * 80;
    this._tone({ freq: f, type: 'square', dur: 0.18, decay: 0.16, vol: 0.22, freqEnd: f * 1.6 });
  }

  playGameOver() {
    this._tone({ freq: 400, type: 'sawtooth', dur: 0.6, decay: 0.55, vol: 0.35, freqEnd: 80 });
    setTimeout(() => this._tone({ freq: 200, type: 'sawtooth', dur: 0.5, decay: 0.45, vol: 0.28, freqEnd: 60 }), 200);
  }

  playNewRecord() {
    if (!this.settings.sfx) return;
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => setTimeout(() => this._tone({ freq: f, type: 'triangle', dur: 0.18, decay: 0.16, vol: 0.32 }), i * 100));
  }

  playClick() {
    this._tone({ freq: 880, type: 'square', dur: 0.06, decay: 0.05, vol: 0.18 });
  }

  playReward() {
    if (!this.settings.sfx) return;
    [659.25, 783.99, 987.77].forEach((f, i) =>
      setTimeout(() => this._tone({ freq: f, type: 'triangle', dur: 0.16, decay: 0.14, vol: 0.3 }), i * 80)
    );
  }

  playWoosh() {
    this._tone({ freq: 800, type: 'sine', dur: 0.18, decay: 0.16, vol: 0.2, freqEnd: 200 });
  }

  // ---------------- MUSIC (very gentle ambient pad) ----------------
  startMusic() {
    if (!this.settings.music) return;
    this._ensureCtx();
    if (!this.ctx || this.musicOsc) return;

    // simple ambient: two detuned saw waves through a low-pass + slow LFO
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.type = 'sine';
    o2.type = 'sine';
    o1.frequency.value = 110;
    o2.frequency.value = 110 * 1.005;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(this.musicGain);

    o1.start();
    o2.start();
    lfo.start();
    this.musicOsc = o1;
    this.musicNodes = [o2, lfo, filter, lfoGain];
  }

  stopMusic() {
    if (this.musicOsc) {
      try { this.musicOsc.stop(); } catch {}
      this.musicNodes.forEach(n => { try { n.stop && n.stop(); } catch {} });
      this.musicOsc = null;
      this.musicNodes = [];
    }
  }
}

export const AudioManager = new _AudioManager();
