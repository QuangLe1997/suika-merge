// Theme & level progression config.
// Each level switches the theme (background + accent + container tint) and
// nudges difficulty. Themes cycle as the player keeps leveling up.

// Ordered calm/readable → vibrant ("vip dần"). Level 1 = the most readable
// theme. Every theme keeps a DARK, low-detail play field so fruit pop hard:
//   `dim`   = opacity the decorative bg image is drawn at (lower = darker/calmer)
//   `scrim` = colour of the strong center vignette over the play area
export const THEMES = [
  {
    key: 'ocean',
    name: 'Ocean',
    bg: 'assets/images/bg-ocean.webp',
    accent: '#5ad6e8',
    accent2: '#7be0ff',
    glow: '#9bf6ff',
    wall: 'rgba(18, 52, 74, 0.62)',
    wallEdge: 'rgba(155, 246, 255, 0.7)',
    scrim: 'rgba(5, 14, 26, 0.7)',
    field: '#0a3346',
    dim: 0.5,
    particles: ['#9bf6ff', '#5ad6e8', '#caffbf', '#ffffff'],
  },
  {
    key: 'aurora',
    name: 'Aurora',
    bg: 'assets/images/bg-aurora.webp',
    accent: '#5ff0cf',
    accent2: '#9bffe4',
    glow: '#b9ffe9',
    wall: 'rgba(18, 62, 56, 0.6)',
    wallEdge: 'rgba(128, 255, 219, 0.7)',
    scrim: 'rgba(5, 20, 20, 0.68)',
    field: '#0a3a32',
    dim: 0.5,
    particles: ['#9bffe4', '#5ff0cf', '#c77dff', '#ffffff'],
  },
  {
    key: 'twilight',
    name: 'Twilight',
    bg: 'assets/images/bg-twilight.webp',
    accent: '#c98bff',
    accent2: '#ff8ee0',
    glow: '#e0aaff',
    wall: 'rgba(52, 34, 92, 0.62)',
    wallEdge: 'rgba(224, 170, 255, 0.7)',
    scrim: 'rgba(12, 7, 26, 0.72)',
    field: '#1c1040',
    dim: 0.45,
    particles: ['#e0aaff', '#ff8ee0', '#ffd166', '#ffffff'],
  },
  {
    key: 'sunset',
    name: 'Sunset',
    bg: 'assets/images/bg-sunset.webp',
    accent: '#ffb072',
    accent2: '#ff7da6',
    glow: '#ffd9b0',
    wall: 'rgba(92, 44, 52, 0.6)',
    wallEdge: 'rgba(255, 217, 176, 0.72)',
    scrim: 'rgba(24, 9, 14, 0.66)',
    field: '#351620',
    dim: 0.45,
    particles: ['#ffd9b0', '#ffb072', '#ff7da6', '#ffffff'],
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
    // danger grace shrinks each level (floors a touch lower than before)
    dangerHoldMul: Math.max(0.5, 1 - (level - 1) * 0.05),
    // auto-drop countdown gets FASTER as you climb: 4.0s → 1.6s
    autoDropSec: Math.max(1.6, 4 - (level - 1) * 0.28),
    // fruit fall a little faster at high levels (subtle, keeps escalating)
    gravityMul: Math.min(1.4, 1 + (level - 1) * 0.035),
  };
}
