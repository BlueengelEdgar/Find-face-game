// 6 skin tones × 5 hair colours × 5 shirt colours = 150 distinct identities.
// Hair, glasses and mouth add redundant visual cues; labels aid the greybox.
export function avatarSvg(id) {
  const skin = ['#f2c9a0','#dca57d','#b97c56','#8a543d','#f1b4a4','#ce956f'][id % 6];
  const hair = ['#302a32','#724636','#c58a39','#484c67','#8c4960'][Math.floor(id / 6) % 5];
  const shirt = ['#559fa9','#d78064','#8b80b5','#b29e45','#587da7'][Math.floor(id / 30) % 5];
  const glasses = id % 3 === 0 ? '<path d="M18 29h11v8H18zm17 0h11v8H35zm-6 3h6" fill="none" stroke="#292d35" stroke-width="2"/>' : '';
  const fringe = id % 2 ? 'M13 26Q8 4 32 5Q57 5 51 27L43 19L36 23L27 17L20 25Z' : 'M12 27Q8 4 32 5Q56 4 52 27L42 17Q27 27 15 19Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="72" viewBox="0 0 64 72"><path d="M4 72Q5 52 25 51h14Q59 52 60 72" fill="${shirt}"/><rect x="25" y="46" width="14" height="14" rx="5" fill="${skin}"/><ellipse cx="32" cy="32" rx="20" ry="24" fill="${skin}"/><path d="${fringe}" fill="${hair}"/><path d="M21 31h3m16 0h3" stroke="#28272c" stroke-width="3" stroke-linecap="round"/>${glasses}<path d="M27 43q5 ${id % 2 ? 5 : 2} 10 0" fill="none" stroke="#794e46" stroke-width="2" stroke-linecap="round"/><rect x="21" y="59" width="23" height="12" rx="3" fill="#fff" fill-opacity=".85"/><text x="32" y="68" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#28303a">${String(id + 1).padStart(3, '0')}</text></svg>`;
}
export function avatarUrl(id) { return 'data:image/svg+xml;base64,' + btoa(avatarSvg(id)); }
