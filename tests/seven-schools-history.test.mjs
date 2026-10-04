import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {sevenFixture as f,sevenBytes,sevenObject} from './seven-schools-baseline.mjs';
import {pkuBytes} from './pku-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {latestSourceBytes,latestSourceBaseline} from './latest-3f294-baseline.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,filterOpportunities} from '../assets/core.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const publishedGitBlobs={"before":{"assets/app.js":"3fc206cb830faa7fac53c7c0bb0228064d38b5ed","assets/core.js":"2864ff591d31e1f295883f037b25b89bd424105a","assets/experiences.js":"8b0ea30b0b7811cb4b2beca8a243f365a5d376cf","assets/material-supplement.js":"637d06345a2998a7f707bd5d74f7e69673730ce3","assets/page-overviews.js":"4006b9648c9490e3d28e8fdf11373823fcb97e01","assets/profiles.js":"c978573a5f18a578c33eb374a7ea56f0aab9d2c3","assets/project-comparison.js":"a577021140cf1b3eb793dae38468ce39e9b44f5f","assets/record-summaries.js":"9ca9105aaed6f8e7eb0b3daa80c9bb02f84bd77a","data/catalog.json":"bd52f8f19a8d51a8450802c27f1c6d7ddcd9f950","index.html":"24f4cc38ac0c5a4483fb0cac4f359aa2fa2285d4"},"after":{"assets/app.js":"5c8c17715e087a1a98766352928a969cd898a72e","assets/core.js":"b1cdd6c732392e7fd63eeeabc836f56cbbf629f2","assets/experiences.js":"0dfcabc76a9ab8b74920e72d7064196bbebd2f39","assets/material-supplement.js":"5a6940e72be8b484459b342566a1a1241633d970","assets/page-overviews.js":"b3297d490628ca1e2abeb85819431a6311ceed96","assets/profiles.js":"dfcc33168ff920e5223dbb88ec7420e88891030e","assets/project-comparison.js":"0bfe092dfa94d517eb935cadbc37ba23d458cd50","assets/record-summaries.js":"727ad4639c3884ca4ee02bf31e25cde6bbfb74ed","data/catalog.json":"c8840ba010b4fc0cb371821a783b18069d04f0fc","index.html":"d1d8e96636edcaac177bf9218bfd2d9bb2438d1e"}};
const c=JSON.parse(read('data/catalog.json')),prior=JSON.parse(sevenBytes('data/catalog.json',read('data/catalog.json')));

test('seven-school source stage reconstructs exact independent dbc Git blobs before PKU history',()=>{
 assert.equal(f.beforeCommit,'dbc994d9575564ffef1139958977dd423193c413');assert.equal(f.afterCommit,'c6989b93ae67bb5d62a09ba5da812d41ec6f4dc9');
 assert.deepEqual(Object.keys(f.files).sort(),Object.keys(publishedGitBlobs.before).sort());
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),old=sevenBytes(path,raw);assert.equal(hash(raw),e.afterSha256);assert.equal(git(raw),publishedGitBlobs.after[path]);
  assert.equal(hash(old),e.beforeSha256);assert.equal(git(old),publishedGitBlobs.before[path]);assert.equal(e.beforeGitBlob,publishedGitBlobs.before[path]);assert.equal(e.afterGitBlob,publishedGitBlobs.after[path]);
  assert.deepEqual(sevenBytes(path,old,'forward'),raw);assert.deepEqual(sevenBytes(path,old),old);assert.deepEqual(sevenBytes(path,raw,'forward'),raw);
  assert.deepEqual(latestSourceBytes(path,raw),latestSourceBytes(path,old));assert.deepEqual(latestSourceBytes(path,old),latestSourceBytes(path,pkuBytes(path,old)));
 }
});

test('current seven-school records stay 87 people and 52 routes with all earlier objects preserved',()=>{
 assert.equal(c.advisors.length,87);assert.equal(c.routes.length,52);assert.equal(prior.advisors.length,63);assert.equal(prior.routes.length,45);
 assert.deepEqual(c.advisors.slice(0,63),prior.advisors);assert.deepEqual(c.routes.slice(0,45),prior.routes);
 assert.deepEqual(Object.keys(c),Object.keys(prior));
 for(const k of Object.keys(c).filter(k=>!['advisors','routes','metadata'].includes(k)))assert.deepEqual(c[k],prior[k],k);
 for(const k of Object.keys(c.metadata).filter(k=>!['checkedDate','scope','sourceInputs','normalizationNotes'].includes(k)))assert.deepEqual(c.metadata[k],prior.metadata[k],k);
 assert.equal(c.metadata.sourceInputs.length,13);assert.deepEqual(c.metadata.sourceInputs.slice(0,6),prior.metadata.sourceInputs);
 assert.equal(c.metadata.normalizationNotes.length,7);assert.deepEqual(c.metadata.normalizationNotes.slice(0,6),prior.metadata.normalizationNotes);
 assert.deepEqual(f.files['data/catalog.json'].operations.map(x=>x.path),[['metadata','checkedDate'],['metadata','scope'],...Array.from({length:7},(_,i)=>['metadata','sourceInputs',6+i]),['metadata','normalizationNotes',6],...Array.from({length:24},(_,i)=>['advisors',63+i]),...Array.from({length:7},(_,i)=>['routes',45+i])]);
 const ra=JSON.parse(read('data/ra-positions.json')).raPositions;assert.deepEqual(buildOpportunities({...c,raPositions:ra}),buildOpportunities({...prior,raPositions:ra}));
 assert.equal(browseAdvisors(c).length,87);assert.equal(browseRoutes(c).length,52);
 const schools=[['ZJU',4],['Fudan',4],['SJTU',3],['NJU',3],['USTC',3],['Tongji',4],['SEU',3]];
 for(const [school,count]of schools){const a=browseAdvisors(c,{institution:school});assert.equal(a.length,count);assert(a.every(x=>x.eligibility==='pending'));assert(a.every(x=>x.routeAssociations.every(y=>y.verificationStatus==='pending'&&!y.individualRecruitmentVerified)));const rows=filterOpportunities(c,{institution:school,opportunityType:'PhD'});assert.equal(rows.length,count);assert(rows.every(x=>x.reference));assert.equal(filterOpportunities(c,{institution:school}).length,0);}
 assert(c.routes.slice(45).every(x=>x.status==='reference'&&!x.individualRecruitmentVerified));
 for(const id of ['jhu-robotics-mse','bu-robotics-ms','pku-sai-phd-reference-2027'])assert.deepEqual(c.routes.find(r=>r.id===id),prior.routes.find(r=>r.id===id));
});

test('seven-school inverse retains unreviewed metadata, later appends, reordered arrays and partial rollbacks',()=>{
 const variants=[];const add=fn=>{const d=structuredClone(c);fn(d);variants.push(d)};
 add(d=>d.futureFriendData={keep:true});add(d=>d.metadata.futureReview='keep');add(d=>d.metadata.sourceInputs.push({future:true}));add(d=>d.metadata.normalizationNotes.push('future'));add(d=>d.metadata.sourceInputs.at(-1).unreviewed=true);
 add(d=>d.advisors.push({id:'future-person'}));add(d=>d.routes.push({id:'future-route'}));add(d=>d.advisors[0].unreviewed=true);add(d=>d.advisors.at(-1).unreviewed=true);add(d=>d.routes.at(-1).unreviewed=true);add(d=>d.advisors.reverse());add(d=>d.routes.reverse());
 for(const op of f.files['data/catalog.json'].operations)add(d=>{let parent=d;for(const k of op.path.slice(0,-1))parent=parent[k];const key=op.path.at(-1);if(op.beforeMissing){if(Array.isArray(parent))parent.splice(key,1);else delete parent[key]}else parent[key]=structuredClone(op.before)});
 for(const d of variants){const b=Buffer.from(serialize(d));assert.deepEqual(sevenObject('data/catalog.json',d),d);assert.deepEqual(sevenBytes('data/catalog.json',b),b);assert.deepEqual(latestSourceBaseline(d),d);assert.notEqual(git(latestSourceBytes('data/catalog.json',b)),publishedGitBlobs.before['data/catalog.json']);}
 for(const [path,e]of Object.entries(f.files)){
  const raw=read(path),old=sevenBytes(path,raw);
  for(const b of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))]){assert.strictEqual(sevenBytes(path,b),b);assert.notEqual(hash(b),e.beforeSha256);}
  const changedOld=Buffer.concat([old,Buffer.from(' ')]);assert.strictEqual(sevenBytes(path,changedOld,'forward'),changedOld);
  if(e.kind==='text_fragments'){for(const op of e.operations){const b=Buffer.from(String(raw).replace(op.after,()=>op.after+'UNREVIEWED'));assert.strictEqual(sevenBytes(path,b),b);}if(e.operations.length>1){const b=Buffer.from(String(raw).replace(e.operations[0].after,()=>e.operations[0].before));assert.strictEqual(sevenBytes(path,b),b);}}
 }
 const b=Buffer.from('{unfinished:');assert.strictEqual(sevenBytes('data/catalog.json',b),b);assert.strictEqual(sevenBytes('data/future.json',b),b);
});
