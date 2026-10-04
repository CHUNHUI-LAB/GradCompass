import {latestSourceBytes,latestSourceBaseline} from './latest-3f294-baseline.mjs';
import {concurrentReferenceBytes} from './concurrent-reference-baseline.mjs';
import {currentCorrectionBaseline,currentCorrectionBytes} from './current-correction-baseline.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-source-deltas.json',import.meta.url));
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(sha256(raw),'3d8857966bdb829d03fa1bb22738228277c9fea837b72438b864ce777e640987','immutable reviewed historical source fixture');
export const historicalSourceFixture=JSON.parse(raw);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const serialize=value=>JSON.stringify(value,null,2)+'\n';
// A reviewed stage is atomic. A partial match must never be erased by an older
// stage that removes an appended whole row. Unknown data is not a reviewed edit.
export function reverseReviewedOperations(value,operations){
 const copy=structuredClone(value);
 const states=operations.map(op=>{let parent=value;for(const key of op.path.slice(0,-1))parent=parent?.[key];const key=op.path.at(-1),present=parent!=null&&Object.hasOwn(parent,key);return {op,matches:op.afterMissing?!present:present&&equal(parent[key],op.after)};});
 if(states.some(s=>s.matches))for(const {op,matches}of states)assert(matches,'reviewed historical delta mismatch: '+op.path.join('/'));
 for(const op of [...operations].reverse()){
  let target=copy;for(const key of op.path.slice(0,-1)){target=target?.[key];if(target===undefined)break;}
  if(!target||typeof target!=='object')continue;
  const key=op.path.at(-1),present=Object.hasOwn(target,key);
  if(op.afterMissing?present:!present||!equal(target[key],op.after))continue;
  if(op.beforeMissing){if(Array.isArray(target))target.splice(key,1);else delete target[key];}
  else target[key]=structuredClone(op.before);
 }
 return copy;
}
function identify(data){
 if(data.routes&&data.advisors)return 'data/catalog.json';
 if(data.profiles)return 'data/advisor-profiles.json';
 if(data.institution==='SUSTech'&&data.admissionEvidence&&data.advisors)return 'data/sustech-advisor-review-20261004.json';
 return null;
}
export function historicalSourceBaseline(data,path=identify(data)){
 const entry=historicalSourceFixture.files[path];let result=currentCorrectionBaseline(latestSourceBaseline(data,path),path);
 if(!entry||entry.kind!=='json')return result;
 for(const stage of [...entry.stages].reverse()){
  // Recognize exact older snapshots for idempotence without requiring absent
  // later rows to resemble a partial current stage.
  const digest=sha256(serialize(result));
  if(Object.entries(entry.sourceHashes).some(([commit,hash])=>hash===digest&&historicalSourceFixture.sourceCommits.indexOf(commit)<historicalSourceFixture.sourceCommits.indexOf(stage.afterCommit)))continue;
  result=reverseReviewedOperations(result,stage.operations);
 }
 return result;
}
export function historicalSourceBytes(path,bytes){
 const name=path.startsWith('data/')||path.startsWith('assets/')||path==='index.html'?path:'data/'+path;
 bytes=concurrentReferenceBytes(name,currentCorrectionBytes(name,latestSourceBytes(name,bytes)));
 const entry=historicalSourceFixture.files[name];if(!entry)return bytes;
 try{
  if(entry.kind==='json')return Buffer.from(serialize(historicalSourceBaseline(JSON.parse(bytes),name)));
  let value=String(bytes);
  for(const stage of [...entry.stages].reverse()){
   const digest=sha256(value);
   if(Object.entries(entry.sourceHashes).some(([commit,hash])=>hash===digest&&historicalSourceFixture.sourceCommits.indexOf(commit)<historicalSourceFixture.sourceCommits.indexOf(stage.afterCommit)))continue;
   const states=stage.operations.map(op=>({op,matches:op.after&&value.split(op.after).length===2}));
   if(states.some(s=>s.matches))for(const {op,matches}of states)assert(matches,'reviewed historical text mismatch: '+name);
   for(const {op,matches}of [...states].reverse())if(matches)value=value.replace(op.after,op.before);
  }
  return Buffer.from(value);
 }catch{return bytes;}
}
