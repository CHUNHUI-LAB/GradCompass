import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,buildOpportunities} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),read=p=>JSON.parse(raw(p));
const s=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/tongji-tianye-20261117.json'}),c=s['data/catalog.json'],p=s['data/advisor-profiles.json'],a=c.advisors.find(x=>x.id==='tongji-tianye'),z=p.profiles.find(x=>x.advisorId===a.id),audit=read('audits/tongji-tianye-20261117.json');
test('Tian Ye is an independent one-person delta after the HIT release',()=>{
 const b=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-hit-20261117.json'});assert.equal(c.advisors.length,1209);assert.equal(p.profiles.length,1209);assert.equal(c.routes.length,106);assert.deepEqual(c.advisors.slice(0,1208),b['data/catalog.json'].advisors);assert.deepEqual(p.profiles.slice(0,1208),b['data/advisor-profiles.json'].profiles);for(const k of Object.keys(c).filter(k=>k!=='advisors'))assert.deepEqual(c[k],b['data/catalog.json'][k]);
});
test('Tian Ye preserves conflicting 2028 Fall plans without inventing vacancy or a doctoral route',()=>{
 assert.equal(a.fall2028OpeningVerified,true);assert.equal(a.intake2028OpeningVerified,true);assert.match(a.openingSummary,/TOPS写2名/);assert.match(a.openingSummary,/学院写2–3名/);assert.match(a.openingSummary,/申请考核.*待核/);assert.deepEqual(a.routeIds,[]);assert.deepEqual(a.routeAssociations,[]);assert.equal(a.eligibility,'pending');assert.equal(a.openingDetails[0].confirmedVacancy,false);assert.equal(a.openingDetails[0].remainingHeadcountVerified,false);assert.equal(z.confirmedVacancy,false);
 assert.equal(browseAdvisors(c,{intake:'known2028'}).length,6);assert.equal(browseAdvisors(c,{intake:'fall2028_phd'}).length,2);assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);assert.deepEqual(audit.evidence.recruitment.map(x=>x.phdPlan),['2','2–3']);
});
test('Tian Ye first appointment is 2018, not conflicting tenured promotions',()=>{
 assert.equal(z.appointmentReview.precision,'year');assert.equal(z.appointmentReview.earliestDate,'2018-01-01');assert.equal(z.appointmentReview.latestDate,'2018-12-31');assert.equal(appointmentStatus(z,createAppointmentWindow('2026-11-17')),'earlier');assert.equal(a.newPi.verified,false);assert.deepEqual(audit.evidence.appointment.map(x=>x.firstNonPostdoc),['2018-05','2018-04']);assert(!/undefined|\[object Object\]/.test(renderProfile(z)));assert(!/\/workspace\/|sourceSnapshots|rawEvidence/.test(JSON.stringify(audit)));
});
