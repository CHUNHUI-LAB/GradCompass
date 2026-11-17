import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,buildOpportunities,institutionLabel} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),read=p=>JSON.parse(raw(p));
const state=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-hit-20261117.json'}),c=state['data/catalog.json'],p=state['data/advisor-profiles.json'],rows=c.advisors.filter(a=>a.institution==='HIT'),profiles=p.profiles.filter(x=>x.advisorId.startsWith('hit-')),audit=read('audits/985-hit-20261117.json');
const by=n=>rows.find(x=>x.nameZh===n),profile=n=>profiles.find(x=>x.advisorId===by(n).id);
test('HIT appends 46 individually sourced records, preserving 1162 advisors and 105 routes',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-jlu-20261116.json'});
 assert.equal(rows.length,46);assert.equal(profiles.length,46);assert.equal(c.advisors.length,1208);assert.equal(c.routes.length,106);
 assert.deepEqual(c.advisors.slice(0,1162),before['data/catalog.json'].advisors);assert.deepEqual(c.routes.slice(0,105),before['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,1162),before['data/advisor-profiles.json'].profiles);
 for(const key of Object.keys(c).filter(k=>!['advisors','routes'].includes(k)))assert.deepEqual(c[key],before['data/catalog.json'][key]);
 assert.equal(new Set(c.advisors.map(x=>x.id)).size,c.advisors.length);
});
test('HIT campus and Sun recruitment boundaries are explicit',()=>{
 assert.equal(institutionLabel('HIT'),'哈尔滨工业大学');assert.equal(browseAdvisors(c,{query:'哈工大'}).length,46);
 assert.equal(rows.filter(x=>x.department.startsWith('哈尔滨本部')).length,23);assert.equal(rows.filter(x=>x.department.startsWith('深圳')).length,15);assert.equal(rows.filter(x=>x.department.startsWith('威海')).length,8);
 assert.equal(by('孙士龙').intake2028OpeningVerified,true);assert.equal(by('孙士龙').fall2028OpeningVerified,false);assert.match(by('孙士龙').openingSummary,/2027\/2028/);
 for(const x of rows.filter(x=>x.nameZh!=='孙士龙')){assert.equal(x.intake2028OpeningVerified,false);assert.equal(x.fall2028OpeningVerified,false);assert.deepEqual(x.openingDetails,[]);}
 assert.equal(browseAdvisors(c,{intake:'known2028'}).length,5);assert.equal(browseAdvisors(c,{intake:'fall2028_phd'}).length,1);
 assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);
});
test('HIT first appointment is not promotion, qualification or postdoc',()=>{
 const win=createAppointmentWindow('2026-11-17');assert.equal(appointmentStatus(profile('曹政才'),win),'recent');assert.equal(profile('曹政才').appointmentReview.dateText,'2024-02');
 assert.equal(profile('张福海').appointmentReview.dateText,'2011');assert.equal(appointmentStatus(profile('张福海'),win),'earlier');assert.equal(appointmentStatus(profile('孙士龙'),win),'earlier');
 for(const n of ['张号','江俊君','倪风雷','袁晗','姚玉峰','黄博'])assert.equal(appointmentStatus(profile(n),win),'unknown');
});
test('HIT partial coverage does not claim annual directory or vacancy verification',()=>{
 assert.equal(audit.notExhaustive,true);assert.equal(audit.addedCount,46);assert.match(audit.annualCoverage,/未重建/);
 for(const x of rows){assert.equal(x.eligibility,'pending');assert.equal(x.routeAssociations[0].status,'reference');assert.equal(x.routeAssociations[0].individualRecruitmentVerified,false);for(const s of x.sources)assert(s.url.startsWith('https:')&&s.title&&s.section&&s.readScope);}
 for(const x of profiles){assert.equal(x.confirmedVacancy,false);assert(!/undefined|\[object Object\]/.test(renderProfile(x)));}
 assert(!/\/workspace\/|sourceSnapshot|rawEvidence|bodyFile/.test(JSON.stringify(audit)));
});
