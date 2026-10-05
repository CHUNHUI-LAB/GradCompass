import {sjtuExpansionBytes} from './sjtu-expansion-baseline.mjs';
import {avatarInitialsBytes} from './avatar-initials-baseline.mjs';
import {roboticsExpansionBytes} from './robotics-expansion-baseline.mjs';
import {currentMainBytes} from './current-main-baseline.mjs';
import {sevenBytes} from './seven-schools-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pkuFixture as f,pkuBytes,pkuObject} from './pku-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {latestSourceBytes,latestSourceBaseline} from './latest-3f294-baseline.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,filterOpportunities} from '../assets/core.js';
// The PKU stage is frozen; current live discovery is asserted separately.
const read=p=>sevenBytes(p,currentMainBytes(p,roboticsExpansionBytes(p,avatarInitialsBytes(p,sjtuExpansionBytes(p,fs.readFileSync(new URL('../'+p,import.meta.url)))))));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const publishedGitBlobs={"before":{"assets/app.js":"5db95c373a2dbdad216a776eba5e47e979df6c38","assets/core.js":"fd04eb6b09070c23f8d4f78f6852ed8d727be90e","assets/experiences.js":"77cb6305aceee67f166e24224b1e5e0371b0e16a","assets/material-supplement.js":"3fe967765022f34d2f003afb957fd97f2c5b4b2c","assets/page-overviews.js":"6f507d105a9715fba68510c5de3f79943b58d8b3","assets/profiles.js":"e9a4156320e7b9533c066fbda8829d670ff6e22f","assets/project-comparison.js":"a0f3dadb7b85f4b646da103804d66462101d9445","assets/record-summaries.js":"6e1e0482f31dcd3335aec243396cde01e5e6e711","data/catalog.json":"c5b4aa6614c047af171d092c18757cdc08e81a4d","index.html":"e6ffc2b4ad938b3dab7976e2d5952d8809b9a6cc"},"after":{"assets/app.js":"3fc206cb830faa7fac53c7c0bb0228064d38b5ed","assets/core.js":"2864ff591d31e1f295883f037b25b89bd424105a","assets/experiences.js":"8b0ea30b0b7811cb4b2beca8a243f365a5d376cf","assets/material-supplement.js":"637d06345a2998a7f707bd5d74f7e69673730ce3","assets/page-overviews.js":"4006b9648c9490e3d28e8fdf11373823fcb97e01","assets/profiles.js":"c978573a5f18a578c33eb374a7ea56f0aab9d2c3","assets/project-comparison.js":"a577021140cf1b3eb793dae38468ce39e9b44f5f","assets/record-summaries.js":"9ca9105aaed6f8e7eb0b3daa80c9bb02f84bd77a","data/catalog.json":"bd52f8f19a8d51a8450802c27f1c6d7ddcd9f950","index.html":"24f4cc38ac0c5a4483fb0cac4f359aa2fa2285d4"}};
const c=JSON.parse(read('data/catalog.json')),prior=JSON.parse(pkuBytes('data/catalog.json',read('data/catalog.json')));

test('PKU source inverse matches both independent Git trees and preserves exact original byte order',()=>{
 assert.equal(f.beforeCommit,'5c9032465d8956ef5b661485674274bfa7259ef1');assert.equal(f.afterCommit,'dbc994d9575564ffef1139958977dd423193c413');
 assert.deepEqual(Object.keys(f.files).sort(),Object.keys(publishedGitBlobs.before).sort());
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),old=pkuBytes(path,raw);assert.equal(hash(raw),e.afterSha256);assert.equal(git(raw),publishedGitBlobs.after[path]);
  assert.equal(hash(old),e.beforeSha256);assert.equal(git(old),publishedGitBlobs.before[path]);assert.equal(e.beforeGitBlob,publishedGitBlobs.before[path]);assert.equal(e.afterGitBlob,publishedGitBlobs.after[path]);
  assert.deepEqual(pkuBytes(path,old,'forward'),raw);assert.deepEqual(pkuBytes(path,old),old);assert.deepEqual(pkuBytes(path,raw,'forward'),raw);
  assert.deepEqual(latestSourceBytes(path,raw),latestSourceBytes(path,old));
 }
 assert.equal(git(read('data/pku-advisor-review-20261004.json')),'1cef4a0b2ace73ff14d730105b61e0ccba7c218b','current PKU review is never removed');
});

test('reviewed PKU append preserves exact prefixes and remains visible without verified personal admissions',()=>{
 assert.equal(c.advisors.length,63);assert.equal(c.routes.length,45);assert.equal(prior.advisors.length,58);assert.equal(prior.routes.length,44);
 assert.deepEqual(c.advisors.slice(0,58),prior.advisors);assert.deepEqual(c.routes.slice(0,44),prior.routes);
 assert.deepEqual(c.metadata.sourceInputs.slice(0,5),prior.metadata.sourceInputs);assert.equal(c.metadata.sourceInputs.length,6);
 assert.deepEqual(Object.keys(c),Object.keys(prior));
 for(const k of Object.keys(c).filter(k=>!['advisors','routes','metadata'].includes(k)))assert.deepEqual(c[k],prior[k],k);
 for(const k of Object.keys(c.metadata).filter(k=>k!=='sourceInputs'))assert.deepEqual(c.metadata[k],prior.metadata[k],k);
 assert.deepEqual(f.files['data/catalog.json'].operations.map(x=>x.path),[['metadata','sourceInputs',5],...Array.from({length:5},(_,i)=>['advisors',58+i]),['routes',44]]);
 const ra=JSON.parse(read('data/ra-positions.json')).raPositions;
 assert.deepEqual(buildOpportunities({...c,raPositions:ra}),buildOpportunities({...prior,raPositions:ra}));
 assert.equal(browseAdvisors(c).length,63);assert.equal(browseRoutes(c).length,45);
 const pk=browseAdvisors(c,{institution:'PKU'});assert.equal(pk.length,5);assert(pk.every(a=>a.eligibility==='pending'&&a.opening==='unknown'));
 assert(pk.every(a=>a.routeAssociations.every(x=>x.verificationStatus==='pending'&&!x.individualRecruitmentVerified)));
 const refs=filterOpportunities(c,{institution:'PKU',opportunityType:'PhD'});assert.equal(refs.length,5);assert(refs.every(r=>r.reference));assert.equal(filterOpportunities(c,{institution:'PKU'}).length,0);
 for(const id of ['jhu-robotics-mse','bu-robotics-ms'])assert.deepEqual(c.routes.find(r=>r.id===id),prior.routes.find(r=>r.id===id));
});

test('PKU inverse cannot consume unknown fields, later friends appends, changed metadata, reordering or partial rollback',()=>{
 const mutations=[];
 const add=fn=>{const d=structuredClone(c);fn(d);mutations.push(d)};
 add(d=>d.futureFriendData={keep:true});add(d=>d.metadata.futureReview='keep');add(d=>d.metadata.sourceInputs.push({future:true}));add(d=>d.metadata.sourceInputs.at(-1).unreviewed=true);
 add(d=>d.advisors.push({id:'future-friend-advisor'}));add(d=>d.routes.push({id:'future-friend-route'}));add(d=>d.advisors[0].unreviewed=true);add(d=>d.advisors.at(-1).unreviewed=true);add(d=>d.routes.at(-1).unreviewed=true);
 add(d=>d.advisors.reverse());add(d=>d.routes.reverse());add(d=>d.advisors.splice(58,1));add(d=>d.routes.pop());add(d=>d.metadata.sourceInputs.pop());
 for(const d of mutations){const bytes=Buffer.from(serialize(d));assert.deepEqual(pkuObject('data/catalog.json',d),d);assert.deepEqual(pkuBytes('data/catalog.json',bytes),bytes);assert.deepEqual(latestSourceBaseline(d),d);assert.notEqual(git(latestSourceBytes('data/catalog.json',bytes)),publishedGitBlobs.before['data/catalog.json']);}
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),old=pkuBytes(path,raw);
  for(const value of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))]){assert.strictEqual(pkuBytes(path,value),value);assert.notEqual(hash(value),e.beforeSha256);}
  const changedOld=Buffer.concat([old,Buffer.from(' ')]);assert.strictEqual(pkuBytes(path,changedOld,'forward'),changedOld);
  if(e.kind==='text_fragments'){
   for(const op of e.operations){const changed=Buffer.from(String(raw).replace(op.after,()=>op.after+'UNREVIEWED'));assert.strictEqual(pkuBytes(path,changed),changed);}
   if(e.operations.length>1){const partial=Buffer.from(String(raw).replace(e.operations[0].after,()=>e.operations[0].before));assert.strictEqual(pkuBytes(path,partial),partial);}
  }
 }
 const unknown=Buffer.from('{unfinished:');assert.strictEqual(pkuBytes('data/catalog.json',unknown),unknown);assert.strictEqual(pkuBytes('data/future.json',unknown),unknown);
});
