// Reproducible local artwork. Mixed-radix identity includes independent hair,
// skin and wardrobe; no visible numeric labels, remote requests or randomness.
export function traits(id) {
  if (!Number.isInteger(id) || id < 0 || id >= 150) throw new RangeError('Unknown character');
  return { skin: id % 5, hair: (Math.floor(id / 5) + id % 5) % 6,
    outfit: (Math.floor(id / 30) + id % 5) % 5, hairColor: (id * 7 + Math.floor(id / 5)) % 6,
    hat: id % 7 === 0 ? 1 : id % 11 === 0 ? 2 : 0,
    glasses: id % 4 === 0, beard: id % 9 === 0, lashes: id % 3 === 1 };
}
export function avatarSvg(id) {
  const t = traits(id);
  const skin = ['#ffe0ba','#edba91','#cc9166','#a76849','#704332'][t.skin];
  const hair = ['#292732','#57392e','#985535','#d5a14e','#ded5bf','#703d50'][t.hairColor];
  const cloth = ['#699ab5','#d97f70','#84a787','#b59ac4','#e2b354'][t.outfit];
  const ink = '#382d30';
  const hairBack = [
    '<path d="M14 41Q5 25 14 12Q23 1 40 6Q57 9 52 41Z"/>',
    '<path d="M11 61L10 25Q9 5 31 5Q56 4 55 28L54 61Z"/>',
    '<path d="M12 43Q3 32 9 21Q3 11 16 12Q13 1 25 6Q32-3 39 6Q54 0 52 13Q65 15 55 27L54 44Z"/>',
    '<path d="M15 57Q6 59 9 48L11 26Q11 7 32 7Q54 7 54 29L57 49Q60 60 48 57Z"/>',
    '<path d="M14 39Q6 12 20 9Q25 1 41 7Q61 12 51 40Z"/>',
    '<path d="M13 40Q5 20 15 12Q21 5 30 8Q35-2 43 7Q59 6 55 24L51 42Z"/>',
  ][t.hair];
  const fringe = [
    'M12 27Q10 5 32 7Q55 5 53 26L42 18L34 22L25 17L19 26Z',
    'M12 30Q6 7 32 7Q58 6 53 30L39 14Q29 26 13 30Z',
    'M12 25Q7 13 18 14Q16 6 25 12Q30 4 35 12Q44 5 46 15Q57 12 53 26L46 24L40 19L34 23L27 19L20 24Z',
    'M12 29Q10 6 32 8Q56 6 53 28L45 24L41 17L37 26L31 18L27 26L21 21L17 29Z',
    'M12 24Q10 9 27 9Q45 0 53 22L44 16Q29 27 12 24Z',
    'M12 26Q8 5 32 9Q47-2 54 20L45 17L43 23L34 16L27 23L20 21Z',
  ][t.hair];
  const glasses = t.glasses ? '<g fill="none" stroke="#453d39" stroke-width="1.8"><circle cx="23" cy="32" r="7"/><circle cx="42" cy="32" r="7"/><path d="M30 31h5M16 30l-4-2m37 2 4-2"/></g>' : '';
  const hat = t.hat === 1 ? `<path d="M10 22Q10 3 30 3Q49 3 52 21Z" fill="${cloth}"/><path d="M8 21Q31 15 57 23L53 28Q30 22 10 26Z" fill="${cloth}"/><path d="M28 6h8v7h-8z" fill="#f8e5be"/>` :
    t.hat === 2 ? `<path d="M13 21Q10 3 32 3Q54 3 52 21Z" fill="${cloth}"/><path d="M11 18h43v9H11z" fill="${cloth}"/><path d="M20 7v10m8-12v12m8-12v12m8-10v10" stroke="#fff" opacity=".35"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="72" viewBox="0 0 64 72"><g stroke="${ink}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><g fill="${hair}">${hairBack}</g><path d="M5 72Q6 54 25 53h14Q59 54 60 72" fill="${cloth}"/><path d="M25 47v10q7 9 14 0V47" fill="${skin}"/><path d="M23 56l9 9 10-9M32 65v7" fill="none" stroke="#fff" opacity=".6"/><ellipse cx="13" cy="34" rx="4" ry="6" fill="${skin}"/><ellipse cx="51" cy="34" rx="4" ry="6" fill="${skin}"/><path d="M13 26Q13 11 32 11Q51 11 51 28v9Q50 53 32 55Q14 53 13 37Z" fill="${skin}"/><path d="${fringe}" fill="${hair}"/><path d="M19 26q4-2 7 0m12 0q4-2 7 0" fill="none" stroke="${hair}" stroke-width="1.8"/><g fill="#302830" stroke="none"><ellipse cx="23" cy="33" rx="2.8" ry="4"/><ellipse cx="41" cy="33" rx="2.8" ry="4"/></g><g fill="#fff" stroke="none"><circle cx="22" cy="31.5" r="1"/><circle cx="40" cy="31.5" r="1"/></g>${t.lashes ? '<path d="M19 30l-2-2m27 2 2-2" fill="none"/>' : ''}<path d="M32 35l-1 4h2" fill="none" stroke="#a56c55" stroke-width=".8"/><g fill="#e68e7d" opacity=".4" stroke="none"><ellipse cx="20" cy="40" rx="4" ry="2"/><ellipse cx="44" cy="40" rx="4" ry="2"/></g>${t.beard ? `<path d="M15 38Q20 45 25 42L32 44L40 42Q46 45 49 38Q49 55 32 56Q16 54 15 38Z" fill="${hair}"/><path d="M26 45q6 5 12 0" fill="none" stroke="#efbc94"/>` : '<path d="M27 45q5 5 10 0" fill="none" stroke="#9a574b"/>'}${glasses}${hat}</g></svg>`;
}
export function avatarUrl(id) { return 'data:image/svg+xml;base64,' + btoa(avatarSvg(id)); }
