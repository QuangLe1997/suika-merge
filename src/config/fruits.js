// Fruit progression chain
// level 1 = smallest (cherry) → level 14 = jackfruit (the new "ascend" top tier)

const SPRITE_BASE = 'assets/images/';

export const FRUITS = [
  null, // index 0 unused so level == index
  // 14-tier chain. The radius curve is COMPRESSED (≈+4px/tier) so even the
  // late "vip" fruit stay modest and don't eat the player's space. The top tier
  // (Jackfruit) is whisked off the board for a big bonus, so its size matters
  // little. Three exotic tiers (Dragonfruit/Durian/Jackfruit) add depth.
  { level: 1,  name: 'Cherry',     emoji: '🍒', radius: 21, score: 1,   color: '#e63946', glow: '#ff6b8c', sprite: SPRITE_BASE + '01-cherry.png' },
  { level: 2,  name: 'Strawberry', emoji: '🍓', radius: 25, score: 3,   color: '#f08080', glow: '#ff9aa2', sprite: SPRITE_BASE + '02-strawberry.png' },
  { level: 3,  name: 'Grape',      emoji: '🍇', radius: 29, score: 6,   color: '#9d4edd', glow: '#c77dff', sprite: SPRITE_BASE + '03-grape.png' },
  { level: 4,  name: 'Dekopon',    emoji: '🍊', radius: 33, score: 10,  color: '#ff9933', glow: '#ffba6e', sprite: SPRITE_BASE + '04-dekopon.png' },
  { level: 5,  name: 'Lemon',      emoji: '🍋', radius: 37, score: 15,  color: '#ffb700', glow: '#ffdd66', sprite: SPRITE_BASE + '05-lemon.png' },
  { level: 6,  name: 'Apple',      emoji: '🍎', radius: 41, score: 24,  color: '#d62828', glow: '#ff5959', sprite: SPRITE_BASE + '06-apple.png' },
  { level: 7,  name: 'Pear',       emoji: '🍐', radius: 45, score: 36,  color: '#c5e063', glow: '#dfff89', sprite: SPRITE_BASE + '07-pear.png' },
  { level: 8,  name: 'Peach',      emoji: '🍑', radius: 49, score: 52,  color: '#ffb6a3', glow: '#ffd1c1', sprite: SPRITE_BASE + '08-peach.png' },
  { level: 9,  name: 'Pineapple',  emoji: '🍍', radius: 53, score: 72,  color: '#f9c74f', glow: '#ffe082', sprite: SPRITE_BASE + '09-pineapple.png' },
  { level: 10, name: 'Melon',      emoji: '🍈', radius: 57, score: 96,  color: '#6a994e', glow: '#a7c957', sprite: SPRITE_BASE + '10-melon.png' },
  { level: 11, name: 'Watermelon', emoji: '🍉', radius: 61, score: 130, color: '#2d6a4f', glow: '#74c69d', sprite: SPRITE_BASE + '11-watermelon.png' },
  { level: 12, name: 'Dragonfruit',emoji: '🐉', radius: 65, score: 175, color: '#e6398c', glow: '#ff7ec0', sprite: SPRITE_BASE + '12-dragonfruit.png' },
  { level: 13, name: 'Durian',     emoji: '🌰', radius: 69, score: 230, color: '#8a8f3a', glow: '#d8e07a', sprite: SPRITE_BASE + '13-durian.png' },
  { level: 14, name: 'Jackfruit',  emoji: '🟢', radius: 73, score: 300, color: '#9aa83e', glow: '#f0e58a', sprite: SPRITE_BASE + '14-jackfruit.png' },
];

export const MAX_LEVEL = 14;

// What levels can the player drop. More types = lower chance two identical
// fruit land together by luck → mindless/one-spot play piles up instead of
// auto-clearing, so you must aim to combine.
export const DROPPABLE_LEVELS = [1, 2, 3, 4, 5, 6, 7];

export function getFruit(level) {
  return FRUITS[level];
}

export function getNextLevel(level) {
  return Math.min(level + 1, MAX_LEVEL);
}

export function randomDropLevel() {
  const i = Math.floor(Math.random() * DROPPABLE_LEVELS.length);
  return DROPPABLE_LEVELS[i];
}
