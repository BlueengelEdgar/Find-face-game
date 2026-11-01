export const BACKGROUNDS=['garden','town'];
export function backgroundUrl(name){
  return globalThis.__CROWD_BACKGROUNDS__?.[name]??(import.meta.env.BASE_URL+'art/backgrounds/'+name+'.webp');
}
