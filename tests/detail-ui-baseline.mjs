import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-detail-ui-polish.json',import.meta.url));
assert.equal(snapshotHash(raw),'3ed94ddefa3180a82913df8a06f85760cb45a618d01baeee8ccc1c4883928d2b','immutable reviewed detail UI fragment fixture');
export const detailUiFixture=JSON.parse(raw);
// This UI-only stage recognizes complete reviewed files before applying small,
// explicit fragments. Unknown edits pass through and fail independent hashes.
// Admissions data and the current discovery scope are never transformed here.
export function detailUiBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction),'known detail UI transform direction');
 const entry=detailUiFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 let value=String(bytes);
 for(const op of forward?entry.operations:[...entry.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert(from&&to,'detail UI fragments include nonempty exact context');
  assert.equal(value.split(from).length,2,path+' unique reviewed detail UI fragment');
  value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);
 assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256'],path+' exact detail UI '+direction+' snapshot');
 return result;
}
