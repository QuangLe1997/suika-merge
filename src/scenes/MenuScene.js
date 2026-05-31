import { SaveManager } from '../managers/SaveManager.js';
import { EconomyManager } from '../managers/EconomyManager.js';
import { AudioManager } from '../managers/AudioManager.js';

export class MenuScene {
  constructor() {
    this.el = document.getElementById('menu');
    this.btnPlay = document.getElementById('btnPlay');
    this.btnDaily = document.getElementById('btnDaily');
    this.btnSettings = document.getElementById('btnSettings');
    this.btnShare = document.getElementById('btnShare');
    this.modesEl = document.getElementById('menuModes');
    this.highEl = document.getElementById('menuHighScore');
    this.coinsEl = document.getElementById('menuCoins');

    this.btnPlay.addEventListener('click', () => this._onPlay());
    this.btnDaily.addEventListener('click', () => this._onDaily());
    this.btnSettings.addEventListener('click', () => this._onSettings());
    this.btnShare.addEventListener('click', () => this._onShare());

    this.modesEl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioManager.playClick();
        SaveManager.setMode(btn.dataset.mode);
        this._refresh();
      });
    });
  }

  enter() {
    this.el.classList.remove('hidden');
    AudioManager.resume();
    AudioManager.startMusic();
    this._refresh();
  }

  exit() {
    this.el.classList.add('hidden');
  }

  _refresh() {
    const mode = SaveManager.getMode();
    this.highEl.textContent = SaveManager.getHighScore(mode);
    this.coinsEl.textContent = EconomyManager.coins;
    this.modesEl.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  _onPlay() {
    AudioManager.playClick();
    this._mgr.switchTo('game');
  }

  _onDaily() {
    AudioManager.playClick();
    this._mgr.switchTo('daily', { from: 'menu' });
  }

  _onSettings() {
    AudioManager.playClick();
    // Open the in-game pause dialog as settings; it has the audio toggles.
    const dlg = document.getElementById('pause');
    const title = dlg.querySelector('.dialog-title');
    title.textContent = 'SETTINGS';
    document.getElementById('btnResume').textContent = 'Close';
    document.getElementById('btnRestart').style.display = 'none';
    document.getElementById('btnToMenu').style.display = 'none';
    dlg.classList.remove('hidden');
    const close = () => {
      dlg.classList.add('hidden');
      title.textContent = 'PAUSED';
      document.getElementById('btnResume').textContent = 'Resume';
      document.getElementById('btnRestart').style.display = '';
      document.getElementById('btnToMenu').style.display = '';
      document.getElementById('btnResume').removeEventListener('click', close);
    };
    document.getElementById('btnResume').addEventListener('click', close, { once: true });
  }

  _onShare() {
    AudioManager.playClick();
    const url = location.href;
    const text = `I'm playing Suika Merge — score ${SaveManager.getHighScore(SaveManager.getMode())}! Try it: ${url}`;
    if (navigator.share) {
      navigator.share({ title: 'Suika Merge', text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      this._toast('Link copied!');
    }
  }

  _toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1600);
  }

  update() { /* DOM-driven */ }
  draw() {}
}
