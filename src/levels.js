export const LEVELS = [
  { name: '热身', count: 10, columns: 3 },
  { name: '人海', count: 150, columns: 10 },
];
export const BATCH_SIZE = 5;
export const WIDTH = 390;
export const HEIGHT = 540;

// Alternating row offsets and bounded jitter keep all faces inside their own
// horizontal band. Only hair/shoulder silhouettes can overlap adjacent rows.
export function layout(level) {
  const rows = Math.ceil(level.count / level.columns);
  const cellW = (WIDTH - 24) / level.columns;
  const cellH = (HEIGHT - 24) / rows;
  const size = Math.min(cellW * 0.85, cellH * 1.05, 86);
  return Array.from({ length: level.count }, (_, i) => {
    const row = Math.floor(i / level.columns);
    const col = i % level.columns;
    return {
      id: i, size,
      x: 12 + cellW * (col + 0.5) + (row % 2 ? 1 : -1) * cellW * 0.04 + Math.sin(i * 7) * cellW * 0.025,
      y: 12 + cellH * (row + 0.5) + Math.cos(i * 9) * cellH * 0.025,
    };
  });
}
