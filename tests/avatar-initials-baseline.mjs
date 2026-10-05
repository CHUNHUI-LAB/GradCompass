import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-avatar-initials.json',import.meta.url));
assert.equal(snapshotHash(raw),'dd23ccd45133fe59baa6ee70c4fbce91b0a03ea4103e9ccb82931c4b0b5b5081','immutable avatar initials source delta');
export const avatarInitialsFixture=JSON.parse(raw);
// Only exact reviewed complete files are reversible. Unknown edits remain visible.
export function avatarInitialsBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=avatarInitialsFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert(from&&to);assert.equal(value.split(from).length,2,'unique avatar initials fragment');
  value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}
