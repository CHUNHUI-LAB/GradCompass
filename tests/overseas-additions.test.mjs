import {avatarInitialsBytes} from './avatar-initials-baseline.mjs';
import {roboticsExpansionBytes} from './robotics-expansion-baseline.mjs';
import {currentMainBytes} from './current-main-baseline.mjs';
import {sevenBytes} from './seven-schools-baseline.mjs';
import {pkuBytes} from './pku-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './jhu-language-history-fs.mjs';
import {overseasFixture as f,overseasBytes,overseasObject} from './overseas-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {browseRoutes,buildOpportunities} from '../assets/core.js';
import {normalizeProjectSummaries,renderRecordSummary} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
// These assertions intentionally inspect the reviewed pre-PKU overseas stage.
const read=p=>pkuBytes(p,sevenBytes(p,currentMainBytes(p,roboticsExpansionBytes(p,avatarInitialsBytes(p,fs.readFileSync(new URL('../'+p,import.meta.url))))))),data=p=>JSON.parse(read(p));
const c=data('data/catalog.json'),p=data('data/project-summaries.json'),m=data('data/material-summaries.json');
const base=JSON.parse(overseasBytes('data/catalog.json',read('data/catalog.json')));
const sourceHashes={
 'data/catalog.json':'1d487459fc92f44d1c68451061b6afac2c06c8289740f6abf77e4639667a6120',
 'assets/app.js':'d25447147287fde8b6bccb7b8c92798a4ea7427c599922fce0fc4cfe26426ba0',
 'index.html':'c069a2831953cdceab275de8f295929a50a2470b95a8bfc2fe4dc095bf187c57',
};
test('overseas exact append layer round trips all source bytes and rejects unknown mutations',()=>{
 assert.equal(f.baseCommit,'7a8b2d63da2eab07b315a099bcd51c561a0c8c6f');assert.equal(f.baseTree,'d925daddc43a5ca8ef20897520f872630c1ace1b');assert.equal(f.identicalContentCommit,'67d98a99f41bbd8be1e85a90cb57db76c14b63c4');
 assert.deepEqual(Object.keys(f.files).sort(),['assets/app.js','data/catalog.json','data/material-summaries.json','data/project-summaries.json','index.html']);
 for(const [path,e]of Object.entries(f.files)){
  if(sourceHashes[path])assert.equal(e.beforeSha256,sourceHashes[path]);
  const raw=read(path);assert.equal(hash(raw),e.afterSha256,path+' exact new snapshot');
  const prior=overseasBytes(path,raw);assert.equal(hash(prior),e.beforeSha256,path+' unchanged published snapshot');
  assert.deepEqual(overseasBytes(path,prior),prior);assert.deepEqual(overseasBytes(path,prior,'forward'),raw);
  for(const altered of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))]){
   assert.deepEqual(overseasBytes(path,altered),altered);assert.notEqual(hash(altered),e.beforeSha256);
  }
  if(e.kind==='json'){
   const value=JSON.parse(raw);value.futureUnreviewed={keep:true};assert.deepEqual(overseasObject(path,value),value);
   const v=JSON.parse(raw),key=path.includes('catalog')?'routes':'records';v[key].reverse();assert.deepEqual(overseasObject(path,v),v);
   const q=JSON.parse(raw);q[key].at(-1).unreviewed=true;assert.deepEqual(overseasObject(path,q),q);
  }else for(const op of e.operations)assert.match(op.before,/\?v=[a-f0-9]{12}$/);
 }
});
test('two project-level additions retain every original record and never create a personal opportunity',()=>{
 assert.deepEqual(c.advisors,base.advisors);assert.equal(c.advisors.length,58);
 assert.deepEqual(c.routes.slice(0,42),base.routes);assert.equal(c.routes.length,44);assert.equal(browseRoutes(c).length,44);
 assert.deepEqual(c.deadlines.slice(0,base.deadlines.length),base.deadlines);assert.equal(c.deadlines.length,base.deadlines.length+6);
 for(const k of Object.keys(base).filter(k=>!['routes','deadlines'].includes(k)))assert.deepEqual(c[k],base[k],k);
 const ra=data('data/ra-positions.json').raPositions;assert.deepEqual(buildOpportunities({...c,raPositions:ra}),buildOpportunities({...base,raPositions:ra}));
 for(const r of c.routes.slice(42)){
  assert.equal(r.individualRecruitmentVerified,false);assert.equal(r.projectCycleVerified,true);assert.equal(r.sourceCycle,'2027');assert.equal(r.admissionMode,'application');assert.equal(r.applicationStatus,'open');
  assert(!c.advisors.some(a=>a.routeIds.includes(r.id)));assert.notEqual(r.cycle2028FallVerified,true);
  const html=renderRecordSummary('project',r,c).html;assert(html.includes(r.nativeDegreeLabel));
 }
});
test('JHU ET deadlines and BU unknown timezones preserve source precision and separate intake years',()=>{
 const ds=c.deadlines.slice(base.deadlines.length);assert.equal(ds.length,6);
 assert.deepEqual(ds.filter(d=>d.institution==='JHU').map(d=>[d.date,d.deadlineTime,d.timezone,d.admissionYear]),[['2026-10-15','23:59','America/New_York','2027 Spring'],['2026-12-15','23:59','America/New_York','2027 Fall'],['2027-01-15','23:59','America/New_York','2027 Fall']]);
 assert.deepEqual(ds.filter(d=>d.institution==='BU').map(d=>[d.date,d.deadlineTime,d.timezone,d.admissionYear]),[['2026-11-01',null,null,'2027 Spring'],['2027-01-15',null,null,'2027 Fall'],['2027-03-15',null,null,'2027 Fall']]);
 assert(!ds.some(d=>['2026-10-15','2027-07-01'].includes(d.date)&&d.institution==='BU'));assert(!ds.some(d=>d.date==='2027-07-01'));
});
test('all current introductions and material groups normalize with source-backed required and optional fields',()=>{
 const summaries=normalizeProjectSummaries(p,c),materials=normalizeMaterialSupplement(m,c);
 assert.equal(summaries.size,30);assert.equal(materials.length,15);assert.equal(materials.length+c.materials.length,17);
 for(const file of ['data/project-summaries.json','data/material-summaries.json']){
  const actual=data(file),prior=JSON.parse(overseasBytes(file,read(file)));
  assert.deepEqual(actual.records.slice(0,prior.records.length),prior.records);assert.deepEqual(actual.sources.slice(0,prior.sources.length),prior.sources);
 }
 for(const r of c.routes.slice(42)){assert(summaries.has(r.id));assert(materials.some(m=>m.routeIds.includes(r.id)));}
 const j=materials.find(m=>m.id==='jhu-robotics-mse-materials'),b=materials.find(m=>m.id==='bu-robotics-ms-materials');
 assert.equal(j.requirements.find(r=>r.kind==='gre').requirementStatus,'optional');assert(!b.requirements.some(r=>r.kind==='gre'));assert.match(b.scopeNotes.join(' '),/不要求GRE/);
 assert.match(j.requirements.find(r=>r.kind==='references').text,/3/);assert.match(b.requirements.find(r=>r.kind==='references').text,/至少2位、最多3位/);
 assert.equal(j.requirements.find(r=>r.kind==='credentialEvaluation').requirementStatus,'optional');
});
