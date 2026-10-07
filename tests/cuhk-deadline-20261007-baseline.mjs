import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-cuhk-deadline-20261007.json',import.meta.url));
assert.equal(snapshotHash(raw),'6fc45019ccdc863b1c6394ae9038ac365547971ccc5c509d302e3a2cea04b74a','immutable reviewed CUHK deadline stage');
export const cuhkDeadlineFixture=JSON.parse(raw);
// Test-only historical projection. Only complete reviewed files transform;
// every unknown, partial or mutated input reaches the older gates unchanged.
export function cuhkDeadlineBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const entry=cuhkDeadlineFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 if(entry.kind==='json')return transformSnapshotBytes(cuhkDeadlineFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?entry.operations:[...entry.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique reviewed CUHK content-version fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256'],'exact CUHK asset replay');return result;
}
export function assertCurrentCuhkDeadlineFile(path,bytes){
 const entry=cuhkDeadlineFixture.files[snapshotPath(path)];assert(entry,'file outside reviewed CUHK allowlist');
 assert.equal(snapshotHash(bytes),entry.afterSha256,'unreviewed current CUHK deadline bytes');
}
