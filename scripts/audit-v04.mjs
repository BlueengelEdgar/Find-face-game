import {writeFileSync} from 'node:fs';
import {selectPack} from '../src/levels.js';
import {crowdLayout} from '../src/art-layout.js';
import {CHARACTERS} from '../src/characters.js';
const cases=[];
for(const [width,height] of [[370,555],[300,345],[370,630],[480,800]])for(const level of [0,1]){
 const pack=selectPack(level,width,height);
 cases.push({width,height,level,tier:pack.tier,points:crowdLayout(pack,width,height).map(p=>({...p,file:CHARACTERS[p.id].file,face:CHARACTERS[p.id].face.y}))});
}
writeFileSync('/tmp/v04-audit-input.json',JSON.stringify(cases));
