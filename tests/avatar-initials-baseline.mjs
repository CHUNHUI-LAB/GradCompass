import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-avatar-initials.json',import.meta.url));
assert.equal(snapshotHash(raw),'91063908a362b5a64b44bf6f40e2a09ea459aafdaa97ed9ae0a80b66c71c5529','immutable avatar initials source delta');
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
