import assert from 'node:assert/strict';
import crypto from 'node:crypto';
export const snapshotHash=value=>crypto.createHash('sha256').update(value).digest('hex');
export const snapshotText=value=>JSON.stringify(value,null,2)+'\n';
export function snapshotPath(path){return path?.startsWith('data/')||path?.startsWith('assets/')||path==='index.html'?path:path?'data/'+path:null;}
export function identifySnapshot(data){
 if(data.routes&&data.advisors)return 'data/catalog.json';if(data.profiles)return 'data/advisor-profiles.json';
 if(data.admissionEvidence&&data.advisors&&['SUSTech','Tsinghua'].includes(data.institution))return 'data/'+(data.institution==='SUSTech'?'sustech':'tsinghua')+'-advisor-review-20261004.json';return null;
}
// Only a complete known snapshot may transform. Mutations pass through intact,
// then fail the independent source hash assertions. Never filter by record ID.
export function transformSnapshotObject(fixture,path,data,direction='reverse'){
 const entry=fixture.files[snapshotPath(path)],forward=direction==='forward';let result=structuredClone(data);
 if(!entry||entry.kind!=='json'||snapshotHash(snapshotText(data))!==entry[forward?'beforeSha256':'afterSha256'])return result;
 const operations=forward?entry.operations:[...entry.operations].reverse();
 for(const original of operations){
  const op=forward?{...original,before:original.after,after:original.before,beforeMissing:original.afterMissing,afterMissing:original.beforeMissing}:original;
  if(!op.path.length){assert.deepEqual(result,op.after);result=structuredClone(op.before);continue;}
  let parent=result;for(const key of op.path.slice(0,-1))parent=parent[key];const key=op.path.at(-1);
  if(op.afterMissing)assert(!Object.hasOwn(parent,key));else assert.deepEqual(parent[key],op.after,'reviewed snapshot field '+op.path.join('/'));
  if(op.beforeMissing){if(Array.isArray(parent))parent.splice(key,1);else delete parent[key];}else parent[key]=structuredClone(op.before);
 }
 assert.equal(snapshotHash(snapshotText(result)),entry[forward?'afterSha256':'beforeSha256'],path+' exact '+direction+' snapshot');return result;
}
export function transformSnapshotBytes(fixture,path,bytes,direction='reverse'){
 const entry=fixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 if(entry.kind==='json')return Buffer.from(snapshotText(transformSnapshotObject(fixture,path,JSON.parse(bytes),direction)));
 assert.equal(entry.operations.length,1);const op=entry.operations[0];assert.equal(String(bytes),op[forward?'before':'after']);
 const result=Buffer.from(op[forward?'after':'before']);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256']);return result;
}
