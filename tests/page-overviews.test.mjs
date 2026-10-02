import {recruitmentBaselineText} from './recruitment-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {buildPageOverview,renderPageOverview,overviewPresets} from '../assets/page-overviews.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {normalizeProjectSummaries} from '../assets/record-summaries.js';
import {normalizeExperiences,renderExperiences} from '../assets/experiences.js';
import {filterDeadlines,filterRoutes,filterOpportunities} from '../assets/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)));
const catalog=read('catalog.json');catalog.raPositions=read('ra-positions.json').raPositions;
catalog.materials.push(...normalizeMaterialSupplement(read('material-summaries.json'),catalog));
catalog.projectSummaries=normalizeProjectSummaries(read('project-summaries.json'),catalog);
const experiences=normalizeExperiences(read('application-experiences.json'));
const options={experiences,projectSummaryState:'loaded',materialSupplementState:'loaded'};
const views=['advisors','routes','deadlines','materials','experiences'];
const model=view=>buildPageOverview(view,catalog,options);
const plain=view=>JSON.stringify(model(view));

test('five distinct page overviews provide real synthesis before item-level lists',()=>{
 for(const view of views){const m=model(view);assert.equal(m.insights.length,3);assert(new Set(m.insights.map(i=>i.title)).size===3);assert(m.insights.every(i=>i.text.length>=45));const html=renderPageOverview(view,catalog,options);assert(html.includes(`data-page-overview="${view}"`));assert(html.includes('page-overview-title'));assert(!html.includes('undefined'));assert(!html.includes('[object Object]'));}
 assert.equal(buildPageOverview('sources',catalog,options),null);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert(html.indexOf('id="page-overview"')<html.indexOf('class="search-surface"'));assert(html.indexOf('id="page-overview"')<html.indexOf('id="view-content"'));
});
test('advisor coverage uses unique included people, distinguishes degree signals from RA jobs',()=>{
 const s=plain('advisors');assert(s.includes('32 位导师'));assert(s.includes('48 条机会'));assert(s.includes('46 条学位机会中，25 条'));assert(s.includes('2 个已核实 RA 岗位'));assert(s.includes('灵巧操作与触觉涉及 21 位'));assert(!s.includes('34 位导师'));assert(!s.includes('46 位导师'));
});
test('programme synthesis reports complete current coverage without inflating the route count',()=>{
 const s=plain('routes');for(const text of ['27 个项目','9 所学校','13 个 MPhil','12 个 PhD','27 个项目有培养与研究简介','另外 0 个目前仅有基本条件'])assert(s.includes(text),text);assert(s.includes('授课'));assert(s.includes('固定导师名额'));
});
test('programme loading and failed states never pretend introductions loaded',()=>{
 for(const state of ['loading','unavailable']){const m=buildPageOverview('routes',{...catalog,projectSummaries:new Map},{...options,projectSummaryState:state});assert(!JSON.stringify(m).includes('27 个项目有培养'));assert(m.insights[2].text.includes(state==='loading'?'正在载入':'暂未载入'));assert.equal(m.insights[0].action.label,'查看 CSE 项目条件');}
 const m=buildPageOverview('routes',{...catalog,projectSummaries:new Map([...catalog.projectSummaries].slice(0,1))},{...options,projectSummaryState:'partial'});assert(m.insights[2].text.includes('1 个项目'));assert(m.insights[2].text.includes('26 个'));assert(m.insights[2].text.includes('部分简介未能验证'));
});
test('calendar synthesis is scoped to current date records and explicitly warns of unsynced programme cycles',()=>{
 const s=plain('deadlines');for(const text of ['2026-10-20','18 条后续日期记录','1 条日期或批次待确认','2 条已截止记录','2026-10-01','本页已记录日期','日历尚未覆盖','不是实时开放状态'])assert(s.includes(text),text);assert(!s.includes('最近申请截止'));assert(!s.includes('HKU 尚未公布'));
});
test('calendar empty and expired-only snapshots do not invent a next future date',()=>{
 const c={...catalog,deadlines:[],raPositions:[]};const s=JSON.stringify(buildPageOverview('deadlines',c,options));assert(s.includes('暂没有可列出的后续截止日期'));assert(!s.includes('2026-10-20'));assert(!s.includes('查看这轮日期与条件'));
});
test('material synthesis exposes concrete requirement differences and missing-data boundaries',()=>{
 const s=plain('materials');for(const text of ['14 组摘要','27 个项目','MPhil 需 2 份','博士需 3 份','指定表格','鼓励但非必需','HKPFS','RA 岗位文件'])assert(s.includes(text),text);
 const base=read('catalog.json');const fallback=JSON.stringify(buildPageOverview('materials',{...catalog,materials:base.materials},{...options,materialSupplementState:'unavailable'}));assert(fallback.includes('当前载入 2 组'));assert(fallback.includes('未完整载入'));assert(!fallback.includes('MPhil 需 2 份'));assert(!fallback.includes('data-summary-id="cuhk'));
});
test('experience synthesis keeps historical, self-report and unfinished outcome boundaries',()=>{
 const s=plain('experiences');for(const text of ['19 篇公开自述','2015 / 2018','不是录取率','未完成申请','RA offer、暑研和学位录取是不同结果'])assert(s.includes(text),text);const html=renderExperiences(experiences).html;assert(html.includes('<details id="experience-synthesis"'));assert(html.includes('不同背景的结果不宜直接比较'));assert.equal((html.match(/data-experience-id=/g)||[]).length,19);assert(!html.includes('id="experience-synthesis" open'));
});
test('experience missing, empty and partial loads cannot reuse absent case conclusions',()=>{
 for(const records of [null,[],experiences.slice(0,4)]){const s=JSON.stringify(buildPageOverview('experiences',catalog,{...options,experiences:records}));assert(!s.includes('2015 / 2018'));assert(!s.includes('RA 后申博、医工'));assert(!s.includes('experience-synthesis'));}for(const omitted of experiences){const partial=experiences.filter(r=>r.id!==omitted.id);const summary=JSON.stringify(buildPageOverview('experiences',catalog,{...options,experiences:partial}));assert(summary.includes('部分归纳依据暂未载入'),omitted.id);assert(!summary.includes('experience-synthesis'),omitted.id);}
});
test('every overview action targets an included summary, existing case, or nonempty validated preset',()=>{
 for(const view of views)for(const {action:a} of model(view).insights){if(!a)continue;if(a.kind){const rows=a.kind==='project'?filterRoutes(catalog):a.kind==='deadline'?filterDeadlines(catalog):catalog.materials;assert(rows.some(r=>r.id===a.id),a.id);}else if(a.preset){const p=overviewPresets[a.preset];assert.equal(p.view,view);assert((view==='advisors'?filterOpportunities:filterRoutes)(catalog,p.filters).length>0,a.preset);}else if(a.href?.startsWith('#experiences/'))assert(experiences.some(r=>r.id===decodeURIComponent(a.href.split('/')[1])));}
});
test('global overviews are deterministic, read-only, and escape data-controlled text',()=>{
 const before=JSON.stringify(catalog);for(const view of views){assert.equal(renderPageOverview(view,catalog,options),renderPageOverview(view,catalog,options));}assert.equal(JSON.stringify(catalog),before);const c={...catalog,metadata:{...catalog.metadata,checkedDate:'<script>alert(1)</script>'}};const html=renderPageOverview('deadlines',c,options);assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
});
test('reviewed catalog and materials plus expanded experience data retain their declared snapshot bytes',()=>{
 const expected={'catalog.json':'045a3a5886d5','material-summaries.json':'193f8d81ae8a','application-experiences.json':'05b5bc420009'};
 for(const [name,sha]of Object.entries(expected)){const bytes=name==='catalog.json'?recruitmentBaselineText(read(name)):fs.readFileSync(new URL('../data/'+name,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12),sha,name);}
});

test('compact advisor entry retains three substantive conclusions without disclosure',()=>{
 const m=model('advisors'),html=renderPageOverview('advisors',catalog,options);
 assert.equal(m.insights.length,3);
 for(const text of ['张富','多传感定位','刘希慧','多模态导航','代表工作','MPhil','PhD','2 个已核实 RA 岗位','培养与指导关系','任期与任职条件','25 条','其余待确认','院系招生都不等于导师本轮名额','条件与来源'])assert(m.insights.some(i=>i.text.includes(text)),text);
 for(const insight of m.insights){assert(html.includes(`<p>${insight.text}</p>`));assert(insight.text.length>=45);}
 assert(!html.includes('<details'));
 assert.equal((html.match(/data-overview-preset=/g)||[]).length,3);
 assert(m.note.includes('不随筛选变化')&&m.note.includes('不等于导师人数'));
});
test('entry hierarchy styles are confined to the advisor page and do not add motion',()=>{
 const css=fs.readFileSync(new URL('../assets/style.css',import.meta.url),'utf8');
 const refinement=css.slice(css.indexOf('/* Advisor entry:'));
 assert(refinement.includes('[data-page-overview="advisors"]'));
 assert(!refinement.includes('animation:')&&!refinement.includes('transition:'));
 assert(!refinement.includes('display:none')&&!refinement.includes('font-size:11px'));
 assert(css.includes('prefers-reduced-motion:reduce'));
});
