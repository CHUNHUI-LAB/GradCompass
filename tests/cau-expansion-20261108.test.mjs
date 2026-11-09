import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,institutionLabel} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
const raw=f=>fs.readFileSync(new URL('../'+f,import.meta.url)),read=f=>JSON.parse(raw(f));
const c=read('data/catalog.json'),p=read('data/advisor-profiles.json'),a=read('audits/985-cau-20261108.json');
const rows=c.advisors.filter(x=>x.institution==='CAU'),profiles=p.profiles.filter(x=>x.advisorId.startsWith('cau-')),window=createAppointmentWindow('2026-11-08');
test('CAU adds one school without rewriting any earlier advisor, route or profile',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-bit-20261105.json'});
 assert.equal(rows.length,52);assert.equal(profiles.length,52);assert.equal(a.addedCount,52);assert.equal(c.advisors.length,734);assert.equal(c.routes.length,97);
 assert.deepEqual(c.advisors.slice(0,682),before['data/catalog.json'].advisors);assert.deepEqual(c.routes.slice(0,96),before['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,682),before['data/advisor-profiles.json'].profiles);
 assert.equal(new Set(rows.map(x=>x.id)).size,52);assert.equal(rows.filter(x=>x.department.startsWith('工学院')).length,22);assert.equal(rows.filter(x=>x.department.startsWith('信息与电气')).length,20);
});
test('CAU doctoral identity and annual qualification remain references without invented intake, eligibility, quota or opportunities',()=>{
 for(const x of rows){assert.equal(x.checkedDate,'2026-11-08');assert.equal(x.eligibility,'pending');assert.equal(x.opening,'unknown');assert.equal(x.newPi.verified,false);assert.deepEqual(x.openingDetails,[]);for(const k of ['intake2027OpeningVerified','intake2028OpeningVerified','fall2027OpeningVerified','fall2028OpeningVerified'])assert.equal(x[k],false);assert.equal(x.routeAssociations.length,1);const r=x.routeAssociations[0];assert.equal(r.status,'reference');assert.equal(r.individualRecruitmentVerified,false);assert.match(r.summary,/博导|博士/);assert.ok(x.sources.every(s=>s.url.startsWith('https:')&&s.section&&s.checkedDate==='2026-11-08'));assert.equal(profiles.find(p=>p.advisorId===x.id).confirmedVacancy,false);}
 assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);assert.equal(browseAdvisors(c,{institution:'CAU',degree:'PhD'}).length,52);for(const intake of ['fall2028_phd','known2028'])assert.equal(browseAdvisors(c,{institution:'CAU',intake}).length,0);assert.equal(browseAdvisors(c,{institution:'CAU',intake:'unknown'}).length,52);assert.equal(browseRoutes(c,{institution:'CAU'}).length,1);assert.equal(institutionLabel('CAU'),'中国农业大学');
});
test('CAU appointment precision and bounded dates are not replaced by promotions, postdocs or proposed hiring dates',()=>{
 const get=n=>profiles.find(p=>p.advisorId===rows.find(x=>x.nameZh===n).id),counts={};for(const p of profiles){const s=appointmentStatus(p,window);counts[s]=(counts[s]||0)+1;}assert.deepEqual(counts,{unknown:29,earlier:18,boundary:1,recent:4});
 for(const [n,d] of [['宗凯彬','2023-09'],['傅成','2024-10'],['马浚诚','2023-06'],['李建功','2022']]){assert.equal(appointmentStatus(get(n),window),'recent');assert.equal(get(n).appointmentReview.dateText,d);}
 assert.equal(get('李建功').appointmentReview.precision,'year');assert.equal(appointmentStatus(get('张昭'),window),'boundary');assert.equal(get('张昭').appointmentReview.latestDate,'2021-11-30');assert.equal(appointmentStatus(get('刘金存'),window),'earlier');assert.equal(get('刘金存').appointmentReview.latestDate,'2021-04-28');assert.match(get('傅成').appointmentReview.noteZh,/此前|研究员/);
});
test('CAU observations keep qualification conflicts and access gaps outside the confirmed doctoral cohort',()=>{
 assert.equal(a.notExhaustive,true);assert.equal(a.observationPool.length,50);assert.equal(a.excludedOrOutOfScope.length,3);assert.equal(a.coverage.engineering.ledger.length,125);assert.equal(a.admissionsSources.length,6);for(const n of ['张庆','张俊雄','王昌陵','林子钰','秦兆博','苏道毕力格','陈度']){assert.ok(!rows.some(x=>x.nameZh===n));assert.ok(a.observationPool.some(x=>x.name===n));}assert.ok(a.entries.every(x=>x.doctoralEvidenceDetail&&x.roboticsTaskEvidence&&x.sources.length));assert.match(JSON.stringify(a.officialAdmissions),/403/);
});
test('CAU public descriptions render safely without raw private context or invented full-paper conclusions',()=>{
 for(const p of profiles){const html=renderProfile(p)+renderProfileReferences(p);assert.ok(!/undefined|\[object Object\]/.test(html));assert.ok(!html.includes('名额已确认'));assert.equal(p.representativeWorks.length,0);assert.ok(p.unknowns.length>=2);}
 for(const text of ['/workspace/','<transcript_evidence>','user_gpa','private_fit'])assert.ok(!JSON.stringify({rows,profiles,a}).includes(text));
});
