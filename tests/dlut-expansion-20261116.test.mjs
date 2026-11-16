import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,browseRoutes,buildOpportunities,institutionLabel} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),read=p=>JSON.parse(raw(p)),stage=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-dlut-20261116.json'}),c=stage['data/catalog.json'],p=stage['data/advisor-profiles.json'],audit=read('audits/985-dlut-20261116.json'),rows=c.advisors.filter(a=>a.institution==='DLUT'),profiles=p.profiles.filter(a=>a.advisorId.startsWith('dlut-')),win=createAppointmentWindow('2026-11-16');
test('Dalian appends 92 sourced profiles and one reference while preserving all 890 prior records',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-tju-20261116.json'});
 assert.equal(rows.length,92);assert.equal(profiles.length,92);assert.equal(c.advisors.length,982);assert.equal(c.routes.length,103);
 assert.deepEqual(c.advisors.slice(0,890),before['data/catalog.json'].advisors);assert.deepEqual(c.routes.slice(0,102),before['data/catalog.json'].routes);assert.deepEqual(p.profiles.slice(0,890),before['data/advisor-profiles.json'].profiles);
 for(const k of Object.keys(c).filter(k=>!['advisors','routes'].includes(k)))assert.deepEqual(c[k],before['data/catalog.json'][k]);
 assert.equal(new Set(c.advisors.map(a=>a.id)).size,c.advisors.length);
});
test('Dalian discovery and doctoral reference filters do not manufacture 2028 recruitment',()=>{
 assert.equal(institutionLabel('DLUT'),'大连理工大学');assert.equal(browseAdvisors(c,{query:'大连理工大学'}).length,92);assert.equal(browseRoutes(c,{institution:'DLUT'}).length,1);
 assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);assert.equal(browseAdvisors(c,{intake:'known2028'}).length,4);assert.equal(browseAdvisors(c,{intake:'fall2028_phd'}).length,1);
 for(const a of rows){assert.equal(a.eligibility,'pending');assert.deepEqual(a.openingDetails,[]);assert.equal(a.fall2028OpeningVerified,false);assert.equal(a.routeAssociations.length,1);assert.equal(a.routeAssociations[0].individualRecruitmentVerified,false);assert.equal(a.routeAssociations[0].status,'reference');}
});
test('Dalian source precision excludes ambiguous postdocs and keeps senior transfer separate',()=>{
 const byName=n=>profiles.find(p=>p.advisorId===rows.find(a=>a.nameZh===n).id);
 assert.equal(profiles.filter(p=>appointmentStatus(p,win)==='recent').length,15);
 assert.equal(appointmentStatus(byName('郭迪'),win),'unknown');assert.equal(appointmentStatus(byName('张璐'),win),'recent');assert.equal(appointmentStatus(byName('阮翔'),win),'recent');
 assert.equal(byName('阮翔').appointmentReview.careerContext,'industry_transition');assert.equal(byName('张焯然').appointmentReview.careerContext,'previous_faculty');assert.equal(rows.some(a=>a.nameZh==='郭韦宏'),false);
});
test('Dalian annual directory joins reject same-name identities and retain missing rows as unknown',()=>{
 const get=n=>audit.entries.find(e=>e.name===n);
 assert.equal(audit.entries.filter(e=>e.annualDirectory2027.matched).length,85);
 assert(get('刘宇').annualDirectory2027.matches.every(x=>x.email==='liuyu8824@dlut.edu.cn'));
 assert(get('张伟').annualDirectory2027.matches.every(x=>x.departmentId==='040'&&x.email==='weizhang@dlut.edu.cn'));
 for(const n of ['刘洋','林秋华','刘俊辉','丛明','王晓东','褚金奎','王雪芳'])assert.equal(get(n).annualDirectory2027.matched,false,n);
 assert.notEqual(rows.find(a=>a.nameZh==='王东').id,rows.find(a=>a.nameZh==='王栋').id);
});
test('Dalian coverage, source scope, rendering and observation exclusions are explicit',()=>{
 assert.equal(audit.notExhaustive,true);assert.equal(audit.rosterScreening.length,235);assert.equal(audit.directoryCoverage.bodySuccess,38);
 for(const e of audit.entries){assert.equal(e.doctoral_verified,true);assert(e.doctoral_evidence&&e.research&&e.sources.length);}
 for(const a of rows)for(const s of a.sources){assert(s.url.startsWith('https:'));assert(s.title&&s.section&&s.readScope);}
 for(const x of profiles){assert.equal(x.representativeWorks.length,0);assert.equal(x.confirmedVacancy,false);assert(!/undefined|\[object Object\]/.test(renderProfile(x)+renderProfileReferences(x)));}
 const marineIds=['guo-di','wang-yunlong','yu-yanyun','sun-tiezhi','liu-kai','zhou-wenya','peng-haijun','wang-yiqiang'].map(id=>'dlut-'+id);
 const directorySources=value=>{
  if(!value||typeof value!=='object')return [];
  return [...(typeof value.url==='string'&&value.url.includes('/zsmlYjfx/2027/')&&value.readScope?[value]:[]),...Object.values(value).flatMap(directorySources)];
 };
 for(const id of marineIds){
  const profile=profiles.find(x=>x.advisorId===id),advisor=rows.find(x=>x.id===id),entry=audit.entries.find(x=>x.id===id);
  assert(profile&&advisor&&entry,id+' marine records must remain present');
  assert(profile.appointmentReview.sources.length>0,id+' appointment must retain evidence');
  for(const source of profile.appointmentReview.sources){assert.equal(new URL(source.url).hostname,'faculty.dlut.edu.cn');assert(!source.url.includes('/zsmlYjfx/'),id+' appointment cannot cite an annual directory');}
  const sources=[advisor,profile,entry].flatMap(directorySources);
  assert(sources.length>0,id+' annual-directory evidence must remain available');
  for(const source of sources){
   assert.match(source.title,/2027博士目录/);
   for(const scope of [source.section,source.readScope]){
    assert.match(scope,/列名与研究方向/);assert.match(scope,/年度目录不等于个人接收或2028名额/);
    assert.match(scope,/不证明个人任职履历/);
    assert(!/工作经历|个人导师类型|任职履历/.test(scope.replaceAll('不证明个人任职履历','')),id+' directory scope must not claim biography evidence');
   }
  }
 }
 assert(!/\/workspace\/|localFullText|evidenceExcerpts|父线程|主任务|"bodyFile"/.test(JSON.stringify(audit)));
});
