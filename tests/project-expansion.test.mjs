import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeProjectSummaries,renderRecordSummary,filterProjectRoutes} from '../assets/record-summaries.js';
import {isVerifiedRoute} from '../assets/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const raw=read('project-summaries.json');const catalog=read('catalog.json');const summaries=normalizeProjectSummaries(raw,catalog);const joined={...catalog,projectSummaries:summaries};
const added=['HKUST-ECE-MPhil','HKU-ECE-MPhil','HKU-MECH-MPhil','HKU-DASE-MPhil','cuhk_robotics_msc','polyu_aae_rpg-mphil','polyu_aae_rpg-phd','polyu_ire_msc','cityu_ds_phd'];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const claimText=id=>JSON.stringify(summaries.get(id));

test('expansion appends exactly nine reviewed routes and preserves the first eight introductions and nineteen sources',()=>{
 assert.equal(hash(JSON.stringify(raw.records.slice(0,8))),'1a96b206d4f4dd04ad1a97f63dc5b8eea60d7f37756a2b7d01b5631d1f6d56c6');
 assert.equal(hash(JSON.stringify(raw.sources.slice(0,19))),'a29f9f9c9e39cabcaa966838490709743f22bf617bae8bdde11b3f28a447205a');
 assert.deepEqual(raw.records.slice(8).map(r=>r.routeId),added);assert.equal(raw.records.length,17);assert.equal(new Set(raw.sources.map(s=>s.id)).size,35);assert.equal(raw.sources.length,35);
});

test('all verified default routes within the five requested schools now have introductions and no other route gains one',()=>{
 const schools=new Set(['HKU','HKUST','CUHK','CityUHK','PolyU']);
 const scoped=catalog.routes.filter(r=>schools.has(r.institution)&&isVerifiedRoute(r));
 assert.deepEqual([...summaries.keys()].sort(),scoped.map(r=>r.id).sort());assert.equal(scoped.length,17);assert.equal(catalog.routes.filter(isVerifiedRoute).length,27);
 for(const r of catalog.routes.filter(r=>!isVerifiedRoute(r)))assert(!summaries.has(r.id));
});

test('each added introduction retains exact degree and institution joins and places every sourced field before official links',()=>{
 for(const id of added){const brief=summaries.get(id);const route=catalog.routes.find(r=>r.id===id);assert.equal(brief.degree,route.degree);assert.equal(brief.institution,route.institution);const html=renderRecordSummary('project',route,joined).html;
  for(const field of [brief.overview,brief.training,brief.bachelorEntry,brief.cycle,...brief.cautions]){assert(field.sourceIds.length);assert(html.includes(field.text),id+': '+field.text);assert(html.indexOf(field.text)<html.indexOf('打开官网'));for(const ref of field.sourceIds)assert(raw.sources.some(s=>s.id===ref));}
 }
});

test('HKUST ECE MPhil keeps departmental high honors and its own 2027 non-local full-time autumn cycle',()=>{
 const b=summaries.get('HKUST-ECE-MPhil');assert.match(b.bachelorEntry.text,/学士.*high honors/);assert.match(b.training.text,/2 年.*至少 15 学分.*9 学分.*口头答辩/);assert.match(b.cycle.text,/2027\/28.*非本地全日制.*2027-06-01/);assert.match(b.cycle.text,/不能混作 MPhil 秋季截止/);
});

test('HKU added MPhil records separate current university cycle from departmental vacancies and degree-specific coursework',()=>{
 for(const id of ['HKU-ECE-MPhil','HKU-MECH-MPhil','HKU-DASE-MPhil']){const b=summaries.get(id);assert.match(b.bachelorEntry.text,/荣誉学士.*无须先取得硕士/);assert.match(b.cycle.text,/校级主轮.*2026-09-01.*2026-12-01.*23:59/);assert.match(b.cycle.text,/不证明院系或导师/);}
 assert.match(summaries.get('HKU-ECE-MPhil').training.text,/ELEC7001.*3 门 RPg.*2 门 RPg.*1 门 MSc/);assert.match(claimText('HKU-MECH-MPhil'),/2023\/24.*旧手册/);assert.match(claimText('HKU-DASE-MPhil'),/博士课程.*未据此认定.*MPhil 必修/);
});

test('CUHK Robotics MSc explicitly labels 2026/27 curriculum and preserves inconsistent 2027 deadline evidence',()=>{
 const b=summaries.get('cuhk_robotics_msc');assert.equal(b.degree,'MSc');assert.match(b.training.text,/2026\/27.*3 门必修.*5 门选修/);assert.match(b.cycle.text,/2026-04-30.*已过.*空截止栏.*2027-03-31.*仍待一致确认/);assert.match(b.cautions[0].text,/自资授课型 MSc.*不是.*MPhil/);
});

test('PolyU AAE MPhil and PhD preserve separate bachelor entry and 2027 spring versus autumn boundaries',()=>{
 const m=summaries.get('polyu_aae_rpg-mphil');const p=summaries.get('polyu_aae_rpg-phd');assert.match(m.bachelorEntry.text,/二等荣誉学士.*MPhil.*无须先取得硕士/);assert.match(p.bachelorEntry.text,/四年制 PhD.*一等荣誉学士.*三年制 PhD.*研究型硕士/);
 for(const b of [m,p]){assert.match(b.training.text,/院系建议在申请中列明导师姓名/);assert.match(b.cycle.text,/2026 年 9 月.*2027 年 1 月及 5 月.*2026-09-30.*2027-01-31/);assert.match(b.cycle.text,/尚未据此确认 2027 秋季/);}
});

test('PolyU robotics stays taught MSc across course and dissertation routes and conditional funding remains conditional',()=>{
 const b=summaries.get('polyu_ire_msc');assert.equal(b.degree,'MSc');assert.match(b.training.text,/10 门课程.*7 门课程加论文.*仍授予 MSc/);assert.match(b.cycle.text,/2027 年 9 月.*2026-10-20.*2027-02-25/);assert.match(b.cautions[0].text,/条件.*经费和名额限制.*录取不能视为已获资助/);
});

test('CityU DS has its own first-class bachelor PhD route, no MPhil, and no promoted ordinary deadline',()=>{
 const b=summaries.get('cityu_ds_phd');assert.equal(b.degree,'PhD');assert.match(b.bachelorEntry.text,/一等荣誉学士.*博士入口/);assert.match(b.training.text,/至少 2 学分.*2026\/27.*不据此确认 2027\/28/);assert.match(b.cautions[0].text,/不受理 MPhil/);assert.match(b.cycle.text,/普通非 HKPFS.*截止.*待确认/);assert(!summaries.has('cityu_ds_mphil-excluded'));
 const source=raw.sources.find(s=>s.id==='city_steps');assert(source.retrievalConflict);assert.match(source.retrievalConflict.fullTextObservation,/2026 entry/);assert.match(source.retrievalConflict.indexedObservation,/2027\/28/);assert.match(source.retrievalConflict.liveVerification,/CAPTCHA; not solved/);
});

test('new introduction research text is searchable without weakening degree, school or excluded-route filters',()=>{
 assert.deepEqual(filterProjectRoutes(joined,{query:'网络化感知与控制'}).map(r=>r.id),['HKUST-ECE-MPhil']);assert.equal(filterProjectRoutes(joined,{query:'网络化感知与控制',opportunityType:'PhD'}).length,0);assert.equal(filterProjectRoutes(joined,{query:'网络化感知与控制',institution:'HKU'}).length,0);assert.deepEqual(filterProjectRoutes(joined,{query:'并非专门的机器人学位'}).map(r=>r.id),['cityu_ds_phd']);assert.equal(filterProjectRoutes(joined,{query:'并非专门的机器人学位',opportunityType:'MPhil'}).length,0);
});

test('official catalogue, experiences, protected runtime, and raw source fields remain byte-identical to c3a2fe20',()=>{
 const protectedHashes={
  "data/catalog.json": "f3b9cf4e8bdf23167f94a897d9891c9c01b19ad27de051047cd9128d17e4177c",
  "data/material-summaries.json": "a61c01350c455bcf4e654acfeaec9a8fb34438003b3a18d1de9400813242a06c",
  "data/application-experiences.json": "8f213cf0ff3af43e436fbd2343ce6f00cbacfc221a293b68a3964c42188967b5",
  "data/application-experience-provenance.json": "2a81b133e27fb66530fc7bdc674aef8e054c1dee9fc4b79a1618fc452471627f",
  "data/advisor-profiles.json": "52f9730eb53c7cf3a7e225682b273891d8060651da8051ae3d078b6a01937661",
  "data/ra-positions.json": "b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e",
  "data/update-status.json": "b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5",
  "data/catalog-test-manifest.json": "32bb22a895615ff2c979091f494d0cdab4c539fffc94f4ff354bcee6b542f96a",
  "assets/core.js": "cad4681d907cdf380dad2b1ab4c9b42ee33829e11fafeb73b9ad0b072975a927",
  "assets/record-summaries.js": "7650b472298f9d0db4f59f53a1a437b4f295efeb3e21e33016b11f3e76a4b314",
  "assets/experiences.js": "662273e1227343feb9dc402f2b72bc40ab641270299816e5d44d66680f78377a",
  "assets/profiles.js": "6b6ce55c9e97edb8060976e5f82a631ed47275d6304d72bba4c0caf649606e88",
  "assets/material-supplement.js": "44c8f5821e4c828503b6efefc6cd6a75f560c2de0067f855531337c025511d03",
  "assets/style.css": "87fc9377f9451bc784a8e6355266e9e740e16a53971c5b25c92c0e7b67d4e0df",
  "tests/render.test.mjs": "93c2e746d7f3f3ce8f354c39ede9c95815311ca8bbd26611a7ca1c2c9d0b7909"
};
 for(const [path,expected] of Object.entries(protectedHashes))assert.equal(hash(fs.readFileSync(new URL('../'+path,import.meta.url))),expected,path);
});
