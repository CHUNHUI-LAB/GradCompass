import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-four-schools-expansion-20261006.json',import.meta.url));
assert.equal(snapshotHash(raw),'2585973e088100de21103e0a7364292a21387ae5509d0dd1810c69fa9f85a236','immutable four-school expansion fixture');
export const fourSchoolsExpansionFixture=JSON.parse(raw);
export function fourSchoolsExpansionBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const entry=fourSchoolsExpansionFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 if(entry.kind==='json')return transformSnapshotBytes(fourSchoolsExpansionFixture,path,bytes,direction);
 let value=String(bytes);
 for(const original of forward?entry.operations:[...entry.operations].reverse()){
  const from=original[forward?'before':'after'],to=original[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique four-school expansion fragment'); value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256']);return result;
}
export function fourSchoolsExpansionObject(path,data,direction='reverse'){
 assert(['reverse','forward'].includes(direction));return transformSnapshotObject(fourSchoolsExpansionFixture,path,data,direction);
}
