import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-ra-deadline-20261007.json',import.meta.url));
assert.equal(snapshotHash(raw),'3009cce65308c82875a70c95c70fa518e282e7dfefad8c043f05c8382bb58af6','immutable reviewed RA-deadline display stage');
export const raDeadlineFixture=JSON.parse(raw);
// Only complete reviewed assets transform. Unknown edits and partial rollbacks
// pass through unchanged and remain visible to the earlier hash assertions.
export function raDeadlineBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const entry=raDeadlineFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 let value=String(bytes);
 for(const op of forward?entry.operations:[...entry.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique reviewed RA-deadline fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256'],'exact RA-deadline stage replay');return result;
}
export function assertCurrentRaDeadlineAsset(path,bytes){
 const entry=raDeadlineFixture.files[snapshotPath(path)];assert(entry,'file outside reviewed RA-deadline allowlist');
 assert.equal(snapshotHash(bytes),entry.afterSha256,'unreviewed current RA-deadline bytes');
}
