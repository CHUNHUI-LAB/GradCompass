import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browseAdvisors,buildOpportunities,hasVerifiedAssociation} from '../assets/core.js';
import {appointmentStatus} from '../assets/appointments.js';
import {renderAppointmentReview} from '../assets/profiles.js';
import {reviewedPublicData,assertReviewedPublicData} from './reviewed-public-data.mjs';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(raw(p));
// October 19 cohort is fixed; today's full files are independently replayed below.
const dated=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/existing-doctoral-links-20261019.json'});
const c=dated['data/catalog.json'],p=dated['data/advisor-profiles.json'].profiles;
const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/appointment-source-followup-20261019.json'});
const oldC=before['data/catalog.json'],oldP=before['data/advisor-profiles.json'].profiles;
const audit=json('audits/existing-doctoral-links-20261019.json'),receipt=json('tests/fixtures/evidence/existing-doctoral-links-20261019.json');
const ids=['hku-xihui-liu','hkust-qifeng-chen','hku-jia-pan','hku-hongyang-li','hkust-yinghao-xu','hku-yanchao-yang','hkust-shaojie-shen','hku-fu-zhang','hkust-yajing-shen','hku-chen-sun','polyu_david_navarro','xjtlu-yaran-chen','hku-peng-lu','hku-hengshuang-zhao','sjtu-wang-jingchuan','sjtu-qin-tong','sjtu-yang-ruigang'];
const faculty=['sjtu-qin-tong','sjtu-wang-jingchuan','sjtu-wang-chenggang','sjtu-yan-youcan','sjtu-yang-ruigang','sjtu-yu-tingting'];
const omit=(row,keys)=>Object.fromEntries(Object.entries(row).filter(([k])=>!keys.includes(k)));
const a=id=>c.advisors.find(a=>a.id===id),profile=id=>p.find(p=>p.advisorId===id);

test('22 existing doctoral-discovery gaps are reviewed; 17 sourced references become discoverable and five remain explicitly unresolved',()=>{
 assert.equal(audit.reviewedRecords,22);assert.equal(audit.resolvedDoctoralReferences.length,17);assert.equal(audit.pendingRecords.length,5);
 assert.deepEqual(new Set(audit.resolvedDoctoralReferences.map(r=>r.advisorId)),new Set(ids));
 assert.deepEqual(new Set(audit.pendingRecords.map(r=>r.advisorId)),new Set(['hkust-ping-tan','cuhk_zhongyu_li','sjtu-wang-chenggang','sjtu-yan-youcan','sjtu-yu-tingting']));
 const oldIds=new Set(browseAdvisors(oldC,{opportunityType:'PhD'}).map(a=>a.id));assert.equal(oldIds.size,470);
 const now=new Set(browseAdvisors(c,{opportunityType:'PhD'}).map(a=>a.id));assert.equal(now.size,487);assert.deepEqual(new Set([...now].filter(id=>!oldIds.has(id))),new Set(ids));
 assert.equal(c.advisors.length,492);assert.equal(c.routes.length,93);assert.equal(p.length,492);
 for(const id of ids){const row=a(id).routeAssociations.at(-1),route=c.routes.find(r=>r.id===row.routeId);assert.equal(row.verificationStatus,'pending');assert.equal(route.status,'reference');assert.equal(route.degree,'PhD');assert(!hasVerifiedAssociation(a(id),route));assert(row.sources.length);}
 for(const id of ['hku-jia-pan','hkust-yinghao-xu','hkust-shaojie-shen'])assert.equal(a(id).routeAssociations.at(-1).scope,'doctoral_supervision_history_only');
 for(const id of ['sjtu-qin-tong','sjtu-yang-ruigang']){const row=a(id).routeAssociations.at(-1);assert.equal(row.sourceCycle,'2026');assert.match(row.summary,/2026.*博士.*不推2027或2028/);}
});

test('the bounded update preserves every unrelated field, all existing routes and all earlier immutable receipts',()=>{
 assert.deepEqual(c.routes.slice(0,92),oldC.routes);assert.deepEqual(c.advisors.map(a=>a.id),oldC.advisors.map(a=>a.id));
 for(let i=0;i<c.advisors.length;i++){
  const now=c.advisors[i],old=oldC.advisors[i],allowed=[];
  if(ids.includes(now.id)){allowed.push('routeIds','routeAssociations');assert.deepEqual(now.routeIds.slice(0,-1),old.routeIds);assert.deepEqual(now.routeAssociations.slice(0,-1),old.routeAssociations||[]);}
  if(faculty.includes(now.id)){allowed.push('profileUrl');assert.match(now.profileUrl,/^https:\/\/gift.sjtu.edu.cn\/faculty\/\d+$/);}
  if(now.id==='hkust-yajing-shen')allowed.push('opening','openingSummary','openings','openingDetails','fall2027OpeningVerified','recruitmentReview');
  assert.deepEqual(omit(now,allowed),omit(old,allowed),now.id);
 }
 for(let i=0;i<p.length;i++){
  const now=p[i],old=oldP[i];const allowed=faculty.includes(now.advisorId)?['appointmentReview','links']:now.advisorId==='hkust-yajing-shen'?['recruitment','links','unknowns']:[];assert.deepEqual(omit(now,allowed),omit(old,allowed),now.advisorId);
  if(faculty.includes(now.advisorId)||now.advisorId==='hkust-yajing-shen')assert.deepEqual(now.links.slice(0,-1),old.links);
 }
 assert.equal(receipt.operations.length,28);assert.equal(receipt.operations.filter(o=>o.operation==='add').length,1);assert.equal(receipt.operations.filter(o=>o.operation==='replace').length,27);
});

test('MRL ordinary PhD closure and joint-programme exception are distinct, with MPhil closure and vacancy boundaries preserved',()=>{
 const shen=a('hkust-yajing-shen'),old=oldC.advisors.find(a=>a.id===shen.id),doctoral=shen.openingDetails.find(d=>d.degree==='PhD');
 assert.equal(shen.opening,'explicit');assert.equal(shen.recruitmentReview.checkedDate,'2026-10-19');assert.deepEqual(shen.recruitmentReview.previousReview,old.recruitmentReview);
 assert.equal(doctoral.scope,'hkust_slai_joint_programme_only');assert.equal(doctoral.normalAdmissionStatus,'closed');assert.equal(doctoral.normalAdmissionQuota,0);assert.equal(doctoral.advertisedJointOpportunities,1);assert.equal(doctoral.remainingHeadcountVerified,false);assert.equal(doctoral.confirmedVacancy,false);assert.equal(doctoral.cycle2027FallVerified,true);assert.equal(doctoral.cycle2028FallVerified,false);
 assert.match(doctoral.summary,/普通博士明确无招生名额/);assert.match(doctoral.summary,/仅联合项目例外/);assert.match(doctoral.summary,/不将公告1个机会当作当前还剩1名/);
 assert.deepEqual(shen.openingDetails.filter(d=>d.degree!=='PhD'),old.openingDetails.filter(d=>d.degree!=='PhD'));assert.equal(shen.openings.mphil,old.openings.mphil);
 assert(browseAdvisors(c,{opportunityType:'PhD',opening:'explicit'}).some(a=>a.id===shen.id));assert(!browseAdvisors(c,{opportunityType:'MPhil',opening:'explicit'}).some(a=>a.id===shen.id));assert(browseAdvisors(c,{opportunityType:'MPhil',opening:'closed'}).some(a=>a.id===shen.id));
 assert.equal(buildOpportunities({...c,raPositions:json('data/ra-positions.json').raPositions}).length,59);
 for(const id of ids)assert.notEqual(a(id).fall2028OpeningVerified,true);
});

test('six existing first institutional appointments use personal work histories, preserving postdoc, prior-faculty and precision boundaries',()=>{
 const expected={'sjtu-qin-tong':['2023-02-01','month','recent','industry_transition'],'sjtu-wang-jingchuan':['2005-01-01','year','earlier','unknown'],'sjtu-wang-chenggang':['2026-05-01','month','recent','early_career'],'sjtu-yan-youcan':['2026-01-01','year','recent','early_career'],'sjtu-yang-ruigang':['2024-02-01','month','recent','previous_faculty'],'sjtu-yu-tingting':['2026-03-01','month','recent','previous_faculty']};
 for(const [id,[date,precision,status,context]]of Object.entries(expected)){const row=profile(id).appointmentReview;assert.equal(row.earliestDate,date);assert.equal(row.precision,precision);assert.equal(appointmentStatus(profile(id)),status);assert.equal(row.careerContext,context);assert.equal(row.checkedDate,'2026-10-19');assert.match(renderAppointmentReview(profile(id)),/本人当前|核验 2026-10-19/);}
 assert.match(profile('sjtu-wang-chenggang').appointmentReview.noteZh,/博士后/);assert.match(profile('sjtu-wang-jingchuan').appointmentReview.noteZh,/在职博士.*转院不重置/);assert.match(profile('sjtu-yan-youcan').appointmentReview.noteZh,/不将2025/);
 const counts={};for(const row of p){const k=appointmentStatus(row);counts[k]=(counts[k]||0)+1;}assert.deepEqual(counts,{earlier:132,recent:94,unknown:256,boundary:10});
});

test('direct-response and same-day cached evidence are distinguished and current data still require every exact independent receipt',()=>{
 assert.equal(audit.sourceLedger.length,22);for(const s of audit.sourceLedger){assert(s.section);assert.equal(new URL(s.url).protocol,'https:');assert.match(s.contentSha256,/^[a-f0-9]{64}$/);assert.equal(s.httpStatus,200);if(s.retrieval==='same_day_cached_public_response')assert.match(s.readLimit,/新请求超时/);else assert.equal(s.retrieval,'direct_public_response');}
 const files=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(n=>n.endsWith('.json')).map(n=>['data/'+n,json('data/'+n)]));assertReviewedPublicData(files,raw);
 const fake=structuredClone(files);fake['data/catalog.json'].advisors.find(a=>a.id==='hkust-yajing-shen').openingDetails.find(d=>d.degree==='PhD').remainingHeadcountVerified=true;assert.throws(()=>assertReviewedPublicData(fake,raw));
 const altered=structuredClone(files);altered['data/catalog.json'].advisors.find(a=>a.id==='hku-xihui-liu').routeAssociations.at(-1).verificationStatus='verified';assert.throws(()=>assertReviewedPublicData(altered,raw));
 assert.equal(crypto.createHash('sha256').update(raw('tests/fixtures/evidence/appointment-source-followup-20261019.json')).digest('hex'),'cdacd80c134789c7876c26965562a6b7fbd8678cfb097d8bd25f8d26678d6ef5');
});
