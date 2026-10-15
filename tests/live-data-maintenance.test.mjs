import {reverseBoundedMaintenanceReviews} from './evidence-reviews.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {publishedBytes,publishedPaths} from './published-history-fs.mjs';
import {assertReviewedPublicData,reviewedPublicData} from './reviewed-public-data.mjs';
import {normalizeProjectSummaries,renderRecordSummary} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {buildOpportunities} from '../assets/core.js';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
const readData=()=>Object.fromEntries(fs.readdirSync(new URL('data/',root)).filter(p=>p.endsWith('.json')).sort().map(p=>['data/'+p,JSON.parse(read('data/'+p))]));
const actual=readData(),catalog=actual['data/catalog.json'],projects=actual['data/project-summaries.json'],materials=actual['data/material-summaries.json'];
const oldCatalog=JSON.parse(publishedBytes('data/catalog.json'));
const polyIds=['polyu_aae_rpg-mphil','polyu_aae_rpg-phd','polyu_ise_rpg-mphil','polyu_ise_rpg-phd'];
const dates=[['jan','2026-09-30','2026/27 January 2027'],['may','2027-01-31','2026/27 May 2027'],['sep','2027-05-31','2027/28 September 2027']];
test('live public data matches reviewed semantic facts rather than a full-file byte hash',()=>{
 assertReviewedPublicData(actual,read);
 const formatted=Object.fromEntries(Object.entries(actual).map(([p,d])=>[p,JSON.parse(JSON.stringify(d,null,4)+'\n\n')]));assertReviewedPublicData(formatted,read);
 assert.notDeepEqual(read('data/catalog.json'),publishedBytes('data/catalog.json'),'a real data maintenance pass may differ from the historical release');
});
// Reverse exact MRL replacements, homepage additions and appointment reviews; retain
// full-object comparisons so unreviewed changes remain visible to the guard.
const recruitmentReview=JSON.parse(read('tests/fixtures/evidence/maintenance-20261009.json'));
function assertRetainedRecruitmentHistory(data,readReview=read){
 const restored=reverseBoundedMaintenanceReviews(data,readReview);
 assert.deepEqual(restored['data/catalog.json'].advisors,oldCatalog.advisors);
 assert.deepEqual(restored['data/advisor-profiles.json'],JSON.parse(publishedBytes('data/advisor-profiles.json')));
 return restored;
}
test('live maintenance retains all collaborators, historical source records, old deadlines and opportunities',()=>{
 assertRetainedRecruitmentHistory(actual);assert.deepEqual(catalog.routes.map(r=>r.sourceRecord??null),oldCatalog.routes.map(r=>r.sourceRecord??null));
 assert.deepEqual(catalog.deadlines.slice(0,oldCatalog.deadlines.length),oldCatalog.deadlines);
 const ra=actual['data/ra-positions.json'].raPositions;assert.deepEqual(buildOpportunities({...catalog,raPositions:ra}),buildOpportunities({...oldCatalog,raPositions:ra}));
 for(const id of polyIds){const r=catalog.routes.find(r=>r.id===id),old=oldCatalog.routes.find(r=>r.id===id);assert.equal(r.checkedDate,old.checkedDate);assert.equal(r.cycleReview.previousAdmissionYear,old.admissionYear);assert.equal(r.cycleReview.previousCycle2027Verified,old.cycle2027Verified);assert.deepEqual(r.sources.slice(0,old.sources.length),old.sources);assert.equal(r.applicationStatus,'unknown');}
});
test('current Shen review separates closed ordinary intake from an unverified joint-programme opportunity and preserves both prior reviews',()=>{
 const advisor=catalog.advisors.find(a=>a.id==='hkust-yajing-shen'),old=oldCatalog.advisors.find(a=>a.id===advisor.id);
 assert.equal(advisor.recruitmentReview.checkedDate,'2026-10-09');
 assert.deepEqual(advisor.recruitmentReview.previousReview,old.recruitmentReview);
 for(const [key,value]of Object.entries(advisor.recruitmentReview.previous))assert.deepEqual(value,old[key]);
 assert.equal(advisor.opening,'unknown');assert.equal(advisor.fall2027OpeningVerified,false);
 assert.deepEqual(advisor.openingDetails.filter(o=>o.degree!=='PhD'),old.openingDetails.filter(o=>o.degree!=='PhD'));
 const phd=advisor.openingDetails.find(o=>o.degree==='PhD');assert.equal(phd.status,'unknown');assert.equal(phd.degreeRouteAssociated,false);
 assert.match(phd.summary,/普通/);assert.match(phd.summary,/HKUST.*SLAI/);
 const profile=actual['data/advisor-profiles.json'].profiles.find(p=>p.advisorId===advisor.id);assert.equal(profile.confirmedVacancy,false);
 assert.equal(buildOpportunities({...catalog,raPositions:actual['data/ra-positions.json'].raPositions}).some(o=>o.advisorId===advisor.id&&o.type==='PhD'),false);
});
test('recruitment history inversion rejects extra operations and unrelated advisor, source or opportunity changes',()=>{
 for(const mutate of [d=>{d['data/catalog.json'].advisors[0].opening='tampered';},d=>{d['data/catalog.json'].advisors[9].sourceRecord={forged:true};},d=>{d['data/catalog.json'].advisors[9].openingDetails[0].status='open';},d=>{d['data/catalog.json'].advisors[9].openingDetails[2].status='open';},d=>{d['data/catalog.json'].advisors[9].recruitmentReview.previousReview.checkedDate='2099-01-01';},d=>{d['data/advisor-profiles.json'].profiles[11].confirmedVacancy=true;}]){
  const data=structuredClone(actual);mutate(data);assert.throws(()=>assertRetainedRecruitmentHistory(data));
 }
 const extra=structuredClone(recruitmentReview);extra.operations.push(structuredClone(extra.operations[0]));assert.throws(()=>assertRetainedRecruitmentHistory(actual,p=>p.endsWith('maintenance-20261009.json')?Buffer.from(JSON.stringify(extra)):read(p)),/unreviewed bounded receipt/);
});
test('combined maintenance rejects unreviewed homepage links, fields, original-link edits and extra receipt operations',()=>{
 for(const mutate of [
  d=>{d['data/advisor-profiles.json'].profiles[41].links.push({label:'unreviewed 55th link',url:'https://example.org/new'});},
  d=>{d['data/advisor-profiles.json'].profiles[41].homepageReview.unreviewed='unexpected';},
  d=>{d['data/advisor-profiles.json'].profiles[41].links[0].url='https://example.org/changed-original';},
  d=>{d['data/advisor-profiles.json'].profiles[11].homepageReview={unreviewed:true};}
 ]){const data=structuredClone(actual);mutate(data);assert.throws(()=>assertRetainedRecruitmentHistory(data));}
 const path='tests/fixtures/evidence/homepages-20261010.json',extra=JSON.parse(read(path));extra.operations.push(structuredClone(extra.operations[0]));
 assert.throws(()=>assertRetainedRecruitmentHistory(actual,p=>p===path?Buffer.from(JSON.stringify(extra)):read(p)),/unreviewed bounded receipt/);
});
test('combined maintenance preserves all reviewed appointments and rejects any unreviewed appointment change',()=>{
 const profiles=actual['data/advisor-profiles.json'].profiles,shen=profiles.find(p=>p.advisorId==='hkust-yajing-shen');
 assert.equal(profiles.filter(p=>p.appointmentReview).length,334);assert.equal(shen.appointmentReview.earliestDate,'2022-09-01');
 for(const mutate of [
  d=>{d['data/advisor-profiles.json'].profiles[11].appointmentReview.earliestDate='2024-01-01';},
  d=>{d['data/advisor-profiles.json'].profiles[0].appointmentReview.unreviewed='unexpected';},
  d=>{d['data/advisor-profiles.json'].profiles[0].appointmentReview.careerContext='fabricated';},
  d=>{delete d['data/advisor-profiles.json'].profiles[333].appointmentReview;}
 ]){const data=structuredClone(actual);mutate(data);assert.throws(()=>assertRetainedRecruitmentHistory(data));}
 const path='tests/fixtures/evidence/appointments-20261010.json';
 for(const mutate of [r=>r.operations.pop(),r=>r.operations.push(structuredClone(r.operations[0])),r=>{r.operations[0].value.unreviewed=true;}]){
  const receipt=JSON.parse(read(path));mutate(receipt);
  assert.throws(()=>assertRetainedRecruitmentHistory(actual,p=>p===path?Buffer.from(JSON.stringify(receipt)):read(p)),/unreviewed bounded receipt/);
 }
});
test('live PolyU ordinary dates retain intake labels, department scope and unknown time instead of importing HKPFS times',()=>{
 for(const [season,date,year]of dates){const d=catalog.deadlines.find(x=>x.id===`polyu-aae-ise-2027-${season}-ordinary`);assert(d);assert.equal(d.date,date);assert.equal(d.admissionYear,year);assert.deepEqual(d.routeIds,polyIds);assert.equal(d.deadlineTime,null);assert.equal(d.timezone,null);assert.equal(d.status,season==='jan'?'expired':'unknown');assert.match(d.note,/HKPFS/);assert.match(d.note,/未登录/);assert.equal(d.sources.length,2);}
});
test('live historical reference summaries and conditional materials retain original year and entry restrictions',()=>{
 const summary=normalizeProjectSummaries(projects,catalog),supplement=normalizeMaterialSupplement(materials,catalog);
 assert.equal(summary.size,projects.records.length,'no silently dropped project summary');assert.equal(supplement.length,materials.records.length,'no silently dropped material group');
 for(const id of ['nju-robotics-phd-reference-2026','sjtu-ai-phd-reference-2026']){const r=projects.records.find(r=>r.routeId===id),route=catalog.routes.find(r=>r.id===id);assert.equal(r.evidenceScope,'reference');assert.equal(r.sourceCycle,'2026');assert.equal(route.individualRecruitmentVerified,false);assert.equal(route.cycle2027Verified,false);const html=renderRecordSummary('project',route,{...catalog,projectSummaries:summary,materials:[...catalog.materials,...supplement]}).html;assert(html.includes('2026'));assert(!/undefined|\[object Object\]/.test(html));}
 const nju=materials.records.find(r=>r.id==='nju-robotics-phd-materials-reference-2026');assert.match(nju.requirements.find(r=>r.kind==='language').text,/第一作者身份已在英文国际期刊发表/);assert.equal(nju.requirements.find(r=>r.kind==='researchOutputs').requirementStatus,'conditional');
 const sjtu=materials.records.find(r=>r.id==='sjtu-ai-phd-materials-reference-2026');assert.match(sjtu.requirements.find(r=>r.kind==='references').text,/推荐信系统/);assert.match(sjtu.unknowns.join(' '),/海外本科/);
});
test('live data guard rejects source loss, fabricated cycles, invented times/openings, altered advisors and unreviewed additions',()=>{
 const mutations=[
 d=>{d['data/catalog.json'].advisors[0].opening='fabricated-current-opening';},d=>{d['data/catalog.json'].advisors.at(-1).sentinel='tampered';},
 d=>{d['data/catalog.json'].routes[0].sourceRecord={forged:true};},d=>{d['data/catalog.json'].deadlines[0].date='2099-01-01';},
 d=>{d['data/catalog.json'].deadlines.at(-1).deadlineTime='23:59';},d=>{d['data/catalog.json'].deadlines.at(-1).timezone='Asia/Hong_Kong';},d=>{d['data/catalog.json'].deadlines.at(-1).admissionYear='2028 Fall';},d=>{d['data/catalog.json'].deadlines.at(-1).status='open';},
 d=>{d['data/catalog.json'].routes.find(r=>r.id===polyIds[0]).confirmedVacancy=true;},d=>{d['data/catalog.json'].routes.find(r=>r.id===polyIds[0]).cycleReview.previousCycle2027Verified=true;},
 d=>{d['data/project-summaries.json'].records.at(-1).sourceCycle='2027';},d=>{d['data/project-summaries.json'].records.at(-1).overview.sourceIds=[];},
 d=>{d['data/material-summaries.json'].records.at(-1).requirements[0].requirementStatus='optional';},d=>{d['data/material-summaries.json'].records.at(-1).sourceIds=['unreviewed'];},
 d=>{d['data/application-experiences.json'].records.at(-1).rulesImpact='official';},d=>{d['data/catalog.json'].routes.push({...d['data/catalog.json'].routes.at(-1),id:'unreviewed-addition'});},
 d=>{d['data/project-summaries.json'].sources.reverse();},d=>{d['data/catalog.json'].unreviewedRoot=true;}
 ];
 for(const mutate of mutations){const d=structuredClone(actual);mutate(d);assert.throws(()=>assertReviewedPublicData(d,read),/reviewed public facts|reviewed/);}
 assert.throws(()=>reviewedPublicData(p=>Buffer.concat([read(p),Buffer.from(' ')])),/unreviewed evidence receipt/);
});
test('live manifest hashes and derived counts follow current data while old batch metadata remains historical',()=>{
 const manifest=JSON.parse(read('release-manifest.json')),previous=JSON.parse(publishedBytes('release-manifest.json'));
 const counts=JSON.parse(execFileSync(process.execPath,['scripts/public-counts.mjs'],{cwd:fileURLToPath(root),encoding:'utf8'}));for(const [key,value]of Object.entries(counts))assert.equal(manifest[key],value,key);
 const mutable=new Set([...Object.keys(counts),'allowedFiles']);for(const [key,value]of Object.entries(previous))if(!mutable.has(key))assert.deepEqual(manifest[key],value,'past batch metadata preserved: '+key);
 for(const row of manifest.allowedFiles){const raw=read(row.path);assert.equal(raw.length,row.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),row.sha256,row.path);}
 assert(!Object.hasOwn(manifest,'nodeTestsPassed'));assert.equal(manifest.firstRunVerified,false);
});
