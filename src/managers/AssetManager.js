// AssetManager — preloads & caches fruit sprite images.

import { FRUITS } from '../config/fruits.js';
import { THEMES } from '../config/themes.js';

// non-fruit images to preload (backgrounds, banners)
export const UI_IMAGES = {
  menuBg: 'assets/images/menu-bg.webp',
  coin: 'assets/images/coin.png',
};

export const COIN_SRC = 'assets/images/coin.png';

class _AssetManager {
  constructor() {
    this.images = {}; // sprite path -> HTMLImageElement
    this.ready = false;
  }

  // Returns a promise resolving when all sprites are loaded (or errored).
  // onProgress(loaded, total) is called as each finishes.
  preload(onProgress) {
    const paths = [
      ...FRUITS.filter(Boolean).map(f => f.sprite),
      ...Object.values(UI_IMAGES),
      ...THEMES.map(t => t.bg),
    ];
    const total = paths.length;
    let loaded = 0;

    return Promise.all(
      paths.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              this.images[src] = img;
              loaded++;
              if (onProgress) onProgress(loaded, total);
              resolve();
            };
            img.onerror = () => {
              // resolve anyway so the game still boots; renderer falls back to a circle
              loaded++;
              if (onProgress) onProgress(loaded, total);
              resolve();
            };
            img.src = src;
          })
      )
    ).then(() => { this.ready = true; });
  }

  get(src) {
    return this.images[src] || null;
  }

  getForLevel(level) {
    const f = FRUITS[level];
    return f ? this.get(f.sprite) : null;
  }
}

export const AssetManager = new _AssetManager();
