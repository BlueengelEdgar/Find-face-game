// Stable identity, replaceable file, and face anchor. No procedural fallback.
export const CHARACTERS = Array.from({ length: 150 }, (_, id) => ({
  id, key: `character-${String(id + 1).padStart(3, '0')}`,
  file: `art/v03/character-${String(id + 1).padStart(3, '0')}.webp`,
  face: { x: 0.5, y: id === 0 ? 0.61 : 0.56 },
}));
export function characterUrl(id) {
  const character = CHARACTERS[id];
  if (!character) throw new RangeError('Unknown character');
  return globalThis.__CROWD_ASSETS__?.[id] ?? (import.meta.env.BASE_URL + character.file);
}
