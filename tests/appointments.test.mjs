import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appointmentStatus,appointmentMatches,appointmentWindow} from '../assets/appointments.js';
import {browseAdvisors,filterAdvisors,filterOpportunities} from '../assets/core.js';
import {renderAppointmentReview} from '../assets/profiles.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const catalog=read('data/catalog.json'),profiles=read('data/advisor-profiles.json').profiles;
const audit=read('audits/appointment-review-20261010.json'),receipt=read('tests/fixtures/evidence/appointments-20261010.json');
const map=new Map(profiles.map(p=>[p.advisorId,p]));
const live={...catalog,advisorProfiles:map};
const ids=(filters={})=>new Set(browseAdvisors(live,filters).map(x=>x.id));
const r=id=>map.get(id).appointmentReview;
const sample=(start,end=start,context='unknown')=>({appointmentReview:{status:'verified',eventType:'first_faculty_research_appointment_current_institution',appointmentConfirmed:true,earliestDate:start,latestDate:end,careerContext:context,dateText:'公开日期',noteZh:'公开履历',sources:[{url:'https://example.org/cv',title:'CV',checkedDate:'2026-10-10'}]}});

test('every existing advisor has a separate appointment review, with exact evidence operations and no catalog changes',()=>{
 assert.equal(profiles.length,334);assert.equal(audit.count,334);assert.equal(receipt.operations.length,334);
 assert.equal(new Set(audit.advisors.map(a=>a.advisorId)).size,334);
 for(let i=0;i<profiles.length;i++){
  const p=profiles[i],row=audit.advisors.find(a=>a.advisorId===p.advisorId);assert(row,p.advisorId);
  assert.deepEqual(row.appointmentReview,p.appointmentReview);assert.equal(row.classification,appointmentStatus(p));
  assert.deepEqual(receipt.operations[i],{file:'data/advisor-profiles.json',path:`/profiles/${i}/appointmentReview`,operation:'add',value:p.appointmentReview});
  assert.equal(p.appointmentReview.checkedDate,'2026-10-10');assert.deepEqual(p.appointmentReview.window,appointmentWindow);
 }
 const counts={};for(const p of profiles){const status=appointmentStatus(p);counts[status]=(counts[status]||0)+1;}
 assert.deepEqual(counts,audit.classificationCounts);assert.equal(counts.recent+counts.earlier+counts.boundary,audit.verifiedDateCount);
 assert.equal(catalog.advisors.length,334);assert.equal(filterOpportunities(catalog).length,57);
 const evidence=new Set(receipt.officialEvidence.map(s=>s.url));
 for(const p of profiles)if(p.appointmentReview.status==='verified'){
  assert(p.appointmentReview.sources.length);assert(p.appointmentReview.precision);assert(p.appointmentReview.appointmentConfirmed);
  for(const s of p.appointmentReview.sources){assert(evidence.has(s.url));assert.equal(new URL(s.url).protocol,'https:');assert(s.readScope&&s.title);assert(s.checkedDate<='2026-10-10');}
 }
});

test('rolling-window boundary, coarse precision and future appointments do not fabricate a recent tag',()=>{
 assert.equal(appointmentStatus(sample('2021-10-10')),'recent');
 assert.equal(appointmentStatus(sample('2021-10-09')),'earlier');
 assert.equal(appointmentStatus(sample('2021-01-01','2021-12-31')),'boundary');
 assert.equal(appointmentStatus(sample('2021-10-01','2021-10-31')),'boundary');
 assert.equal(appointmentStatus(sample('2026-10-10')),'recent');
 assert.equal(appointmentStatus(sample('2026-10-11')),'unknown');
 assert.equal(appointmentStatus(sample('2026-02-30')),'unknown');
 assert.equal(appointmentStatus(sample('2024-02-01','2023-01-01')),'unknown');
 for(const delta of [{sources:[]},{sources:[{url:'javascript:alert(1)',checkedDate:'2026-10-10'}]},{sources:[{url:'https://example.org',checkedDate:'2026-10-11'}]},{sources:[{url:'https://example.org',checkedDate:'2026-02-30'}]},{status:'pending'},{appointmentConfirmed:false},{eventType:'promotion'},{eventType:'postdoc_start'},{eventType:'department_transfer'}])assert.equal(appointmentStatus({appointmentReview:{...sample('2024-01-01').appointmentReview,...delta}}),'unknown');
 assert.equal(appointmentStatus(null),'unknown');assert.equal(appointmentStatus({newPi:{verified:true,date:'2026'}}),'unknown');
});

test('first faculty dates exclude promotions, internal moves and earlier postdoctoral positions',()=>{
 for(const [id,date] of [['sustech-pan-yang','2019-09-01'],['nju-li-huaxiong','2009-07-01'],['seu-wang-teng','2017-01-01'],['sjtu-yue-xinyi','2016-06-01'],['sjtu-zhang-qinghao','2024-03-01'],['sjtu-xu-fan','2023-08-01'],['fudan-chen-tao','2019-03-01'],['tsinghua-rui-chen','2023-01-01']])assert.equal(r(id).earliestDate,date,id);
 assert.equal(appointmentStatus(map.get('sustech-boyu-zhou')),'recent');assert.equal(r('sustech-boyu-zhou').careerContext,'previous_faculty');
 assert.equal(r('seu-sun-mingxuan').careerContext,'previous_faculty');assert.match(r('seu-sun-mingxuan').noteZh,/LSU/);
 assert.equal(appointmentStatus(map.get('sjtu-xu-yunwen')),'boundary');
 assert.equal(appointmentStatus(map.get('polyu_weisong_wen')),'boundary');
 assert.equal(r('tsinghua-shuguang-li').precision,'interval');assert.equal(r('tsinghua-shuguang-li').earliestDate,'2022-06-01');assert.equal(r('tsinghua-shuguang-li').latestDate,'2022-07-31');
 assert.equal(r('sjtu-cai-panpan').earliestDate,'2022-08-01');assert.equal(r('sjtu-cai-panpan').careerContext,'early_career');assert.equal(r('pku-liu-hangxin').earliestDate,'2026-03-01');assert.equal(r('hkust-yajing-shen').earliestDate,'2022-09-01');assert.equal(appointmentStatus(map.get('zju-lu-haojian')),'unknown');
});

test('appointment filters combine with school, rank and doctoral reference routes without creating admissions',()=>{
 const recent=ids({appointment:'recent'});assert.equal(recent.size,audit.classificationCounts.recent);
 const expected=catalog.advisors.filter(a=>a.institution==='SUSTech'&&['sustech-boyu-zhou','sustech-hongliang-lu'].includes(a.id)).map(a=>a.id).sort();
 assert.deepEqual([...ids({institution:'SUSTech',appointment:'recent',opportunityType:'PhD'})].sort(),expected);
 const early=ids({appointment:'early_career'});assert(early.has('sustech-hongliang-lu'));assert(!early.has('sustech-boyu-zhou'));assert(!early.has('seu-sun-mingxuan'));
 const transfer=ids({appointment:'previous_faculty'});assert(transfer.has('sustech-boyu-zhou'));assert(transfer.has('seu-sun-mingxuan'));
 for(const p of profiles){const id=p.advisorId;assert.equal(appointmentMatches({id},live,{appointment:'unknown'}),appointmentStatus(p)==='unknown');}
 assert(!appointmentMatches({id:'missing'},live,{appointment:'recent'}));assert(appointmentMatches({id:'missing'},live,{}));
 for(const filters of [{appointment:'recent'},{appointment:'early_career',institution:'SUSTech',rank:'assistant'},{appointment:'previous_faculty',opportunityType:'PhD'}]){
  for(const o of filterOpportunities(live,filters)){assert(appointmentMatches({id:o.advisorId},live,filters));assert(catalog.advisors.some(a=>a.id===o.advisorId));}
  for(const a of filterAdvisors(live,filters))assert(appointmentMatches(a,live,filters));
 }
});

test('appointment details render precision, source dates, conflicts and safe strings without age or vacancy inference',()=>{
 for(const p of profiles){const html=renderAppointmentReview(p);assert.match(html,/任职时间 · 本校教研首次任职/);assert(!/undefined|\[object Object\]/.test(html));assert.match(html,/不证明年龄、完整职业史或博士名额/);}
 const recentUnknown=renderAppointmentReview(map.get('nju-tong-xin'));assert(!recentUnknown.includes('入职时间待核实'));assert(!recentUnknown.includes('教研职业早期线索；按公开履历分类'));
 assert.match(renderAppointmentReview(map.get('sjtu-xu-yunwen')),/五年边界待核实/);assert.match(renderAppointmentReview(map.get('tsinghua-shuguang-li')),/月份存在差异/);
 const attack=sample('2024-01-01');attack.appointmentReview.noteZh='<img onerror=bad>';attack.appointmentReview.sources.push({url:'javascript:alert(1)',title:'<script>',checkedDate:'2026-10-10'});const html=renderAppointmentReview(attack);assert(!html.includes('<img'));assert(!html.includes('javascript:'));assert(html.includes('&lt;img'));assert.equal(renderAppointmentReview(null),'');
});
