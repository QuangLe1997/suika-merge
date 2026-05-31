// Game constants & difficulty-mode tunings

export const PLAY_AREA = {
  // logical (design) coordinates — renderer scales to canvas
  width: 460,
  height: 720,
};

// container (the open box)
export const CONTAINER = {
  innerWidth: 380,
  innerHeight: 560,
  wallThickness: 16,
  bottomOffset: 30, // gap from bottom of play area
  cornerRadius: 14,
};

// danger line (where game-over check applies) measured from top of container interior
export const DANGER_LINE_OFFSET = 70;
export const DANGER_HOLD_TIME = 2.0; // seconds above line before game over

// drop area
export const DROP = {
  // y position (relative to play area) where new fruit appears
  spawnY: 64,
  // cooldown after each drop
  cooldownMs: 420,
};

// physics
export const PHYSICS = {
  gravity: 1.0,
  fixedTimestepHz: 60,
};

// scoring & combo
export const SCORING = {
  comboWindowMs: 1200, // chain merges within this window count as combo
  comboBonusPerStep: 0.5, // each combo step multiplies bonus
  baseScoreMul: 1.0,
};

// difficulty modes
export const DIFFICULTY = {
  easy: {
    label: 'Easy',
    containerScale: 1.10,
    dangerHoldTime: 3.0,
    coinReward: 0.6,
    startingBoosters: { hammer: 4, bomb: 2, freeze: 3 },
  },
  normal: {
    label: 'Normal',
    containerScale: 1.0,
    dangerHoldTime: 2.0,
    coinReward: 1.0,
    startingBoosters: { hammer: 3, bomb: 1, freeze: 2 },
  },
  hard: {
    label: 'Hard',
    containerScale: 0.88,
    dangerHoldTime: 1.2,
    coinReward: 1.5,
    startingBoosters: { hammer: 2, bomb: 1, freeze: 1 },
  },
};

// ads
export const AD = {
  // interstitial roughly every N game overs
  interstitialEveryN: 3,
  // revive cooldown — only one free revive per game
  maxRevivesPerGame: 1,
};

// storage keys
export const STORAGE = {
  highscore: 'suika_highscore_v1', // map of mode -> score
  coins: 'suika_coins_v1',
  settings: 'suika_settings_v1',
  daily: 'suika_daily_v1',
  ads: 'suika_ads_stats_v1',
  mode: 'suika_mode_v1',
  boosters: 'suika_boosters_v1',
};

// daily reward chain (Day 1..7)
export const DAILY_REWARDS = [
  { day: 1, type: 'coin', amount: 20 },
  { day: 2, type: 'coin', amount: 40 },
  { day: 3, type: 'boost', booster: 'freeze', amount: 1 },
  { day: 4, type: 'coin', amount: 80 },
  { day: 5, type: 'boost', booster: 'hammer', amount: 2 },
  { day: 6, type: 'coin', amount: 150 },
  { day: 7, type: 'mega', label: '🎁 MEGA: 300 🪙 + boosters' },
];
