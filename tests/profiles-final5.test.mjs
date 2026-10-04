import {recruitmentBaselineText} from './recruitment-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {profileMap,renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {buildOpportunities,isVerifiedRoute,safeUrl,rankOf,filterOpportunities} from '../assets/core.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const supplement=JSON.parse(read('data/advisor-profiles.json'));
const academic=JSON.parse(read('data/catalog.json'));
const data={...academic,raPositions:JSON.parse(read('data/ra-positions.json')).raPositions};
const ids=['hkust-ping-tan','hku-yanchao-yang','hku-chen-sun','polyu_bing_wang','hkustgz-qiang-nie'];
const added=supplement.profiles.slice(25,30);
const get=id=>added.find(p=>p.advisorId===id);

test('final five append to the exact twenty-five released profiles without relabelling their verification dates',()=>{
 assert.equal(hash(JSON.stringify(supplement.profiles.slice(0,25))),'7bfeb431fbed1c2b539837d248ad1f9366e2756a2857c3e402aa53b17eb8dccf');
 assert.deepEqual(added.map(p=>p.advisorId),ids);
 assert.equal(supplement.profiles.length,41);
 assert.equal(supplement.batch6Review.baseCommit,'5bd7724d79c8b41f75cb9230d1a23d04fec3d481');
 assert.equal(supplement.batch6Review.preservedProfiles,25);
 assert.equal(supplement.batch6Review.catalogMutation,false);
});
test('every visible advisor has exactly one rich profile while the two excluded records stay excluded',()=>{
 const rows=buildOpportunities(data),visible=new Set(rows.map(o=>o.advisorId));
 const profiles=profileMap(supplement,academic.advisors);
 assert.deepEqual([...profiles.keys()].sort(),[...visible].sort());
 assert.equal(rows.length,59);assert.equal(visible.size,41);assert.equal(rows.filter(o=>o.type==='RA').length,2);
 assert.equal(academic.advisors.length,43);assert.equal(academic.routes.filter(isVerifiedRoute).length,27);
 for(const id of ['cuhk_zhongyu_li','xjtlu-yaran-chen']){assert(!visible.has(id));assert(!profiles.has(id));}
});
test('profile completion leaves catalog identity, ranks, original source records and admissions authority byte-identical',()=>{
 assert.equal(hash(recruitmentBaselineText(academic)),'045a3a5886d50a2cca8b294ee34936522d77590a0a76f0c4b3e94252654f9d1a');
 assert.equal(hash(read('data/ra-positions.json')),'b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e');
 assert.equal(hash(read('data/update-status.json')),'b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5');
 for(const p of added)for(const key of ['position','rank','nameZh','institution','routeIds','eligibility','openingDetails','defaultVisible','raPositions','employmentEligibility'])assert(!(key in p));
});
test('all new facts and representative works carry dated safe primary sources',()=>{
 for(const p of added){
  assert.equal(p.checkedDate,'2026-10-02');assert.equal(p.confirmedVacancy,false);assert.equal(p.profileScope,'public_professional_and_lab_overview');
  assert(p.cardSummaryZh.length>25);assert(p.labSnapshot.themes.length>=3);assert(p.labSnapshot.resources.length>=1);assert(p.unknowns.length>=2);
  assert(p.representativeWorks.length>=2&&p.representativeWorks.length<=3);
  for(const f of [p.overview,p.labSnapshot.affiliation,p.labSnapshot.structure,...p.labSnapshot.resources,p.recruitment,...p.representativeWorks]){
   assert(f.textZh||f.summaryZh);assert(f.sources.length);
   for(const source of f.sources){assert.equal(source.checkedDate,'2026-10-02');assert.equal(new URL(source.url).protocol,'https:');assert(safeUrl(source.url));}
  }
  for(const w of p.representativeWorks){assert(Number.isInteger(w.year)&&w.year<=2026);assert(w.venue);assert(safeUrl(w.url));}
 }
});
test('all new details render with explicit resource and vacancy limits and safe external links',()=>{
 for(const p of added){
  const h=renderProfile(p)+renderProfileReferences(p);
  for(const t of ['个人职业概况','实验室与研究资源','近期代表成果','简介参考与待确认信息','专业简介核验于 2026-10-02','资源分配保证'])assert(h.includes(t),p.advisorId+': '+t);
  assert.match(h,/名额|余位|席位|招生/);assert.match(h,/未核实|未确认|不代表|不等于|未知|不能/);
  for(const bad of ['undefined','[object Object]','名额已确认','专业简介待补充'])assert(!h.includes(bad));
  for(const a of h.match(/<a\b[^>]*>/g)||[]){assert(a.includes('target="_blank"'));assert(a.includes('rel="noopener noreferrer"'));}
 }
});
test('profile expansion preserves all visible academic-rank and opportunity filter partitions',()=>{
 const byRank={professor:6,associate:16,assistant:35};
 for(const [rank,count]of Object.entries(byRank)){const rows=filterOpportunities(data,{rank});assert.equal(rows.length,count);assert(rows.every(o=>rankOf(academic.advisors.find(a=>a.id===o.advisorId))===rank));}
 for(const id of ids){const a=academic.advisors.find(a=>a.id===id);assert.equal(rankOf(a),id==='hkust-ping-tan'?'professor':'assistant');}
});
test('Tan profile separates 2023 joining, 2025 joint lab and 2026 administrative appointment and paper dates',()=>{
 const p=get('hkust-ping-tan');assert.match(p.overview.textZh,/2023.*2026/);assert.match(p.labSnapshot.affiliation.textZh,/2025.*7/);
 const work=p.representativeWorks.find(w=>w.title.startsWith('SAIL-Recon'));assert.equal(work.year,2026);assert.match(work.venue,/3DV 2026.*2025/);
 assert.match(renderProfileReferences(p),/BibTeX.*2025/);assert.equal(academic.advisors.find(a=>a.id===p.advisorId).opening,'unknown');
});
test('completion metadata lists only public content provenance and excludes local audit files',()=>{
 const text=JSON.stringify({profiles:added,review:supplement.batch6Review});
 assert(!/\/workspace\/|\/tmp\/|node_modules|sourceSnapshotPath|internalQA|privateEvidence|browserDebug/.test(text));
 const manifest=JSON.parse(read('release-manifest.json'));assert(manifest.allowedFiles.some(f=>f.path==='tests/profiles-final5.test.mjs'));
 assert(!manifest.allowedFiles.some(f=>/advisor-final5-research|identity-rank-audit|candidate-report|baseline-tests/.test(f.path)));
});

test('Yang and Sun retain different labs, official Chinese-name sources and precise publication-year boundaries',()=>{
 const yang=get('hku-yanchao-yang'),sun=get('hku-chen-sun');
 assert.equal(yang.labSnapshot.name,'InfoBodied AI Lab');assert.match(sun.labSnapshot.name,/Social.*Safe/);
 assert(yang.overview.sources.some(s=>s.url==='https://hub.hku.hk/cris/rp/rp03076'));
 assert(sun.overview.sources.some(s=>s.url==='https://hub.hku.hk/cris/rp/rp03442'));
 const pointCloud=sun.representativeWorks.find(w=>w.title.includes('Point Cloud Based Potential Field'));
 assert.equal(pointCloud.year,2025);assert.match(pointCloud.venue,/2024.*2025/);assert.match(pointCloud.summaryZh,/感知.*真实.*规划.*仿真/);
 const hybrid=sun.representativeWorks.find(w=>w.title.startsWith('Hybrid Action-Based'));assert.equal(hybrid.year,2026);assert.match(hybrid.summaryZh,/2025.*预印本.*2026.*期刊/);
 assert.match(yang.recruitment.textZh,/2026\/2027.*Fall 2027/);assert.match(sun.recruitment.textZh,/2027\/28 Fall.*不能.*剩/);
});
test('Wang staffing signals and Nie Master invitations never create new RA or cross-degree opportunities',()=>{
 const wang=get('polyu_bing_wang'),nie=get('hkustgz-qiang-nie');
 assert.match(wang.recruitment.textZh,/Postdoctoral|博士后/);assert.match(wang.recruitment.textZh,/Project Technical Assistant/);assert.match(renderProfileReferences(wang),/雇佣.*不是.*RA.*学位/);
 assert.match(nie.recruitment.textZh,/2026 Recruitment Ongoing/);assert.match(nie.recruitment.textZh,/Master.*MPhil\/MSc/);assert.match(nie.recruitment.textZh,/六个月.*双向/);
 assert(!buildOpportunities(data).some(o=>['polyu_bing_wang','hkustgz-qiang-nie'].includes(o.advisorId)&&o.type==='RA'));
});
test('Nie representative works separate conference acceptance from preprint and founding dates',()=>{
 const nie=get('hkustgz-qiang-nie'),foresight=nie.representativeWorks.find(w=>w.title.startsWith('3D Dynamics'));
 assert.equal(foresight.year,2026);assert.match(foresight.venue,/ICRA 2026.*2025/);
 const tactile=nie.representativeWorks.find(w=>w.title.startsWith('TactileReflex'));assert.equal(tactile.year,2026);assert.match(tactile.venue,/IROS 2026.*已接收.*2026-09-23/);
 assert.match(nie.labSnapshot.affiliation.textZh,/2024.*不当作.*任职/);assert.match(renderProfileReferences(nie),/Master.*不能.*MPhil.*MSc/);
});
