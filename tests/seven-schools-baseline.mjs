import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-seven-schools-20261005.json',import.meta.url));
assert.equal(snapshotHash(raw),'fdbf5e434048e82b6e48e7562a2c1f76d68659a84db7f0c930287fd84a0e6243','immutable seven-school source-stage fixture');
export const sevenFixture=JSON.parse(raw);
// Whole reviewed files only. Unknown edits, partial rollback and later appends
// remain untouched so older independent hashes cannot silently accept them.
export function sevenBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=sevenFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 if(e.kind==='json')return transformSnapshotBytes(sevenFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique exact seven-school fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}
export const sevenObject=(path,data)=>transformSnapshotObject(sevenFixture,path,data);
