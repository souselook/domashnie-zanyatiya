import { readFileSync, readdirSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { manifestSchema, lessonSchema } from '../src/core/schema';

const zip = unzipSync(readFileSync('dist/m01-start-3-4.zip'));
const mf = manifestSchema.parse(JSON.parse(strFromU8(zip['module.json'] as Uint8Array)));
console.log(`MANIFEST OK id=${mf.id} lessons=${(zip['lessons'] ? Object.keys(zip).filter(k=>k.startsWith('lessons/')).length : 0)}`);
let ok = 0;
for (const name of Object.keys(zip).filter(k => k.endsWith('.json') && k.startsWith('lessons/')).sort()) {
  try {
    const l = lessonSchema.parse(JSON.parse(strFromU8(zip[name] as Uint8Array)));
    const types = l.steps.map(s => s.type);
    const reflIdx = types.map((t,i)=>[t,i] as const).filter(([t])=>t==='reflection').map(([,i])=>i);
    const oneLastRefl = reflIdx.length === 1 && reflIdx[0] === types.length - 1;
    console.log(`OK ${name} steps=${types.length} types=[${[...new Set(types)].join(',')}] reflection=${oneLastRefl?'yes-last':'BAD(${reflIdx})'}`);
    ok++;
  } catch (e) { console.log(`FAIL ${name}: ${(e as Error).message.slice(0,200)}`); }
}
console.log(`SMOKE ${ok}/12`);
