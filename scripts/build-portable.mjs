import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
let html=readFileSync('dist/index.html','utf8');
const js=html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)[1];
const css=html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)[1];
const assetPath=p=>resolve('dist',p.replace(/^\/Find-face-game\//,''));
let code=readFileSync(assetPath(js),'utf8').replace(/<\/script/gi,'<\\/script');
const styles=readFileSync(assetPath(css),'utf8');
const assets=Object.fromEntries(Array.from({length:150},(_,id)=>[
  id,'data:image/webp;base64,'+readFileSync(`public/art/v03/character-${String(id+1).padStart(3,'0')}.webp`).toString('base64'),
]));
html=html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/,'')
  .replace(/<link[^>]*href="[^"]+\.css"[^>]*>/,()=>'<style>'+styles+'</style>');
html=html.replace('</body>',()=>`<script>globalThis.__CROWD_ASSETS__=${JSON.stringify(assets)};</script><script type="module">${code}</script></body>`);
const embedded=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if(embedded!==code)throw new Error('Portable script was changed during HTML injection');
new Function(code); // Parse only, do not execute browser code in Node.
writeFileSync('dist/find-crowd-v03.html',html);
console.log('Portable offline game:',Math.round(Buffer.byteLength(html)/1024),'KiB; all art and scripts embedded');
