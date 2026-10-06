import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-date-summary-20261006.json',import.meta.url));
assert.equal(snapshotHash(raw),'eeb5e8df4236774fc4aa1fc7877cb2be9c5efa09b323a8979895d1eb39495f7e','immutable reviewed date-summary display stage');
export const dateSummaryFixture=JSON.parse(raw);
// Only complete reviewed assets transform. Unknown edits and partial rollbacks
// pass through unchanged and remain visible to the earlier hash assertions.
export function dateSummaryBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const entry=dateSummaryFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 let value=String(bytes);
 for(const op of forward?entry.operations:[...entry.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique reviewed date-summary fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256'],'exact date-summary stage replay');return result;
}
export function assertCurrentDateSummaryAsset(path,bytes){
 const entry=dateSummaryFixture.files[snapshotPath(path)];assert(entry,'file outside reviewed date-summary allowlist');
 assert.equal(snapshotHash(bytes),entry.afterSha256,'unreviewed current date-summary bytes');
}
