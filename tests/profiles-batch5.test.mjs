import {maintenanceBaseline} from './maintenance-baseline.mjs';
import {recruitmentBaselineText} from './recruitment-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {profileMap,renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {buildOpportunities,isVerifiedRoute,safeUrl} from '../assets/core.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const supplement=JSON.parse(read('data/advisor-profiles.json'));
const academic=JSON.parse(read('data/catalog.json'));
const data={...academic,raPositions:JSON.parse(read('data/ra-positions.json')).raPositions};
const ids=['hkust-qifeng-chen','hku-hongyang-li','polyu_pai_zheng','hkustgz-junwei-liang','westlake-guojun-qi'];
const added=supplement.profiles.slice(20,25);
const get=id=>added.find(p=>p.advisorId===id);
test('batch five preserves all twenty earlier profile objects and appends exactly the five reviewed advisers',()=>{
 assert.equal(hash(JSON.stringify(supplement.profiles.slice(0,20))),'9f5cd90c4e8961c7981fac1c69114b36b21abfbade1c78dfa30d9679519e5fec');
 assert.deepEqual(added.map(p=>p.advisorId),ids);
 assert.equal(supplement.profiles.slice(0,25).length,25);
 assert.equal(profileMap({profiles:supplement.profiles.slice(0,25)},academic.advisors).size,25);
 assert.equal(supplement.batch5Review.baseCommit,'53d865df01e83c7fd7187a3fe22ab184413441d4');
 assert.equal(supplement.batch5Review.preservedProfiles,20);
 assert.equal(supplement.batch5Review.catalogMutation,false);
});
test('batch five freezes catalog, RA, materials, projects, experiences and update authority byte for byte',()=>{
 const expected={'data/catalog.json':'045a3a5886d50a2cca8b294ee34936522d77590a0a76f0c4b3e94252654f9d1a','data/ra-positions.json':'b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e','data/material-summaries.json':'193f8d81ae8a6e5cbb4c81e96f43c586d073e050423d013601a9a0e90ab68296','data/project-summaries.json':'d3c29e7af93a4a7f326b2ea293949f0f8169936f29f3d37b9cd7b7ad5a8bf8bc','data/application-experiences.json':'05b5bc420009910cdb9432bcb199df050007034c178fa2d2b9e7531cc76beb9b','data/application-experience-provenance.json':'0a057d4264371c0adbca86d6af5257919a45f5a767e40f39d9457e0698d9ccf8','data/update-status.json':'b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5'};
 for(const [file,sha] of Object.entries(expected))assert.equal(hash(file==='data/catalog.json'?recruitmentBaselineText(academic):['data/material-summaries.json','data/project-summaries.json','data/application-experiences.json','data/application-experience-provenance.json'].includes(file)?JSON.stringify(maintenanceBaseline(JSON.parse(read(file))),null,2)+'\n':read(file)),sha,file);
});
test('batch five only enriches five already visible advisers across five institutions',()=>{
 const rows=buildOpportunities(data),visible=new Set(rows.map(o=>o.advisorId));
 for(const id of ids){const a=academic.advisors.find(a=>a.id===id);assert(a.defaultVisible);assert.equal(a.eligibility,'verified');assert(visible.has(id));}
 assert.equal(new Set(ids.map(id=>academic.advisors.find(a=>a.id===id).institution)).size,5);
 assert.equal(rows.length,59);assert.equal(visible.size,41);assert.equal(rows.filter(o=>o.type==='RA').length,2);
 assert.equal(academic.routes.filter(isVerifiedRoute).length,28);
 assert(!supplement.profiles.some(p=>['cuhk_zhongyu_li','xjtlu-yaran-chen'].includes(p.advisorId)));
});
test('every new fact has a dated primary-source link and every profile separates public research from authority',()=>{
 for(const p of added){assert.equal(p.checkedDate,'2026-10-02');assert.equal(p.confirmedVacancy,false);assert.equal(p.profileScope,'public_professional_and_lab_overview');assert(p.cardSummaryZh.length>25);assert(p.labSnapshot.themes.length>=3);assert(p.unknowns.length>=2);assert(p.representativeWorks.length>=2&&p.representativeWorks.length<=3);
  for(const key of ['routeIds','eligibility','openingDetails','defaultVisible','institution','raPositions','employmentEligibility'])assert(!(key in p));
  for(const f of [p.overview,p.labSnapshot.affiliation,p.labSnapshot.structure,...p.labSnapshot.resources,p.recruitment,...p.representativeWorks]){assert(f.textZh||f.summaryZh);assert(f.sources.length);for(const source of f.sources){assert.equal(source.checkedDate,'2026-10-02');assert.equal(new URL(source.url).protocol,'https:');assert(safeUrl(source.url));}}
  for(const w of p.representativeWorks){assert(Number.isInteger(w.year)&&w.year<=2026);assert(w.venue);assert(safeUrl(w.url));}
 }
});
test('new profile details render all sections, evidence boundaries and safe external links',()=>{
 for(const p of added){const h=renderProfile(p)+renderProfileReferences(p);for(const t of ['个人职业概况','实验室与研究资源','近期代表成果','简介参考与待确认信息','专业简介核验于 2026-10-02'])assert(h.includes(t),p.advisorId+': '+t);assert(!h.includes('undefined'));assert(!h.includes('[object Object]'));assert(!h.includes('名额已确认'));for(const a of h.match(/<a\b[^>]*>/g)||[]){assert(a.includes('target="_blank"'));assert(a.includes('rel="noopener noreferrer"'));}}
});
test('Chen profile distinguishes promotion, administrative affiliation and the implemented skill-switching planner',()=>{
 const p=get('hkust-qifeng-chen');assert.match(p.overview.textZh,/晋升.*不是新入职/);assert.match(p.labSnapshot.affiliation.textZh,/机构关联或行政职务不等于独立实验室名称/);assert.match(p.representativeWorks.find(w=>w.title.startsWith('Switch')).summaryZh,/实体部署使用最近邻/);assert.match(renderProfileReferences(p),/Fall 2027.*注册已关闭/);assert.match(renderProfileReferences(p),/Robot Synesthesia/);
});
test('five profiles keep unresolved recruitment and resource limits visible without inventing a new opportunity',()=>{
 for(const p of added){const h=renderProfileReferences(p);assert.match(h,/名额|余位|席位|招生/);assert.match(h,/未核实|未确认|不代表|不等于|未知|不能/);}
 assert.equal(academic.advisors.find(a=>a.id==='hkust-qifeng-chen').opening,'unknown');
 assert.equal(academic.advisors.find(a=>a.id==='westlake-guojun-qi').newPi.verified,false);
 assert.match(renderProfileReferences(get('westlake-guojun-qi')),/2024.*2022.*2025/);
 assert.match(renderProfileReferences(get('hkustgz-junwei-liang')),/Spring 2027.*未.*当前剩余席位/);
 assert.match(renderProfileReferences(get('hkustgz-junwei-liang')),/Fall 2027/);
 assert.match(renderProfileReferences(get('hku-hongyang-li')),/2026／2027 实习声明不能延伸/);
 assert.match(renderProfileReferences(get('hku-hongyang-li')),/Code \(Soon\).*CoRL 2026/);
 assert.equal(get('polyu_pai_zheng').representativeWorks[0].year,2026);
 assert.match(get('polyu_pai_zheng').representativeWorks[0].venue,/2025.*online-first/);
});
test('batch five public metadata contains only content scope, provenance and public dates',()=>{
 const text=JSON.stringify({profiles:added,review:supplement.batch5Review});
 assert(!/\/workspace\/|\/tmp\/|node_modules|chromium.*socket|playwright.*error/i.test(text));
 assert(!/sourceSnapshotPath|internalQA|privateEvidence|browserDebug/.test(text));
 const manifest=JSON.parse(read('release-manifest.json'));assert(manifest.allowedFiles.some(f=>f.path==='tests/profiles-batch5.test.mjs'));
 assert(!manifest.allowedFiles.some(f=>/research|evidence|snapshot|batch5-report/.test(f.path)));
});
