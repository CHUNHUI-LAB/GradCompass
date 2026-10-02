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
 assert.deepEqual(raw.records.slice(8,17).map(r=>r.routeId),added);assert.equal(raw.records.slice(0,17).length,17);assert.equal(new Set(raw.sources.slice(0,35).map(s=>s.id)).size,35);assert.equal(raw.sources.slice(0,35).length,35);
});

test('first expansion preserves introductions for the five original schools',()=>{
 const schools=new Set(['HKU','HKUST','CUHK','CityUHK','PolyU']);
 const scoped=catalog.routes.filter(r=>schools.has(r.institution)&&isVerifiedRoute(r));
 assert.deepEqual([...summaries.values()].filter(r=>schools.has(r.institution)).map(r=>r.routeId).sort(),scoped.map(r=>r.id).sort());assert.equal(scoped.length,17);assert.equal(catalog.routes.filter(isVerifiedRoute).length,27);
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

test('reviewed catalog and material snapshots plus reviewed runtime and expanded experience data match the declared content boundary',()=>{
 const protectedHashes={
  "data/catalog.json": "045a3a5886d50a2cca8b294ee34936522d77590a0a76f0c4b3e94252654f9d1a",
  "data/material-summaries.json": "193f8d81ae8a6e5cbb4c81e96f43c586d073e050423d013601a9a0e90ab68296",
  "data/application-experiences.json": "05b5bc420009910cdb9432bcb199df050007034c178fa2d2b9e7531cc76beb9b",
  "data/application-experience-provenance.json": "0a057d4264371c0adbca86d6af5257919a45f5a767e40f39d9457e0698d9ccf8",
  "data/advisor-profiles.json": "cb44d1bac86e4d9075e3b43b79ae1dcafb3fac6f91957990d99ca8f9459631c1",
  "data/ra-positions.json": "b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e",
  "data/update-status.json": "b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5",
  "data/catalog-test-manifest.json": "ec05af20969ea0b56d4c88fe9afec2131f67fcf242577df687bcc0656d683bfa",
  "assets/core.js": "cad4681d907cdf380dad2b1ab4c9b42ee33829e11fafeb73b9ad0b072975a927",
  "assets/record-summaries.js": "7650b472298f9d0db4f59f53a1a437b4f295efeb3e21e33016b11f3e76a4b314",
  "assets/experiences.js": "beb2c7ff88a88181c50cb8041466e121bebe0771b77ef747bfd100fba3f15bfa",
  "assets/profiles.js": "6b6ce55c9e97edb8060976e5f82a631ed47275d6304d72bba4c0caf649606e88",
  "assets/material-supplement.js": "44c8f5821e4c828503b6efefc6cd6a75f560c2de0067f855531337c025511d03",
  "assets/style.css": "87fc9377f9451bc784a8e6355266e9e740e16a53971c5b25c92c0e7b67d4e0df",
  "tests/render.test.mjs": "b7d70031c476f9e3ae77b9ba92c34cca3e527d68527101522813be5c4c9e6885"
};
 for(const [path,expected] of Object.entries(protectedHashes)){
  let content=fs.readFileSync(new URL('../'+path,import.meta.url));
  if(path==='assets/style.css')content=content.subarray(0,24000);
  assert.equal(hash(content),expected,path);
 }
});
