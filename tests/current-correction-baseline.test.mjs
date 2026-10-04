import {previousCandidateBytes} from './latest-3f294-baseline.mjs';
// This suite locks the preceding reviewed candidate; latest 3f294 source coverage is independent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {currentCorrectionFixture as fixture,currentCorrectionBaseline,currentCorrectionBytes} from './current-correction-baseline.mjs';
import {historicalSourceBaseline,historicalSourceBytes,serialize,sha256} from './historical-source-baseline.mjs';
const frozenCandidateCache=new Map();
const read=path=>{if(!frozenCandidateCache.has(path))frozenCandidateCache.set(path,previousCandidateBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url))));return Buffer.from(frozenCandidateCache.get(path));};
// Independently pinned to the source-audited four-file candidate. None is read
// from release-manifest.json, so regenerating that manifest cannot bless edits.
const currentDataHashes={
 'data/catalog.json':'fdec2340133a6b926dc485fb9cad3e20a20a86c62dc1f205f86a41bd5d4f9e04',
 'data/advisor-profiles.json':'ac269d5b9e9915cc94dcc74c0f9adb7732f4ec84b70b94b39e37a546ea0203f7',
 'data/tsinghua-advisor-review-20261004.json':'c394dcc0d9497f35488b7d5b7ca69fb1f24f3023b69e9a6d2833233f4473b414',
 'data/sustech-advisor-review-20261004.json':'ddd76136d6883952e25cb9d474cf26629442ebc88b280b78e3aa6f5ff43d8b9b',
};
const oldHashes={'data/catalog.json':'3423ba646e7ed2f7857f8ece4c884edaaf568319049f78b18000ba9fe59e3875','data/advisor-profiles.json':'1550cecabe989c7f857fb65347486e5f7abe85fa140a92514892f1d2de42a2a8'};
function detect(path,value,label){
 const bytes=Buffer.from(serialize(value)),before=Buffer.from(bytes);
 assert.deepEqual(currentCorrectionBytes(path,bytes),bytes,label+' unknown bytes are retained');
 assert.deepEqual(currentCorrectionBaseline(value,path),value,label+' unknown object is retained');
 assert.deepEqual(bytes,before,label+' input is read-only');
 assert.notEqual(sha256(bytes),fixture.files[path].beforeSha256,label+' differs from 5c27c78');
 if(oldHashes[path])assert.notEqual(sha256(historicalSourceBytes(path,bytes)),oldHashes[path],label+' cannot pass an older source hash');
}

test('the preceding reviewed candidate keeps its exact source-to-5c27c78 inverse',()=>{
 assert.equal(fixture.baseCommit,'5c27c78fbcb742e7f44e70145d2e91b7e98fde1f');
 assert.deepEqual(Object.keys(fixture.files).sort(),['assets/app.js','assets/core.js','assets/experiences.js','assets/material-supplement.js','assets/page-overviews.js','assets/profiles.js','assets/project-comparison.js','assets/record-summaries.js','data/advisor-profiles.json','data/catalog.json','data/sustech-advisor-review-20261004.json','data/tsinghua-advisor-review-20261004.json','index.html'].sort());
 const before=serialize(fixture);
 for(const [path,entry]of Object.entries(fixture.files)){
  const bytes=read(path);assert.equal(sha256(bytes),entry.afterSha256,path+' exact reviewed candidate');
  const restored=currentCorrectionBytes(path,bytes);assert.equal(sha256(restored),entry.beforeSha256,path+' exact 5c27c78 bytes');
  assert.deepEqual(currentCorrectionBytes(path,restored),restored,path+' idempotence');
  if(entry.kind==='json'){
   const value=JSON.parse(bytes),serialized=serialize(value),result=currentCorrectionBaseline(value,path);
   assert.equal(serialize(value),serialized,path+' input is read-only');assert.equal(sha256(serialize(result)),entry.beforeSha256);
   assert.deepEqual(currentCorrectionBaseline(result,path),result,path+' object idempotence');
  }
 }
 assert.equal(serialize(fixture),before,'correction operations are not mutated');
 for(const [path,hash]of Object.entries(currentDataHashes))assert.equal(fixture.files[path].afterSha256,hash,path+' source audit');
});

test('all fifteen retained local people and profiles reject changed, unknown and removed research fields',()=>{
 for(const [path,key,idKey,field]of [['data/catalog.json','advisors','id','name'],['data/advisor-profiles.json','profiles','advisorId','cardSummaryZh']]){
  const original=JSON.parse(read(path)),locals=original[key].filter(row=>/^(sustech-|tsinghua-)/.test(row[idKey]));assert.equal(locals.length,15);
  for(const row of locals)for(const mode of ['change','add','remove']){
   const value=structuredClone(original),target=value[key].find(r=>r[idKey]===row[idKey]);
   if(mode==='change')target[field]+=' UNREVIEWED';if(mode==='add')target.unreviewedProbe={retain:true};if(mode==='remove')delete target[field];
   detect(path,value,row[idKey]+' '+mode);
  }
 }
});

test('pending and reference association safeguards cannot be rolled back then erased by historical expansion stages',()=>{
 const path='data/catalog.json',original=JSON.parse(read(path)),locals=original.advisors.filter(a=>/^(sustech-|tsinghua-)/.test(a.id));let checked=0;
 for(const advisor of locals){
  for(let index=0;index<advisor.routeAssociations.length;index++){
   const association=advisor.routeAssociations[index];assert(['pending','reference'].includes(association.status));
   assert.equal(association.verificationStatus,'pending');
   const value=structuredClone(original);value.advisors.find(a=>a.id===advisor.id).routeAssociations[index].status='verified';detect(path,value,advisor.id+' association '+index);
   const verified=structuredClone(original);verified.advisors.find(a=>a.id===advisor.id).routeAssociations[index].verificationStatus='verified';detect(path,verified,advisor.id+' association verification '+index);checked++;
  }
 }
 assert.equal(checked,30,'all thirty precise local associations remain guarded');
 const added=original.routes.find(r=>!JSON.parse(currentCorrectionBytes(path,read(path))).routes.some(old=>old.id===r.id));assert(added);
 for(const mode of ['change','add','remove']){
  const value=structuredClone(original),route=value.routes.find(r=>r.id===added.id);
  if(mode==='change')route.program+=' UNREVIEWED';if(mode==='add')route.unreviewedProbe=true;if(mode==='remove')delete route.program;
  detect(path,value,'new separated IIIS route '+mode);
 }
});

test('unreviewed root fields, future rows, order changes and text mutations are never discarded',()=>{
 for(const path of Object.keys(currentDataHashes)){
  let value=JSON.parse(read(path));value.unreviewedProbe='retain';detect(path,value,path+' root field');
  const key=value.advisors?'advisors':'profiles';
  value=JSON.parse(read(path));value[key].push({id:'future-unreviewed'});detect(path,value,path+' future record');
  value=JSON.parse(read(path));[value[key][0],value[key][1]]=[value[key][1],value[key][0]];detect(path,value,path+' reordered');
 }
 for(const [path,entry]of Object.entries(fixture.files))if(entry.kind==='text')for(const bytes of [Buffer.concat([read(path),Buffer.from('\nUNREVIEWED')]),Buffer.from(String(read(path)).replace('\n','\nUNREVIEWED\n'))]){
  assert.deepEqual(currentCorrectionBytes(path,bytes),bytes,path+' modified source survives');assert.notEqual(sha256(bytes),entry.beforeSha256);
 }
 for(const path of ['data/catalog.json','data/unknown.json']){const bytes=Buffer.from('{unfinished:');assert.deepEqual(currentCorrectionBytes(path,bytes),bytes);}
});
