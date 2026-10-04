// Historical 5e7cd36 data assertions; current application coverage is tested separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './historical-source-fs.mjs';
import {normalizeExperiences,filterExperiences,renderExperiences,renderExperienceEvidence,renderExperienceReading,experienceHref} from '../assets/experiences.js';
import {buildPageOverview,renderPageOverview} from '../assets/page-overviews.js';
import {escapeHTML,filterRoutes,filterAdvisors} from '../assets/core.js';
import {maintenanceBaseline} from './maintenance-baseline.mjs';
import {batchIds,originalIds,previousBatchMetadata,protectedFileHashes,versionOnlyFileHashes,sha256,experienceBatchBaseline,assertExperienceBatchPreserved} from './experience-batch-20261004-baseline.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)));
const experiences=read('application-experiences.json'),provenance=read('application-experience-provenance.json');
const records=normalizeExperiences(experiences),catalog=read('catalog.json');
const files=Object.fromEntries([...Object.keys(protectedFileHashes),...Object.keys(versionOnlyFileHashes)].map(name=>[name,fs.readFileSync(new URL('../'+name,import.meta.url))]));
const snapshot=()=>({experiences:structuredClone(experiences),provenance:structuredClone(provenance),files:{...files}});
const get=id=>records.find(r=>r.id===id);
const overview=rows=>buildPageOverview('experiences',catalog,{experiences:rows});

test('October 4 appends exactly five reviewed objects and preserves all 21 original records, provenance and metadata',()=>{
 assertExperienceBatchPreserved(snapshot());
 assert.equal(records.length,26);assert.equal(new Set(records.map(r=>r.id)).size,26);assert.equal(new Set(records.map(r=>r.url)).size,26);
 assert.deepEqual(records.map(r=>r.id),[...originalIds,...batchIds]);
 assert.equal(new Set(records.map(r=>r.platform)).size,19,'keep the existing display-platform grouping');
 assert.equal(records.filter(r=>r.collection==='bachelor').length,21);assert.equal(records.filter(r=>r.collection==='cross-background').length,5);
});

test('October 4 inverse is read-only, removes only five IDs, and composes with every historical hash',()=>{
 const before=JSON.stringify({experiences,provenance});
 for(const data of [experiences,provenance]){
  const old=experienceBatchBaseline(data);assert.deepEqual(old.records.map(r=>r.id),originalIds);
  assert.deepEqual(experienceBatchBaseline(old),old,'historical snapshots stay unchanged');
  const extra={id:'unreviewed-future-case',sentinel:true};
  const future=experienceBatchBaseline({...data,records:[...data.records,extra]});assert.deepEqual(future.records.at(-1),extra,'no generic tail truncation');
 }
 assert.equal(experienceBatchBaseline(experiences).checkedAt,'2026-10-03');
 assert.equal(maintenanceBaseline(experiences).checkedAt,'2026-10-02');
 for(const [name,data,expected] of [
  ['experience',experiences,'05b5bc420009910cdb9432bcb199df050007034c178fa2d2b9e7531cc76beb9b'],
  ['provenance',provenance,'0a057d4264371c0adbca86d6af5257919a45f5a767e40f39d9457e0698d9ccf8']
 ])assert.equal(sha256(JSON.stringify(maintenanceBaseline(data),null,2)+'\n'),expected,name);
 assert.equal(JSON.stringify({experiences,provenance}),before);
});

test('October 4 keeps official source files, F2 CSS and unrelated UI bytes fixed independently of the release manifest',()=>{
 assertExperienceBatchPreserved(snapshot());
 assert.equal(filterRoutes(catalog).length,28);assert.equal(filterAdvisors(catalog).length,41);assert.equal(catalog.deadlines.length,21);
 for(const name of Object.keys(protectedFileHashes).filter(name=>name.startsWith('data/'))){
  assert(!String(files[name]).includes('grad-zuoduan-westlake-ai4sci-2024'));assert(!/TU Delft/.test(String(files[name])));
 }
});

for(const id of batchIds)test('October 4 case renders, searches and keeps every boundary before the original source: '+id,()=>{
 const r=get(id);assert(r,id);const p=provenance.records.find(p=>p.id===id);assert(p,id);
 assert.deepEqual(Object.keys(r).sort(),Object.keys(records[0]).sort());
 assert.equal(p.url,r.url);assert.equal(r.rulesImpact,'none');assert.equal(r.evidenceType,'first_person_self_report');assert.equal(r.checkedAt,'2026-10-04');
 assert.match(p.independentReview.status,/^approved/);assert(p.independentReview.mode);assert(p.independentReview.scope.includes('reread'));
 assert.equal(p.officialRulesVerified,false);assert.equal(p.officialPolicyImpact,'none');
 for(const key of ['authorContext','outcome','summary','commercialDisclosure'])assert(p.fieldLocations[key],id+' source location for '+key);
 assert(p.fieldLocations.dateNote||(p.fieldLocations.publishedAt&&p.fieldLocations.applicableCycle),id+' source locations for publication and event dates');
 for(const query of [r.title,r.author,r.summary,r.actionableMethods[0]])assert(filterExperiences(records,{query}).some(result=>result.id===id),id+' searchable '+query);
 assert.deepEqual(filterExperiences(records,{query:r.author}).map(result=>result.id),[id]);
 const list=renderExperiences(records).html,card=list.split(`data-experience-id="${id}"`)[1].split('</article>')[0];
 assert.equal((card.match(/<a /g)||[]).length,1);assert(card.includes(`href="${experienceHref(id)}"`));assert(!card.includes('target="_blank"'));
 const h=renderExperienceReading(records,id).html,source=h.indexOf(`href="${escapeHTML(r.url)}"`);assert(source>0);
 for(const text of [r.summary,r.authorContext,r.outcome,r.readScope,r.dateNote,r.commercialDisclosure,r.bachelorApplicability,...r.actionableMethods,...r.excludedClaims]){
  const at=h.indexOf(escapeHTML(text));assert(at>=0,id+' renders '+text);assert(at<source,id+' content before source');
 }
 for(const section of ['这篇经验的总结','文中记录与结果','可借鉴的做法','不能照搬的部分','来源日期、核读范围与商业披露'])assert(h.indexOf(section)<source);
 assert.equal((h.match(/target="_blank"/g)||[]).length,1);assert(h.includes('rel="noopener noreferrer"'));assert(h.includes('href="#experiences"'));
});

test('October 4 all five cases contribute substantive linked evidence and the 26-case overview',()=>{
 const evidence=renderExperienceEvidence(records),model=overview(records),page=renderPageOverview('experiences',catalog,{experiences:records});
 assert(evidence.includes('这 26 篇经验的逐项依据'));assert(!evidence.includes('尚未纳入'));assert.equal(model.scope,'全页 26 篇公开自述');
 assert.equal(model.insights.length,3);assert(page.includes('data-overview-expand="experience-synthesis"'));
 for(const r of records)assert(evidence.includes(`href="${experienceHref(r.id)}"`),r.id);
 for(const id of batchIds){
  assert(evidence.includes(`href="${experienceHref(id)}"`),id);
  const paragraphs=evidence.split(/<li>|<p><strong>/).filter(fragment=>fragment.includes(`href="${experienceHref(id)}"`));
  assert(paragraphs.some(fragment=>fragment.includes('<p>')&&fragment.includes('experience-related')),id+' linked explanatory passage');
 }
 for(const phrase of ['红鸟挑战营','港中深2026年','港中深MSDS','Delft海外参考','西湖2024年'])assert(JSON.stringify(model).includes(phrase),phrase);
 for(const phrase of ['营选参与','截至发帖时','KTH','候补','未优营','海外','不是官方结论'])assert(evidence.includes(phrase),phrase);
});

test('October 4 any missing reviewed case prevents full synthesis, including a duplicate masking its count',()=>{
 for(const omitted of records){
  const partial=records.filter(r=>r.id!==omitted.id);
  assert(renderExperienceEvidence(partial).includes('综合总结暂不完整'),omitted.id);
  const model=overview(partial);assert.equal(model.title,'部分归纳依据暂未载入',omitted.id);assert(!JSON.stringify(model).includes('experience-synthesis'));
  const duplicate=normalizeExperiences({...experiences,records:[...partial,partial[0]]});assert.equal(duplicate.length,25);assert(renderExperienceEvidence(duplicate).includes('综合总结暂不完整'));
 }
 for(const rows of [null,[]]){assert.equal(renderExperienceEvidence(rows),'');assert(!JSON.stringify(overview(rows)).includes('experience-synthesis'));}
});

test('October 4 pending additions stay readable without being laundered into complete conclusions',()=>{
 const pending=[1,2].map(n=>({...records[0],id:'future-unreviewed-'+n,title:'Future pending '+n,url:'https://example.org/future-'+n}));
 const all=[...records,...pending],evidence=renderExperienceEvidence(all),model=overview(all),list=renderExperiences(all);
 assert.equal(list.countLabel,'28 条申请经验');assert(evidence.includes('这 26 篇经验的逐项依据'));assert(evidence.includes('另有 2 篇新收录经验尚未纳入'));
 assert.equal(model.scope,'已归纳 26 篇公开自述 · 另 2 篇待综合');assert(!evidence.includes('这 28 篇'));
 for(const r of pending){assert(list.html.includes(experienceHref(r.id)));assert(!evidence.includes(experienceHref(r.id)));assert(!JSON.stringify(model).includes(r.id));assert(renderExperienceReading(all,r.id).html.includes('查看原帖'));}
});

test('October 4 Westlake wording retains the corrected internship decision and separates self-assessment from admission',()=>{
 const r=get(batchIds[4]),p=provenance.records.find(p=>p.id===r.id);
 const correction='考虑到推免资格不确定和个人时间安排，未参加后续组内实习';assert(r.summary.includes(correction));assert.equal(p.independentReview.requiredWordingApplied,correction);assert.equal(provenance.batch20261004.requiredWordingCorrection,correction);
 for(const phrase of ['入营、未优营','未报告西湖正式录取','信工所','不能混作西湖结果'])assert(r.outcome.includes(phrase),phrase);
 assert(r.summary.includes('未优营原因仅是其自评'));assert(r.summary.includes('PI未参加该轮面试'));assert(r.authorContext.includes('本科专业未明写'));
 assert(r.excludedClaims.join('').includes('不把作者对未优营原因的解释写成官方结论'));assert.equal(r.publishedAt,'2024-10-02');assert(r.dateNote.includes('Created: 2024-10-02'));assert(r.readScope.includes('未读评论、视频、图片内材料或PI通信'));
});

test('October 4 outcome, date and actual read-scope boundaries remain distinct for all new sources',()=>{
 const [camp,phd,msds,delft]=batchIds.map(get);
 assert.equal(camp.publishedAt,null);assert(camp.applicableCycle.includes('2022年'));assert(camp.outcome.includes('未报告MPhil学位offer、接受或入学'));assert(camp.authorContext.includes('未披露本科院校、专业'));assert(camp.readScope.includes('未返回评论'));assert(camp.readScope.includes('图片内录取信和日程未核读'));assert(camp.readScope.includes('普通web打开失败'));
 assert.equal(phd.publishedAt,'2026-05-31');assert.equal(phd.collection,'cross-background');assert(phd.outcome.startsWith('截至2026-05-31发帖时'));assert(phd.outcome.includes('无正式录取、RA合同或实际入职证据'));assert(phd.background.includes('最高学历未注明'));assert(phd.excludedClaims.join('').includes('不推断今天'));assert(phd.readScope.includes('2条回复'));assert(phd.readScope.includes('评论未读'));
 assert.equal(msds.publishedAt,null);assert(msds.outcome.includes('2021-03-29港中深MSDS录取'));assert(msds.outcome.includes('最终去向为UCSD MSCS'));assert(msds.dateNote.includes('17是年级标签'));assert(msds.dateNote.includes('2020.02'));assert(msds.dateNote.includes('冲突'));assert(msds.background.includes('非MPhil/PhD'));assert(msds.readScope.includes('未读取外链'));
 assert.equal(delft.publishedAt,null);assert(delft.applicableCycle.includes('约2021'));assert(delft.dateNote.includes('上下文推定'));assert(delft.outcome.includes('另行申请'));assert(delft.outcome.includes('未核验录取或奖学金文件'));assert(delft.summary.includes('不据此认定KTH录取'));assert(delft.excludedClaims.join('').includes('不把KTH候补算录取'));
 for(const field of ['title','background','bachelorApplicability'])assert(delft[field].includes('海外参考'),field);assert(delft.bachelorApplicability.includes('不新增本站默认学位项目'));
});

test('October 4 review timestamps, privacy and public-source scope do not fabricate source verification',()=>{
 const batch=provenance.batch20261004;assert.equal(batch.preservedRecords,21);assert.deepEqual(batch.newRecordIds,batchIds);assert.deepEqual(batch.previousBatchMetadata,previousBatchMetadata);assert.equal(batch.officialRulesChanged,false);
 assert.equal(batch.sourceReviewDate,'2026-10-04');assert.match(batch.timeMeaning,/not a new web reread/);
 for(const id of batchIds){const r=get(id),p=provenance.records.find(p=>p.id===id);assert.equal(new URL(r.url).search,'');assert.equal(new URL(r.url).hash,'');
  for(const key of ['routeId','routeIds','advisorId','jobId','eligibility','verified'])assert(!Object.hasOwn(r,key),id+' '+key);
  for(const time of [p.reviewedAtUtc,p.independentReview.reviewedAtUtc]){assert(Number.isFinite(Date.parse(time)),id+' timestamp');assert(Date.parse(time)<=Date.parse(batch.integrationCheckedAtUtc),id+' source read before integration');}
  if(r.publishedAt)assert(r.publishedAt<=r.checkedAt);
 }
 const text=JSON.stringify({records:records.slice(21),provenance:provenance.records.slice(21)});
 for(const forbidden of ['xsec_token','xsec_source','/workspace/','rawHtml','mailto:','tel:','entryUrl'])assert(!text.includes(forbidden),forbidden);
 assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text));
 // 微信用户_c98sd is a public byline, not a contact handle. Do not broadly strip provenance-bearing names.
 assert.equal(get(batchIds[1]).author,'微信用户_c98sd');assert(!/(?:微信号|手机号|联系电话|申请编号)\s*[:：]/.test(text));
});

test('preservation negative controls reject changes to every original record, date and provenance object',()=>{
 assert.doesNotThrow(()=>assertExperienceBatchPreserved(snapshot()));
 for(let i=0;i<21;i++)for(const [name,change] of [
  ['record',s=>s.experiences.records[i].summary+=' MUTATED'],
  ['date',s=>s.experiences.records[i].checkedAt='2099-01-01'],
  ['provenance',s=>s.provenance.records[i].scope+=' MUTATED'],
  ['provenance date',s=>s.provenance.records[i].reviewedAtUtc='2099-01-01T00:00:00Z']
 ]){const altered=snapshot();change(altered);assert.throws(()=>assertExperienceBatchPreserved(altered),/original 21 objects/,originalIds[i]+' '+name);}
});

test('preservation negative controls reject date and metadata laundering, unknown fields, and reordering',()=>{
 for(const [name,change] of [
  ['collection date',s=>s.experiences.checkedAt='2099-01-01'],
  ['provenance current date',s=>s.provenance.latestBatchReviewDate='2099-01-01'],
  ['provenance historic date',s=>s.provenance.reviewDate='2099-01-01'],
  ['restoration date',s=>s.provenance.batch20261004.previousBatchMetadata.latestBatchReviewDate='2099-01-01'],
  ['restoration base',s=>s.provenance.batch20261004.previousBatchMetadata.latestBatchBaseCommit='forged'],
  ['scope',s=>s.experiences.scope+=' MUTATED'],
  ['unknown metadata',s=>s.provenance.extraClaim='forged'],
  ['original order',s=>[s.experiences.records[0],s.experiences.records[1]]=[s.experiences.records[1],s.experiences.records[0]]],
  ['extra record',s=>s.experiences.records.push({...s.experiences.records[0],id:'unapproved-sixth-case'})],
  ['missing batch record',s=>s.experiences.records.pop()]
 ]){const altered=snapshot();change(altered);assert.throws(()=>assertExperienceBatchPreserved(altered),undefined,name);}
});

test('preservation negative controls reject official datum and F2 UI mutations even if a manifest would be regenerated',()=>{
 for(const name of Object.keys(protectedFileHashes)){
  const altered=snapshot();altered.files[name]=Buffer.concat([Buffer.from(altered.files[name]),Buffer.from('\nMUTATED')]);
  assert.throws(()=>assertExperienceBatchPreserved(altered),/protected bytes changed/,name);
 }
 const official=snapshot(),changedCatalog=JSON.parse(official.files['data/catalog.json']);changedCatalog.routes[0].institution='FORGED';official.files['data/catalog.json']=Buffer.from(JSON.stringify(changedCatalog,null,2)+'\n');assert.throws(()=>assertExperienceBatchPreserved(official),/protected bytes changed: data\/catalog.json/);
 for(const name of Object.keys(versionOnlyFileHashes)){const altered=snapshot();altered.files[name]=Buffer.from(String(altered.files[name])+'\nMUTATED UI');assert.throws(()=>assertExperienceBatchPreserved(altered),/non-version UI change/,name);}
});
