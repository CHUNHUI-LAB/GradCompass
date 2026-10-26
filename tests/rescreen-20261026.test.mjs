import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browseAdvisors,buildOpportunities,hasVerifiedAssociation} from '../assets/core.js';
import {appointmentStatus,appointmentWindow} from '../assets/appointments.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {reviewedPublicData,assertReviewedPublicData} from './reviewed-public-data.mjs';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(raw(p));
// Preserve the original published October 26 batch; current data are independently checked below.
const dated=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/rescreen-20261026.json'});
const c=dated['data/catalog.json'],p=dated['data/advisor-profiles.json'].profiles;
const audit=json('audits/rescreen-20261026.json'),receipt=json('tests/fixtures/evidence/rescreen-20261026.json');
const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/existing-doctoral-links-20261019.json'});
const old=before['data/catalog.json'],oldP=before['data/advisor-profiles.json'].profiles;
const ids=['pku-yang-ling','pku-he-guannan','sjtu-xia-zeyang','polyu-li-xinfeng','seu-chen-duxin','ustc-zeng-jinzhe'];
const advisor=id=>c.advisors.find(a=>a.id===id),profile=id=>p.find(p=>p.advisorId===id);
const omit=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));

test('six appended people and two resolved historical doctoral gaps are discoverable without fabricating verified opportunities',()=>{
 assert.deepEqual(c.advisors.slice(492).map(a=>a.id),ids);assert.deepEqual(p.slice(492).map(p=>p.advisorId),ids);
 assert(c.routes.at(-1).requirements.every(r=>r.sources.every(s=>!s.url.includes('sjtu.edu.cn'))));assert.equal(c.advisors.length,498);assert.equal(c.routes.length,94);assert.equal(p.length,498);
 const now=new Set(browseAdvisors(c,{opportunityType:'PhD'}).map(a=>a.id)),prior=new Set(browseAdvisors(old,{opportunityType:'PhD'}).map(a=>a.id));
 assert.equal(now.size,495);assert.deepEqual(new Set([...now].filter(id=>!prior.has(id))),new Set([...ids,'hkust-ping-tan','cuhk_zhongyu_li']));
 for(const id of [...ids,'hkust-ping-tan','cuhk_zhongyu_li']){const a=advisor(id),assoc=a.routeAssociations.at(-1),r=c.routes.find(r=>r.id===assoc.routeId);assert.equal(r.degree,'PhD');assert.equal(r.status,'reference');assert.equal(assoc.verificationStatus,'pending');assert(!hasVerifiedAssociation(a,r));}
 const ops=buildOpportunities({...c,raPositions:json('data/ra-positions.json').raPositions});assert.equal(ops.filter(o=>o.kind==='degree').length,57);assert.equal(ops.filter(o=>o.kind==='employment').length,2);
});

test('exact 2028 Fall, year-only invitations, relative-date conflict and unsplit graduate recruitment remain distinct',()=>{
 assert.deepEqual(c.advisors.filter(a=>a.fall2028OpeningVerified).map(a=>a.id),['pku-yang-ling','polyu-li-xinfeng']);
 assert.equal(c.advisors.filter(a=>a.intake2028OpeningVerified).length,7);
 for(const id of ids){const a=advisor(id),d=a.openingDetails.find(d=>d.degree==='PhD');assert.equal(d.status,'explicit');assert.equal(d.cycle2028IntakeVerified,true);assert.equal(d.cycle2028FallVerified,['pku-yang-ling','polyu-li-xinfeng'].includes(id));assert.equal(d.confirmedVacancy,false);assert.equal(d.remainingHeadcountVerified,false);assert.equal(d.projectCycleVerified,false);}
 assert.match(advisor('pku-yang-ling').openings.phd,/每年4–6名.*不是2028当前剩余数/);
 assert.match(advisor('pku-he-guannan').openings.phd,/明年.*日期不一致/);
 assert.match(advisor('seu-chen-duxin').openings.phd,/双选意向数.*竞争指标/);assert.match(advisor('seu-chen-duxin').openings.phd,/不能把双选意向写成已录取/);
 assert.match(advisor('sjtu-xia-zeyang').openings.phd,/2028年.*2027年.*硕士/);
 assert.match(advisor('ustc-zeng-jinzhe').openings.phd,/硕转博.*普通招考/);assert.match(advisor('ustc-zeng-jinzhe').openings.phd,/联合培养.*不能移用/);
 const ma=advisor('sjtu-ma-jin');assert.match(ma.openings.cycle2028,/2028年9月.*未拆分硕士与博士/);assert.notEqual(ma.fall2028OpeningVerified,true);
});

test('training history and expired self-authored recruitment do not become current openings or future cycles',()=>{
 const ping=advisor('hkust-ping-tan'),li=advisor('cuhk_zhongyu_li');
 assert.equal(ping.routeAssociations.at(-1).scope,'doctoral_supervision_history_only');assert.match(ping.openings.phd,/Doctor of Philosophy.*指导记录/);
 assert.equal(li.routeAssociations.at(-1).scope,'historical_personal_doctoral_invitation');assert.match(li.openings.phd,/2026 Fall.*已过去/);
 for(const a of [ping,li]){assert.equal(a.opening,'unknown');assert.equal(a.fall2027OpeningVerified,false);assert.notEqual(a.fall2028OpeningVerified,true);assert.equal(a.routeAssociations.at(-1).individualRecruitmentVerified,false);const prior=old.advisors.find(x=>x.id===a.id);assert.deepEqual(a.openingDetails.filter(d=>d.degree!=='PhD'),prior.openingDetails.filter(d=>d.degree!=='PhD'));}
 assert.deepEqual(audit.pendingDoctoralGaps,['sjtu-wang-chenggang','sjtu-yan-youcan','sjtu-yu-tingting']);
 for(const id of audit.pendingDoctoralGaps)assert(!browseAdvisors(c,{opportunityType:'PhD'}).some(a=>a.id===id));
});

test('appointment dates use effective dates and first institutional roles, with rolling-window and source precision boundaries',()=>{
 assert.deepEqual(appointmentWindow,{asOf:'2026-10-26',start:'2021-10-26',end:'2026-10-26'});
 for(const [id,dt,precision,status]of [['polyu-li-xinfeng','2026-08-03','day','recent'],['pku-he-guannan','2021-09-01','month','earlier'],['sjtu-xia-zeyang','2024-01-01','year','recent'],['ustc-zeng-jinzhe','2025-02-01','month','recent']]){const ar=profile(id).appointmentReview;assert.equal(ar.earliestDate,dt);assert.equal(ar.precision,precision);assert.equal(appointmentStatus(profile(id)),status);assert.equal(ar.checkedDate,'2026-10-26');}
 assert.match(profile('polyu-li-xinfeng').appointmentReview.noteZh,/8月10日.*不作入职日/);assert.equal(profile('sjtu-xia-zeyang').appointmentReview.careerContext,'previous_faculty');
 for(const id of ['pku-yang-ling','seu-chen-duxin'])assert.equal(appointmentStatus(profile(id)),'unknown');
 const counts={};for(const row of p){let k=appointmentStatus(row);counts[k]=(counts[k]||0)+1;}assert.deepEqual(counts,{earlier:133,recent:97,unknown:258,boundary:10});
});

test('all unrelated fields and original ordering survive exactly, and independently pinned receipts guard actual live data',()=>{
 assert.deepEqual(c.routes.slice(0,93),old.routes);assert.deepEqual(c.deadlines,old.deadlines);assert.deepEqual(c.materials,old.materials);
 for(let i=0;i<492;i++){
  const a=c.advisors[i],o=old.advisors[i],keys=['hkust-ping-tan','cuhk_zhongyu_li'].includes(a.id)?['routeIds','routeAssociations','openings','openingDetails']:a.id==='sjtu-ma-jin'?['openingSummary','openings']:[];
  assert.deepEqual(omit(a,keys),omit(o,keys),a.id);if(keys.includes('routeIds')){assert.deepEqual(a.routeIds.slice(0,-1),o.routeIds);assert.deepEqual(a.routeAssociations.slice(0,-1),o.routeAssociations);assert.deepEqual(omit(a.openings,['phd']),omit(o.openings,['phd']));}
  const pr=p[i],op=oldP[i],pk=['hkust-ping-tan','cuhk_zhongyu_li'].includes(pr.advisorId)?['recruitment','links']:[];assert.deepEqual(omit(pr,pk),omit(op,pk),pr.advisorId);
 }
 assert.equal(receipt.operations.length,18);assert.equal(receipt.operations.filter(o=>o.operation==='add').length,13);
 const all=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(n=>n.endsWith('.json')).map(n=>['data/'+n,json('data/'+n)]));assertReviewedPublicData(all,raw);
 for(const mutate of [d=>d.advisors.find(a=>a.id==='sjtu-xia-zeyang').fall2028OpeningVerified=true,d=>d.advisors.find(a=>a.id==='sjtu-xia-zeyang').openingDetails[0].remainingHeadcountVerified=true,d=>d.advisors.find(a=>a.id==='cuhk_zhongyu_li').fall2027OpeningVerified=true]){const changed=structuredClone(all);mutate(changed['data/catalog.json']);assert.throws(()=>assertReviewedPublicData(changed,raw));}
});

test('source access and fact reading have separate scope; homepage templates and rendered doctoral text are explicit',()=>{
 assert.equal(audit.sourceAccess.length,202);assert.equal(audit.sourceLedger.length,13);for(const s of audit.sourceLedger){assert.equal(s.checkedDate,'2026-10-26');assert.equal(s.httpStatus,200);assert.match(s.contentSha256,/^[a-f0-9]{64}$/);assert(s.section);}
 const mias=audit.unchangedReviewedSignals.find(r=>r.advisorId==='tongji-fan-rui');assert.equal(mias.retrieval,'browser_rendered_visible_text');assert.match(mias.extractedTextSha256,/^[a-f0-9]{64}$/);assert.match(mias.readLimit,/静态HTML.*壳/);
 assert.match(renderProfile(profile('sjtu-xia-zeyang')),/只见模板标题/);
 for(const id of ids){const html=renderProfile(profile(id))+renderProfileReferences(profile(id));assert(!/undefined|\[object Object\]/.test(html));assert.match(html,/2026-10-26/);assert.deepEqual(profile(id).representativeWorks,[]);}
 assert.equal(crypto.createHash('sha256').update(raw('tests/fixtures/evidence/existing-doctoral-links-20261019.json')).digest('hex'),'4deb13767bbd8622bce061197cb9ae68db3543c2bbc2e0c268d22f121e2b238c');
});
