import {profileCoverageBytes} from './profile-coverage-baseline.mjs';
// CUHK-stage assertions first reverse only the separately pinned later profile
// expansion. Current manifest and production-byte checks still use raw node:fs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {cuhkDeadlineFixture as f,cuhkDeadlineBytes,assertCurrentCuhkDeadlineFile} from './cuhk-deadline-20261007-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {detailReturnBytes,assertCurrentDetailReturnAsset} from './detail-return-focus-baseline.mjs';
import {assertCurrentPublicAudit} from './public-audit-20261006-baseline.mjs';
import {normalizeProjectSummaries,renderRecordSummary} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {browseAdvisors,browseRoutes,buildOpportunities,filterDeadlines} from '../assets/core.js';
const root=new URL('../',import.meta.url),rawRead=p=>fs.readFileSync(new URL(p,root)),read=p=>profileCoverageBytes(p,rawRead(p)),data=p=>JSON.parse(read(p));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const paths=['data/catalog.json','data/project-summaries.json','data/material-summaries.json','assets/app.js','index.html'];
const sourceUrls=['https://www.gs.cuhk.edu.hk/programmes/engineering/msc-robotics','https://www.gs.cuhk.edu.hk/admissions/application-deadline'];
const sourceIds=['cuhk_robotics_programme_20261007','cuhk_robotics_deadlines_20261007'];
const catalog=data(paths[0]),projects=data(paths[1]),materials=data(paths[2]);
const oldCatalog=JSON.parse(cuhkDeadlineBytes(paths[0],read(paths[0]))),oldProjects=JSON.parse(cuhkDeadlineBytes(paths[1],read(paths[1]))),oldMaterials=JSON.parse(cuhkDeadlineBytes(paths[2],read(paths[2])));
const allowed={
 'data/catalog.json':[['routes',8,'admissionYear'],['routes',8,'cycle2027Verified'],['routes',8,'sources',1],['routes',8,'sources',2],['routes',8,'cycleReview'],['deadlines',27],['sources',212],['sources',213]],
 'data/project-summaries.json':[['sources',70],['sources',71],['records',12,'cycle','text'],['records',12,'cycle','sourceIds',0],['records',12,'cycle','sourceIds',1],['records',12,'cycleReview']],
 'data/material-summaries.json':[['sources',49],['sources',50],['records',3,'summary'],['records',3,'note'],['records',3,'admissionYear'],['records',3,'unknowns',0],['records',3,'requirements',5,'text'],['records',3,'requirements',5,'requirementStatus'],['records',3,'requirements',5,'sourceIds',0],['records',3,'requirements',5,'sourceIds',1],['records',3,'sourceIds',3],['records',3,'sourceIds',4],['records',3,'cycleReview']]
};

test('CUHK correction pins PR17 provenance and a narrow reviewed field allowlist',()=>{
 assert.equal(f.baseCommit,'eb4abd2639ea97a99ccb870c165fa1f97b952652');assert.equal(f.contentCommit,'a188f2a06d7621b1a004787238d90d183a9e3425');assert.equal(f.baseTree,'d1515c606544c3cc0e66ef9ddc1f7cc2d73af791');
 assert.deepEqual(Object.keys(f.files),paths);assert.equal(f.checkedDate,'2026-10-07');assert.deepEqual(f.sourceEvidence.map(s=>s.url),sourceUrls);
 for(const s of f.sourceEvidence){assert.equal(s.deadline,'2027-03-31');assert.equal(s.deadlineTime,null);assert.equal(s.timezone,null);}
 for(const [p,expected]of Object.entries(allowed)){assert.equal(f.files[p].kind,'json');assert.deepEqual(f.files[p].operations.map(o=>o.path),expected);}
 assert.equal(catalog.routes[8].id,'cuhk_robotics_msc');assert.equal(projects.records[12].routeId,'cuhk_robotics_msc');assert.equal(materials.records[3].id,'cuhk-robotics-msc-materials');
 for(const sha of Object.values(f.inputSha256))assert.match(sha,/^[a-f0-9]{64}$/);
});

test('CUHK raw current bytes round trip exactly to independently pinned PR17 files',()=>{
 const beforeHashes={
 'data/catalog.json':'55803258de42f4bcb42950fb9f0019ad6a5d9a63a4cf7b86795c60d7ae9e97db',
 'data/project-summaries.json':'8c0004f515919965b94eb0c82ddfd875f2aaaaba805c51e1060b62320eba164d',
 'data/material-summaries.json':'9d27adfd4472e2c5f7bd37e61968fb550929f74c5e1083b52721410dea70f361',
 'assets/app.js':'84c14b37326919b4fd0b071b9837f44239a612b316f21df9ac2d58e98042974f',
 'index.html':'a07ff43f3395d111e62183d4837eef28eaf64525e882cfa9e47c8b20a22105ef'};
 for(const p of paths){const raw=read(p),old=cuhkDeadlineBytes(p,raw),e=f.files[p];assertCurrentCuhkDeadlineFile(p,raw);assert.equal(e.beforeSha256,beforeHashes[p]);assert.equal(hash(old),beforeHashes[p]);assert.equal(git(old),e.beforeGitBlob);assert.equal(git(raw),e.afterGitBlob);assert.deepEqual(cuhkDeadlineBytes(p,old,'forward'),raw);assert.strictEqual(cuhkDeadlineBytes(p,old),old);assert.strictEqual(cuhkDeadlineBytes(p,raw,'forward'),raw);assert.throws(()=>assertCurrentCuhkDeadlineFile(p,old),/unreviewed/);}
});

test('CUHK update preserves all advisors, original routes, source records, dates and older source rows',()=>{
 assert.deepEqual(catalog.advisors,oldCatalog.advisors);assert.equal(catalog.advisors.length,334);assert.equal(catalog.routes.length,65);
 assert.deepEqual(catalog.routes.map(r=>r.sourceRecord??null),oldCatalog.routes.map(r=>r.sourceRecord??null));
 assert.deepEqual(catalog.routes.filter((_,i)=>i!==8),oldCatalog.routes.filter((_,i)=>i!==8));assert.deepEqual(catalog.deadlines.slice(0,27),oldCatalog.deadlines);assert.equal(catalog.deadlines.length,28);
 assert.deepEqual(catalog.sources.slice(0,212),oldCatalog.sources);assert.equal(catalog.sources.length,214);
 for(const key of Object.keys(oldCatalog))if(!['routes','deadlines','sources'].includes(key))assert.deepEqual(catalog[key],oldCatalog[key]);
 const changed=new Set(['admissionYear','cycle2027Verified','sources','cycleReview']);for(const key of Object.keys(oldCatalog.routes[8]))if(!changed.has(key))assert.deepEqual(catalog.routes[8][key],oldCatalog.routes[8][key]);
 assert.deepEqual(catalog.routes[8].sources.slice(0,1),oldCatalog.routes[8].sources);assert.equal(catalog.routes[8].checkedDate,'2026-10-01');
 const review=catalog.routes[8].cycleReview;assert.equal(review.previousAdmissionYear,oldCatalog.routes[8].admissionYear);assert.equal(review.previousCycle2027Verified,oldCatalog.routes[8].cycle2027Verified);assert.equal(review.previousCheckedDate,oldCatalog.routes[8].checkedDate);
});

test('CUHK deadline remains date-only with unknown submission and no new advisor or vacancy claims',()=>{
 const route=catalog.routes[8],deadline=catalog.deadlines[27];assert.equal(deadline.id,'cuhk-robotics-msc-2027-deadline');assert.deepEqual(deadline.routeIds,[route.id]);assert.equal(deadline.date,'2027-03-31');assert.equal(deadline.deadlineTime,null);assert.equal(deadline.timezone,null);assert.equal(deadline.status,'unknown');assert.equal(route.applicationStatus,'unknown');assert.equal(route.cycle2027Verified,true);
 assert.match(deadline.note,/滚动录取/);assert.match(deadline.note,/满额即止/);assert.match(deadline.note,/未登录/);assert.match(deadline.note,/不推定剩余名额/);
 for(const row of [route,deadline])for(const field of ['confirmedVacancy','remainingHeadcountVerified','individualRecruitmentVerified'])assert.equal(row[field],undefined);
 assert.deepEqual(buildOpportunities(catalog).map(o=>o.id),buildOpportunities(oldCatalog).map(o=>o.id));assert.equal(buildOpportunities(catalog).length,57);assert.equal(browseAdvisors(catalog).length,334);assert.equal(browseRoutes(catalog).length,65);
 assert(filterDeadlines(catalog,{institution:'CUHK'}).some(d=>d.id===deadline.id));
});

test('CUHK new evidence is consistent across catalog, project and material source references',()=>{
 for(const list of [catalog.sources,projects.sources,materials.sources]){const added=list.slice(-2);assert.deepEqual(added.map(s=>s.id),sourceIds);assert.deepEqual(added.map(s=>s.url),sourceUrls);for(const s of added)assert.equal(s.checkedDate,'2026-10-07');}
 for(const list of [catalog.routes[8].sources.slice(-2),catalog.deadlines[27].sources,catalog.routes[8].cycleReview.sources]){assert.deepEqual(list.map(s=>s.id),sourceIds);assert.deepEqual(list.map(s=>s.url),sourceUrls);}
 assert.deepEqual(projects.records[12].cycle.sourceIds,sourceIds);assert.deepEqual(materials.records[3].requirements[5].sourceIds,sourceIds);
 assert.equal(projects.records[12].checkedDate,'2026-10-02');assert.equal(materials.records[3].checkedDate,'2026-10-01');assert.match(projects.records[12].cycle.text,/2026\/27/);assert.match(projects.records[12].cycle.text,/不自动升级为2027\/28/);
});

test('CUHK project and material updates retain all unrelated records and original academic requirements',()=>{
 assert.deepEqual(projects.records.filter((_,i)=>i!==12),oldProjects.records.filter((_,i)=>i!==12));assert.deepEqual(materials.records.filter((_,i)=>i!==3),oldMaterials.records.filter((_,i)=>i!==3));
 assert.deepEqual(projects.sources.slice(0,70),oldProjects.sources);assert.deepEqual(materials.sources.slice(0,49),oldMaterials.sources);
 for(const k of Object.keys(oldProjects.records[12]))if(k!=='cycle')assert.deepEqual(projects.records[12][k],oldProjects.records[12][k]);assert.deepEqual(projects.records[12].cycleReview.previous,oldProjects.records[12].cycle);
 const m=materials.records[3],old=oldMaterials.records[3];assert.deepEqual(m.requirements.slice(0,5),old.requirements.slice(0,5));assert.deepEqual(m.sourceIds.slice(0,3),old.sourceIds);assert.equal(m.requirements[5].kind,'deadline');assert.equal(m.requirements[5].requirementStatus,'published');
 for(const key of ['summary','note','admissionYear','unknowns'])assert.deepEqual(m.cycleReview.previous[key],old[key]);assert.deepEqual(m.cycleReview.previous.deadlineRequirement,old.requirements[5]);
 for(const key of Object.keys(old))if(!['summary','note','admissionYear','unknowns','requirements','sourceIds'].includes(key))assert.deepEqual(m[key],old[key]);
});

test('CUHK raw current normalizers and rendered details retain date and evidence boundaries',()=>{
 const summaries=normalizeProjectSummaries(projects,catalog),supplement=normalizeMaterialSupplement(materials,catalog);assert.equal(summaries.size,30);assert.equal(supplement.length,15);
 const joined={...catalog,projectSummaries:summaries},project=renderRecordSummary('project',catalog.routes[8],joined).html,material=renderRecordSummary('material',supplement.find(r=>r.id==='cuhk-robotics-msc-materials'),joined).html,deadline=renderRecordSummary('deadline',catalog.deadlines[27],joined).html;
 for(const html of [project,material,deadline]){assert(html.includes('2027-03-31'));for(const url of sourceUrls)assert(html.includes(url));assert(!html.includes('[object Object]'));}
 assert(project.includes('2026/27'));assert(material.includes('仍待核实'));assert(deadline.includes('未标钟点或时区'));
});

test('CUHK release changes only four cache-version fragments and retains the PR17 focus logic exactly',()=>{
 for(const [p,names]of [['assets/app.js',['catalog.json','project-summaries.json','material-summaries.json']],['index.html',['./assets/app.js']]]){
  const entry=f.files[p],raw=read(p),old=cuhkDeadlineBytes(p,raw);assert.equal(entry.kind,'text_fragments');assert.equal(entry.operations.length,names.length);assertCurrentDetailReturnAsset(p,old);assert.notDeepEqual(detailReturnBytes(p,old),old);
  entry.operations.forEach((op,i)=>{for(const key of ['before','after']){assert(op[key].startsWith(names[i]+'?v='));assert.match(op[key].slice(names[i].length+3),/^[a-f0-9]{12}$/);}assert.notEqual(op.before,op.after);});
 }
 assertCurrentPublicAudit('data/catalog.json',cuhkDeadlineBytes('data/catalog.json',read('data/catalog.json')));
});

test('CUHK exact gate rejects whitespace, corruption, every partial field rollback and every partial asset rollback',()=>{
 for(const p of paths){const raw=read(p),entry=f.files[p];const mutants=[Buffer.concat([raw,Buffer.from(' ')])];
  if(entry.kind==='json')for(const op of entry.operations){const d=JSON.parse(raw);let parent=d;for(const k of op.path.slice(0,-1))parent=parent[k];const k=op.path.at(-1);if(op.beforeMissing){if(Array.isArray(parent))parent.splice(k,1);else delete parent[k];}else parent[k]=structuredClone(op.before);mutants.push(Buffer.from(serialize(d)));}
  else for(const op of entry.operations)mutants.push(Buffer.from(String(raw).replace(op.after,()=>op.before)));
  for(const changed of mutants){assert.throws(()=>assertCurrentCuhkDeadlineFile(p,changed),/unreviewed/);assert.strictEqual(cuhkDeadlineBytes(p,changed),changed);if(hash(changed)===entry.beforeSha256)assert.deepEqual(cuhkDeadlineBytes(p,changed,'forward'),raw,'a full known rollback can replay forward but is never accepted as current');else assert.strictEqual(cuhkDeadlineBytes(p,changed,'forward'),changed);}
  const changedOld=Buffer.concat([cuhkDeadlineBytes(p,raw),Buffer.from(' ')]);assert.strictEqual(cuhkDeadlineBytes(p,changedOld,'forward'),changedOld);
 }
});

test('CUHK inverse cannot hide forged current facts or tampered historical records',()=>{
 const cases=[
 ['data/catalog.json',d=>d.advisors[0].sentinel='tampered'],['data/catalog.json',d=>d.advisors.at(-1).sentinel='tampered'],['data/catalog.json',d=>d.routes[8].sourceRecord.intake_2027='forged'],['data/catalog.json',d=>d.routes[9].checkedDate='2026-10-07'],['data/catalog.json',d=>d.deadlines[0].date='2099-01-01'],['data/catalog.json',d=>d.deadlines[27].timezone='Asia/Hong_Kong'],['data/catalog.json',d=>d.deadlines[27].deadlineTime='23:59'],['data/catalog.json',d=>d.deadlines[27].status='open'],['data/catalog.json',d=>d.deadlines.push({...d.deadlines[27]})],['data/catalog.json',d=>d.routes[8].sources[1].url='https://example.org/forged'],
 ['data/project-summaries.json',d=>d.records[12].training.text='forged 2027/28 curriculum'],['data/project-summaries.json',d=>d.records[0].checkedDate='2026-10-07'],['data/project-summaries.json',d=>d.sources.reverse()],['data/material-summaries.json',d=>d.records[3].requirements[0].text='unreviewed requirement'],['data/material-summaries.json',d=>d.records[3].cycleReview.previous.summary='rewritten history'],['data/material-summaries.json',d=>d.sources.push({...d.sources.at(-1)})]];
 for(const [p,mutate]of cases){const d=data(p);mutate(d);const raw=Buffer.from(serialize(d));assert.throws(()=>assertCurrentCuhkDeadlineFile(p,raw),/unreviewed/);assert.strictEqual(cuhkDeadlineBytes(p,raw),raw);}
 const logic=Buffer.from(String(read('assets/app.js')).replace('restoreDetailOpener(route.view);',''));assert.throws(()=>assertCurrentCuhkDeadlineFile('assets/app.js',logic),/unreviewed/);assert.strictEqual(cuhkDeadlineBytes('assets/app.js',logic),logic);assert.throws(()=>assertCurrentDetailReturnAsset('assets/app.js',cuhkDeadlineBytes('assets/app.js',logic)),/unreviewed/);
});

test('CUHK projection cannot reinterpret unknown files, lone fragments or invalid directions',()=>{
 for(const p of ['data/ra-positions.json','assets/core.js','assets/style.css','data/application-experiences.json']){const raw=read(p);for(const direction of ['reverse','forward'])assert.strictEqual(cuhkDeadlineBytes(p,raw,direction),raw);assert.throws(()=>assertCurrentCuhkDeadlineFile(p,raw),/outside/);}
 for(const p of ['assets/app.js','index.html']){const raw=Buffer.from(f.files[p].operations[0].after);assert.strictEqual(cuhkDeadlineBytes(p,raw),raw);assert.throws(()=>assertCurrentCuhkDeadlineFile(p,raw),/unreviewed/);}
 assert.throws(()=>cuhkDeadlineBytes(paths[0],read(paths[0]),'invalid'));
});

test('CUHK raw current manifest verifies actual counts and bytes with no fabricated release or browser claims',()=>{
 const manifest=data('release-manifest.json'),counts=JSON.parse(execFileSync(process.execPath,['scripts/public-counts.mjs'],{cwd:fileURLToPath(root),encoding:'utf8'}));
 for(const [key,value]of Object.entries(counts))assert.equal(manifest[key],value,key);assert.equal(counts.projectSummarySources,72);assert.equal(counts.materialSupplementSources,51);assert.equal(counts.projectSummaryRecords,30);assert.equal(counts.materialSupplementRecords,15);assert.equal(counts.opportunityCount,59);assert.equal(counts.verifiedDegreeAssociationCount,57);
 for(const row of manifest.allowedFiles){const raw=rawRead(row.path);assert.equal(raw.length,row.bytes,row.path);assert.equal(hash(raw),row.sha256,row.path);}
 assert.equal(manifest.browserVisualQA,'Not yet browser-verified.');assert.equal(manifest.firstRunVerified,false);assert(!Object.hasOwn(manifest,'nodeTestsPassed'));
 for(const p of ['tests/cuhk-deadline-20261007-baseline.mjs','tests/cuhk-deadline-20261007.test.mjs','tests/fixtures/history/reviewed-cuhk-deadline-20261007.json'])assert(manifest.allowedFiles.some(r=>r.path===p));
});
