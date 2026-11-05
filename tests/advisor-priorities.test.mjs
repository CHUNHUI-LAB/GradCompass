import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appointmentStatus,appointmentWindow,createAppointmentWindow,appointmentMatches} from '../assets/appointments.js';
import {recruitmentPriority,intakeMatches} from '../assets/recruitment-priorities.js';
import {renderAdvisorPriorities,priorityCounts} from '../assets/advisor-priorities.js';
import {browseAdvisors,filterOpportunities} from '../assets/core.js';
import {renderAdvisorCard,groupAdvisorResults} from '../assets/advisor-cards.js';
const window=createAppointmentWindow('2026-11-05');
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)));
const catalog=read('catalog.json');catalog.advisorProfiles=new Map(read('advisor-profiles.json').profiles.map(p=>[p.advisorId,p]));
const source={url:'https://example.org/personal-admissions',checkedDate:'2026-11-05'};
const row=(delta={})=>({degree:'PhD',status:'explicit',sourceStatus:'personal_recruitment_statement',individualRecruitmentVerified:true,cycle2028FallVerified:true,sources:[source],...delta});
const advisor=(delta={})=>({id:'sample',institution:'HKU',name:'Sample',position:'Professor',routeIds:['phd'],openingDetails:[row(delta)]});
const appointment=(earliest='2024-01-01',latest=earliest)=>({appointmentReview:{status:'verified',eventType:'first_faculty_research_appointment_current_institution',appointmentConfirmed:true,earliestDate:earliest,latestDate:latest,sources:[source]}});

test('current appointment window follows actual UTC date, with deterministic historical and leap-day evaluations',()=>{
 assert.equal(appointmentWindow.asOf,new Date().toISOString().slice(0,10));
 assert.deepEqual(window,{asOf:'2026-11-05',start:'2021-11-05',end:'2026-11-05'});
 assert.equal(createAppointmentWindow('2028-02-29').start,'2023-02-28');
 assert.throws(()=>createAppointmentWindow('2026-02-30'),RangeError);
 assert.equal(appointmentStatus(appointment('2021-11-05'),window),'recent');
 assert.equal(appointmentStatus(appointment('2021-11-04'),window),'earlier');
 assert.equal(appointmentStatus(appointment('2021-01-01','2021-12-31'),window),'boundary');
 assert.equal(appointmentStatus(appointment('2026-11-06'),window),'unknown');
 assert.equal(appointmentStatus(appointment(),createAppointmentWindow('2026-10-26')),'unknown');
 assert.equal(appointmentStatus(appointment(),window),'recent');
 const future=appointment();future.appointmentReview.sources[0]={...source,checkedDate:'2026-11-06'};
 assert.equal(appointmentStatus(future,window),'unknown');
});

test('all fifteen previously blocked Beihang recent hires use their real November source dates',()=>{
 for(const suffix of ['liu-wenxin','cheng-sheng','yan-jiaqi','shi-di','ren-ziyu','zhang-tao-mechanical','du-hanheng','qi-chao','huang-linjiang','she-rui','yan-rui','liu-aishan','zhou-lipu','ma-xinzhu','feng-bin']){
  const p=catalog.advisorProfiles.get('buaa-'+suffix);assert(p,suffix);
  const before=JSON.stringify(p);assert.equal(appointmentStatus(p,window),'recent',suffix);
  assert(p.appointmentReview.sources.every(s=>s.checkedDate==='2026-11-05'));
  assert.equal(appointmentMatches({id:p.advisorId},{...catalog,appointmentWindow:window},{appointment:'recent'}),true);
  assert.equal(JSON.stringify(p),before,'classification cannot backdate or change evidence');
 }
 assert.equal(appointmentStatus(catalog.advisorProfiles.get('sjtu-chen-feifei'),window),'earlier');
 for(const id of ['tongji-fan-rui','sjtu-xu-yunwen'])assert.equal(appointmentStatus(catalog.advisorProfiles.get(id),window),'earlier');
});

test('confirmed current-year and current-month arrivals preserve coarse evidence without future-date promotion',()=>{
 for(const [precision,earliest,latest] of [['year','2026-01-01','2026-12-31'],['month','2026-11-01','2026-11-30']]){
  const p=appointment(earliest,latest);p.appointmentReview.precision=precision;
  const before=JSON.stringify(p);assert.equal(appointmentStatus(p,window),'recent');assert.equal(JSON.stringify(p),before);
  assert.equal(appointmentStatus(p,createAppointmentWindow('2026-10-26')),'unknown');
  for(const delta of [{appointmentConfirmed:false},{status:'unknown'},{precision:'day'},{precision:'unknown'},{earliestDate:'2026-11-06'},{latestDate:'2027-12-31'},{sources:[{...source,checkedDate:'2027-01-01'}]},{sources:[{...source,checkedDate:'2025-12-31'}]}])assert.equal(appointmentStatus({appointmentReview:{...p.appointmentReview,...delta}},window),'unknown',JSON.stringify(delta));
 }
 const future=appointment('2026-11-06');future.appointmentReview.precision='day';assert.equal(appointmentStatus(future,window),'unknown');
});

test('Fall 2028 PhD requires explicit personal degree, cycle and dated primary-source evidence',()=>{
 assert.equal(recruitmentPriority(advisor(),window.asOf),'fall2028_phd');
 for(const delta of [{status:'closed'},{status:'unknown'},{degree:'MPhil'},{degree:'Graduate'},{degree:'2028级博士'},{individualRecruitmentVerified:false},{sourceStatus:'program_reference_only'},{sources:[]},{sources:[{...source,url:'javascript:alert(1)'}]},{sources:[{...source,checkedDate:'2026-11-06'}]},{sources:[{...source,checkedDate:'2026-02-30'}]},{cycle2028FallVerified:'true'},{cycle2028FallVerified:false,cycle2028FallReference:true},{cycle2028FallVerified:false,cycle:'2027/28 Fall'}])assert.notEqual(recruitmentPriority(advisor(delta),window.asOf),'fall2028_phd',JSON.stringify(delta));
 assert.equal(recruitmentPriority({...advisor({cycle2028FallVerified:false}),fall2028OpeningVerified:true},window.asOf),'unknown');
});

test('year-only doctorate and unspecified graduate signals remain distinct from Fall and vacancies',()=>{
 const year=advisor({cycle2028FallVerified:false,cycle2028IntakeVerified:true});
 const graduate=advisor({degree:'Graduate',cycle2028FallVerified:false,cycle2028FallReference:true});
 assert.equal(recruitmentPriority(year,window.asOf),'year2028_phd');
 assert.equal(recruitmentPriority(graduate,window.asOf),'graduate2028');
 assert.equal(recruitmentPriority(catalog.advisors.find(a=>a.id==='tongji-fan-rui'),window.asOf),'year2028_phd');
 assert.equal(recruitmentPriority(catalog.advisors.find(a=>a.id==='sjtu-xia-zeyang'),window.asOf),'year2028_phd');
 assert.equal(recruitmentPriority(catalog.advisors.find(a=>a.id==='sjtu-ma-jin'),window.asOf),'graduate2028');
 assert(!intakeMatches(year,{intake:'fall2028_phd'}));
 assert(!intakeMatches(graduate,{intake:'graduate2028',opportunityType:'PhD'}));
 assert(!intakeMatches(advisor(),{intake:'fall2028_phd',opportunityType:'RA'}));
 assert(!intakeMatches(advisor(),{intake:'invalid'}));
});

test('priority filters compose with school, appointment, degree and search without creating opportunities',()=>{
 const data={advisors:[advisor()],advisorProfiles:new Map([['sample',appointment()]]),routes:[{id:'phd',institution:'HKU',degree:'PhD',status:'reference',sources:[source]}],appointmentWindow:window};
 const before=JSON.stringify([...data.advisorProfiles]);
 assert.equal(browseAdvisors(data,{intake:'fall2028_phd',appointment:'recent',institution:'HKU',opportunityType:'PhD',query:'Sample'}).length,1);
 assert.equal(browseAdvisors(data,{intake:'fall2028_phd',institution:'BUAA'}).length,0);
 assert(filterOpportunities(data,{intake:'fall2028_phd'}).every(o=>o.kind==='reference'&&o.type==='PhD'),'personal recruitment does not manufacture verified degree associations or spill into other degrees');
 assert.equal(filterOpportunities(data,{intake:'fall2028_phd',opportunityType:'PhD'})[0].kind,'reference');
 assert.equal(JSON.stringify([...data.advisorProfiles]),before);
});

test('visible priorities expose truthful zero, separate labels, loading and reversible selections',()=>{
 const data={advisors:[advisor({cycle2028FallVerified:false,cycle2028IntakeVerified:true})],advisorProfiles:new Map([['sample',appointment()]])};
 const counts=priorityCounts(data);assert.equal(counts.fall2028_phd,0);assert.equal(counts.year2028_phd,1);
 const html=renderAdvisorPriorities(data,{intake:'year2028_phd'},'ready');
 assert.match(html,/重点关注/);assert.match(html,/当前机器人主目录尚无/);assert.match(html,/不保证当前余位/);assert.match(html,/data-priority-value="year2028_phd" aria-pressed="true"/);
 assert.match(renderAdvisorPriorities(data,{},'loading'),/data-priority-value="recent" aria-pressed="false" disabled/);
 assert.match(renderAdvisorPriorities(data,{},'unavailable'),/任职资料未载入/);
 assert.match(renderAdvisorPriorities({advisors:data.advisors,advisorProfiles:new Map()}, {}, 'ready'),/data-priority-value="recent" aria-pressed="false" disabled/);
 const card=renderAdvisorCard({advisor:data.advisors[0],opportunities:[]},{catalog:data});
 assert.match(card,/data-intake-status="year2028_phd"/);assert(!card.includes('data-intake-status="fall2028_phd"'));
 const yearGroups=groupAdvisorResults({...catalog,appointmentWindow:window},{intake:'year2028_phd'});
 for(const id of ['tongji-fan-rui','sjtu-xia-zeyang'])assert(yearGroups.some(g=>g.advisor.id===id));
 assert(yearGroups.every(g=>recruitmentPriority(g.advisor)==='year2028_phd'));
});
