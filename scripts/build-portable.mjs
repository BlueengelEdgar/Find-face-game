import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allLevelIds } from '../src/art-layout.js';
import { CHARACTERS } from '../src/characters.js';
let html=readFileSync('dist/index.html','utf8');
const js=html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)[1];
const css=html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)[1];
const assetPath=p=>resolve('dist',p.replace(/^\/Find-face-game\//,''));
let code=readFileSync(assetPath(js),'utf8').replace(/<\/script/gi,'<\\/script');
const styles=readFileSync(assetPath(css),'utf8');
const ids=[...new Set([...allLevelIds(0),...allLevelIds(1)])];
const assets=Object.fromEntries(ids.map(id=>[id,'data:image/webp;base64,'+readFileSync('public/'+CHARACTERS[id].file).toString('base64')]));
const backgrounds=Object.fromEntries(['garden','town'].map(name=>[name,'data:image/webp;base64,'+readFileSync('public/art/backgrounds/'+name+'.webp').toString('base64')]));
html=html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/,'')
  .replace(/<link[^>]*href="[^"]+\.css"[^>]*>/,()=>'<style>'+styles+'</style>');
html=html.replace('</body>',()=>`<script>globalThis.__CROWD_ASSETS__=${JSON.stringify(assets)};globalThis.__CROWD_BACKGROUNDS__=${JSON.stringify(backgrounds)};</script><script type="module">${code}</script></body>`);
const embedded=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if(embedded!==code)throw new Error('Portable script was changed during HTML injection');
new Function(code); // Parse only, do not execute browser code in Node.
writeFileSync('dist/find-crowd-v05.html',html);
console.log('Portable offline game:',Math.round(Buffer.byteLength(html)/1024),'KiB; active artwork, backgrounds and scripts embedded');
