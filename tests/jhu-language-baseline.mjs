import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-jhu-language-20261005.json',import.meta.url));
assert.equal(snapshotHash(raw),'f1794d2988697be40a474bb932d5b379b01d1135f3b3ec6bc36249cec16a1c45','immutable JHU policy source delta');
export const jhuLanguageFixture=JSON.parse(raw);
export function jhuLanguageBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const e=jhuLanguageFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!e||snapshotHash(bytes)!==e[forward?'beforeSha256':'afterSha256'])return bytes;
 if(e.kind==='json')return transformSnapshotBytes(jhuLanguageFixture,path,bytes,direction);
 let value=String(bytes);
 for(const op of forward?e.operations:[...e.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2);value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),e[forward?'afterSha256':'beforeSha256']);return result;
}
