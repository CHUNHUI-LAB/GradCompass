import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,institutionLabel} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),read=p=>JSON.parse(raw(p));
const stage=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-neu-20261116.json'}),c=stage['data/catalog.json'],p=stage['data/advisor-profiles.json'],audit=read('audits/985-neu-20261116.json'),rows=c.advisors.filter(a=>a.institution==='NEU'),profiles=p.profiles.filter(a=>a.advisorId.startsWith('neu-')),win=createAppointmentWindow('2026-11-16');
const a=n=>rows.find(x=>x.nameZh===n),profile=n=>profiles.find(x=>x.advisorId===a(n).id),entry=n=>audit.entries.find(x=>x.name===n);
test('Northeastern China appends sourced records without altering the 982-person and 103-route baseline',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-dlut-20261116.json'});
 assert.equal(rows.length,72);assert.equal(profiles.length,72);assert.equal(c.advisors.length,1054);assert.equal(c.routes.length,104);
 assert.deepEqual(c.advisors.slice(0,982),before['data/catalog.json'].advisors);assert.deepEqual(c.routes.slice(0,103),before['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,982),before['data/advisor-profiles.json'].profiles);
 for(const k of Object.keys(c).filter(k=>!['advisors','routes'].includes(k)))assert.deepEqual(c[k],before['data/catalog.json'][k]);
 assert.equal(new Set(c.advisors.map(x=>x.id)).size,c.advisors.length);
});
test('NEU references preserve year, degree and admission-route uncertainty',()=>{
 assert.equal(institutionLabel('NEU'),'东北大学');assert.equal(browseAdvisors(c,{query:'东北大学'}).length,72);assert.equal(browseRoutes(c,{institution:'NEU'}).length,1);
 assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);assert.equal(browseAdvisors(c,{intake:'known2028'}).length,4);assert.equal(browseAdvisors(c,{intake:'fall2028_phd'}).length,1);
 for(const x of rows){assert.equal(x.eligibility,'pending');assert.deepEqual(x.openingDetails,[]);assert.equal(x.fall2028OpeningVerified,false);assert.equal(x.routeAssociations[0].individualRecruitmentVerified,false);assert.equal(x.routeAssociations[0].status,'reference');}
 const route=c.routes.find(x=>x.institution==='NEU');assert.equal(route.noMasterRequired,false);assert.match(route.eligibilitySummary,/学士6年/);assert.match(route.eligibilitySummary,/在职同等学力/);assert.match(route.eligibilitySummary,/推免/);
});
test('NEU appointment precision retains the 2021 boundary and officially linked personal evidence',()=>{
 assert.equal(profiles.filter(x=>appointmentStatus(x,win)==='recent').length,3);
 assert.equal(appointmentStatus(profile('项顶顶'),win),'boundary');const unsafe=structuredClone(profile('杨建宇'));unsafe.appointmentReview.sources[0].url='ftp://example.org/cv';assert.equal(appointmentStatus(unsafe,win),'unknown');assert.equal(appointmentStatus(profile('杨建宇'),win),'earlier');assert.equal(profile('杨建宇').appointmentReview.dateText,'2006-08');assert.equal(appointmentStatus(profile('于尚书'),win),'recent');assert.equal(profile('于尚书').appointmentReview.dateText,'2025-06');assert.equal(appointmentStatus(profile('任秀秀'),win),'recent');assert.equal(appointmentStatus(profile('张付'),win),'recent');
 for(const n of ['李新德','王军义','房立金'])assert.equal(appointmentStatus(profile(n),win),'unknown');
 assert(profile('于尚书').appointmentReview.sources.some(s=>s.access==='self_authored_body_officially_linked'));
});
test('NEU same-name and limited doctoral roles never inherit stronger annual status',()=>{
 assert(entry('张力').annualDirectory2027.matches.every(x=>x.email==='zhanglime@neuq.edu.cn'));
 assert(entry('刘宇').annualDirectory2027.matches.every(x=>x.email==='yuliu@me.neu.edu.cn'));
 assert.equal(entry('刘威').annualDirectory2027.matched,false);assert.equal(entry('王舒禹').annualDirectory2027.matched,false);assert.match(a('王舒禹').position,/项目博士导师/);assert(!a('王舒禹').position.includes('博士生导师'));
 assert.equal(rows.some(x=>x.nameZh==='孙聪'),false);
 for(const x of audit.entries)assert(x.annualDirectory2027.matches.every(m=>!m.note.includes('校外兼职')));
});
test('NEU records disclose actual source scope, HTTP recovery and non-exhaustive screening',()=>{
 assert.equal(audit.notExhaustive,true);assert.equal(audit.directoryCoverage.pageCount,134);assert.equal(audit.directoryCoverage.parsedRows,2808);assert.deepEqual(audit.directoryCoverage.unparsedRows,[]);
 assert.equal(audit.coverage.robotics.profileFetchTotal,197);assert.equal(audit.coverage.robotics.profileTextEmpty,25);assert.equal(audit.coverage.vision.batchFetch.total.attempted,195);
 for(const x of rows)for(const s of x.sources){assert(/^https?:/.test(s.url));assert(s.title&&s.section&&s.readScope);}
 for(const x of profiles){assert.equal(x.representativeWorks.length,0);assert.equal(x.confirmedVacancy,false);assert(!/undefined|\[object Object\]/.test(renderProfile(x)+renderProfileReferences(x)));assert(x.appointmentReview.sources.every(s=>!s.url.includes('yz.neu.edu.cn')));}
 assert(!/\/workspace\/|localFullText|evidenceExcerpts|父线程|主任务|"bodyFile"/.test(JSON.stringify(audit)));
});
