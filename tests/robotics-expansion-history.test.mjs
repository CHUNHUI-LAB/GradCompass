import {avatarInitialsBytes} from './avatar-initials-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {roboticsExpansionBytes,roboticsExpansionObject,roboticsExpansionFixture as f} from './robotics-expansion-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {latestSourceBytes,latestSourceBaseline} from './latest-3f294-baseline.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities} from '../assets/core.js';
const read=p=>avatarInitialsBytes(p,fs.readFileSync(new URL('../'+p,import.meta.url)));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
// Independent published Git-tree blobs; expected values never come from the manifest.
const published={before:{'assets/app.js':'9bbe201c6981fe89541641ee521a080ba14c9870','data/catalog.json':'1159f8bf6533a4a41001c039ef2fd28deaefdab3','index.html':'0cc69b1d2c190625748e610536a4586b4b9e2eba'},after:{'assets/app.js':'2ff6befebb180fe2c3b4e824e80ecfd15bcaac22','data/catalog.json':'c16fc677fe3c546a6a47d2fb9a6020286905f1e6','index.html':'6563fa591a8940afff02e74c1af76de5515e1405'}};
test('robotics expansion pins both published Git trees and exact reversible files',()=>{
 assert.equal(f.beforeCommit,'1e70f65e3eb5caf2baa655d532ae8183a8466ec3');
 assert.equal(f.afterCommit,'5617d13a000c557a0d29fc9658ef3c36d0ebb281');
 assert.equal(f.beforeTree,'85357eeea3cf1d234558501ce7c2d298b00676c3');
 assert.equal(f.afterTree,'a2e0c2f98dcbb5de33fe6997e45bb16b3674e907');
 assert.deepEqual(Object.keys(f.files).sort(),Object.keys(published.before).sort());
 const fixtureBefore=serialize(f);
 for(const [path,e]of Object.entries(f.files)){
  const raw=read(path),copy=Buffer.from(raw),old=roboticsExpansionBytes(path,raw);
  assert.equal(hash(raw),e.afterSha256);assert.equal(hash(old),e.beforeSha256);
  assert.equal(git(raw),published.after[path]);assert.equal(git(old),published.before[path]);
  assert.equal(e.afterGitBlob,published.after[path]);assert.equal(e.beforeGitBlob,published.before[path]);
  assert.deepEqual(roboticsExpansionBytes(path,old,'forward'),raw);
  assert.deepEqual(roboticsExpansionBytes(path,old),old);assert.deepEqual(roboticsExpansionBytes(path,raw,'forward'),raw);
  assert.deepEqual(latestSourceBytes(path,raw),latestSourceBytes(path,old));assert.deepEqual(raw,copy);
 }
 assert.equal(serialize(f),fixtureBefore);
});
test('all 148 live advisors and 60 projects retain exact pre-expansion prefixes and bounded references',()=>{
 const path='data/catalog.json',current=JSON.parse(read(path)),old=JSON.parse(roboticsExpansionBytes(path,read(path)));
 assert.equal(current.advisors.length,148);assert.equal(current.routes.length,60);
 assert.equal(browseAdvisors(current).length,148);assert.equal(browseRoutes(current).length,60);
 assert.equal(old.advisors.length,91);assert.equal(old.routes.length,55);
 assert.deepEqual(current.advisors.slice(0,91),old.advisors);assert.deepEqual(current.routes.slice(0,55),old.routes);
 assert.equal(current.advisors.slice(91).filter(a=>a.institution==='ZJU').length,32);
 assert.equal(current.advisors.slice(91).filter(a=>a.institution==='NJU').length,25);
 for(const key of Object.keys(old).filter(k=>!['advisors','routes','metadata'].includes(k)))assert.deepEqual(current[key],old[key]);
 for(const a of current.advisors.slice(91)){
  assert.equal(a.eligibility,'pending');assert.equal(a.opening,'unknown');
  assert(a.routeAssociations.every(r=>r.verificationStatus==='pending'&&!r.individualRecruitmentVerified));
 }
 const raPositions=JSON.parse(read('data/ra-positions.json')).raPositions;
 assert.deepEqual(buildOpportunities({...current,raPositions}),buildOpportunities({...old,raPositions}));
 assert.deepEqual(roboticsExpansionObject(path,current),old);assert.deepEqual(roboticsExpansionObject(path,old,'forward'),current);
 assert.deepEqual(latestSourceBaseline(current),latestSourceBaseline(old));
});
test('robotics expansion rejects unknown data, reordering and partial record rollbacks',()=>{
 const path='data/catalog.json',original=JSON.parse(read(path));
 const variants=[];const add=fn=>{const value=structuredClone(original);fn(value);variants.push(value)};
 add(v=>v.futureContributorMetadata={keep:true});add(v=>v.metadata.futureEvidence='retain');
 add(v=>v.advisors.push({id:'future-advisor'}));add(v=>v.routes.push({id:'future-project'}));
 add(v=>v.advisors.reverse());add(v=>v.routes.reverse());
 add(v=>v.advisors[0].name+=' UNREVIEWED');add(v=>v.advisors[91].name+=' UNREVIEWED');
 add(v=>v.advisors.at(-1).opening='explicit');add(v=>v.advisors.splice(91,1));
 add(v=>v.routes.at(-1).individualRecruitmentVerified=true);add(v=>v.routes.pop());
 add(v=>v.metadata.normalizationNotes.pop());add(v=>v.metadata.sourceInputs.pop());
 for(const value of variants){
  const bytes=Buffer.from(serialize(value));assert.notEqual(hash(bytes),f.files[path].afterSha256);
  assert.strictEqual(roboticsExpansionBytes(path,bytes),bytes);assert.deepEqual(roboticsExpansionObject(path,value),value);
  assert.deepEqual(latestSourceBytes(path,bytes),bytes);assert.deepEqual(latestSourceBaseline(value),value);
 }
});
test('robotics expansion cannot hide text changes, fragment input or partially reversed runtime',()=>{
 for(const [path,e]of Object.entries(f.files)){
  const raw=read(path),old=roboticsExpansionBytes(path,raw);
  const mutations=[Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))];
  if(e.kind==='text_fragments'){
   mutations.push(Buffer.from(e.operations.map(op=>op.after).join('\n')));
   for(const op of e.operations){
    mutations.push(Buffer.from(String(raw).replace(op.after,()=>op.after+'UNREVIEWED')));
    const partial=Buffer.from(String(raw).replace(op.after,()=>op.before));
    if(hash(partial)!==e.beforeSha256)mutations.push(partial);
   }
  }
  for(const bytes of mutations){assert.strictEqual(roboticsExpansionBytes(path,bytes),bytes);assert.deepEqual(latestSourceBytes(path,bytes),bytes);}
  const changedOld=Buffer.concat([old,Buffer.from(' ')]);assert.strictEqual(roboticsExpansionBytes(path,changedOld,'forward'),changedOld);
 }
 for(const path of ['data/future.json','assets/future.js','index.html']){
  const bytes=Buffer.from('{unfinished:');for(const direction of ['reverse','forward'])assert.strictEqual(roboticsExpansionBytes(path,bytes,direction),bytes);
 }
});
