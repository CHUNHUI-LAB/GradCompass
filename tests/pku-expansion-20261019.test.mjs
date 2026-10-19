import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import historicalFs,{pkuHistoricalTestPaths,pkuHistoricalTestBytes,publishedBytes,decodePkuHistoricalTests} from './published-history-fs.mjs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {evidenceReviews} from './evidence-reviews.mjs';
import {browseAdvisors,filterOpportunities,buildOpportunities,hasVerifiedAssociation} from '../assets/core.js';
import {profileMap,renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {appointmentStatus,appointmentWindow} from '../assets/appointments.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const read=p=>JSON.parse(raw(p));
const catalog=read('data/catalog.json'),profiles=read('data/advisor-profiles.json').profiles;
const audit=read('audits/pku-expansion-20261019.json'),receipt=read('tests/fixtures/evidence/pku-expansion-20261019.json');
const oldReviewed=reviewedPublicData(p=>raw(p));
const names=['王启宁','王龙','王勇','谢广明','喻俊志','张飞天','刘畅','孙环波','庞智博','王雪峰','吕鹏宇','李启亮','李阿明','黄天云','杨莹','段志生','楚梦渝','刘利斌','曾钢','裴玉茹','陈宝权','钟亦武','张驰','吴玺宏','曲天书','谭营','董豪','卢宗青','仉尚航','王鹤','王亦洲','施柏鑫','周嘉欢','穆亚东','杨耀东','朱毅鑫','刘宏','刘梦源'];
const additions=catalog.advisors.slice(334,372),addedProfiles=profiles.slice(334,372),map=new Map(profiles.map(p=>[p.advisorId,p]));
const a=id=>catalog.advisors.find(a=>a.id==='pku-'+id),p=id=>map.get('pku-'+id);

test('PKU expansion appends 38 individually reviewed advisors and profiles, six references, and preserves earlier facts',()=>{
 assert.deepEqual(additions.map(a=>a.nameZh),names);
 assert.equal(catalog.advisors.length,424);assert.equal(profiles.length,424);assert.equal(catalog.routes.length,75);
 assert.equal(profileMap({profiles},catalog.advisors).size,424);
 assert.deepEqual(addedProfiles.map(p=>p.advisorId),additions.map(a=>a.id));
 // Replay all receipts before this expansion, not a live-data-derived baseline.
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(catalog.advisors.slice(0,334))).digest('hex'),'047b149cae21dfbcabc5a963a7a6e02a77e5efad3583bbde818af1e5f586bd8c');
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(profiles.slice(0,334))).digest('hex'),'e7f4a53a69083a664b91d5f75d48b6f252846f98a67d4f949f1c17c3ec06e7e4');
 const earlierReceiptPaths=new Set(evidenceReviews.slice(0,evidenceReviews.findIndex(r=>r.path.includes('pku-expansion-20261019'))).map(r=>r.path));
 for(const op of receipt.operations){assert.equal(op.operation,'add');assert(['data/catalog.json','data/advisor-profiles.json'].includes(op.file));assert(/^\/(advisors|routes|profiles)\/\d+$/.test(op.path));}
 assert.equal(earlierReceiptPaths.size,4);assert.equal(receipt.operations.length,82);
 const priorAdvisors=receipt.operations.filter(op=>op.file==='data/catalog.json'&&op.path.startsWith('/advisors/'));
 assert.equal(priorAdvisors[0].path,'/advisors/334');assert.deepEqual(oldReviewed['data/catalog.json'],catalog);
 assert.deepEqual(oldReviewed['data/advisor-profiles.json'].profiles,profiles);
 // Historical cohort identity and exact object preservation are additionally enforced
 // by the append-only semantic evidence replay, whose original receipts stay fixed.
 assert.equal(browseAdvisors(catalog,{institution:'PKU'}).length,43);
 assert.equal(browseAdvisors(catalog,{institution:'PKU',opportunityType:'PhD'}).length,43);
 const paths=filterOpportunities(catalog,{institution:'PKU',opportunityType:'PhD'});
 assert.equal(paths.length,43);assert(paths.every(o=>o.reference===true));
 assert.equal(buildOpportunities({...catalog,raPositions:read('data/ra-positions.json').raPositions}).length,59);
 assert.equal(filterOpportunities(catalog,{institution:'PKU'}).length,0);
});

test('doctoral references retain faculty identity, school boundaries, named evidence and unverified admission authority',()=>{
 assert.equal(audit.checkedDate,'2026-10-19');assert.equal(audit.addedAdvisorCount,38);assert.equal(audit.currentAdvisorCount,43);
 assert.equal(new Set(additions.map(a=>a.department)).size,7);
 const urls=new Map(audit.sourceLedger.map(s=>[s.url,s]));
 for(const advisor of additions){
  assert.equal(advisor.institution,'PKU');assert.equal(advisor.defaultVisible,true);assert.equal(advisor.eligibility,'pending');
  assert.equal(advisor.routeIds.length,1);const route=catalog.routes.find(r=>r.id===advisor.routeIds[0]);
  assert.equal(route.degree,'PhD');assert.equal(route.status,'reference');assert.equal(route.applicationStatus,'unknown');
  assert(!hasVerifiedAssociation(advisor,route));assert.equal(advisor.routeAssociations[0].verificationStatus,'pending');
  const row=audit.advisors.find(r=>r.advisorId===advisor.id);assert(row);assert(row.doctoralEvidenceUrls.length);assert(row.doctoralMatches.length);assert(row.doctoralMatches.every(m=>m.matchedName===advisor.nameZh&&m.column.includes('博士')));
  for(const s of advisor.sources){assert.equal(s.checkedDate,'2026-10-19');assert.equal(new URL(s.url).protocol,'https:');assert(urls.has(s.url));assert.equal(urls.get(s.url).httpStatus,200);assert.match(urls.get(s.url).contentSha256,/^[a-f0-9]{64}$/);}
  for(const opening of advisor.openingDetails){assert.equal(opening.cycle2028FallVerified,false);assert.equal(opening.confirmedVacancy,false);assert.equal(opening.remainingHeadcountVerified,false);}
 }
 assert(a('liu-hong').department.includes('深圳'));assert(a('liu-mengyuan').department.includes('深圳'));
 assert(a('zhou-jiahuan').department.includes('王选'));assert(a('mu-yadong').department.includes('王选'));
 assert(a('zhu-yixin').department.includes('心理与认知科学学院'));
 for(const name of ['崔锦实','查红彬','麦金耿','邵金燕','杨林'])assert(!additions.some(a=>a.nameZh===name));
 assert(audit.exclusionsAndPending.some(r=>r.name.includes('合作成员')));
});

test('2027 open and full statements, mixed headcounts and 2028 remain distinct',()=>{
 for(const id of ['liu-libin','lu-zongqing']){assert.equal(a(id).opening,'explicit');assert.equal(a(id).openingDetails[0].cycle2027FallVerified,true);assert.equal(a(id).fall2027OpeningVerified,true);assert.match(p(id).recruitment.textZh,/2027 Fall/);}
 assert.match(p('liu-libin').recruitment.textZh,/普博/);assert.match(p('liu-libin').recruitment.textZh,/硕士/);
 assert.equal(a('yang-yaodong').opening,'closed');assert.equal(a('yang-yaodong').fall2027OpeningVerified,false);assert.match(p('yang-yaodong').recruitment.textZh,/0名.*已满/);
 for(const id of ['wang-he','liu-mengyuan','yu-junzhi','dong-hao'])assert.match(p(id).recruitment.textZh,/不能|不等于/);
 assert.equal(audit.cycle2028FallPhdVerifiedCount,0);
 assert.equal(browseAdvisors(catalog,{institution:'PKU',opportunityType:'PhD',opening:'explicit'}).length,2);
});

test('new appointment evidence retains first non-postdoc dates and year-boundary uncertainty',()=>{
 assert.deepEqual(appointmentWindow,{asOf:'2026-10-19',start:'2021-10-19',end:'2026-10-19'});
 const counts={};for(const profile of addedProfiles){const status=appointmentStatus(profile);counts[status]=(counts[status]||0)+1;assert.equal(profile.appointmentReview.checkedDate,'2026-10-19');}
 assert.deepEqual(counts,{earlier:14,unknown:13,boundary:2,recent:9});
 for(const [id,date]of [['wang-qining','2009-07-01'],['li-aming','2020-11-01'],['lv-pengyu','2017-01-01'],['li-qiliang','2023-11-01'],['liu-mengyuan','2023-03-01'],['huang-tianyun','2021-09-01'],['zhang-shanghang','2022-01-01']])assert.equal(p(id).appointmentReview.earliestDate,date,id);
 for(const id of ['liu-chang','zhang-feitian'])assert.equal(appointmentStatus(p(id)),'boundary');
 assert.equal(appointmentStatus(p('huang-tianyun')),'earlier');assert.equal(p('pang-zhibo').appointmentReview.careerContext,'previous_faculty');
 assert.equal(p('zhang-chi').appointmentReview.latestDate,'2026-10-19');
 for(const id of ['wang-he','zhong-yiwu'])assert.equal(appointmentStatus(p(id)),'unknown');
 for(const profile of addedProfiles){const html=renderProfile(profile);assert.match(html,/证据核查于 2026-10-19/);}
 assert.match(renderProfile(profiles[0]),/证据核查于 2026-10-10/);
});

test('all new profiles expose sources and homepage limits without invented papers or team headcounts',()=>{
 for(const profile of addedProfiles){
  const html=renderProfile(profile)+renderProfileReferences(profile);assert(!/undefined|\[object Object\]/.test(html));assert.match(html,/个人主页、实验室与相关链接/);assert.match(html,/尚未逐篇核验/);
  assert.equal(profile.confirmedVacancy,false);assert(profile.unknowns.length>=3);assert(profile.overview.sources.length>=2);assert(profile.labSnapshot.themes.length>=3);
  for(const link of profile.links)assert(['https:','http:'].includes(new URL(link.url).protocol));
 }
 assert.equal(addedProfiles.filter(p=>p.links.some(l=>l.label.includes('个人／实验室'))).length,20);
 for(const id of ['yu-junzhi','pang-zhibo','zhong-yiwu','zhang-shanghang','mu-yadong']){const row=audit.advisors.find(r=>r.advisorId==='pku-'+id);assert(row.homepageReadLimit);assert.match(renderProfile(p(id)),/正文|超时|错误提示/);}
 assert.match(p('shi-boxin').labSnapshot.structure.textZh,/2027待入学/);
 const receiptRow=evidenceReviews.find(r=>r.path.includes('pku-expansion-20261019'));assert.equal(crypto.createHash('sha256').update(raw(receiptRow.path)).digest('hex'),receiptRow.sha256);
});


test('additive dated-test archive preserves original manifest hashes and rejects corruption without shadowing live inputs',()=>{
 assert.deepEqual([...pkuHistoricalTestPaths].sort(),['tests/full-profile-coverage.test.mjs','tests/nju-tongji-ustc-profiles.test.mjs','tests/pku-profiles.test.mjs','tests/pku-review.test.mjs','tests/public-discovery.test.mjs']);
 const manifest=JSON.parse(publishedBytes('release-manifest.json'));
 for(const name of pkuHistoricalTestPaths){const row=manifest.allowedFiles.find(r=>r.path===name),bytes=pkuHistoricalTestBytes(name);assert.equal(bytes.length,row.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);assert.deepEqual(historicalFs.readFileSync(new URL('../'+name,import.meta.url)),bytes);assert.notDeepEqual(raw(name),bytes);}
 const zipped=raw('tests/fixtures/history/published-test-inputs-pku-20261019.json.gz');assert.throws(()=>decodePkuHistoricalTests(Buffer.concat([zipped,Buffer.from(' ')])),/immutable/);
 assert.deepEqual(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)),raw('data/catalog.json'));
});
