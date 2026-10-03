import {maintenanceBaseline} from './maintenance-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeProjectSummaries,renderRecordSummary,filterProjectRoutes} from '../assets/record-summaries.js';
import {isVerifiedRoute} from '../assets/core.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../data/'+n,import.meta.url),'utf8'));
const raw=read('project-summaries.json'),catalog=read('catalog.json');
const summaries=normalizeProjectSummaries(raw,catalog),joined={...catalog,projectSummaries:summaries};
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const added=['hkbu_cs_rpg-mphil','hkbu_cs_rpg-phd','westlake-ai-phd','westlake-ee-phd','cuhksz-ai-mphil','cuhksz-ai-phd','hkust-gz-rbm','hkust-gz-roas-phd','hkust-gz-ai-phd','hkust-gz-intr-phd'];
test('final ten additions preserve all seventeen prior records and thirty-five sources exactly',()=>{
 assert.equal(hash(maintenanceBaseline(raw).records.slice(0,17)),'69df1001690d5c2b990fc3be7b3f65cf81439ecd5a8f6182e98c9e16609dc2d6');
 assert.equal(hash(raw.sources.slice(0,35)),'166c50d602945e794c519cfe4332c44fc032d29cde80d5e97b25e974d27d16e5');
 assert.deepEqual(raw.records.slice(17).map(r=>r.routeId),added);assert.equal(raw.records.length,27);assert.equal(raw.sources.length,62);assert.equal(new Set(raw.sources.map(s=>s.url)).size,61);
});
test('all twenty-seven verified default projects now have rich introductions with exact campus and degree joins',()=>{
 assert.deepEqual([...summaries.keys()].sort(),catalog.routes.filter(isVerifiedRoute).map(r=>r.id).sort());
 for(const id of added){const r=catalog.routes.find(x=>x.id===id),b=summaries.get(id);assert.equal(b.institution,r.institution);assert.equal(b.degree,r.degree);assert.notEqual(b.overview.text,b.bachelorEntry.text);assert.notEqual(b.training.text,b.bachelorEntry.text);}
});
test('all final-ten claims are rendered before source links and source versions disclose limited or historical reads',()=>{
 for(const id of added){const r=catalog.routes.find(x=>x.id===id),b=summaries.get(id),html=renderRecordSummary('project',r,joined).html;
 for(const f of [b.overview,b.training,b.bachelorEntry,b.cycle,...b.cautions]){assert(f.sourceIds.length);assert(html.includes(f.text));assert(html.indexOf(f.text)<html.indexOf('打开官网'));for(const id of f.sourceIds){const s=raw.sources.find(s=>s.id===id);assert(s);assert(s.sourceVersion);}}
 }
});
test('HKBU keeps current four-year PhD and historical three-year programme distinct',()=>{
 assert.match(summaries.get('hkbu_cs_rpg-mphil').training.text,/24个月.*12学分.*论文.*口试/);
 const p=summaries.get('hkbu_cs_rpg-phd');assert.match(p.training.text,/48个月.*22学分.*2018\/19/);assert.match(p.bachelorEntry.text,/研究成果或经验.*MPhil.*评估/);
 assert.match(p.cycle.text,/2026-12-01.*2027-04-15.*2026-08-15/);
});
test('Westlake AI and EE offer differentiated research content and keep the closed September batch explicit',()=>{
 const a=summaries.get('westlake-ai-phd'),e=summaries.get('westlake-ee-phd');assert.match(a.overview.text,/机器人学习.*计算机视觉/);assert.match(e.overview.text,/集成电路.*微电子.*微波/);assert.notEqual(a.overview.text,e.overview.text);
 for(const b of [a,e]){assert.match(b.training.text,/5年/);assert.match(b.cycle.text,/2026-08-31.*10:00.*北京时间/);assert.match(b.cycle.text,/已过|截止/);assert.match(b.training.text,/2027.*另查|2027.*尚未/);}
});
test('CUHK Shenzhen MPhil and PhD retain different coursework, supervisor and funding boundaries',()=>{
 const m=summaries.get('cuhksz-ai-mphil'),p=summaries.get('cuhksz-ai-phd');assert.match(m.training.text,/18学分.*6学分.*答辩/);assert.match(p.training.text,/主导师必须.*27学分.*6学分/);assert.match(m.cautions[0].text,/主要面向优秀博士.*不能按博士资助/);assert.match(p.cautions[0].text,/仅收MPhil.*校外成员.*主导师资格/);
 const source=raw.sources.find(s=>s.id==='cuhksz_ai_programme');assert.match(source.retrievalConflict.liveVerification,/Resolved.*31 October 2026.*31 May 2027/);assert.match(source.retrievalConflict.exaFullTextObservation,/30 June 2026/);
});
test('Red Bird retains project learning, individual thesis and its own dated application rather than doctoral deadline',()=>{
 const b=summaries.get('hkust-gz-rbm');assert.match(b.overview.text,/项目导师.*学术导师.*产业顾问/);assert.match(b.training.text,/15.*个人论文.*答辩/);assert.match(b.cycle.text,/2027-03-01 23:59.*2028 Fall.*时区.*不能套用/);assert.match(b.bachelorEntry.text,/MPhil \(General\).*无需预先联系/);
});
test('Guangzhou PhD profiles distinguish the 2026/27 curriculum from the 2027/28 intake and applicant-specific dates',()=>{
 for(const id of ['hkust-gz-roas-phd','hkust-gz-ai-phd','hkust-gz-intr-phd']){const b=summaries.get(id);assert.match(b.training.text,/2026\/27.*21 学分/);assert.match(b.cycle.text,/2027\/28 Fall.*2026-07-21.*国际申请人 2027-06-15.*中国申请人 2027-07-15.*23:59.*GMT\+8/);assert.match(b.cycle.text,/不证明具体导师/);}
 assert.match(summaries.get('hkust-gz-ai-phd').training.text,/B\+/);assert.match(summaries.get('hkust-gz-intr-phd').training.text,/INTR 6800/);
});
test('new research content is searchable without weakening degree and campus filters',()=>{
 assert.deepEqual(filterProjectRoutes(joined,{query:'多模式运输'}).map(r=>r.id),[]);
 assert.deepEqual(filterProjectRoutes(joined,{query:'自动化港口物流'}).map(r=>r.id),['hkust-gz-intr-phd']);
 assert.equal(filterProjectRoutes(joined,{query:'自动化港口物流',institution:'HKUST'}).length,0);
 assert.deepEqual(filterProjectRoutes(joined,{query:'产业实践双重培养',opportunityType:'MPhil'}).map(r=>r.id),['cuhksz-ai-mphil']);
 assert.equal(filterProjectRoutes(joined,{query:'产业实践双重培养',opportunityType:'PhD'}).length,0);
});
