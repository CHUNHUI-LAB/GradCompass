import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browseAdvisors,filterOpportunities,buildOpportunities,hasVerifiedAssociation} from '../assets/core.js';
import {profileMap,renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {appointmentStatus} from '../assets/appointments.js';
import {evidenceReviews} from './evidence-reviews.mjs';
import {reviewedPublicData,assertReviewedPublicData} from './reviewed-public-data.mjs';
import historicalFs,{publishedBytes,allSchoolsHistoricalTestPaths,allSchoolsHistoricalTestBytes,decodeAllSchoolsHistoricalTests} from './published-history-fs.mjs';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(raw(p));
const catalog=json('data/catalog.json'),profiles=json('data/advisor-profiles.json').profiles;
const audit=json('audits/all-schools-rescreen-20261019.json'),receipt=json('tests/fixtures/evidence/all-schools-rescreen-20261019.json');
const additions=catalog.advisors.slice(424),newProfiles=profiles.slice(424);
const prior=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/tongji-rescreen-20261019.json'});
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const byName=n=>additions.find(a=>(a.nameZh||a.name)===n);

test('all 20 recorded faculty schools and two programme-only schools receive an explicit bounded coverage row',()=>{
 assert.equal(audit.schools.length,22);assert.equal(new Set(audit.schools.map(s=>s.institution)).size,22);
 const expected=new Set([...catalog.advisors,...catalog.routes].map(x=>x.institution));assert.deepEqual(new Set(audit.schools.map(s=>s.institution)),expected);
 assert.equal(audit.existingAdvisorChecks.length,424);assert.deepEqual(audit.existingAdvisorChecks.map(r=>r.advisorId),prior['data/catalog.json'].advisors.map(a=>a.id));
 for(const school of audit.schools){assert(school.notesZh.length>40);assert(school.directoryAccess.length);assert.equal(school.fullUniversityCensus,false);assert.equal(school.currentAdvisorCount,catalog.advisors.filter(a=>a.institution===school.institution).length);}
 for(const key of ['JHU','BU']){const r=audit.schools.find(s=>s.institution===key);assert.equal(r.status,'programme_only_reviewed');assert.equal(r.currentAdvisorCount,0);}
 assert.match(audit.scopeZh,/非原424位全部事实重新人工核验/);assert(audit.boundariesZh.some(s=>s.includes('访问成功不代表事实核实')));
});

test('68 additions and 17 references preserve exact existing advisor/route objects and only three reviewed old-profile corrections',()=>{
 assert.equal(catalog.advisors.length,492);assert.equal(profiles.length,492);assert.equal(catalog.routes.length,92);assert.equal(profileMap({profiles},catalog.advisors).size,492);
 assert.equal(additions.length,68);assert.equal(new Set(additions.map(a=>a.id)).size,68);assert.deepEqual(newProfiles.map(p=>p.advisorId),additions.map(a=>a.id));
 assert.equal(hash(catalog.advisors.slice(0,424)),'7b2383921e70aa6098b62ad528103e07151e3229fe00fe74fd911e43c0949b9d');
 assert.equal(hash(catalog.routes.slice(0,75)),'970262be4a5048d04ca9168e132b53660bbcdadcbdd383e79a5aef49bf6f205c');
 assert.equal(hash(prior['data/advisor-profiles.json'].profiles),'cee4fbf2ea7ecbe70e3fb9bbc6af06505c13368c36433fbb58a115619a258d09');
 const changed=profiles.slice(0,424).filter((p,i)=>hash(p)!==hash(prior['data/advisor-profiles.json'].profiles[i]));
 assert.deepEqual(new Set(changed.map(p=>p.advisorId)),new Set(['fudan-zhang-wenqiang','tongji-xiao-guobao','tsinghua-li-liu']));
 for(const p of changed){const before=prior['data/advisor-profiles.json'].profiles.find(r=>r.advisorId===p.advisorId);assert.deepEqual(p.appointmentReview,before.appointmentReview);assert.deepEqual(p.recruitment,before.recruitment);assert.equal(p.checkedDate,before.checkedDate);}
 const counts={};for(const a of additions)counts[a.institution]=(counts[a.institution]||0)+1;
 assert.deepEqual(counts,{SUSTech:10,Tsinghua:12,NJU:15,HKUST:2,'HKUST(GZ)':5,XJTLU:6,SJTU:4,Fudan:1,Westlake:1,PolyU:3,HKBU:1,SEU:2,ZJU:1,USTC:1,CUHK:2,CityUHK:1,'CUHK-Shenzhen':1});
});

test('new doctoral references remain pending, supervision history stays distinct, and no confirmed opportunity is manufactured',()=>{
 assert.equal(browseAdvisors(catalog,{opportunityType:'PhD'}).length,470);assert.equal(filterOpportunities(catalog,{opportunityType:'PhD'}).filter(r=>r.kind==='reference').length,445);
 const opportunities=buildOpportunities({...catalog,raPositions:json('data/ra-positions.json').raPositions});assert.equal(opportunities.length,59);assert.equal(opportunities.filter(r=>r.kind==='degree').length,57);
 assert.equal(audit.addedAdvisors.filter(a=>a.doctoralEvidenceKind==='supervision_history_only').length,6);
 for(const a of additions){const route=catalog.routes.find(r=>r.id===a.routeIds[0]);assert.equal(route.status,'reference');assert.equal(route.applicationStatus,'unknown');assert.equal(route.projectCycleVerified,false);assert.equal(a.eligibility,'pending');assert.equal(a.routeAssociations[0].verificationStatus,'pending');assert(!hasVerifiedAssociation(a,route));}
 for(const name of ['贺登博','姜汉卿','刘达铭','江浩川','刘晨光','Sze-Hong Teh']){const a=byName(name);assert.equal(a.routeAssociations[0].scope,'doctoral_supervision_history_only');assert.match(a.eligibilityMeaning,/独立博士招生资格尚未核实/);}
});

test('only named personal 2027 invitations get exact Fall flags; expired LAMDA calls and 2028 extrapolation remain unconfirmed',()=>{
 assert.deepEqual(additions.filter(a=>a.fall2027OpeningVerified).map(a=>a.name),['Ling Pan','Ziqi Wang']);
 const pan=byName('潘玲');assert.equal(pan.name,'Ling Pan');assert.equal(pan.openingDetails[0].cycle,'2027春／秋');
 for(const a of additions){assert.equal(a.fall2028OpeningVerified,false);assert.equal(a.intake2028OpeningVerified,false);for(const o of a.openingDetails){assert.equal(o.cycle2028FallVerified,false);assert.equal(o.cycle2028IntakeVerified,false);assert.equal(o.confirmedVacancy,false);assert.equal(o.remainingHeadcountVerified,false);}}
 const lamda=additions.filter(a=>a.sources.some(s=>s.url.endsWith('recruit-2027.html')));assert.equal(lamda.length,14);
 for(const a of lamda){assert.equal(a.opening,'unknown');assert.equal(a.fall2027OpeningVerified,false);assert.match(a.openings.phd,/截止2026年7月31日|截止2026年7月31日/);assert.match(a.openings.phd,/过期|已过期/);}
 assert.match(byName('周志华').openings.phd,/仅列直博生/);for(const n of ['姜远','吴建鑫','王天佐','赵鹏'])assert.match(byName(n).openings.phd,/未列普通博士/);
 assert(!additions.some(a=>['袁雷','周大蔚','谭志豪','许天'].includes(a.nameZh)));
 const fan=catalog.advisors.find(a=>a.id==='tongji-fan-rui');assert.equal(fan.intake2028OpeningVerified,true);assert.equal(fan.fall2028OpeningVerified,false);
});

test('first institutional appointments retain year/month precision and experienced transfers never imply age or first PI status',()=>{
 const counts={};for(const p of newProfiles){const state=appointmentStatus(p);counts[state]=(counts[state]||0)+1;const row=audit.addedAdvisors.find(a=>a.advisorId===p.advisorId);assert.equal(row.appointmentStatus,state);assert.equal(p.appointmentReview.checkedDate,'2026-10-19');}
 assert.deepEqual(counts,{recent:11,earlier:24,unknown:32,boundary:1});
 const p=n=>newProfiles.find(p=>p.advisorId===byName(n).id);
 assert.equal(p('戴建生').appointmentReview.earliestDate,'2022-02-01');assert.equal(p('戴建生').appointmentReview.careerContext,'previous_faculty');assert.match(p('戴建生').appointmentReview.noteZh,/2024.*后续职务/);
 assert.equal(p('周利锋').appointmentReview.earliestDate,'2026-03-01');assert.match(p('周利锋').appointmentReview.noteZh,/北京大学/);
 assert.equal(appointmentStatus(p('贺登博')),'boundary');assert.equal(p('杜汇丰').appointmentReview.earliestDate,'2025-09-01');assert.match(p('杜汇丰').appointmentReview.noteZh,/不将新闻日当/);
 assert.equal(p('陈根良').appointmentReview.earliestDate,'2018-03-01');assert.match(p('陈根良').appointmentReview.noteZh,/博士后/);
 for(const a of additions)assert.equal(a.newPi.verified,false);
});

test('read scopes distinguish successful public bodies, indexed extracts, dynamic shells and failed homepage destinations',()=>{
 assert.equal(audit.sourceAccess.length,1527);assert.equal(audit.sourceLedger.length,106);
 const ledger=new Map(audit.sourceLedger.map(s=>[s.url,s]));
 for(const a of additions)for(const s of a.sources){const row=ledger.get(s.url);assert(row);assert.equal(s.checkedDate,'2026-10-19');if(row.retrieval==='direct_public_response'){assert.equal(row.httpStatus,200);assert.match(row.contentSha256,/^[a-f0-9]{64}$/);}else{assert.match(row.extractedTextSha256,/^[a-f0-9]{64}$/);assert(row.readLimit);}}
 const liu=ledger.get(byName('Lu Liu').profileUrl);assert.equal(liu.retrieval,'primary_index_excerpt');assert.match(liu.readLimit,/索引摘录/);
 const jiang=ledger.get('https://jiang.lab.westlake.edu.cn/index.htm');assert.equal(jiang.retrieval,'web_primary_extract');assert.equal(jiang.httpStatus,403);assert.match(jiang.extractedTextSha256,/^[a-f0-9]{64}$/);
 const dai=newProfiles.find(p=>p.advisorId===byName('戴建生').id);assert.match(renderProfile(dai),/未取得可读正文/);assert(!byName('戴建生').sources.some(s=>s.url==='https://faculty.sustech.edu.cn/daijs/'));
 for(const p of newProfiles){assert.deepEqual(p.representativeWorks,[]);const h=renderProfile(p)+renderProfileReferences(p);assert(!/undefined|\[object Object\]/.test(h));assert.match(h,/尚未逐篇核验/);assert.match(h,/个人主页、实验室与相关链接/);}
});

test('dynamic directory and candidate boundaries cannot silently become claims of a complete doctoral census',()=>{
 assert.equal(audit.dynamicDirectoryProof.HKUST.namedEntries.length,37);assert.match(audit.dynamicDirectoryProof.HKUST.readScope,/分类30/);assert.equal(audit.dynamicDirectoryProof['HKUST(GZ)'].count,24);assert.equal(audit.dynamicDirectoryProof['CUHK-Shenzhen'].pageUrls.length,6);assert.equal(audit.dynamicDirectoryProof.XJTLU.count,17);
 for(const n of ['王昌凌','吴锋','何再兴','郭艺璇'])assert(audit.candidateQueue.some(q=>q.names.includes(n)));
 assert(audit.candidateQueue.find(q=>q.names.includes('王昌凌')).reason.includes('Adjunct'));
 const old=profiles.find(p=>p.advisorId==='tsinghua-li-liu');assert.match(renderProfile(old),/404/);assert(profiles.find(p=>p.advisorId==='tongji-xiao-guobao').links.some(l=>l.url==='https://guobaoxiao.github.io/'));
});

test('the new receipt is independently pinned, the prior checkpoint is bounded, and unreviewed changes still fail live-data replay',()=>{
 assert.equal(receipt.operations.length,156);assert.equal(receipt.operations.filter(o=>o.operation==='add').length,153);assert.equal(receipt.operations.filter(o=>o.operation==='replace').length,3);
 const r=evidenceReviews.find(r=>r.path.endsWith('all-schools-rescreen-20261019.json'));assert.equal(crypto.createHash('sha256').update(raw(r.path)).digest('hex'),r.sha256);
 const files=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(p=>p.endsWith('.json')).map(p=>['data/'+p,json('data/'+p)]));assertReviewedPublicData(files,raw);
 assert.throws(()=>reviewedPublicData(raw,{throughReceipt:'not-registered'}),/registered/);
 const changed=structuredClone(files);changed['data/catalog.json'].advisors.find(a=>a.id===byName('徐思渊').id).fall2028OpeningVerified=true;assert.throws(()=>assertReviewedPublicData(changed,raw));
 const changedOld=structuredClone(files);changedOld['data/advisor-profiles.json'].profiles[100].unknowns.push('unreviewed change');assert.throws(()=>assertReviewedPublicData(changedOld,raw));
});

test('the additive historical test archive preserves original manifest bytes without serving current data from history',()=>{
 assert.deepEqual([...allSchoolsHistoricalTestPaths],['tests/nju-expansion.test.mjs','tests/sjtu-expansion.test.mjs','tests/sustech-review.test.mjs','tests/tsinghua-review.test.mjs','tests/zju-expansion.test.mjs']);
 const manifest=JSON.parse(publishedBytes('release-manifest.json'));
 for(const name of allSchoolsHistoricalTestPaths){const entry=manifest.allowedFiles.find(r=>r.path===name),bytes=allSchoolsHistoricalTestBytes(name);assert.equal(bytes.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.deepEqual(historicalFs.readFileSync(new URL('../'+name,import.meta.url)),bytes);assert.notDeepEqual(raw(name),bytes);}
 const zip=raw('tests/fixtures/history/published-test-inputs-all-schools-20261019.json.gz');assert.throws(()=>decodeAllSchoolsHistoricalTests(Buffer.concat([zip,Buffer.from(' ')])),/immutable/);
 assert.deepEqual(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)),raw('data/catalog.json'));
});
