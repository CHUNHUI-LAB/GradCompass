import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-sjtu-expansion.json',import.meta.url));
assert.equal(snapshotHash(raw),'5a8840fb27973d14c0fd4068cf9d9ce212259c9617548f9b31eb3babfe73e720','immutable published SJTU expansion fixture');
export const sjtuExpansionFixture=JSON.parse(raw);
export function sjtuExpansionBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=sjtuExpansionFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 if(e.kind==='json')return transformSnapshotBytes(sjtuExpansionFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert(from&&to);assert.equal(value.split(from).length,2,'unique SJTU expansion fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}

export function sjtuExpansionObject(path,data,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 return transformSnapshotObject(sjtuExpansionFixture,path,data,direction);
}
