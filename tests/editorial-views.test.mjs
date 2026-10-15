import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderProjectCard,renderDeadlineTimeline,renderMaterialCard,renderSourceDirectory} from '../assets/editorial-views.js';
import {filterDeadlines,deadlineStatus,escapeHTML,readerText,sourcesOf,browseRoutes,matchesSearch,institutionLabel,isBrowsableRoute,degreeLabel} from '../assets/core.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {normalizeExperiences,renderExperiences,renderExperienceEvidence} from '../assets/experiences.js';

const read = name => JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)));
const catalog = {...read('catalog.json'),raPositions:read('ra-positions.json').raPositions};
const escaped = value => escapeHTML(readerText(value));

// Run the current application functions with a small DOM boundary. These are
// behavior contracts, not browser/layout acceptance or a second implementation.
const appSource = fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const materialMatchSource = appSource.slice(appSource.indexOf('function materialMatches('),appSource.indexOf('\nfunction materialCard('));
const traySource = appSource.slice(appSource.indexOf('function updateTray(){'),appSource.indexOf('\nfunction showCompareLimit('));
const currentMaterialMatches = new Function('catalog','state','browseRoutes','displayInstitution','matchesSearch',`${materialMatchSource}; return materialMatches;`);
const materialCatalog = {...catalog,materials:[...catalog.materials,...normalizeMaterialSupplement(read('material-summaries.json'),catalog)]};
const materialIds = filters => materialCatalog.materials.filter(currentMaterialMatches(materialCatalog,filters,browseRoutes,institutionLabel,matchesSearch)).map(record=>record.id);

test('project comparison accessible names follow selection, removal and clear',()=>{
 const route = catalog.routes[0];
 for(const initiallySelected of [false,true]) {
  const html = renderProjectCard(route,{catalog,selectedIds:initiallySelected?[route.id]:[]});
  const attributes = html.match(/<button[^>]*data-compare-project=[^>]*>/)[0];
  const button = {dataset:{compareProject:route.id},attrs:{'aria-label':attributes.match(/aria-label="([^"]+)"/)[1]},
   setAttribute(key,value){this.attrs[key]=String(value);},getAttribute(key){return this.attrs[key];}};
  const nodes = new Map(), $ = selector => {if(!nodes.has(selector))nodes.set(selector,{setAttribute(){}});return nodes.get(selector);};
  const document = {body:{classList:{toggle(){}}},querySelectorAll:selector=>selector==='[data-compare-project]'?[button]:[]};
  const update = new Function('catalog','currentView','projectCompareIds','compareIds','$','document','buildOpportunities',`${traySource}; updateTray();`);
  for(const selected of [true,false,true,false]) {
   update(catalog,'routes',selected?[route.id]:[],[],$,document,()=>[]);
   assert.equal(button.attrs['aria-pressed'],String(selected));
   assert.equal(button.textContent,selected?'已选项目':'＋ 加入对比');
   assert.equal(button.attrs['aria-label'].startsWith(selected?'移出比较：':'加入比较：'),true);
  }
 }
});

test('material search matches separated words in real recorded requirements',()=>{
 const before = JSON.stringify(materialCatalog);
 assert(materialIds({query:'IELTS 6.5'}).includes('hku-mphil-materials'));
 assert(materialIds({query:'6.5 IELTS'}).includes('hku-mphil-materials'));
 assert.equal(materialIds({query:'IELTS zero-nonexistent-material-word'}).length,0);
 assert.equal(JSON.stringify(materialCatalog),before);
});

test('material search normalizes full-width text and surrounding whitespace',()=>{
 const expected = materialIds({query:'IELTS'});
 assert(expected.length>0);
 assert.deepEqual(materialIds({query:'ＩＥＬＴＳ'}),expected);
 assert.deepEqual(materialIds({query:'  IELTS  '}),expected);
 assert.deepEqual(materialIds({query:'   '}),materialIds({query:''}));
});

test('empty material search preserves institution and degree gates without mutating evidence',()=>{
 const before = JSON.stringify(materialCatalog);
 for(const filters of [{},{institution:'HKU'},{opportunityType:'MPhil'},{institution:'HKU',opportunityType:'MPhil'},{institution:'PolyU',opportunityType:'MSc'},{opportunityType:'RA'},{institution:'not-a-school'}]) {
  const routes = materialCatalog.routes.filter(route=>isBrowsableRoute(route)&&(!filters.institution||route.institution===filters.institution)&&(!filters.opportunityType||degreeLabel(route)===filters.opportunityType));
  const ids = new Set(routes.map(route=>route.id));
  const expected = materialCatalog.materials.filter(material=>(!filters.institution||material.institution===filters.institution)&&material.routeIds?.some(id=>ids.has(id))).map(material=>material.id);
  assert.deepEqual(materialIds({...filters,query:''}),expected);
 }
 assert.equal(materialIds({query:''}).length,19);
 assert.equal(JSON.stringify(materialCatalog),before);
});

test('project rows preserve independent record actions, exact conditions and selection',()=>{
 const before = JSON.stringify(catalog);
 for(const route of catalog.routes) {
  const html = renderProjectCard(route,{catalog,selectedIds:[route.id]});
  assert(html.includes(`data-project-id="${route.id}"`));
  assert(html.includes(`data-compare-project="${route.id}"`));
  assert(html.includes('aria-pressed="true"'));
  assert(html.includes(`data-summary-id="${route.id}"`));
  if(route.eligibilitySummary)assert(html.includes(escaped(route.eligibilitySummary)));
  assert(html.includes('<details class="project-eligibility">'));
 }
 assert.equal(JSON.stringify(catalog),before);
 const html = renderProjectCard({...catalog.routes[0],program:'<script>alert(1)</script>'},{catalog});
 assert(html.includes('&lt;script&gt;'));
 assert(!html.includes('<script>'));
 assert(html.includes('aria-pressed="false"'));
});

test('timeline groups every visible deadline once against catalog date and preserves original precision',()=>{
 const records = filterDeadlines(catalog);
 const before = JSON.stringify(records);
 const html = renderDeadlineTimeline(records,{catalog});
 assert(html.includes(`分组基准日：${catalog.metadata.checkedDate}`));
 assert.equal((html.match(/data-deadline-id=/g)||[]).length,records.length);
 for(const record of records) {
  assert(html.includes(`data-deadline-id="${record.id}"`));
  const group = deadlineStatus(record,catalog.metadata.checkedDate)==='expired'?'expired':record.date?'upcoming':'unknown';
  const portion = html.split(`data-deadline-group="${group}"`)[1].split('<section class="deadline-group"')[0];
  assert(portion.includes(`data-deadline-id="${record.id}"`));
  if(record.admissionYear)assert(html.includes(escaped(record.admissionYear)));
  if(record.timezone)assert(html.includes(escaped(record.timezone)));
 }
 assert.equal(JSON.stringify(records),before);
 const fixtures = [
  {id:'instant',date:'2027-02-21T10:30:00+08:00',timezone:'Asia/Hong_Kong',title:'Instant'},
  {id:'date-only',date:'2027-02-23',title:'Date only'},
  {id:'pending',date:null,title:'Pending'},
  {id:'job',jobId:'job-source',date:'2027-02-24',title:'RA'}
 ];
 const exact = renderDeadlineTimeline(fixtures,{catalog:{metadata:catalog.metadata,raPositions:[{id:'job-source',currentRecruitment:{deadlineTime:'17:00',timezone:'Asia/Shanghai'}}]}});
 assert(exact.includes('10:30:00+08:00'));
 assert(exact.includes('17:00'));
 assert(exact.includes('Asia/Shanghai'));
 const dateOnly = exact.split('data-deadline-id="date-only"')[1].split('</article>')[0];
 assert(dateOnly.includes('<dt>原始时刻</dt><dd>未注明</dd>'));
 assert(dateOnly.includes('<dt>时区</dt><dd>未注明</dd>'));
 assert(exact.includes('data-month="2027-02"'));
 assert(exact.includes('data-month="unknown"'));
 assert(!exact.includes('23:59'));
});

test('material checklist keeps each requirement and every unknown accessible',()=>{
 const materials = [...catalog.materials,...normalizeMaterialSupplement(read('material-summaries.json'),catalog)];
 for(const material of materials) {
  const before = JSON.stringify(material);
  const html = renderMaterialCard(material,{catalog});
  assert(html.includes(`data-summary-id="${material.id}"`));
  for(const item of material.requirements||material.items||[material.requirement].filter(Boolean)) {
   assert(html.includes(escaped(typeof item==='string'?item:item.text||item.requirement)));
  }
  for(const unknown of material.unknowns||[])assert(html.includes(escaped(unknown)));
  if(material.scope)assert(html.includes(escaped(material.scope)));
  assert.equal(JSON.stringify(material),before);
 }
 const conditional = materials.find(material=>material.requirements?.some(item=>item.requirementStatus==='conditional'));
 assert(renderMaterialCard(conditional,{catalog}).includes('符合相应条件时适用'));
});

test('source directory groups institutions without omitting source URLs or evidence boundaries',()=>{
 const html = renderSourceDirectory(read('update-status.json'),catalog);
 const institutions = new Set(catalog.watchSources.map(watch=>watch.institution||watch.school||'其他来源'));
 assert.equal((html.match(/class="source-institution"/g)||[]).length,institutions.size);
 for(const watch of catalog.watchSources) {
  for(const source of sourcesOf(watch.sources||watch.urls||watch.url&&[watch.url]||[]))assert(html.includes(escaped(source.url)));
  if(watch.scope)assert(html.includes(escaped(watch.scope)));
 }
 for(const boundary of ['资格','个人经验','不能自动证明个人指导关系','首轮执行尚未验证','社交线索不会直接改写官方资格结论','没有账号、上传、后台或外部分析'])assert(html.includes(boundary),boundary);
});

test('experience previews reveal result scope while evidence synthesis remains collapsed',()=>{
 const records = normalizeExperiences(read('application-experiences.json'));
 const html = renderExperiences(records).html;
 for(const record of records) {
  const card = html.split(`data-experience-id="${record.id}"`)[1].split('</article>')[0];
  assert(card.includes(escapeHTML(record.outcome)));
  assert(card.includes(escapeHTML(record.applicableCycle)));
  assert(card.includes(`href="#experiences/${encodeURIComponent(record.id)}"`));
  assert.equal((card.match(/<a /g)||[]).length,1);
 }
 const synthesis = renderExperienceEvidence(records);
 assert(synthesis.includes('<details id="experience-synthesis"'));
 assert(!synthesis.includes('<details id="experience-synthesis" open'));
});
