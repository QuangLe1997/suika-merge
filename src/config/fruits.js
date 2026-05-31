// Fruit progression chain
// level 1 = smallest (cherry) → level 11 = watermelon

const SPRITE_BASE = 'assets/images/';

export const FRUITS = [
  null, // index 0 unused so level == index
  // radius curve is COMPRESSED at the top: high-tier ("vip") fruit grow only
  // modestly so they feel premium without eating the player's space. The
  // Watermelon (max) is whisked off the board for a big bonus, so its on-board
  // size barely matters.
  { level: 1,  name: 'Cherry',     emoji: '🍒', radius: 21, score: 1,  color: '#e63946', glow: '#ff6b8c', sprite: SPRITE_BASE + '01-cherry.png' },
  { level: 2,  name: 'Strawberry', emoji: '🍓', radius: 26, score: 3,  color: '#f08080', glow: '#ff9aa2', sprite: SPRITE_BASE + '02-strawberry.png' },
  { level: 3,  name: 'Grape',      emoji: '🍇', radius: 30, score: 6,  color: '#9d4edd', glow: '#c77dff', sprite: SPRITE_BASE + '03-grape.png' },
  { level: 4,  name: 'Dekopon',    emoji: '🍊', radius: 35, score: 10, color: '#ff9933', glow: '#ffba6e', sprite: SPRITE_BASE + '04-dekopon.png' },
  { level: 5,  name: 'Lemon',      emoji: '🍋', radius: 40, score: 15, color: '#ffb700', glow: '#ffdd66', sprite: SPRITE_BASE + '05-lemon.png' },
  { level: 6,  name: 'Apple',      emoji: '🍎', radius: 44, score: 24, color: '#d62828', glow: '#ff5959', sprite: SPRITE_BASE + '06-apple.png' },
  { level: 7,  name: 'Pear',       emoji: '🍐', radius: 49, score: 36, color: '#c5e063', glow: '#dfff89', sprite: SPRITE_BASE + '07-pear.png' },
  { level: 8,  name: 'Peach',      emoji: '🍑', radius: 54, score: 52, color: '#ffb6a3', glow: '#ffd1c1', sprite: SPRITE_BASE + '08-peach.png' },
  { level: 9,  name: 'Pineapple',  emoji: '🍍', radius: 59, score: 72, color: '#f9c74f', glow: '#ffe082', sprite: SPRITE_BASE + '09-pineapple.png' },
  { level: 10, name: 'Melon',      emoji: '🍈', radius: 64, score: 96, color: '#6a994e', glow: '#a7c957', sprite: SPRITE_BASE + '10-melon.png' },
  { level: 11, name: 'Watermelon', emoji: '🍉', radius: 69, score: 130, color: '#2d6a4f', glow: '#74c69d', sprite: SPRITE_BASE + '11-watermelon.png' },
];

export const MAX_LEVEL = 11;

// What levels can the player drop (random from first N)?
export const DROPPABLE_LEVELS = [1, 2, 3, 4, 5];

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
