import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const receipt='tests/fixtures/evidence/hnu-supplement-20261117.json';
const s=reviewedPublicData(raw,{throughReceipt:receipt}),c=s['data/catalog.json'],p=s['data/advisor-profiles.json'];
const b=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-hnu-20261117.json'});
const rows=c.advisors.slice(1400),profiles=p.profiles.slice(1400),audit=JSON.parse(raw('audits/hnu-supplement-20261117.json'));
const w=createAppointmentWindow('2026-11-17'),by=n=>rows.find(a=>a.nameZh===n),profile=n=>profiles.find(z=>z.advisorId===by(n).id);
test('HNU supplement appends two and preserves every published record and route',()=>{
 assert.equal(c.advisors.length,1402);assert.equal(c.routes.length,113);assert.equal(rows.length,2);assert.equal(profiles.length,2);
 assert.deepEqual(c.advisors.slice(0,1400),b['data/catalog.json'].advisors);assert.deepEqual(c.routes,b['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,1400),b['data/advisor-profiles.json'].profiles);
 assert.deepEqual(rows.map(a=>a.id),['hnu-sunbin','hnu-zhangwandong']);assert.equal(new Set(c.advisors.map(a=>a.id)).size,1402);
});
test('two personal PhD references never become annual eligibility or current vacancies',()=>{
 for(const a of rows){assert.deepEqual(a.routeIds,['hnu-doctoral-faculty-reference-20261117']);assert.equal(a.eligibility,'pending');assert.deepEqual(a.openingDetails,[]);for(const k of ['fall2027OpeningVerified','intake2027OpeningVerified','fall2028OpeningVerified','intake2028OpeningVerified'])assert.equal(a[k],false);assert.equal(a.routeAssociations.length,1);const r=a.routeAssociations[0];assert.equal(r.status,'reference');assert.equal(r.projectCycleVerified,false);assert.equal(r.individualRecruitmentVerified,false);}
 assert.match(by('孙斌').openings.cycle2027,/2027/);assert.match(by('孙斌').openings.cycle2027,/直博/);assert.match(by('孙斌').openings.cycle2027,/申请考核/);assert.match(by('张万栋').openings.cycle2027,/未核/);
 assert.equal(browseAdvisors(c,{intake:'known2028'}).length,9);assert.equal(browseAdvisors(c,{intake:'fall2028_phd'}).length,3);
});
test('first appointment keeps Sun year conflict and Zhang postdoc exclusion',()=>{
 const sun=profile('孙斌').appointmentReview,zhang=profile('张万栋').appointmentReview;
 assert.equal(sun.dateText,'2019');assert.equal(sun.precision,'year');assert.equal(sun.earliestDate,'2019-01-01');assert.equal(sun.latestDate,'2019-12-31');assert.match(sun.noteZh,/2019.06/);assert.match(sun.noteZh,/2019.07/);
 assert.equal(zhang.dateText,'2025-04');assert.equal(zhang.precision,'month');assert.match(zhang.noteZh,/博士后/);assert.equal(appointmentStatus(profile('张万栋'),w),'recent');assert.notEqual(appointmentStatus(profile('孙斌'),w),'recent');assert.equal(profiles.filter(z=>appointmentStatus(z,w)==='recent').length,1);
 const hnuIds=new Set(c.advisors.filter(a=>a.institution==='HNU').map(a=>a.id));assert.equal(p.profiles.filter(z=>hnuIds.has(z.advisorId)&&appointmentStatus(z,w)==='recent').length,14);
});
test('evidence remains private-path free and unchanged intake restrictions render',()=>{
 for(const x of [rows,profiles,audit,JSON.parse(raw(receipt))])assert(!/\/workspace\/|\/tmp\/|sourceSnapshot|rawEvidence|bodyFile/.test(JSON.stringify(x)));
 for(const z of profiles){assert.equal(z.confirmedVacancy,false);assert(!/undefined|\[object Object\]/.test(renderProfile(z)));}
 assert.equal(audit.addedCount,2);assert.equal(audit.doctoralReferenceCount,2);assert.equal(audit.doctoralUnknownCount,0);assert.equal(audit.recentAppointmentCount,1);
 assert.equal(audit.entries.find(a=>a.name==='张万栋').masterSupervisor,null);
});
