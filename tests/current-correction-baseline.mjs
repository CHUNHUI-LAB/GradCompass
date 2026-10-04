import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-current-corrections.json',import.meta.url));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const serialize=value=>JSON.stringify(value,null,2)+'\n';
assert.equal(hash(raw),'9121155eeccd93a80d1caf67e14a1ca1c6d2e7b7e04177bdd8993b773df7625b','immutable reviewed current correction fixture');
export const currentCorrectionFixture=JSON.parse(raw);
function identify(data){
 if(data.routes&&data.advisors)return 'data/catalog.json';
 if(data.profiles)return 'data/advisor-profiles.json';
 if(data.institution==='SUSTech'&&data.admissionEvidence&&data.advisors)return 'data/sustech-advisor-review-20261004.json';
 if(data.institution==='Tsinghua'&&data.admissionEvidence&&data.advisors)return 'data/tsinghua-advisor-review-20261004.json';
 return null;
}
export function currentCorrectionBaseline(data,path=identify(data)){
 const entry=currentCorrectionFixture.files[path];let result=structuredClone(data);
 if(!entry||entry.kind!=='json'||hash(serialize(data))!==entry.afterSha256)return result;
 for(const op of [...entry.operations].reverse()){
  if(op.path.length===0){assert.deepEqual(result,op.after);result=structuredClone(op.before);continue;}
  let target=result;for(const key of op.path.slice(0,-1))target=target[key];const key=op.path.at(-1);
  if(op.afterMissing)assert(!Object.hasOwn(target,key));else assert.deepEqual(target[key],op.after,'exact reviewed current field '+op.path.join('/'));
  if(op.beforeMissing){if(Array.isArray(target))target.splice(key,1);else delete target[key];}else target[key]=structuredClone(op.before);
 }
 assert.equal(hash(serialize(result)),entry.beforeSha256,path+' exact 5c27c78 restoration');
 return result;
}
export function currentCorrectionBytes(path,bytes){
 const name=path.startsWith('data/')||path.startsWith('assets/')||path==='index.html'?path:'data/'+path;
 const entry=currentCorrectionFixture.files[name];if(!entry||hash(bytes)!==entry.afterSha256)return bytes;
 if(entry.kind==='json')return Buffer.from(serialize(currentCorrectionBaseline(JSON.parse(bytes),name)));
 assert.equal(entry.operations.length,1);assert.equal(String(bytes),entry.operations[0].after);
 const result=Buffer.from(entry.operations[0].before);assert.equal(hash(result),entry.beforeSha256);
 return result;
}
