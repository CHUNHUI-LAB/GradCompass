import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {publicAuditFixture as f,publicAuditBytes,publicAuditObject,assertCurrentPublicAudit} from './public-audit-20261006-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {normalizeExperiences,renderExperiences,renderExperienceEvidence,renderExperienceReading,filterExperiences} from '../assets/experiences.js';
import {buildPageOverview} from '../assets/page-overviews.js';
import {browseAdvisors,browseRoutes,buildOpportunities} from '../assets/core.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),data=p=>JSON.parse(read(p));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const experienceId='grad-heu-sunbohan-research-selection-2026';
const catalog=data('data/catalog.json'),experiences=data('data/application-experiences.json'),provenance=data('data/application-experience-provenance.json');

test('public audit has a fixed field allowlist and exact source and target hashes',()=>{
 assert.equal(f.baseCommit,'079eaea16e636f2e91ab2cb0e6ffa309f589440e');
 assert.deepEqual(Object.keys(f.files),['data/catalog.json','data/application-experiences.json','data/application-experience-provenance.json']);
 assert.deepEqual(Object.keys(f.addedFiles),['data/maintenance-2026-10-06.json']);
 const allowed={
  'data/catalog.json':[['routes',40,'applicationStatus'],['routes',40,'requirements'],['routes',40,'cycleReview'],['routes',45,'requirements'],['routes',45,'cycleReview'],...[6,7].flatMap(i=>['timezone','note','cycleReview'].map(k=>['deadlines',i,k]))],
  'data/application-experiences.json':[['checkedAt'],['records',26]],
  'data/application-experience-provenance.json':[['records',26]]
 };
 for(const [path,entry] of Object.entries(f.files)){
  assert.deepEqual(entry.operations.map(o=>o.path),allowed[path]);
  const current=read(path),old=publicAuditBytes(path,current);
  assertCurrentPublicAudit(path,current);assert.equal(hash(old),entry.beforeSha256);assert.equal(git(old),entry.beforeGitBlob);assert.equal(git(current),entry.afterGitBlob);
  assert.deepEqual(publicAuditBytes(path,old,'forward'),current,'byte-identical forward replay: '+path);
  assert.deepEqual(publicAuditBytes(path,old),old,'old snapshots are unchanged');
  assert.deepEqual(publicAuditBytes(path,current,'forward'),current,'forward does not double-apply');
  assert.deepEqual(publicAuditObject(path,JSON.parse(current)),JSON.parse(old));
 }
 for(const path of Object.keys(f.addedFiles))assertCurrentPublicAudit(path,read(path));
 assert.equal(serialize(f),fs.readFileSync(new URL('./fixtures/history/reviewed-public-audit-20261006.json',import.meta.url),'utf8'));
});

test('public audit preserves all 334 advisors, 65 route source records, old deadlines and 26 experience objects',()=>{
 const old=JSON.parse(publicAuditBytes('data/catalog.json',read('data/catalog.json')));
 assert.equal(catalog.advisors.length,334);assert.deepEqual(catalog.advisors,old.advisors);
 assert.equal(catalog.routes.length,65);assert.deepEqual(catalog.routes.map(r=>r.id),old.routes.map(r=>r.id));
 assert.deepEqual(catalog.routes.map(r=>r.sourceRecord??null),old.routes.map(r=>r.sourceRecord??null));
 assert.deepEqual(catalog.metadata,old.metadata);assert.equal(catalog.deadlines.length,27);
 for(const key of Object.keys(old))if(!['routes','deadlines'].includes(key))assert.deepEqual(catalog[key],old[key]);
 for(const [key,indices,allowed] of [['routes',[40,45],['applicationStatus','requirements','cycleReview']],['deadlines',[6,7],['timezone','note','cycleReview']]]){
  for(let i=0;i<old[key].length;i++){
   if(!indices.includes(i)){assert.deepEqual(catalog[key][i],old[key][i]);continue;}
   for(const k of new Set([...Object.keys(old[key][i]),...Object.keys(catalog[key][i])]))if(!allowed.includes(k))assert.deepEqual(catalog[key][i][k],old[key][i][k]);
  }
 }
 assert.equal(catalog.routes[40].id,'sustech-aim-phd-reference-2027');assert.equal(catalog.routes[45].id,'zju-ai-phd-reference-2027');
 assert.deepEqual(catalog.routes[40].requirements.slice(0,1),old.routes[40].requirements);
 assert.deepEqual(catalog.routes[45].cycleReview.previous.requirements,old.routes[45].requirements);
 assert.deepEqual(catalog.routes[45].cycleReview.history,[old.routes[45].cycleReview]);
 for(const name of ['application-experiences.json','application-experience-provenance.json']){
  const current=data('data/'+name),previous=JSON.parse(publicAuditBytes(name,read('data/'+name)));
  assert.equal(previous.records.length,26);assert.equal(current.records.length,27);assert.deepEqual(current.records.slice(0,26),previous.records);assert.equal(current.records.at(-1).id,experienceId);
 }
});

test('current source validates 27 experiences with one pending synthesis case and unchanged public counts',()=>{
 const records=normalizeExperiences(experiences),r=records.at(-1),p=provenance.records.at(-1);
 assert.equal(records.length,27);assert.equal(new Set(records.map(r=>r.url)).size,27);assert.equal(r.id,experienceId);assert.equal(p.id,r.id);assert.equal(p.url,r.url);
 assert.deepEqual(Object.keys(r).sort(),Object.keys(records[0]).sort());assert.equal(r.publishedAt,null);assert.equal(r.rulesImpact,'none');assert.equal(r.evidenceType,'first_person_self_report');assert.equal(p.officialRulesVerified,false);assert.equal(p.officialPolicyImpact,'none');
 for(const r of records)for(const key of ['routeId','routeIds','advisorId','jobId','eligibility','verified'])assert(!Object.hasOwn(r,key));
 assert.equal(new Set(records.map(r=>r.id)).size,27);assert.equal(new Set(records.map(r=>r.platform)).size,20);
 for(const record of records){const source=provenance.records.find(p=>p.id===record.id);assert(source);assert.equal(source.url,record.url);assert(source.scope);}
 assert(p.fieldLocations.summary);assert(p.fieldLocations.outcome);assert(r.readScope.includes('正文')||r.readScope.includes('主帖'));
 const list=renderExperiences(records).html;
 for(const record of records){
  const card=list.split(`data-experience-id="${record.id}"`)[1].split('</article>')[0];assert.equal((card.match(/<a /g)||[]).length,1);assert(card.includes('阅读经验'));
  const page=renderExperienceReading(records,record.id).html;
  for(const value of [record.authorContext,record.summary,record.outcome,record.dateNote,record.readScope,record.commercialDisclosure,...record.actionableMethods,...record.excludedClaims]){
   const escaped=value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');assert(page.includes(escaped));
  }
  assert(page.includes(`href="${record.url}"`));assert(page.indexOf('不能照搬的部分')<page.indexOf('查看原帖'));
 }
 assert.equal(renderExperiences(records).countLabel,'27 条申请经验');assert.equal((renderExperiences(records).html.match(/class="experience-card"/g)||[]).length,27);
 const evidence=renderExperienceEvidence(records);assert(evidence.includes('这 26 篇经验的逐项依据'));assert(evidence.includes('另有 1 篇新收录经验尚未纳入'));assert(!evidence.includes('这 27 篇经验的逐项依据'));
 assert.equal(buildPageOverview('experiences',catalog,{experiences:records}).scope,'已归纳 26 篇公开自述 · 另 1 篇待综合');
 assert(filterExperiences(records,{query:r.author}).some(x=>x.id===r.id));
 const reading=renderExperienceReading(records,r.id).html;for(const text of [r.summary,r.outcome,r.dateNote,r.readScope,...r.excludedClaims])assert(reading.includes(text));assert(reading.indexOf('不能照搬的部分')<reading.indexOf('查看原帖'));
 assert.equal(browseAdvisors(catalog).length,334);assert.equal(browseRoutes(catalog).length,65);assert.equal(buildOpportunities(catalog).length,57);
 assert.equal(catalog.routes[40].applicationStatus,'open');for(const i of [6,7])assert.equal(catalog.deadlines[i].timezone,null);
});

test('public audit rejects changes to every old advisor, route source, old experience and provenance object',()=>{
 const cases=[];
 for(let i=0;i<334;i++)cases.push(['data/catalog.json',d=>{d.advisors[i].sentinel='tampered';}]);
 for(let i=0;i<65;i++)cases.push(['data/catalog.json',d=>{d.routes[i].sourceRecord={tampered:true};}]);
 for(const path of ['data/application-experiences.json','data/application-experience-provenance.json'])for(let i=0;i<26;i++)cases.push([path,d=>{d.records[i].sentinel='tampered';}]);
 for(const [path,mutate] of cases){const d=data(path);mutate(d);const raw=Buffer.from(serialize(d));assert.throws(()=>assertCurrentPublicAudit(path,raw),/unreviewed current/);assert.strictEqual(publicAuditBytes(path,raw),raw);assert.notEqual(hash(publicAuditBytes(path,raw)),f.files[path].beforeSha256);}
});

test('public audit rejects forged additions, unknown fields, duplicates, reordering and partial rollback',()=>{
 for(const path of ['data/application-experiences.json','data/application-experience-provenance.json'])for(const mutate of [d=>d.records.at(-1).id='forged-new-record',d=>d.records.at(-1).url='https://example.org/forged',d=>d.records.push({...d.records.at(-1)}),d=>d.records.reverse(),d=>d.records.at(-1).newField=true,d=>d.records.pop()]){
  const d=data(path);mutate(d);const raw=Buffer.from(serialize(d));assert.throws(()=>assertCurrentPublicAudit(path,raw),/unreviewed current/);assert.strictEqual(publicAuditBytes(path,raw),raw);
 }
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path);const spaced=Buffer.concat([raw,Buffer.from(' ')]);assert.strictEqual(publicAuditBytes(path,spaced),spaced);assert.throws(()=>assertCurrentPublicAudit(path,spaced));
  for(const op of e.operations){const d=JSON.parse(raw);let parent=d;for(const k of op.path.slice(0,-1))parent=parent[k];const k=op.path.at(-1);if(op.beforeMissing){if(Array.isArray(parent))parent.splice(k,1);else delete parent[k];}else parent[k]=op.before;const partial=Buffer.from(serialize(d));assert.throws(()=>assertCurrentPublicAudit(path,partial));assert.strictEqual(publicAuditBytes(path,partial),partial);}
 }
 const altered=Buffer.from(String(read('data/maintenance-2026-10-06.json'))+' ');assert.throws(()=>assertCurrentPublicAudit('data/maintenance-2026-10-06.json',altered));
 assert.throws(()=>assertCurrentPublicAudit('data/unreviewed.json',Buffer.from('{}')),/outside reviewed/);
});
