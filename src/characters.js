// V0.3 phase 1 assets. No procedural fallbacks: unapproved casts stay gated.
// Stable integer gameplay IDs map to replaceable independent files.
export const CHARACTERS = Array.from({ length: 10 }, (_, id) => ({
  id, key: `character-${String(id + 1).padStart(3, '0')}`,
  file: `art/v03/character-${String(id + 1).padStart(3, '0')}.png`,
  face: { x: 0.5, y: 0.52 },
}));
export function characterUrl(id) {
  const character = CHARACTERS[id];
  if (!character) throw new RangeError('Character artwork has not been approved');
  return import.meta.env.BASE_URL + character.file;
}
