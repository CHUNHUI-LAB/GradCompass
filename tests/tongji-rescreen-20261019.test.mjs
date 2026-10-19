import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browseAdvisors,filterOpportunities,buildOpportunities,hasVerifiedAssociation} from '../assets/core.js';
import {profileMap,renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {appointmentStatus} from '../assets/appointments.js';
import historicalFs,{publishedBytes,tongjiHistoricalTestBytes,decodeTongjiHistoricalTests} from './published-history-fs.mjs';
import {evidenceReviews} from './evidence-reviews.mjs';
import {assertReviewedPublicData} from './reviewed-public-data.mjs';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(raw(p));
const catalog=json('data/catalog.json'),profiles=json('data/advisor-profiles.json').profiles;
const audit=json('audits/tongji-rescreen-20261019.json'),receipt=json('tests/fixtures/evidence/tongji-rescreen-20261019.json');
const additions=catalog.advisors.slice(372,424),addedProfiles=profiles.slice(372,424),map=new Map(profiles.map(p=>[p.advisorId,p]));
const a=id=>catalog.advisors.find(a=>a.id==='tongji-'+id),p=id=>map.get('tongji-'+id);
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const names=['范睿','陈启军','陈杰','董延超','董怡','郭露露','洪奕光','李修贤','李雪峰','梁舒','孟敏','齐鹏','史淼晶','王峻','王瀚漓','王祝萍','张皓','尹慧琳','叶伟','曾一锋','操锟','陈广','陈亮','程久军','蒋寻','刘庆文','任云帆','彭铎','汪政','王轩瀚','徐行','曾鹏鹏','张军旗','祝澜耘','孙杳如','肖国宝','赵才荣','张林','黄岩军','熊璐','褚洪庆','卓桂荣','唐辰','张琳','余卓平','高炳钊','刘春','冯甜甜','许雄','吴杭彬','黄炜','李浩军'];

test('Tongji rescreen appends 52 people and profiles after the exact published 372-person prefix',()=>{
 assert.deepEqual(additions.map(a=>a.nameZh),names);assert.deepEqual(addedProfiles.map(p=>p.advisorId),additions.map(a=>a.id));
 assert.equal(catalog.advisors.length,424);assert.equal(profiles.length,424);assert.equal(catalog.routes.length,75);assert.equal(profileMap({profiles},catalog.advisors).size,424);
 assert.equal(hash(catalog.advisors.slice(0,372)),'0ea86531f8b57ab181d461b799a6c085da4660cf76f55d1f84af0165a455cc59');
 assert.equal(hash(catalog.routes.slice(0,71)),'deeb628c648df737a356d5881a6d1d56d5ccba01b7396001ff8be86f2aa803d5');
 assert.equal(hash(profiles.slice(0,372)),'ade27aafb60ff4ef1cb5dcf71f147fc25c9b6995d914cbbd245ca62c7f13ff02');
 assert.equal(browseAdvisors(catalog,{institution:'Tongji'}).length,80);
 assert.equal(browseAdvisors(catalog,{institution:'Tongji',opportunityType:'PhD'}).length,80);
 assert.equal(filterOpportunities(catalog,{institution:'Tongji',opportunityType:'PhD'}).length,80);
 const verified=buildOpportunities({...catalog,raPositions:json('data/ra-positions.json').raPositions});assert.equal(verified.length,59);assert.equal(verified.filter(o=>o.kind==='degree').length,57);
 for(const advisor of additions){const r=catalog.routes.find(r=>r.id===advisor.routeIds[0]);assert.equal(r.status,'reference');assert.equal(r.projectCycleVerified,false);assert.equal(r.applicationStatus,'unknown');assert(!hasVerifiedAssociation(advisor,r));assert.equal(advisor.eligibility,'pending');assert.equal(advisor.routeAssociations[0].verificationStatus,'pending');}
});

test('Fan doctoral 2028-entry registration preserves exact season, unit, degree and remaining-capacity boundaries',()=>{
 const fan=a('fan-rui');assert.equal(fan.nameZh,'范睿');assert.equal(fan.opening,'explicit');assert.equal(fan.intake2028OpeningVerified,true);assert.equal(fan.fall2028OpeningVerified,false);assert.equal(fan.fall2027OpeningVerified,false);
 const doctoral=fan.openingDetails.find(o=>o.degree==='PhD');assert.equal(doctoral.cycle2028IntakeVerified,true);assert.equal(doctoral.cycle2028FallVerified,false);assert.equal(doctoral.noticeDate,'2026-10');assert.match(doctoral.summary,/2027级除城市交通研究院外均已招满/);assert.match(doctoral.summary,/2028级博士/);assert.match(doctoral.summary,/未注明2028入学月份或Fall/);assert.match(doctoral.summary,/硕士栏.*中意学院.*移用/);assert.match(doctoral.summary,/通常.*2\+名.*不是2028当前余位/);
 assert.match(doctoral.summary,/第一作者/);assert.match(doctoral.summary,/直博5.5年、普博4年/);
 for(const o of fan.openingDetails){assert.equal(o.confirmedVacancy,false);assert.equal(o.remainingHeadcountVerified,false);assert.equal(o.cycle2028FallVerified,false);}
 assert.equal(audit.cycle2028DoctoralIntakeSignalCount,1);assert.equal(audit.cycle2028FallPhdVerifiedCount,0);
 const html=renderProfile(p('fan-rui'))+renderProfileReferences(p('fan-rui'));assert.match(p('fan-rui').recruitment.textZh,/已开放2028级博士申请报名/);assert.match(html,/mias.group\/vacancies.html#role-0/);assert.match(html,/范睿个人主页（本人履历与研究方向）/);assert(a('fan-rui').sources.some(s=>s.url==='https://www.ruirangerfan.com'));
 const source=audit.sourceLedger.find(s=>s.url==='https://mias.group/vacancies.html');assert.match(source.section,/role-0/);assert.match(source.section,/实际渲染/);assert.match(source.contentSha256,/^[a-f0-9]{64}$/);
});

test('2027 spring/fall and entry-year statements remain distinct from one another and from 2028',()=>{
 assert.equal(a('ren-yunfan').fall2027OpeningVerified,true);assert.equal(a('ren-yunfan').intake2027OpeningVerified,true);assert.match(p('ren-yunfan').recruitment.textZh,/2027年春\/秋/);
 for(const id of ['zhu-lanyun','huang-wei']){assert.equal(a(id).intake2027OpeningVerified,true);assert.equal(a(id).fall2027OpeningVerified,false);assert.equal(a(id).intake2028OpeningVerified,false);assert.match(p(id).recruitment.textZh,/季节/);}
 assert.match(p('huang-wei').recruitment.textZh,/不能证明当前还剩2名/);assert.match(p('peng-duo').recruitment.textZh,/常年/);
 const signals=browseAdvisors(catalog,{institution:'Tongji',opportunityType:'PhD',opening:'explicit'});assert.equal(signals.length,14);assert.deepEqual(signals.filter(a=>additions.some(n=>n.id===a.id)).map(a=>a.nameZh).sort(),['范睿','任云帆','祝澜耘','黄炜'].sort()); // ten preserved invitations and four newly dated statements
});

test('individual doctoral evidence, supervision history and unresolved candidates cannot inherit authority from a professor title',()=>{
 const ledger=new Map(audit.sourceLedger.map(s=>[s.url,s]));assert.equal(audit.advisors.length,52);assert.deepEqual(audit.groupCounts,{control:21,cs:17,auto:8,geo:6});
 assert.equal(audit.advisors.filter(a=>a.doctoralEvidenceKind==='individual_doctoral_identity_or_invitation').length,51);
 assert.equal(a('cao-kun').routeAssociations[0].scope,'doctoral_supervision_history_only');assert.match(p('cao-kun').recruitment.textZh,/独立博士招生资格/);assert.equal(a('cao-kun').opening,'unknown');
 for(const advisor of additions){const row=audit.advisors.find(r=>r.advisorId===advisor.id);assert(row.doctoralEvidenceUrls.length);assert(row.doctoralMatches.every(m=>m.matchedName===advisor.nameZh));for(const s of advisor.sources){assert.equal(s.checkedDate,'2026-10-19');assert.equal(new URL(s.url).protocol,'https:');const entry=ledger.get(s.url);assert(entry);assert.equal(entry.httpStatus,200);assert.equal(entry.readLimit,null);assert.match(entry.contentSha256,/^[a-f0-9]{64}$/);}}
 for(const name of ['宋井宽','丁玉隆','姚陈鹏','田炜','陈君毅']){assert(!additions.some(a=>a.nameZh===name));assert(audit.exclusionsAndPending.some(r=>r.name.includes(name)));}
 assert.equal(audit.screening.controlFacultyDirectoryCount,90);assert.equal(audit.screening.csProfessorDirectoryPages.length,5);assert.match(audit.omissionAnalysis.mechanism,/初始HTML为空/);
 assert.notEqual(a('zhang-lin').id,a('zhang-lin-auto').id);assert.equal(a('zhang-lin').nameZh,'张林');assert.equal(a('zhang-lin-auto').nameZh,'张琳');assert(a('zhang-lin-auto').department.includes('汽车'));
});

test('first appointments exclude postdocs and promotions and retain the month-level five-year boundary',()=>{
 const counts={};for(const profile of addedProfiles){const s=appointmentStatus(profile);counts[s]=(counts[s]||0)+1;assert.equal(profile.appointmentReview.checkedDate,'2026-10-19');}
 assert.deepEqual(counts,{boundary:2,unknown:30,earlier:18,recent:2});
 assert.equal(appointmentStatus(p('fan-rui')),'boundary');assert.equal(p('fan-rui').appointmentReview.earliestDate,'2021-10-01');assert.equal(p('fan-rui').appointmentReview.latestDate,'2021-10-31');
 assert.equal(appointmentStatus(p('liang-shu')),'boundary');assert.equal(appointmentStatus(p('guo-lulu')),'earlier');
 assert.equal(p('cao-kun').appointmentReview.earliestDate,'2024-01-01');assert.equal(p('zhang-lin-auto').appointmentReview.earliestDate,'2023-03-01');
 assert.match(p('zhang-lin-auto').appointmentReview.noteZh,/2020.*博士后不计/);assert.equal(p('xu-xiong').appointmentReview.earliestDate,'2013-10-01');assert.equal(p('zhuo-guirong').appointmentReview.earliestDate,'2004-12-01');
 assert.equal(appointmentStatus(p('tang-chen')),'unknown');assert.match(p('tang-chen').appointmentReview.noteZh,/不由2021年博士后结束推断/);
});

test('new profiles expose homepage read limits and do not manufacture papers, team sizes or verified vacancies',()=>{
 for(const profile of addedProfiles){const html=renderProfile(profile)+renderProfileReferences(profile);assert(!/undefined|\[object Object\]/.test(html));assert.match(html,/证据核查于 2026-10-19/);assert.match(html,/个人主页、实验室与相关链接/);assert.match(html,/尚未逐篇核验/);assert.deepEqual(profile.representativeWorks,[]);assert.equal(profile.confirmedVacancy,false);assert(profile.overview.sources.length>=2);assert(profile.unknowns.length>=3);}
 assert.match(renderProfile(p('peng-duo')),/404错误页/);assert.match(renderProfile(p('fan-rui')),/拟入学/);
});

test('independent append receipt protects this batch without rewriting historical receipts or permitting arbitrary data changes',()=>{
 assert.equal(receipt.baseCommit,'4653bbd56a237a618a58c6f599e32e071ddf7094');assert.equal(receipt.operations.length,108);
 const review=evidenceReviews.find(r=>r.path.includes('tongji-rescreen-20261019'));assert.equal(crypto.createHash('sha256').update(raw(review.path)).digest('hex'),review.sha256);
 for(const op of receipt.operations){assert.equal(op.operation,'add');assert(['data/catalog.json','data/advisor-profiles.json'].includes(op.file));assert(/^\/(advisors|routes|profiles)\/\d+$/.test(op.path));}
 const files=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(p=>p.endsWith('.json')).map(p=>['data/'+p,json('data/'+p)]));assertReviewedPublicData(files,raw);
 const changed=structuredClone(files);changed['data/catalog.json'].advisors.find(a=>a.id==='tongji-fan-rui').fall2028OpeningVerified=true;assert.throws(()=>assertReviewedPublicData(changed,raw));
});


test('dated four-school and seven-school test archive preserves the original manifest bytes and rejects corruption without shadowing current data',()=>{
 for(const name of ['tests/four-schools-review.test.mjs','tests/seven-schools-review.test.mjs']){
 const bytes=tongjiHistoricalTestBytes(name),entry=JSON.parse(publishedBytes('release-manifest.json')).allowedFiles.find(r=>r.path===name);
 assert.equal(bytes.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.deepEqual(historicalFs.readFileSync(new URL('../'+name,import.meta.url)),bytes);assert.notDeepEqual(raw(name),bytes);
 }
 const zipped=raw('tests/fixtures/history/published-test-inputs-tongji-20261019.json.gz');assert.throws(()=>decodeTongjiHistoricalTests(Buffer.concat([zipped,Buffer.from(' ')])),/immutable/);
 assert.deepEqual(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)),raw('data/catalog.json'));
});
