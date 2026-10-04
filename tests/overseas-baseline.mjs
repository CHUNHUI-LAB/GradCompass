import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,snapshotText,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-overseas-20261004.json',import.meta.url));
assert.equal(snapshotHash(raw),'b7bddb9f96ff18edf9db10e53091368109a6eb2a1f9da4cf6ac7ae949337375a','immutable overseas addition fixture');
export const overseasFixture=JSON.parse(raw);
export function overseasBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const entry=overseasFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 if(entry.kind==='json')return transformSnapshotBytes(overseasFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?entry.operations:[...entry.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique exact content-version fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256']);return result;
}
export const overseasObject=(path,data)=>transformSnapshotObject(overseasFixture,path,data);
