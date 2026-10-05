import {avatarInitialsBytes} from './avatar-initials-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {currentMainFixture as f,currentMainBytes,currentMainObject} from './current-main-baseline.mjs';
import {sevenFixture,sevenBytes} from './seven-schools-baseline.mjs';
import {pkuBytes} from './pku-baseline.mjs';
import {latestSourceBytes,latestSourceBaseline} from './latest-3f294-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,filterOpportunities,matchesSearch} from '../assets/core.js';
// This older stage asserts its original exact bytes after the separately pinned avatar fix.
const read=path=>avatarInitialsBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url)));
const git=bytes=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
// Independent constants from the published c698 and 03b16 Git trees. These are
// intentionally separate from fixture metadata and are never derived at test time.
const publishedGitBlobs={
  "before": {
    "assets/app.js": "5c8c17715e087a1a98766352928a969cd898a72e",
    "assets/core.js": "b1cdd6c732392e7fd63eeeabc836f56cbbf629f2",
    "assets/experiences.js": "0dfcabc76a9ab8b74920e72d7064196bbebd2f39",
    "assets/material-supplement.js": "5a6940e72be8b484459b342566a1a1241633d970",
    "assets/page-overviews.js": "b3297d490628ca1e2abeb85819431a6311ceed96",
    "assets/profiles.js": "dfcc33168ff920e5223dbb88ec7420e88891030e",
    "assets/project-comparison.js": "0bfe092dfa94d517eb935cadbc37ba23d458cd50",
    "assets/record-summaries.js": "727ad4639c3884ca4ee02bf31e25cde6bbfb74ed",
    "data/catalog.json": "c8840ba010b4fc0cb371821a783b18069d04f0fc",
    "index.html": "d1d8e96636edcaac177bf9218bfd2d9bb2438d1e"
  },
  "after": {
    "assets/app.js": "9bbe201c6981fe89541641ee521a080ba14c9870",
    "assets/core.js": "ccee992a1af5410081bcc2622fe0991a6f7bfb27",
    "assets/experiences.js": "71052d284a2a40883a65f618ad5ae6951bec0f9d",
    "assets/material-supplement.js": "2be553319906d265df922b6c21baf06618251559",
    "assets/page-overviews.js": "deba17a9cafc7efd90c4957d88e966556e85900d",
    "assets/profiles.js": "a2915448ca7605d7d68343c7df169599fc30aed6",
    "assets/project-comparison.js": "ab0e7a7e4521018d6788af03e4ac13011ee97a43",
    "assets/record-summaries.js": "b22a74320e278f455ac95e2ffc181d3a42849868",
    "data/catalog.json": "1159f8bf6533a4a41001c039ef2fd28deaefdab3",
    "index.html": "0cc69b1d2c190625748e610536a4586b4b9e2eba"
  }
};
const reviewGitBlobs={
  "data/fudan-advisor-review-20261005.json": "5e8aba16d518a139e45e82f95d644dbccf80ff78",
  "data/nju-advisor-review-20261005.json": "765e6f1c3921712c834798e7e8b6e076d484dfc9",
  "data/seu-advisor-review-20261005.json": "0fe277d1a1da5e8e4c2f9a2fb93af755f705f9b8",
  "data/sjtu-advisor-review-20261005.json": "73bbba3c84210e955c19aa037c114c2f361aa477",
  "data/tongji-advisor-review-20261005.json": "795ed536ad2df7b939f47fb646ae0250d70e4ddb",
  "data/ustc-advisor-review-20261005.json": "4efb140537b6ff5aee78968eb48d87d21d882925",
  "data/zju-advisor-review-20261005.json": "e434c0e084f64609290bef0711ea0c74b6a85a64"
};
const current=JSON.parse(read('data/catalog.json'));
const historical=JSON.parse(currentMainBytes('data/catalog.json',read('data/catalog.json')));

test('current-main stage pins both published Git trees and round trips exact runtime bytes',()=>{
 assert.equal(f.beforeCommit,'c6989b93ae67bb5d62a09ba5da812d41ec6f4dc9');
 assert.equal(f.beforeTree,'3c6f86dc4fac4f6b9fc931b19ad68c80f508f8df');
 assert.equal(f.afterCommit,'03b16d35f50905ecfa9b800f34058aaf357104d5');
 assert.equal(f.afterTree,'a94c78fca261d9f28a1f9c5d6b7a4a2b756b1aae');
 assert.deepEqual(Object.keys(f.files).sort(),Object.keys(publishedGitBlobs.before).sort());
 assert.deepEqual(Object.keys(f.files).sort(),Object.keys(publishedGitBlobs.after).sort());
 const fixtureBefore=serialize(f);
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),copy=Buffer.from(raw),old=currentMainBytes(path,raw);
  assert.equal(hash(raw),e.afterSha256,path+' exact current source');
  assert.equal(git(raw),publishedGitBlobs.after[path],path+' independent current Git blob');
  assert.equal(hash(old),e.beforeSha256,path+' exact historical source');
  assert.equal(git(old),publishedGitBlobs.before[path],path+' independent c698 Git blob');
  assert.equal(e.beforeGitBlob,publishedGitBlobs.before[path]);
  assert.equal(e.afterGitBlob,publishedGitBlobs.after[path]);
  assert.equal(e.beforeSha256,sevenFixture.files[path].afterSha256,path+' connects to immutable seven-school stage');
  assert.deepEqual(currentMainBytes(path,old,'forward'),raw,path+' forward inverse');
  assert.deepEqual(currentMainBytes(path,old),old,path+' reverse idempotence');
  assert.deepEqual(currentMainBytes(path,raw,'forward'),raw,path+' forward idempotence');
  assert.deepEqual(latestSourceBytes(path,raw),latestSourceBytes(path,old),path+' explicit current-main chain');
  assert.deepEqual(latestSourceBytes(path,raw),latestSourceBytes(path,pkuBytes(path,sevenBytes(path,old))),path+' seven-school then PKU chain');
  assert.deepEqual(raw,copy,path+' input bytes are immutable');
 }
 assert.deepEqual(currentMainObject('data/catalog.json',current),historical);
 assert.deepEqual(currentMainObject('data/catalog.json',historical,'forward'),current);
 assert.deepEqual(latestSourceBaseline(current),latestSourceBaseline(historical));
 assert.equal(serialize(f),fixtureBefore,'fixture remains immutable');
});

test('live current catalog retains 91 people and 55 routes while historical c698 remains 87 and 52',()=>{
 assert.equal(current.advisors.length,91);assert.equal(current.routes.length,55);
 assert.equal(historical.advisors.length,87);assert.equal(historical.routes.length,52);
 assert.equal(browseAdvisors(current).length,91);assert.equal(browseRoutes(current).length,55);
 assert.deepEqual(current.advisors.slice(0,63),historical.advisors.slice(0,63),'all pre-seven-school contributor advisors remain exact');
 assert.deepEqual(current.routes.slice(0,45),historical.routes.slice(0,45),'all pre-seven-school contributor routes remain exact');
 assert.deepEqual(current.advisors.slice(0,87).map(a=>a.id),historical.advisors.map(a=>a.id),'all c698 people retained in order');
 assert.deepEqual(current.routes.slice(0,52).map(r=>r.id),historical.routes.map(r=>r.id),'all c698 routes retained in order');
 assert.deepEqual(current.advisors.slice(87).map(a=>a.id),['seu-wei-xiucan','seu-song-mofei','seu-feng-lei','seu-zhang-yu']);
 assert.deepEqual(current.routes.slice(52).map(r=>r.id),['nju-lamda-phd-reference-2027','ustc-tong-plan-phd-reference-2027','seu-palm-phd-reference-2027']);
 for(const key of Object.keys(historical).filter(k=>!['metadata','advisors','routes'].includes(k)))assert.deepEqual(current[key],historical[key],key+' unchanged');
 const raPositions=JSON.parse(read('data/ra-positions.json')).raPositions;
 assert.deepEqual(buildOpportunities({...current,raPositions}),buildOpportunities({...historical,raPositions}),'new programme references do not manufacture personal opportunities');
 assert.equal(buildOpportunities({...current,raPositions}).length,59);
 for(const [institution,count] of [['ZJU',4],['Fudan',4],['SJTU',3],['NJU',4],['USTC',4],['Tongji',4],['SEU',7]]){
  const rows=filterOpportunities(current,{institution,opportunityType:'PhD'});
  assert.equal(rows.length,count);assert(rows.every(row=>row.reference));
  assert.equal(filterOpportunities(current,{institution}).length,0);
 }
 for(const advisor of current.advisors.slice(87)){
  assert.equal(advisor.eligibility,'pending');assert.equal(advisor.opening,'unknown');
  assert(advisor.routeAssociations.every(a=>a.verificationStatus==='pending'&&!a.individualRecruitmentVerified));
 }
 assert(matchesSearch('Robotics 机器人：导航','ＲＯＢＯＴＩＣＳ　导航'),'published multilingual width/case/token normalization remains live');
 assert(!matchesSearch('Robotics 机器人：导航','navigation absent'));
});

function retained(value,label,direction='reverse'){
 const bytes=Buffer.from(serialize(value));
 assert.notEqual(hash(bytes),f.files['data/catalog.json'][direction==='reverse'?'afterSha256':'beforeSha256'],label+' genuine mutation');
 assert.deepEqual(currentMainObject('data/catalog.json',value,direction),value,label+' object mutation retained');
 assert.strictEqual(currentMainBytes('data/catalog.json',bytes,direction),bytes,label+' complete byte gate rejects mutation');
 if(direction==='reverse'){
  assert.deepEqual(latestSourceBaseline(value),value,label+' older object chain cannot consume mutation');
  assert.deepEqual(latestSourceBytes('data/catalog.json',bytes),bytes,label+' older byte chain cannot consume mutation');
 }
}

test('current-main inverse rejects unknown metadata, appends, reordered rows and each partial catalog rollback',()=>{
 const mutations=[
  d=>{d.futureContributorData={keep:true}},d=>{d.metadata.futureReview='keep'},
  d=>d.metadata.sourceInputs.push({future:true}),d=>d.metadata.normalizationNotes.push('future'),
  d=>{d.metadata.sourceInputs.at(-1).unreviewed=true},
  d=>d.advisors.push({id:'future-contributor-advisor'}),d=>d.routes.push({id:'future-contributor-route'}),
  d=>{d.advisors[0].unreviewed=true},d=>{d.advisors[74].unreviewed=true},d=>{d.advisors.at(-1).unreviewed=true},
  d=>{d.routes[0].unreviewed=true},d=>{d.routes[45].unreviewed=true},d=>{d.routes.at(-1).unreviewed=true},
  d=>d.advisors.reverse(),d=>d.routes.reverse(),d=>d.advisors.pop(),d=>d.routes.pop(),
 ];
 for(const [i,mutate] of mutations.entries()){
  const value=structuredClone(current);mutate(value);retained(value,'current mutation '+i);
  const old=structuredClone(historical);mutate(old);retained(old,'historical mutation '+i,'forward');
 }
 for(const op of f.files['data/catalog.json'].operations){
  const value=structuredClone(current);let parent=value;
  for(const key of op.path.slice(0,-1))parent=parent[key];
  const key=op.path.at(-1);
  if(op.beforeMissing){if(Array.isArray(parent))parent.splice(key,1);else delete parent[key];}
  else parent[key]=structuredClone(op.before);
  retained(value,'partial rollback '+op.path.join('/'));
 }
});

test('current-main whole-file gate retains unknown text, whitespace, fragment inputs and partial runtime rollbacks',()=>{
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),old=currentMainBytes(path,raw);
  const mutations=[Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))];
  if(e.kind==='text_fragments'){
   mutations.push(Buffer.from(e.operations.map(op=>op.after).join('\n')));
   for(const op of e.operations){
    mutations.push(Buffer.from(String(raw).replace(op.after,()=>op.after+'UNREVIEWED')));
    if(e.operations.length>1)mutations.push(Buffer.from(String(raw).replace(op.after,()=>op.before)));
   }
  }
  for(const bytes of mutations){
   assert.notEqual(hash(bytes),e.afterSha256,path+' mutation differs from current');
   assert.notEqual(hash(bytes),e.beforeSha256,path+' mutation differs from historical');
   assert.strictEqual(currentMainBytes(path,bytes),bytes,path+' exact gate retains mutation');
   assert.deepEqual(latestSourceBytes(path,bytes),bytes,path+' full older chain retains mutation');
  }
  for(const bytes of [Buffer.concat([old,Buffer.from(' ')]),Buffer.from(String(old).replace('\n','\nUNREVIEWED\n'))]){
   assert.strictEqual(currentMainBytes(path,bytes,'forward'),bytes,path+' forward exact gate retains mutation');
   assert.notEqual(hash(bytes),e.afterSha256);
  }
 }
 for(const path of ['data/catalog.json','data/future.json','assets/app.js','index.html']){
  const bytes=Buffer.from('{unfinished:');
  for(const direction of ['reverse','forward'])assert.strictEqual(currentMainBytes(path,bytes,direction),bytes);
 }
});

test('new source stage leaves every other runtime and dataset byte untouched, including enriched school reviews',()=>{
 for(const [path,expected] of Object.entries(reviewGitBlobs))assert.equal(git(read(path)),expected,path+' independent current review');
 for(const folder of ['assets','data'])for(const name of fs.readdirSync(new URL('../'+folder+'/',import.meta.url))){
  const path=folder+'/'+name;if(f.files[path])continue;
  const bytes=read(path);
  for(const direction of ['reverse','forward'])assert.strictEqual(currentMainBytes(path,bytes,direction),bytes,path+' untouched '+direction);
 }
});
