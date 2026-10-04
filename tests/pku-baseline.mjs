import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-pku-20261004.json',import.meta.url));
assert.equal(snapshotHash(raw),'443cf0e43f9439d6be01a79d92fc15d867573cbe26286b2859f1c18480061894','immutable PKU source-stage fixture');
export const pkuFixture=JSON.parse(raw);
// Whole reviewed files only. Unknown edits, partial rollback and later appends
// remain untouched so older independent hashes cannot silently accept them.
export function pkuBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=pkuFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 if(e.kind==='json')return transformSnapshotBytes(pkuFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique exact PKU fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}
export const pkuObject=(path,data)=>transformSnapshotObject(pkuFixture,path,data);
