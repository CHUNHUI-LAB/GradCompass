import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterDeadlines,deadlineStatus,buildOpportunities,browseAdvisors} from '../assets/core.js';
import {renderDeadlineTimeline} from '../assets/editorial-views.js';
import {renderRecordSummary,normalizeProjectSummaries} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {overviewPresets,buildPageOverview} from '../assets/page-overviews.js';
import {reviewedPublicData,assertReviewedPublicData} from './reviewed-public-data.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
const c=json('data/catalog.json');
const audit=json('audits/phd-application-dates-2027-20261026.json');
const receipt=json('tests/fixtures/evidence/phd-application-dates-2027-20261026.json');
const prior=reviewedPublicData(read,{throughReceipt:'tests/fixtures/evidence/robotics-scope-correction-20261026.json'});
const find=id=>c.deadlines.find(d=>d.id===id);

test('2027 doctoral calendar covers each existing school with sources while preserving missing dates and distinct channels',()=>{
 const rows=filterDeadlines(c,{query:'2027',opportunityType:'PhD'});
 assert.equal(rows.length,58);assert.equal(c.deadlines.length,75);
 assert.deepEqual(new Set(rows.map(d=>d.institution)),new Set(c.advisors.map(a=>a.institution)));
 assert.equal(audit.coverage.length,20);assert.equal(new Set(audit.coverage.map(s=>s.institution)).size,20);
 assert.equal(audit.addedCalendarIds.length,44);
 for(const id of audit.addedCalendarIds){const d=find(id);assert(d&&rows.includes(d));assert.equal(d.degree,'PhD');assert.equal(d.status,d.date&&d.date<'2026-10-26'?'expired':'unknown');assert.equal(d.checkedDate,'2026-10-26');assert(d.applicantScope&&d.applicationDateKind&&d.sources.length);assert(d.routeIds.every(id=>c.routes.some(r=>r.id===id&&r.degree==='PhD')));}
 for(const school of ['nju','sjtu','fudan','tongji','ustc','seu']){const d=find(school+'-phd-2027-ordinary-pending');assert.equal(d.date,null);assert.equal(d.deadlineTime,null);assert.equal(d.startDate,null);assert.match(d.note,/未核实不等于学校尚未公布/);}
 const fast=find('sustech-aim-phd-2027-fast');assert.equal(fast.startDate,'2026-09-23');assert.equal(fast.date,null);assert.equal(fast.dateVerification,'published_start_only');
 assert.equal(find('seu-palm-phd-2027-screening').dateVerification,'published_no_deadline_specified');
});

test('school, entry-year keyword and doctoral filters compose independently of historical reference-route wording',()=>{
 assert.deepEqual(overviewPresets['deadlines-phd-2027'],{view:'deadlines',filters:{query:'2027',opportunityType:'PhD'}});
 const rows=filterDeadlines(c,{institution:'SJTU',query:'2027',opportunityType:'PhD'});
 assert.equal(rows.length,2);assert(rows.some(d=>d.applicationDateKind==='pre_recommendation'));assert(rows.some(d=>d.applicationDateKind==='pending'));
 assert.equal(c.routes.find(r=>r.id==='sjtu-robotics-phd-reference-2026').cycle2027Verified,false);
 assert(!filterDeadlines(c,{opportunityType:'MSc'}).some(d=>audit.addedCalendarIds.includes(d.id)));
 assert(!filterDeadlines(c,{institution:'HKU',opportunityType:'PhD',query:'2027'}).some(d=>d.id.startsWith('hku-ris-msc')));
 assert(filterDeadlines(c,{institution:'PKU',opportunityType:'PhD',query:'校内'}).some(d=>d.applicationDateKind==='internal_transfer'));
});

test('Westlake third domestic round excludes AI and live international dates resolve the stale search-index date',()=>{
 const third=find('westlake-ee-phd-2027-round3');assert.deepEqual(third.routeIds,['westlake-ee-phd']);assert.equal(third.date,'2026-12-28');assert.equal(third.startDate,'2026-12-07');assert.match(third.note,/智能信息技术不在第三轮/);
 const local=find('westlake-phd-2027-round2'),international=find('westlake-phd-2027-international-round1');
 assert.equal(local.date,'2026-11-02');assert.equal(international.date,'2026-11-02');assert.equal(local.timezone,'Asia/Shanghai');assert.equal(international.timezone,null);
 const source=audit.sources.find(s=>s.id==='westlake-international');assert.equal(source.retrieval,'primary_page_browser_visible_text');assert.match(source.textSha256,/^[a-f0-9]{64}$/);assert.equal(source.retrievalConflict.indexedDeadline,'2026-11-09 10:00');
});

test('net application, arrival, dispatch, postmark and internal transfer dates never substitute for one another',()=>{
 assert.equal(find('pku-sai-phd-2027-online').date,'2026-11-25');assert.equal(find('pku-sai-phd-2027-online').deadlineTime,'17:00');
 assert.equal(find('pku-sai-phd-2027-materials').date,'2026-11-27');assert.equal(find('pku-sai-phd-2027-materials').applicationDateKind,'materials_arrival');
 assert.equal(find('pku-sz-ece-phd-2027-materials').applicationDateKind,'materials_shipping');
 assert.equal(find('zju-ai-phd-2027-materials').applicationDateKind,'materials_postmark');assert.equal(find('zju-ai-phd-2027-materials').deadlineTime,null);
 assert.equal(find('pku-cs-phd-2027-transfer').applicationDateKind,'internal_transfer');assert.match(find('pku-cs-phd-2027-transfer').note,/不是外校/);
 const winter=find('tsinghua-phd-2027-winter');assert.equal(winter.startDate,'2026-11-01');assert.match(winter.note,/不宣称机械系或交叉信息院已经确定参加/);assert(!winter.routeIds.includes('tsinghua-me-phd-reference-2027'));
 const guide=find('xjtlu-phd-2027-self-merit-september');assert.equal(guide.date,'2027-01-15');assert.equal(guide.applicationDateKind,'funding_pathway_guide');assert.match(guide.note,/一般规划指引/);
});

test('the new AI date is consistent in calendar, both degree routes, project cycles and material dates while old observations stay historical',()=>{
 const d=find('cuhksz-ai-2027-fall-deadline');assert.equal(d.date,'2027-06-30');assert.equal(d.cycleReview.previous.date,'2027-05-31');assert.equal(d.checkedDate,'2026-10-02');assert.equal(d.cycleReview.checkedDate,'2026-10-26');assert.equal(d.deadlineTime,null);assert.equal(d.timezone,null);
 for(const id of ['cuhksz-ai-mphil','cuhksz-ai-phd']){const r=c.routes.find(r=>r.id===id),old=prior['data/catalog.json'].routes.find(r=>r.id===id);assert(r.notes.some(n=>n.includes('2027-06-30')));assert.deepEqual(r.cycleReview.history[0],old.cycleReview);assert.deepEqual(r.sourceRecord,old.sourceRecord);assert.equal(r.applicationStatus,'unknown');}
 const summaries=normalizeProjectSummaries(json('data/project-summaries.json'),c);for(const id of ['cuhksz-ai-mphil','cuhksz-ai-phd']){assert(summaries.get(id).cycle.text.includes('2027-06-30'));assert.equal(summaries.get(id).checkedDate,'2026-10-02');}
 const materials=normalizeMaterialSupplement(json('data/material-summaries.json'),c);const deadline=materials.find(r=>r.id==='cuhksz-ai-rpg-materials').requirements.find(r=>r.kind==='deadline');assert(deadline.text.includes('2027-06-30'));assert.deepEqual(deadline.sourceIds,['sz_ai_dates_20261026']);
});

test('calendar starts and pending dates render at the explicit date baseline without inventing times or current vacancies',()=>{
 const rows=[find('pku-sai-phd-2027-online'),find('sustech-aim-phd-2027-fast'),find('nju-lamda-phd-2027-screening'),find('hkust-cse-ece-phd-2027-fall-nonlocal')];
 const html=renderDeadlineTimeline(rows,{catalog:c});assert(html.includes('分组基准日：2026-10-26'));assert(html.includes('申请开始：2026-10-26 09:00'));assert(html.includes('适用对象'));assert(html.includes('此轮已截止'));assert(html.includes('日期 / 批次待核'));assert(!/undefined|\[object Object\]/.test(html));
 const detail=renderRecordSummary('deadline',rows[0],c).html;assert(detail.includes('申请开始'));assert(detail.includes('2026-10-26 09:00'));assert(detail.includes('普通申请考核'));
 assert.equal(deadlineStatus(find('tsinghua-phd-2027-winter'),c.metadata.deadlineAsOf),'unknown');
 const ordinary=find('hkust-cse-ece-phd-2027-fall-nonlocal');assert.equal(ordinary.deadlineTime,null);assert.equal(ordinary.timezone,null);
 const escaped=renderRecordSummary('deadline',{...rows[0],startDate:'<script>bad()</script>',applicantScope:'<img onerror=bad>'},c).html;assert(!escaped.includes('<script>'));assert(!escaped.includes('<img onerror'));assert(escaped.includes('&lt;script&gt;'));
});

test('blocked or missing official content cannot become a new verification, opening, or date by inference',()=>{
 const cityu=audit.sources.find(s=>s.id==='cityu');assert.equal(cityu.lastContentVerifiedDate,'2026-10-03');assert.equal(cityu.findingStatus,'blocked_recheck');
 const ustc=audit.sources.find(s=>s.id==='ustc-list');assert.equal(ustc.accessLimitation.acceptedAsNewVerifiedDate,false);assert(!audit.addedCalendarIds.some(id=>id.includes('ustc-tong')));
 for(const d of audit.addedCalendarIds.map(find)){assert.notEqual(d.status,'open');assert(!d.confirmedVacancy);assert(!d.cycle2028FallVerified);}
 assert.deepEqual(c.advisors,prior['data/catalog.json'].advisors);assert.equal(browseAdvisors(c,{opportunityType:'PhD'}).length,490);
 const raPositions=json('data/ra-positions.json').raPositions;assert.deepEqual(buildOpportunities({...c,raPositions}),buildOpportunities({...prior['data/catalog.json'],raPositions}));
});

test('independent receipt replays all current data and rejects date, channel and scope tampering',()=>{
 assert.equal(receipt.operations.length,53);
 const actual=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(n=>n.endsWith('.json')).map(n=>['data/'+n,json('data/'+n)]));assertReviewedPublicData(actual,read);
 for(const mutate of [d=>d.deadlines.find(d=>d.id==='cuhksz-ai-2027-fall-deadline').date='2027-05-31',d=>d.deadlines.find(d=>d.id==='westlake-ee-phd-2027-round3').routeIds.push('westlake-ai-phd'),d=>d.deadlines.find(d=>d.id==='fudan-phd-2027-ordinary-pending').date='2026-12-15',d=>d.deadlines.find(d=>d.id==='hkust-cse-ece-phd-2027-fall-nonlocal').deadlineTime='23:59']){const bad=structuredClone(actual);mutate(bad['data/catalog.json']);assert.throws(()=>assertReviewedPublicData(bad,read));}
});


test('calendar overview separates the grouping baseline from source verification and preserves the historical fallback',()=>{
 const before=JSON.stringify(c);
 assert.equal(c.metadata.deadlineAsOf,'2026-10-26');
 assert.notEqual(c.metadata.deadlineAsOf,c.metadata.checkedDate);
 const overview=buildPageOverview('deadlines',c);
 assert.equal(overview.scope,'日期分组基准日 2026-10-26');
 assert(overview.note.includes('按基准日 2026-10-26 分组'));
 assert(overview.note.includes('各项实际核验日期见来源'));
 assert(overview.note.includes('不是实时开放状态'));
 assert(!JSON.stringify(overview).includes('日期目录核验'));
 const historical=structuredClone(c);
 delete historical.metadata.deadlineAsOf;
 const fallback=buildPageOverview('deadlines',historical);
 assert.equal(fallback.scope,`日期分组基准日 ${historical.metadata.checkedDate}`);
 assert(fallback.note.includes(`按基准日 ${historical.metadata.checkedDate} 分组`));
 assert.equal(JSON.stringify(c),before);
});
