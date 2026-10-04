import {overseasBytes} from './overseas-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {detailUiBytes} from './detail-ui-baseline.mjs';
import {latestCorrectionFixture as latest,concurrent3fFixture as concurrent,latestCorrectionBytes,concurrent3fBytes,latestSourceBytes,latestSourceBaseline,previousCandidateBytes} from './latest-3f294-baseline.mjs';
import {currentCorrectionFixture as previous} from './current-correction-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize,transformSnapshotBytes} from './strict-history-transform.mjs';
// The later UI-only stage is reversed explicitly; all evidence-stage hashes and
// fixtures below stay unchanged. Current UI bytes have independent strict tests.
const read=path=>detailUiBytes(path,overseasBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url))));
const currentDataHashes={
 'data/catalog.json':'1d487459fc92f44d1c68451061b6afac2c06c8289740f6abf77e4639667a6120',
 'data/advisor-profiles.json':'f1b3044692f6bbebed815428f10133c535272bcccce7bd431657cf432511d042',
 'data/sustech-advisor-review-20261004.json':'2f34732eed51b8d4939f8648fcb51333ca4ada82d94bdaf6097a308b9f6a2bf3',
 'data/tsinghua-advisor-review-20261004.json':'8e27ae2cb8ec5cb355bee87bbec40bf728653ac0b14f4d39deb52181484d7d9c',
};
const concurrentHashes={
 'assets/app.js':'ce7ce59dd5eeae8d897601310b81f95f5bb2baaaa578fd2239e9b5d6011b30af',
 'assets/core.js':'ab18ba93180652c992aee8ba55aefbafcb05146bddf33d3d55474d85c00630e0',
 'assets/material-supplement.js':'5f80aaa5d2fd3fe8b4d97aa0906fd60d47249c21fce07a64d0322fa5fb906a75',
 'assets/page-overviews.js':'b87e52f201d2392cd9c641667ecd935c1a277d7c028f2c98976620723d3c7e79',
 'assets/project-comparison.js':'7406e812724e1a569deccebf59b43631590a4caa9ba0052c0cbf20da46a60c2c',
 'assets/record-summaries.js':'d5b9b1aed2234eaa19dceac539b91218c103f6c967d286e67b2f67bb6ac2f899',
 'data/catalog.json':'522fa2b72ec959c5babc6c0b30d513f40b28312ad715e724767101e6eb9bb587',
 'index.html':'2d478a0b7fabd496a76346a265de878139df754885099fea3f7852c469f33401',
};
function retained(path,value,label){
 const bytes=Buffer.from(serialize(value));assert.notEqual(hash(bytes),latest.files[path].afterSha256,label+' is a real mutation');
 assert.deepEqual(latestCorrectionBytes(path,bytes),bytes,label+' new correction stage retains mutation');
 assert.deepEqual(latestSourceBytes(path,bytes),bytes,label+' concurrent stage retains mutation');
 assert.deepEqual(latestSourceBaseline(value,path),value,label+' object stage retains mutation');
 assert.notEqual(hash(bytes),latest.files[path].beforeSha256,label+' fails fresh source hash');
}

test('latest source and concurrent 3f294 are explicit independent stages with exact immutable source hashes',()=>{
 assert.equal(latest.beforeCommit,'3f294a8cc601e77183deb594de0836ec76cc8a9c');assert.equal(concurrent.afterCommit,latest.beforeCommit);
 assert.equal(concurrent.beforeCommit,'5c27c78fbcb742e7f44e70145d2e91b7e98fde1f');
 assert.deepEqual(Object.keys(concurrent.files).sort(),Object.keys(concurrentHashes).sort());
 const before=serialize({latest,concurrent});
 for(const [path,entry]of Object.entries(latest.files)){
  const raw=read(path);assert.equal(hash(raw),entry.afterSha256,path+' exact latest candidate');
  const fresh=latestCorrectionBytes(path,raw);assert.equal(hash(fresh),entry.beforeSha256,path+' exact fresh 3f294');
  assert.deepEqual(latestCorrectionBytes(path,fresh),fresh,path+' latest inverse idempotent');
  const old=concurrent3fBytes(path,fresh);assert.equal(hash(old),concurrent.files[path]?.beforeSha256||entry.beforeSha256,path+' exact 5c27 source');
  assert.deepEqual(concurrent3fBytes(path,old),old,path+' concurrent inverse idempotent');
 }
 for(const [path,expected]of Object.entries(currentDataHashes))assert.equal(latest.files[path].afterSha256,expected,path+' independent source audit');
 for(const [path,expected]of Object.entries(concurrentHashes))assert.equal(concurrent.files[path].afterSha256,expected,path+' independent concurrent source');
 assert.equal(serialize({latest,concurrent}),before);
});

test('the preceding candidate is reconstructed exactly without changing its old fixture or forcing its hashes onto latest data',()=>{
 for(const [path,entry]of Object.entries(previous.files)){
  const raw=read(path),prior=previousCandidateBytes(path,raw);assert.equal(hash(prior),entry.afterSha256,path+' frozen previous candidate');
  const five=latestSourceBytes(path,raw);assert.equal(hash(five),entry.beforeSha256,path+' prior source');
  assert.deepEqual(transformSnapshotBytes(previous,path,prior),five,path+' exact round trip');
  assert.deepEqual(transformSnapshotBytes(previous,path,five,'forward'),prior,path+' exact historical forward reconstruction');
 }
 assert.notEqual(hash(read('data/catalog.json')),previous.files['data/catalog.json'].afterSha256,'latest catalog is explicitly newer');
});

test('all latest local people, profiles and association safeguards reject unreviewed rollback or deletion',()=>{
 for(const [path,key,idKey,field]of [['data/catalog.json','advisors','id','name'],['data/advisor-profiles.json','profiles','advisorId','cardSummaryZh']]){
  const original=JSON.parse(read(path)),locals=original[key].filter(r=>/^(sustech-|tsinghua-)/.test(r[idKey]));assert.equal(locals.length,15);
  for(const local of locals){
   const changed=structuredClone(original);changed[key].find(r=>r[idKey]===local[idKey])[field]+=' UNREVIEWED';retained(path,changed,local[idKey]+' changed research');
   const removed=structuredClone(original);delete removed[key].find(r=>r[idKey]===local[idKey])[field];retained(path,removed,local[idKey]+' removed research');
  }
 }
 const path='data/catalog.json',original=JSON.parse(read(path));let count=0;
 for(const advisor of original.advisors.filter(a=>/^(sustech-|tsinghua-)/.test(a.id)))for(let i=0;i<advisor.routeAssociations.length;i++){
  const value=structuredClone(original),a=value.advisors.find(a=>a.id===advisor.id);assert.equal(a.routeAssociations[i].verificationStatus,'pending');
  a.routeAssociations[i].verificationStatus='verified';retained(path,value,advisor.id+' association '+i);count++;
 }
 assert.equal(count,30);
});

test('unknown roots, future records, row order, new UI edits and source-stage mutations remain visible',()=>{
 for(const path of Object.keys(currentDataHashes)){
  let value=JSON.parse(read(path));value.unreviewedProbe='keep';retained(path,value,path+' root addition');
  const key=value.advisors?'advisors':'profiles';value=JSON.parse(read(path));value[key].push({id:'future-unreviewed'});retained(path,value,path+' future record');
  value=JSON.parse(read(path));[value[key][0],value[key][1]]=[value[key][1],value[key][0]];retained(path,value,path+' reordered');
 }
 for(const [path,entry]of Object.entries(latest.files))if(entry.kind==='text'){
  const mutated=Buffer.concat([read(path),Buffer.from('\nUNREVIEWED')]);assert.deepEqual(latestSourceBytes(path,mutated),mutated,path+' text appended');assert.notEqual(hash(mutated),entry.beforeSha256);
 }
 for(const [path,entry]of Object.entries(concurrent.files)){
  const raw=latestCorrectionBytes(path,read(path));assert.equal(hash(raw),entry.afterSha256);
  const mutated=Buffer.concat([raw,Buffer.from('\nUNREVIEWED')]);assert.deepEqual(concurrent3fBytes(path,mutated),mutated,path+' concurrent mutation');
 }
 for(const path of ['data/catalog.json','data/unknown.json']){const bytes=Buffer.from('{unfinished:');assert.deepEqual(latestSourceBytes(path,bytes),bytes);}
});
