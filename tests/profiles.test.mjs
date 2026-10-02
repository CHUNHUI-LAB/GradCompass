import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {profileMap,profileSummary,renderProfile,renderProfileReferences} from '../assets/profiles.js';import {buildOpportunities,safeUrl} from '../assets/core.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');const academic=JSON.parse(read('data/catalog.json'));const ra=JSON.parse(read('data/ra-positions.json'));const data={...academic,raPositions:ra.raPositions};const supplement=JSON.parse(read('data/advisor-profiles.json'));const expected=['hku-fu-zhang','hkust-yinghao-xu','cuhk_yunhui_liu','cityu_yuxiang_sun','polyu_weisong_wen','hkust-shaojie-shen','hku-xihui-liu','cuhksz-junjie-hu','westlake-peidong-liu','cityu_peng_yin',"hku-jia-pan","hkust-yajing-shen","hkustgz-jun-ma","polyu_david_navarro","cuhk_fei_chen"].sort();
test('profile supplement joins exactly fifteen existing advisor IDs and never expands opportunities',()=>{assert.deepEqual(supplement.profiles.map(p=>p.advisorId).sort(),expected);assert.equal(profileMap(supplement,academic.advisors).size,15);const rows=buildOpportunities(data);assert.equal(rows.length,46);assert.equal(new Set(rows.map(o=>o.advisorId)).size,30);assert.equal(rows.filter(o=>o.type==='RA').length,2);assert.equal(academic.advisors.length-expected.length,17);assert.equal(profileMap({profiles:[{advisorId:'orphan'}]},academic.advisors).size,0);});
test('profile evidence remains separate from admission and employment authority',()=>{for(const p of supplement.profiles){for(const key of ['eligibility','routeIds','openingDetails','defaultVisible','raPositions','employmentEligibility'])assert(!(key in p));assert.equal(p.confirmedVacancy,false);assert.equal(p.checkedDate,["hku-jia-pan", "hkust-yajing-shen", "hkustgz-jun-ma", "polyu_david_navarro", "cuhk_fei_chen"].includes(p.advisorId)?'2026-10-02':'2026-10-01');assert(p.unknowns.length);assert(p.representativeWorks.length>=2&&p.representativeWorks.length<=3);}assert.equal(profileSummary(undefined,'既有内容'),'既有内容');assert.equal(renderProfile(undefined),'');});
test('all supplement URLs use HTTPS, with safe external markup and escaped text',()=>{function walk(v){if(!v||typeof v!=='object')return;for(const [k,val]of Object.entries(v)){if(k==='url'){assert.equal(new URL(val).protocol,'https:');assert(safeUrl(val));}else walk(val);}}walk(supplement);const malicious={advisorId:'<img>',overview:{textZh:'<script>alert(1)</script>'},labSnapshot:{resources:[]},representativeWorks:[{title:'<img src=x>',url:'javascript:alert(1)'}],unknowns:['<img>']};const html=renderProfile(malicious)+renderProfileReferences(malicious);assert(!html.includes('<script>'));assert(!html.includes('href="javascript:'));assert(html.includes('&lt;script&gt;'));for(const p of supplement.profiles){const h=renderProfile(p)+renderProfileReferences(p);for(const tag of h.match(/<a\b[^>]*>/g)||[]){assert(tag.includes('target="_blank"'));assert(tag.includes('rel="noopener noreferrer"'));}assert(!h.includes('undefined'));assert(!h.includes('[object Object]'));assert(!h.includes('名额已确认'));}});

test('original route eligibility, RA job data and last-success status survive targeted maintenance',()=>{
const keys=['id','institution','degree','status','bachelorEligible','noMasterRequired','noTuimianRequired','defaultVisible','eligibilitySummary','requirements'];const rows=academic.routes.map(r=>Object.fromEntries(keys.map(k=>[k,r[k]??null])));assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'7f83e0d91be88c18e30e07b88554abd5518f06130f8fde244097723b25a2c04b');
assert.equal(crypto.createHash('sha256').update(read('data/ra-positions.json')).digest('hex'),'b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e');
assert.equal(crypto.createHash('sha256').update(read('data/update-status.json')).digest('hex'),'b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5');
});

const newProfileIds = ["hku-jia-pan", "hkust-yajing-shen", "hkustgz-jun-ma", "polyu_david_navarro", "cuhk_fei_chen"];
test('five-profile expansion preserves the original ten and all official catalog data',()=>{
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(supplement.profiles.slice(0,10))).digest('hex'),'763ccda49c9153b2a0279e61ed8b90c7c90ab414cbe8eecfe2cb20639289893b');
 assert.equal(crypto.createHash('sha256').update(read('data/catalog.json')).digest('hex'),'d60936c9ddc57c843376611bca5f08717d26e648ce8e9f711e8d59110d8d54a5');
 const visibleIds=new Set(buildOpportunities(data).map(o=>o.advisorId));
 for(const id of newProfileIds)assert(visibleIds.has(id),id);
 assert.equal(new Set(newProfileIds.map(id=>academic.advisors.find(a=>a.id===id).institution)).size,5);
 assert.equal(supplement.profiles.filter(p=>visibleIds.has(p.advisorId)).length,15);
});
test('five new profiles contain sourced public facts and preserve research-versus-admissions boundaries',()=>{
 for(const id of newProfileIds){
  const p=supplement.profiles.find(p=>p.advisorId===id);
  const facts=[p.overview,p.labSnapshot.affiliation,p.labSnapshot.structure,...p.labSnapshot.resources,p.recruitment,...p.representativeWorks];
  assert(p.cardSummaryZh.length>25);assert(p.labSnapshot.themes.length>=3);assert(p.unknowns.length>=2);
  for(const f of facts){assert(f.textZh||f.summaryZh);assert(f.sources.length>0);for(const s of f.sources){assert.equal(s.checkedDate,'2026-10-02');assert.equal(new URL(s.url).protocol,'https:');}}
  for(const w of p.representativeWorks){assert(Number.isInteger(w.year)&&w.year<=2026);assert(w.venue);}
  const html=renderProfile(p)+renderProfileReferences(p);
  assert(html.includes('专业简介核验于 2026-10-02'));assert(html.includes(p.cardSummaryZh)===false);
  for(const w of p.representativeWorks)assert(html.includes(w.title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));
 }
});
test('new profiles retain meaningful cycle and eligibility caveats even when recruitment is not rendered',()=>{
 const get=id=>supplement.profiles.find(p=>p.advisorId===id);
 assert.match(get('hkust-yajing-shen').recruitment.textZh,/Fall 2027/);assert.match(get('hkust-yajing-shen').recruitment.textZh,/0 openings/);
 const shen=academic.advisors.find(a=>a.id==='hkust-yajing-shen');assert.equal(shen.opening,'closed');assert.equal(shen.fall2027OpeningVerified,false);
 assert.match(renderProfileReferences(get('hkust-yajing-shen')),/0 openings/);
 assert.match(renderProfileReferences(get('polyu_david_navarro')),/dissertation/);
 assert.match(get('hkustgz-jun-ma').recruitment.textZh,/双向选择/);
 assert(newProfileIds.every(id=>get(id).confirmedVacancy===false));
});
test('recent research dates and partial public resources are labelled rather than inflated',()=>{
 const get=id=>supplement.profiles.find(p=>p.advisorId===id);
 assert.equal(get('hku-jia-pan').representativeWorks.find(w=>w.title.startsWith('NeuPAN')).year,2025);
 assert.match(JSON.stringify(get('polyu_david_navarro')),/2025-04-11/);
 assert.match(JSON.stringify(get('polyu_david_navarro')),/雨雾雪/);
 assert.match(get('hkustgz-jun-ma').overview.textZh,/晋升不等同于当年新入职/);
 const push=get('hkustgz-jun-ma').representativeWorks.find(w=>w.title.includes('Interactive Navigation'));assert.match(push.venue,/预印本/);
});
