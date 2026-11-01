export const LEVELS = [
  { name: '热身', count: 10, columns: 3, density: 0.76, maxSize: 108, stagger: 0.18, jitter: 0.08 },
  { name: '人海', count: 150, columns: 10, density: 1.06, maxSize: 64, stagger: 0.16, jitter: 0.045 },
  { name: '密集样板', count: 35, columns: 6, density: 1.06, maxSize: 110, stagger: 0.18, jitter: 0.06 },
];
export const BATCH_SIZE = 5;
export const WIDTH = 390;
export const HEIGHT = 540;

// Deterministic stagger + bounded jitter: silhouettes may overlap, protected
// face ellipses never do. Each row's complete silhouette stays in the viewport.
export function layout(level, width = WIDTH, height = HEIGHT) {
  const rows = Math.ceil(level.count / level.columns);
  const cellW = (width - 12) / (level.columns + level.stagger);
  const cellH = (height - 12) / rows;
  const base = Math.min(cellW * level.density, cellH / 1.125 * 1.12, level.maxSize);
  return Array.from({ length: level.count }, (_, id) => {
    const row = Math.floor(id / level.columns);
    const col = id % level.columns;
    const inRow = Math.min(level.columns, level.count - row * level.columns);
    const size = base * (0.94 + (Math.sin(id * 13 + 3) + 1) * 0.03);
    const rowWidth = inRow * cellW;
    const x = (width - rowWidth) / 2 + cellW * (col + 0.5) +
      ((row % 2 ? 1 : -1) * level.stagger / 2 + Math.sin(id * 7) * level.jitter) * cellW;
    const rawY = 6 + cellH * (row + 0.5) + Math.cos(id * 9) * cellH * level.jitter;
    const halfH = size * 1.125 / 2;
    return { id, size, x: Math.max(size / 2, Math.min(width - size / 2, x)),
      y: Math.max(halfH, Math.min(height - halfH, rawY)) };
  });
}

// Same geometry used for Phaser input and regression checks. Transparent hair
// corners/shoulders never steal a neighbouring face's touch.
export function faceHit(point, x, y) {
  return ((x - point.x) / (point.size * 0.29)) ** 2 +
    ((y - (point.y - point.size * 0.035)) / (point.size * 0.32)) ** 2 <= 1;
}
