// Theme & level progression config.
// Each level switches the theme (background + accent + container tint) and
// nudges difficulty. Themes cycle as the player keeps leveling up.

export const THEMES = [
  {
    key: 'twilight',
    name: 'Twilight',
    bg: 'assets/images/bg-twilight.jpg',
    accent: '#c77dff',
    accent2: '#ff6bd6',
    glow: '#e0aaff',
    wall: 'rgba(70, 44, 120, 0.55)',
    wallEdge: 'rgba(224, 170, 255, 0.55)',
    scrim: 'rgba(13, 8, 32, 0.55)',
    particles: ['#e0aaff', '#ff6bd6', '#ffd166', '#ffffff'],
  },
  {
    key: 'sunset',
    name: 'Sunset',
    bg: 'assets/images/bg-sunset.jpg',
    accent: '#ff9e6d',
    accent2: '#ff6b9d',
    glow: '#ffd0a6',
    wall: 'rgba(120, 60, 70, 0.5)',
    wallEdge: 'rgba(255, 208, 166, 0.6)',
    scrim: 'rgba(40, 12, 24, 0.5)',
    particles: ['#ffd0a6', '#ff9e6d', '#ff6b9d', '#ffffff'],
  },
  {
    key: 'ocean',
    name: 'Ocean',
    bg: 'assets/images/bg-ocean.jpg',
    accent: '#56cfe1',
    accent2: '#48bfe3',
    glow: '#9bf6ff',
    wall: 'rgba(30, 80, 110, 0.5)',
    wallEdge: 'rgba(155, 246, 255, 0.55)',
    scrim: 'rgba(8, 24, 40, 0.5)',
    particles: ['#9bf6ff', '#56cfe1', '#caffbf', '#ffffff'],
  },
  {
    key: 'aurora',
    name: 'Aurora',
    bg: 'assets/images/bg-aurora.jpg',
    accent: '#64dfdf',
    accent2: '#80ffdb',
    glow: '#caffbf',
    wall: 'rgba(30, 90, 80, 0.5)',
    wallEdge: 'rgba(128, 255, 219, 0.55)',
    scrim: 'rgba(8, 30, 28, 0.5)',
    particles: ['#80ffdb', '#64dfdf', '#c77dff', '#ffffff'],
  },
];

// Score needed to *reach* each level (1-based). Index 0 → level 1 at score 0.
export const LEVEL_THRESHOLDS = [0, 250, 600, 1100, 1800, 2800, 4200, 6000, 8500, 12000, 16500, 22000];

export function levelForScore(score) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (score >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
  }
  return lvl;
}

export function nextThreshold(level) {
  return LEVEL_THRESHOLDS[level] ?? null; // score needed for the NEXT level, or null if maxed
}

export function themeForLevel(level) {
  return THEMES[(level - 1) % THEMES.length];
}

// Difficulty knobs derived from level — gentle ramp, never brutal.
export function difficultyForLevel(level) {
  return {
    // which fruit levels can drop — starts narrow, widens with level
    dropMin: 1,
    dropMax: Math.min(5, 2 + Math.ceil(level / 2)),
    // danger grace shrinks slightly each level (clamped)
    dangerHoldMul: Math.max(0.6, 1 - (level - 1) * 0.05),
  };
}
