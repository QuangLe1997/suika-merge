// Fruit progression chain
// level 1 = smallest (cherry) → level 11 = watermelon

export const FRUITS = [
  null, // index 0 unused so level == index
  { level: 1,  name: 'Cherry',     emoji: '🍒', radius: 18, score: 1,  color: '#e63946', glow: '#ff6b8c' },
  { level: 2,  name: 'Strawberry', emoji: '🍓', radius: 25, score: 3,  color: '#f08080', glow: '#ff9aa2' },
  { level: 3,  name: 'Grape',      emoji: '🍇', radius: 33, score: 6,  color: '#9d4edd', glow: '#c77dff' },
  { level: 4,  name: 'Dekopon',    emoji: '🍊', radius: 42, score: 10, color: '#ff9933', glow: '#ffba6e' },
  { level: 5,  name: 'Orange',     emoji: '🍋', radius: 53, score: 15, color: '#ffb700', glow: '#ffdd66' },
  { level: 6,  name: 'Apple',      emoji: '🍎', radius: 66, score: 21, color: '#d62828', glow: '#ff5959' },
  { level: 7,  name: 'Pear',       emoji: '🍐', radius: 80, score: 28, color: '#c5e063', glow: '#dfff89' },
  { level: 8,  name: 'Peach',      emoji: '🍑', radius: 96, score: 36, color: '#ffb6a3', glow: '#ffd1c1' },
  { level: 9,  name: 'Pineapple',  emoji: '🍍', radius: 114, score: 45, color: '#f9c74f', glow: '#ffe082' },
  { level: 10, name: 'Melon',      emoji: '🍈', radius: 133, score: 55, color: '#6a994e', glow: '#a7c957' },
  { level: 11, name: 'Watermelon', emoji: '🍉', radius: 155, score: 66, color: '#2d6a4f', glow: '#74c69d' },
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
