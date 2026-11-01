// Art-directed face centers, not grid cells. Bodies can be clipped/covered;
// eyes, nose and mouth occupy a protected foreground-aware region.
const COMPOSITION = [
  [.19,.20,1.04], [.51,.17,1.08], [.83,.24,1.04],
  [.17,.51,1.06], [.49,.51,1.10], [.83,.55,1.04],
  [.13,.84,.88], [.38,.81,.94], [.65,.85,.96], [.89,.90,.87],
];
export function artLayout(width, height) {
  // The height bound reserves space for three exposed face bands on short
  // phones. This is only the 10-person stage, not a 150-person shrink strategy.
  const base = Math.min(width * .46, height * .32);
  return COMPOSITION.map(([x,y,scale],id)=>({
    id, x:x*width,
    y:Math.max(y*height,id<3 ? base*scale*1.25*.52+3 : 0),
    size:base*scale, depth:y*100,
  }));
}
