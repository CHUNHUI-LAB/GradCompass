import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {hkuRisBaseline,risRouteId,risSourceIds} from './hku-ris-baseline.mjs';
import {filterRoutes,buildOpportunities,filterDeadlines,deadlineStatus} from '../assets/core.js';
import {normalizeProjectSummaries,renderRecordSummary,filterProjectRoutes} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const c=read('data/catalog.json'),p=read('data/project-summaries.json'),m=read('data/material-summaries.json');
const route=c.routes.find(r=>r.id===risRouteId),brief=p.records.find(r=>r.routeId===risRouteId),material=m.records.find(r=>r.id==='hku-ris-msc-materials');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const expected={
  "data/catalog.json": "dcee77a0ab0f290ab8f051a895eb96dd6bc108e883ad44f067fd93c5a0ab6738",
  "data/project-summaries.json": "a41975a878a610be8e19dd7ac416c433677b88c4d7d2237a6d9f90cc949c3a94",
  "data/material-summaries.json": "d18a6017fad6c3d0a072c0a0fc4aa2bb4cfc339623afc8a570bf516a40a86fe9",
  "data/advisor-profiles.json": "1550cecabe989c7f857fb65347486e5f7abe85fa140a92514892f1d2de42a2a8",
  "data/application-experiences.json": "3e46c7e8eea013844c7e3ccf3430e0a9dd2518bd75bb0c1c7c21b4077db9cb07",
  "data/application-experience-provenance.json": "857bd7ea00767b6d115cf79e14ddb3900bc79965ad49d419ba16c1457422cfe9",
  "data/ra-positions.json": "b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e",
  "data/update-status.json": "b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5",
  "data/catalog-test-manifest.json": "d7824ea7a17eef0af78577dd57daae941befb9af02e68adf9ce7abe9d54fa9a7",
  "assets/style.css": "8bdf5b250a9e88e4aaf8f311f6c79520cd2b81b1702a702333ce931ee651f98a",
  "assets/core.js": "cad4681d907cdf380dad2b1ab4c9b42ee33829e11fafeb73b9ad0b072975a927",
  "assets/page-overviews.js": "c6e5b5f7a794ef28e576e22d7a381a194548f4830b2fda5195ed384f0d726eba",
  "assets/record-summaries.js": "5597dac07f8a420aef7d477c1a36cdd2611f74a2e3fef68e3e2a8b6ebcede5d9",
  "assets/material-supplement.js": "44c8f5821e4c828503b6efefc6cd6a75f560c2de0067f855531337c025511d03",
  "assets/project-comparison.js": "007137a737d75065c7a574727c776a4069db2ef8b860f95cfac933fc78c80a3c",
  "data/sustech-advisor-review-20261004.json": "ec5204975321dc31f04e808dd37be88d510ac747bb62790af811ee209bbd14b9"
};
function assertBaseline(files){for(const [f,h]of Object.entries(expected)){
 let bytes=files[f];if(['data/catalog.json','data/project-summaries.json','data/material-summaries.json'].includes(f))bytes=JSON.stringify(hkuRisBaseline(JSON.parse(bytes)),null,2)+'\n';
 if(f==='assets/page-overviews.js')bytes=String(bytes).replace("title:'MSc 侧重授课培养'","title:'两个 MSc 侧重授课培养'").replace("已收录 ${count(routes,r=>r.degree==='MSc')} 个 MSc。","已收录的 ${count(routes,r=>r.degree==='MSc')} 个 MSc 是 CUHK Robotics 与 PolyU Intelligent Robotics Engineering。");
 assert.equal(hash(bytes),h,'Exact remote 91af79d3 baseline: '+f);
}}
const allBytes=()=>Object.fromEntries(Object.keys(expected).map(f=>[f,fs.readFileSync(new URL('../'+f,import.meta.url))]));
function assertRis(r){
 assert.equal(r.institution,'HKU');assert.equal(r.degree,'MSc');assert.equal(r.degreeVariant,'MSc(Eng)');assert.equal(r.status,'verified');
 assert.equal(r.bachelorEligible,true);assert.equal(r.noMasterRequired,true);assert.equal(r.noTuimianRequired,true);
 assert.equal(r.applicationStatus,'unknown');assert.equal(r.admissionYear,'2027/28');assert.equal(r.cycle2027Verified,true);
 assert.match(r.eligibilitySummary,/工程或相关领域本科/);assert.match(r.eligibilitySummary,/不代表所有专业/);assert.match(r.supervisorAssociation,/未将任何已收录导师绑定/);
}
test('RIS batch appends exactly one default project and leaves 41 advisors and 59 opportunities',()=>{
 assertRis(route);assert.equal(filterRoutes(c).length,28);assert.equal(c.routes.length,34);assert.equal(p.records.length,28);assert.equal(m.records.length,13);
 const opportunities=buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions});assert.equal(opportunities.length,59);assert.equal(new Set(opportunities.map(o=>o.advisorId)).size,41);
 assert(c.advisors.every(a=>!a.routeIds.includes(risRouteId)));assert.equal(c.routes.filter(r=>r.id===risRouteId).length,1);
});
test('RIS has two year-specific noon Hong Kong deadlines without deriving open status',()=>{
 const dates=filterDeadlines(c).filter(d=>d.routeIds.includes(risRouteId));assert.equal(dates.length,2);
 assert.deepEqual(dates.map(d=>d.date).sort(),['2027-01-04','2027-04-09']);
 for(const d of dates){assert.equal(d.deadlineTime,'12:00');assert.equal(d.timezone,'Asia/Hong_Kong');assert.equal(d.status,'unknown');assert.equal(deadlineStatus(d),'unknown');assert.equal(d.admissionYear,'2027/28');assert.match(d.note,/预计10月上旬.*可能延迟/);assert.match(d.note,/未确认提交入口开放/);}
 assert.equal(c.deadlines.length,21);
});
test('RIS source IDs and successful reading windows are explicit while old dates remain untouched',()=>{
 for(const data of [c,p,m])for(const id of risSourceIds){const s=data.sources.find(x=>x.id===id);assert(s);assert.equal(s.checkedDate,'2026-10-04');assert.equal(s.readWindowUtc,'2026-10-04T06:28:00Z/2026-10-04T06:34:30Z');assert(new URL(s.url).hostname.endsWith('hku.hk'));}
 assert.equal(route.checkedDate,'2026-10-04');assert.equal(brief.checkedDate,'2026-10-04');assert.equal(material.checkedDate,'2026-10-04');assert.equal(c.metadata.checkedDate,'2026-10-01');assert.equal(p.checkedDate,'2026-10-02');assert.equal(m.checkedDate,'2026-10-01');
});
test('RIS material group separates taught requirements, non-English conditions and unconfirmed programme files',()=>{
 const mat=normalizeMaterialSupplement(m,c).find(x=>x.id===material.id);assert(mat);assert.deepEqual(mat.routeIds,[risRouteId]);assert.equal(mat.degree,'MSc');
 const language=mat.requirements.find(r=>r.kind==='language');assert.equal(language.requirementStatus,'conditional');assert.match(language.text,/6.0.*5.5.*80.*4.5/);assert.match(language.text,/9月1日前两年/);
 assert(mat.scopeNotes.some(x=>x.includes('申请日前两年')));assert(mat.unknowns.some(x=>x.includes('2027/28')&&x.includes('未标周期')));
 const docs=mat.requirements.find(r=>r.kind==='cvPersonalStatement');assert.equal(docs.requirementStatus,'unknown');assert.match(docs.text,/推荐信数量尚未核实/);
 assert(!mat.requirements.some(r=>r.kind==='references'&&r.requirementStatus==='required'));
});
test('RIS project and material details render before official sources with exact degree and campus joins',()=>{
 const summaries=normalizeProjectSummaries(p,c);assert.equal(summaries.size,28);const joined={...c,projectSummaries:summaries};
 const html=renderRecordSummary('project',route,joined).html;
 for(const f of [brief.overview,brief.training,brief.bachelorEntry,brief.cycle,...brief.cautions]){assert(html.includes(f.text));assert(html.indexOf(f.text)<html.indexOf('打开官网'));}
 assert(html.includes('MSc(Eng)'));assert(html.includes('准备材料'));assert(!html.includes('[object Object]'));
 const mh=renderRecordSummary('material',normalizeMaterialSupplement(m,c).find(x=>x.id===material.id),c).html;assert(mh.includes('2027/28'));assert(mh.includes('尚未确认'));
});
test('RIS can be searched without leaking into research degrees or advisor opportunities',()=>{
 const joined={...c,projectSummaries:normalizeProjectSummaries(p,c)};
 assert.deepEqual(filterProjectRoutes(joined,{query:'72学分'}).map(r=>r.id),[risRouteId]);
 for(const degree of ['MPhil','PhD','RA'])assert.equal(filterProjectRoutes(joined,{query:'72学分',opportunityType:degree}).length,0);
 assert.equal(filterProjectRoutes(joined,{query:'72学分',institution:'HKUST'}).length,0);
});
test('RIS inverse restores every entire current remote baseline file including all concurrent advisors',()=>assertBaseline(allBytes()));
test('RIS inverse is read-only, idempotent and preserves unrelated future records',()=>{
 for(const data of [c,p,m]){const before=JSON.stringify(data);const old=hkuRisBaseline(data);assert.deepEqual(hkuRisBaseline(old),old);assert.equal(JSON.stringify(data),before);}
 const extra={id:'future-unreviewed',sentinel:true};assert.deepEqual(hkuRisBaseline({...c,routes:[...c.routes,extra]}).routes.at(-1),extra);
 assert.deepEqual(hkuRisBaseline({...m,records:[...m.records,extra]}).records.at(-1),extra);
});
test('negative controls detect edits to old records, hidden extra routes and altered RIS eligibility or open state',()=>{
 for(const mutate of [x=>x.advisors[0].name+=' changed',x=>x.routes[0].checkedDate='2026-10-04',x=>x.routes.push({id:'unexpected'})]){const files=allBytes(),x=structuredClone(c);mutate(x);files['data/catalog.json']=JSON.stringify(x,null,2)+'\n';assert.throws(()=>assertBaseline(files));}
 for(const patch of [{applicationStatus:'open'},{degree:'MPhil'},{noMasterRequired:false},{eligibilitySummary:'所有本科均可申请'}])assert.throws(()=>assertRis({...route,...patch}));
});
test('maintenance report discloses incomplete reads, old portal and limited social comments without promoting them to rules',()=>{
 const report=read('data/maintenance-2026-10-04.json');assert.equal(report.baseCommit,'91af79d313c3d0bd7f3bfd5a4e306a3af596ccaf');assert(report.observations.length>=13);
 assert(report.publicExperienceSearch.reads.some(x=>x.readScope.includes('More replies')));assert(report.publicExperienceSearch.reads.some(x=>x.readScope.includes('未返回回复正文')));assert(report.hkuRisSourceBoundary.finding.includes('2026'));
 const status=read('data/update-status.json');assert.equal(status.firstRunVerified,false);assert.equal(status.lastSuccessfulCheck,null);
});
