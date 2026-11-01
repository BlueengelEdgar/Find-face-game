import { LEVELS } from '../src/levels.js';
import { crowdLayout, supportsLevel } from '../src/art-layout.js';
import { CHARACTERS } from '../src/characters.js';
import { writeFileSync } from 'node:fs';
const cases=[];
for(const [width,height] of [[370,550],[300,350],[500,740]])for(const level of LEVELS)
 if(supportsLevel(level,width,height))cases.push({width,height,count:level.count,points:crowdLayout(level,width,height).map(p=>({...p,face:CHARACTERS[p.id].face.y,file:CHARACTERS[p.id].file}))});
writeFileSync('/tmp/crowd-layout-measure.json',JSON.stringify(cases));
