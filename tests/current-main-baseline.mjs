import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-current-main-03b16.json',import.meta.url));
assert.equal(snapshotHash(raw),'954394473f16adb7bffc3f72ef9fa557f7365a6f5acd1bbed64235becf2804f2','immutable current-main source-stage fixture');
export const currentMainFixture=JSON.parse(raw);
// Whole reviewed files only. Unknown edits, partial rollback and later appends
// remain untouched so older independent hashes cannot silently accept them.
export function currentMainBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=currentMainFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 if(e.kind==='json')return transformSnapshotBytes(currentMainFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique exact current-main fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}
export function currentMainObject(path,data,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 return transformSnapshotObject(currentMainFixture,path,data,direction);
}
