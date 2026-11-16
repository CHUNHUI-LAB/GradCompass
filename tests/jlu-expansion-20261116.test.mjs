import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,institutionLabel} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),read=p=>JSON.parse(raw(p));
const stage=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-jlu-20261116.json'}),c=stage['data/catalog.json'],p=stage['data/advisor-profiles.json'],audit=read('audits/985-jlu-20261116.json'),rows=c.advisors.filter(a=>a.institution==='JLU'),profiles=p.profiles.filter(a=>a.advisorId.startsWith('jlu-')),win=createAppointmentWindow('2026-11-16');
const a=n=>rows.find(x=>x.nameZh===n),profile=n=>profiles.find(x=>x.advisorId===a(n).id),entry=n=>audit.entries.find(x=>x.name===n);
test('JLU appends 108 sourced records and preserves the 1054-person 104-route baseline',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-neu-20261116.json'});
 assert.equal(rows.length,108);assert.equal(profiles.length,108);assert.equal(c.advisors.length,1162);assert.equal(c.routes.length,105);
 assert.deepEqual(c.advisors.slice(0,1054),before['data/catalog.json'].advisors);assert.deepEqual(c.routes.slice(0,104),before['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,1054),before['data/advisor-profiles.json'].profiles);
 for(const k of Object.keys(c).filter(k=>!['advisors','routes'].includes(k)))assert.deepEqual(c[k],before['data/catalog.json'][k]);
 assert.equal(new Set(c.advisors.map(x=>x.id)).size,c.advisors.length);
});
test('JLU partial annual plans do not become 2028 intake or verified opportunities',()=>{
 assert.equal(institutionLabel('JLU'),'吉林大学');assert.equal(browseAdvisors(c,{query:'吉林大学'}).length,108);assert.equal(browseRoutes(c,{institution:'JLU'}).length,1);
 assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);assert.equal(browseAdvisors(c,{intake:'known2028'}).length,4);assert.equal(browseAdvisors(c,{intake:'fall2028_phd'}).length,1);
 for(const x of rows){assert.equal(x.eligibility,'pending');assert.deepEqual(x.openingDetails,[]);assert.equal(x.fall2028OpeningVerified,false);assert.equal(x.intake2028OpeningVerified,false);assert.equal(x.routeAssociations[0].individualRecruitmentVerified,false);assert.equal(x.routeAssociations[0].status,'reference');}
 const route=c.routes.find(x=>x.institution==='JLU');assert.equal(route.noMasterRequired,false);assert.match(route.eligibilitySummary,/推免/);assert.match(route.eligibilitySummary,/硕士/);
});
test('JLU appointment dates preserve postdoc and five-year-window boundaries',()=>{
 assert.equal(profiles.filter(x=>appointmentStatus(x,win)==='recent').length,14);
 assert.equal(appointmentStatus(profile('宋姗姗'),win),'boundary');assert.equal(profile('宋姗姗').appointmentReview.dateText,'2021');
 assert.equal(appointmentStatus(profile('麻斌'),win),'recent');assert.equal(profile('麻斌').appointmentReview.dateText,'2023-04');assert.equal(appointmentStatus(profile('毕秋实'),win),'earlier');assert.equal(profile('毕秋实').appointmentReview.dateText,'2021-10');
 for(const n of ['王天皓','杨孔华'])assert.equal(appointmentStatus(profile(n),win),'unknown');
 for(const n of ['毕秋实','赵海艳'])assert.equal(profile(n).appointmentReview.careerContext,'industry_transition');
});
test('JLU same names and restricted doctoral roles retain their individual evidence',()=>{
 const same=rows.filter(x=>x.nameZh==='王刚');assert.equal(same.length,2);assert.equal(new Set(same.map(x=>x.profileUrl)).size,2);assert(same.some(x=>x.id==='jlu-wanggang-cs'));assert(same.some(x=>x.id==='jlu-wanggang-agriculture'));
 assert.match(a('吴宝广').position,/机械工程专业博士导师/);assert.equal(entry('吴宝广').annualDirectory2027.matched,false);
 assert.match(a('梅芳').position,/资格具备.*名额不确定/);assert.equal(a('梅芳').opening,'unknown');
 assert.equal(audit.entries.filter(x=>x.annualDirectory2027.matched).length,89);assert.equal(audit.entries.filter(x=>x.annualDirectory2027.htmlMatched).length,26);assert.equal(audit.entries.filter(x=>x.annualDirectory2027.pdfMatched).length,89);
 for(const x of same){const e=audit.entries.find(e=>e.id===x.id);assert(e.annualDirectory2027.pdfMatches.every(m=>m.department.includes(x.id.endsWith('-cs')?'计算机科学与技术学院':'生物与农业工程学院')));}
 const cs=audit.entries.find(e=>e.id==='jlu-wanggang-cs');assert(cs.annualDirectory2027.pdfMatches.every(m=>m.degreeType==='专业学位'&&m.publishedPlan===null));
 for(const e of audit.entries)for(const m of e.annualDirectory2027.matches){assert.equal(m.name,e.name);assert.match(m.note,/2027公布计划/);assert.match(m.note,/不是2028或当前余位/);}
});
test('JLU audit separates partial HTML and verified full-PDF coverage without private caches',()=>{
 assert.equal(audit.notExhaustive,true);assert.equal(audit.annualCoverage.parsedHtmlRows,139);assert.equal(audit.annualCoverage.pdf.pageCount,138);assert.equal(audit.annualCoverage.pdf.parsedRows,2714);assert.equal(audit.annualCoverage.pdf.matchedAdvisors,89);assert.equal(audit.annualCoverage.htmlMatchedAdvisors,26);assert.equal(audit.annualCoverage.initialAttachmentAttempts.length,2);assert(audit.annualCoverage.initialAttachmentAttempts.every(x=>x.status==='captcha_not_attempted'));assert.equal(audit.annualCoverage.downloadVerification.status,'downloaded_and_verified');assert.equal(audit.entries.reduce((n,x)=>n+x.annualDirectory2027.pdfMatches.length,0),117);
 assert.equal(audit.coverage.robotics.rosterLinks,283);assert.equal(audit.coverage.robotics.mainProfiles,33);assert.match(audit.coverage.robotics.method,/关键词初筛/);
 for(const x of rows)for(const s of x.sources){assert(/^https?:/.test(s.url));assert(s.title&&s.section&&s.readScope);}
 for(const x of profiles){assert.equal(x.representativeWorks.length,0);assert.equal(x.confirmedVacancy,false);assert(!/undefined|\[object Object\]/.test(renderProfile(x)+renderProfileReferences(x)));}
 assert(!/\/workspace\/|\/tmp\/|rawEvidence|localFullText|evidenceExcerpts|父线程|主任务|"bodyFile"/.test(JSON.stringify(audit)));
});
