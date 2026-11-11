import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,institutionLabel,filterAdvisors} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {recruitmentPriority,hasPersonalMSc2028} from '../assets/recruitment-priorities.js';
import {renderAdvisorPriorities} from '../assets/advisor-priorities.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
const raw=f=>fs.readFileSync(new URL('../'+f,import.meta.url)),read=f=>JSON.parse(raw(f));
const c=read('data/catalog.json'),p=read('data/advisor-profiles.json'),audit=read('audits/985-bnu-20261111.json'),rows=c.advisors.filter(a=>a.institution==='BNU'),profiles=p.profiles.filter(a=>a.advisorId.startsWith('bnu-'));
const win=createAppointmentWindow('2026-11-11'),get=n=>rows.find(a=>a.nameZh===n),profile=n=>profiles.find(p=>p.advisorId===get(n).id);
test('BNU adds eleven evidence-backed people and one reference while preserving every prior public record',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-cau-20261108.json'});
 assert.equal(rows.length,11);assert.equal(profiles.length,11);assert.equal(c.advisors.length,745);assert.equal(c.routes.length,98);assert.equal(p.profiles.length,745);
 assert.deepEqual(c.advisors.slice(0,734),before['data/catalog.json'].advisors);assert.deepEqual(c.routes.slice(0,97),before['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,734),before['data/advisor-profiles.json'].profiles);
 assert.equal(new Set(rows.map(x=>x.nameZh)).size,11);assert.equal(institutionLabel('BNU'),'北京师范大学');assert.equal(browseAdvisors(c,{query:'北师大'}).length,11);
 assert.equal(browseAdvisors(c,{institution:'BNU',degree:'PhD'}).length,11);assert.equal(browseRoutes(c,{institution:'BNU'}).length,1);
 const ops=buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions});assert.equal(ops.length,59);assert.equal(ops.filter(o=>o.kind==='degree').length,57);assert.equal(ops.filter(o=>o.kind==='employment').length,2);
 for(const a of rows){assert.equal(a.eligibility,'pending');assert.equal(a.newPi.verified,false);assert.equal(a.routeAssociations.length,1);assert.equal(a.routeAssociations[0].status,'reference');assert.equal(a.routeAssociations[0].projectCycleVerified,false);assert.equal(a.routeAssociations[0].individualRecruitmentVerified,false);assert.equal(profile(a.nameZh).confirmedVacancy,false);}
});
test('Huang personal dated Fall 2028 MSc and PhD plans stay separate from vacancies, institutional routes and prior three signals',()=>{
 const a=get('黄石生');assert.equal(a.openingDetails.length,2);
 for(const [degree,n]of [['MSc',2],['PhD',1]]){const r=a.openingDetails.find(r=>r.degree===degree);assert.equal(r.noticeDate,'2026-07');assert.equal(r.cycle2028FallVerified,true);assert.equal(r.individualRecruitmentVerified,true);assert.equal(r.projectCycleVerified,false);assert.equal(r.degreeRouteAssociated,false);assert.equal(r.confirmedVacancy,false);assert.equal(r.remainingHeadcountVerified,false);assert.match(r.summary,new RegExp(n+'名'));assert(r.sources.every(s=>s.url==='https://shishenghuang.github.io/index/'&&s.checkedDate==='2026-11-11'&&s.section.startsWith('招生信息：2026/07')&&s.readScope.startsWith('招生信息：2026/07')));}
 assert(a.sources.some(s=>s.url==='https://ai.bnu.edu.cn/xygk/szdw/fgj/b7a9a28e8e254f2ca29c6926eeb31e60.htm'));
 assert.equal(recruitmentPriority(a,win.asOf),'fall2028_phd');assert.equal(recruitmentPriority(a,'2026-11-10'),'unknown');assert(hasPersonalMSc2028(a,win.asOf));
 assert.equal(browseAdvisors(c,{intake:'known2028'}).length,4);assert.deepEqual(browseAdvisors(c,{intake:'fall2028_phd'}).map(a=>a.id),[a.id]);
 assert.deepEqual(browseAdvisors(c,{intake:'known2028',degree:'MSc'}).map(a=>a.id),[a.id]);assert.equal(browseAdvisors(c,{intake:'fall2028_phd',degree:'MSc'}).length,0);
 assert.equal(filterAdvisors(c,{degree:'MSc'}).some(x=>x.id===a.id),false);assert(!c.routes.some(r=>r.institution==='BNU'&&r.degree==='MSc'));
 const html=renderAdvisorPriorities(c,{},'ready');assert.match(html,/已核实 2028 招募线索：4 位导师/);assert.match(html,/明确秋季博士 1 位/);assert(!html.includes('精确秋季博士为 0'));
 for(const other of rows.filter(x=>x!==a)){assert.equal(other.opening,'unknown');assert.deepEqual(other.openingDetails,[]);assert.equal(recruitmentPriority(other,win.asOf),'unknown');}
});
test('BNU recent employment dates preserve original precision, boundary and unverified event types',()=>{
 for(const [n,d]of [['王一凯','2024'],['张鸿文','2023-10'],['钟方威','2024']]){assert.equal(appointmentStatus(profile(n),win),'recent');assert.equal(profile(n).appointmentReview.dateText,d);}
 assert.equal(profiles.filter(p=>appointmentStatus(p,win)==='recent').length,3);assert.equal(appointmentStatus(profile('黄永祯'),win),'boundary');assert.equal(appointmentStatus(profile('黄石生'),win),'earlier');assert.equal(appointmentStatus(profile('韩战钢'),win),'unknown');assert.equal(profile('韩战钢').appointmentReview.appointmentConfirmed,false);
 assert.equal(profile('卢宇').appointmentReview.earliestDate,null);assert.equal(profile('卢宇').appointmentReview.latestConfirmedBound,'2016-09-30');assert.match(profile('卢宇').appointmentReview.dateText,/不晚于/);assert.equal(get('卢宇').position,'教授');assert.match(get('卢宇').caveats.join(' '),/副教授/);
 assert.equal(profile('余胜泉').appointmentReview.dateText,'2000-09');
});
test('BNU coverage is bounded and deduplicated, with source-specific interdisciplinary and admissions limitations',()=>{
 assert.equal(audit.notExhaustive,true);assert.equal(audit.coverage.ai.total,69);assert.equal(audit.coverage.ai.emptyProfiles,8);assert.equal(audit.coverage.computingUniqueCount,68);assert.equal(audit.coverage.computing.reduce((n,r)=>n+r.count,0),94);
 assert.equal(new Set(audit.observationPool.map(r=>r.name)).size,audit.observationPool.length);for(const n of ['陈鹏鹤','陈巍','党健宁'])assert(audit.observationPool.some(r=>r.name===n));
 for(const n of ['卢宇','余胜泉'])assert.match(get(n).caveats.join(' '),/共同作者|教育实体机器人/);assert.match(audit.officialAdmissions.excludedWrongRoute.reason,/666/);
 assert(!rows.some(r=>r.nameZh==='陈鹏鹤'));assert.match(JSON.stringify(audit.officialAdmissions),/2027/);
 for(const a of rows)for(const s of a.sources){assert(s.url.startsWith('https:'));assert(s.section&&s.readScope);assert.equal(s.checkedDate,'2026-11-11');}
});
test('BNU public profiles render without private context or invented paper reading',()=>{
 for(const p of profiles){const html=renderProfile(p)+renderProfileReferences(p);assert(!/undefined|\[object Object\]/.test(html));assert.equal(p.representativeWorks.length,0);assert(p.unknowns.length>=2);}
 for(const privateText of ['/workspace/','<transcript_evidence>','user_gpa','private_fit'])assert(!JSON.stringify({rows,profiles,audit}).includes(privateText));
});
