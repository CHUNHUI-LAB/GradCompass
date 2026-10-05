import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-robotics-expansion.json',import.meta.url));
assert.equal(snapshotHash(raw),'2b07411e61286ea1c1684e5a892bd81766bab943ac7c05bf9dc633c7e51275c6','immutable published robotics expansion fixture');
export const roboticsExpansionFixture=JSON.parse(raw);
// Historical tests reverse only complete, exact published files. Production data
// keeps every contributor record; unknown edits and partial rollbacks pass through.
export function roboticsExpansionBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=roboticsExpansionFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 if(e.kind==='json')return transformSnapshotBytes(roboticsExpansionFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert(from&&to);assert.equal(value.split(from).length,2,'unique robotics expansion fragment');
  value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}
export function roboticsExpansionObject(path,data,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 return transformSnapshotObject(roboticsExpansionFixture,path,data,direction);
}
