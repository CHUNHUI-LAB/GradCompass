import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {escapeHTML, isVerifiedRoute, readerText} from '../assets/core.js';
import {normalizeProjectSummaries} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {PROJECT_COMPARISON_UNKNOWN, selectProjectComparisonRoutes, projectComparisonRows, renderProjectComparison} from '../assets/project-comparison.js';
const read = name => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const original = read('catalog.json');
const catalog = {...original, projectSummaries:normalizeProjectSummaries(read('project-summaries.json'), original), materials:[...original.materials, ...normalizeMaterialSupplement(read('material-summaries.json'), original)]};
const ids = ['HKUST-CSE-MPhil', 'polyu_aae_rpg-phd', 'cityu_ds_phd'];
const row = (records, key) => records.find(record => record.key === key);
const e = value => escapeHTML(readerText(value));
const source = {label:'Verified source', url:'https://example.edu/requirements', checkedDate:'2026-10-01'};
const fakeRoute = (id, overrides = {}) => ({id, institution:'HKUST', program:`Project ${id}`, degree:'MPhil', status:'verified', bachelorEligible:true, noMasterRequired:true, noTuimianRequired:true, sources:[source], ...overrides});

test('project selections accept raw verified academic IDs in requested order and cap at three', () => {
 assert.deepEqual(selectProjectComparisonRoutes(catalog, [ids[1], ids[0], ids[1], 'missing', ids[2], 'HKU-CDS-MPhil']).map(route => route.id), [ids[1], ids[0], ids[2]]);
 assert.deepEqual(selectProjectComparisonRoutes(catalog, null), []);
 assert.deepEqual(selectProjectComparisonRoutes({}, ids), []);
 assert.deepEqual(selectProjectComparisonRoutes(catalog, ['advisor::HKUST-CSE-MPhil', 'HKUST-CSE-PhD-supplement', 'cityu_ds_mphil-excluded', null, {}]), []);
 });
test('employment and unverified qualification records cannot enter academic comparison', () => {
 const invalid = [fakeRoute('ra', {degree:'RA'}), fakeRoute('mixed', {degree:'RA / PhD'}), fakeRoute('job', {kind:'employment'}), fakeRoute('ra-type', {opportunityType:'RA'}), fakeRoute('job-id', {jobId:'r1'}), fakeRoute('job-ids', {jobIds:['r1']}), fakeRoute('hidden', {defaultVisible:false}), fakeRoute('unknown', {status:'unknown'}), fakeRoute('masters-needed', {noMasterRequired:false}), fakeRoute('nomination', {noTuimianRequired:false}), fakeRoute('bachelor-no', {bachelorEligible:false})];
 assert.deepEqual(selectProjectComparisonRoutes({routes:invalid}, invalid.map(route => route.id)), []);
 });
test('fewer than two valid projects gives a recoverable, truthful empty state', () => {
 for (const selected of [[], [ids[0]], [ids[0], ids[0]], ['missing', 'HKUST-CSE-PhD-supplement']]) {
  const html = renderProjectComparison(catalog, selected);
  assert.match(html, /请选择 2–3 个项目进行对比/);
  assert(!html.includes('<table'));
  assert(!html.includes('data-summary-id="undefined"'));
 }
 });
test('two and three columns use semantic headers and accessible control contracts', () => {
 for (const selected of [ids.slice(0, 2), ids]) {
  const html = renderProjectComparison(catalog, selected);
  assert.match(html, /<table class="project-comparison-table/);
  assert.match(html, /<caption/);
  assert.match(html, /<thead>/);
  assert.equal((html.match(/class="project-comparison-heading"/g) || []).length, selected.length);
  assert.equal((html.match(/data-remove-project=/g) || []).length, selected.length);
  assert.equal((html.match(/data-summary-kind="project"/g) || []).length, selected.length);
  for (const id of selected) {
   assert(html.includes(`data-remove-project="${id}"`));
   assert(html.includes(`data-summary-id="${id}"`));
  }
  for (const key of ['research','training','bachelor','cycle','language','funding','deadlines','cautions','sources']) {
   assert(html.includes(`scope="row" id="project-comparison-row-${key}"`));
   assert(html.includes(`headers="project-comparison-row-${key} project-comparison-column-0"`));
  }
  assert.match(html, /data-project-differences aria-pressed="false"/);
  assert.match(html, /role="region" aria-label="项目对比表，可横向滚动" tabindex="0"/);
  assert.match(html, /project-comparison-meta/);
  assert.match(html, /project-comparison-control/);
 }
 });
test('real research, training, qualification and cycle facts are displayed in full', () => {
 const rows = projectComparisonRows(catalog, ids);
 for (const [index, id] of ids.entries()) {
  const brief = catalog.projectSummaries.get(id);
  const route = catalog.routes.find(route => route.id === id);
  for (const [key, field] of [['research','overview'], ['training','training'], ['bachelor','bachelorEntry'], ['cycle','cycle']]) assert(row(rows, key).values[index].includes(brief[field].text));
  assert(row(rows, 'bachelor').values[index].includes(route.eligibilitySummary));
  for (const caution of brief.cautions) assert(row(rows, 'cautions').values[index].includes(caution.text));
  for (const note of route.notes) assert(row(rows, 'cautions').values[index].includes(note));
  assert(renderProjectComparison(catalog, ids).includes(e(brief.overview.text)));
 }
 assert(row(rows, 'bachelor').values[1].includes('三年制'));
 assert(row(rows, 'cautions').values[2].includes('MPhil'));
 });
test('every actual verified project has its own comparison column without modifying catalog data', () => {
 const before = structuredClone(catalog);
 for (const route of catalog.routes.filter(isVerifiedRoute)) {
  const other = route.id === ids[0] ? ids[1] : ids[0];
  const html = renderProjectComparison(catalog, [route.id, other]);
  assert(html.includes(`data-summary-id="${e(route.id)}"`));
  assert(html.includes(e(route.program)));
 }
 assert.deepEqual(catalog, before);
 });
test('explicit linked language requirements keep thresholds, exemptions, conditions and applicability', () => {
 const values = row(projectComparisonRows(catalog, ['HKUST-CSE-MPhil','hkust-gz-rbm','westlake-ai-phd']), 'language').values;
 assert(values[0].includes('2026-01-21'));
 assert(values[0].includes('英语母语或英语授课本科可按规则豁免'));
 assert(values[0].includes('符合相应条件时适用'));
 assert(values[0].includes('2027/28项目目录＋现行本部材料规则'));
 assert(values[1].includes('不收在家考'));
 assert(values[1].includes('符合官方英文授课豁免条件者另审'));
 assert(values[2].includes('CET6≥480'));
 assert(values[2].includes('公告限定的境外英文授课学位条件'));
 });
test('language and funding require explicit evidence and do not infer from degrees or advisor biographies', () => {
 const local = {routes:[fakeRoute('a', {funding:'Guaranteed', notes:['HKPFS mentioned as another application'] }), fakeRoute('b', {requirements:[{kind:'language', text:'IELTS 1', sources:[{url:'javascript:bad'}]}, {kind:'funding', text:'All expenses covered', sources:[]} ]})], advisors:[{funding:'Everything paid'}]};
 const rows = projectComparisonRows(local, ['a','b']);
 assert.deepEqual(row(rows,'language').values, [PROJECT_COMPARISON_UNKNOWN, PROJECT_COMPARISON_UNKNOWN]);
 assert.deepEqual(row(rows,'funding').values, [PROJECT_COMPARISON_UNKNOWN, PROJECT_COMPARISON_UNKNOWN]);
 assert(!renderProjectComparison(local, ['a','b']).includes('Guaranteed'));
 assert(projectComparisonRows(catalog, ids).find(row => row.key === 'funding').values.every(value => value === PROJECT_COMPARISON_UNKNOWN));
 });
test('an explicitly sourced funding requirement retains the entire condition', () => {
 const text = '仅符合奖学金条件者可另行申请；金额及个人获资助结果未核实';
 const local = {routes:[fakeRoute('a', {requirements:[{kind:'funding', text, requirementStatus:'conditional', sources:[source]}]}), fakeRoute('b')]};
 const values = row(projectComparisonRows(local, ['a','b']), 'funding').values;
 assert.equal(values[0], `符合相应条件时适用：${text}`);
 assert.equal(values[1], PROJECT_COMPARISON_UNKNOWN);
 });
test('linked material evidence must match route, campus, academic scope and verified status', () => {
 const makeMaterial = overrides => ({id:'m', status:'verified', institution:'HKUST', routeIds:['a'], requirements:[{kind:'language', text:'SHOULD_NOT_APPEAR', sources:[source]}], ...overrides});
 for (const bad of [{institution:'HKU'}, {routeIds:['b']}, {status:'unknown'}, {opportunityType:'RA'}, {jobIds:['job']}, {requirements:[{kind:'language', text:'SHOULD_NOT_APPEAR', sourceIds:['unresolved-source']}]}]) {
  const local = {routes:[fakeRoute('a'), fakeRoute('b')], materials:[makeMaterial(bad)]};
  assert.equal(row(projectComparisonRows(local, ['a','b']), 'language').values[0], PROJECT_COMPARISON_UNKNOWN);
 }
 });
test('deadline records keep full dates, time, timezone, application status, notes and cycle review', () => {
 const selected = ['cityu_ds_phd', 'hkust-gz-rbm', 'cuhksz-ai-phd'];
 const values = row(projectComparisonRows(catalog, selected), 'deadlines').values;
 assert(values[0].includes('2026-12-01'));
 assert(values[0].includes('截止时刻：23:59（香港时间 UTC+8）；时区：Asia/Hong_Kong'));
 assert(values[0].includes('申请状态：开放状态待核实'));
 assert(values[0].includes('批次复核于 2026-10-03'));
 assert(values[1].includes('截止时刻：23:59；时区：未注明'));
 assert(values[1].includes('Red Bird'));
 assert(values[1].includes('迟交进入 2028 Fall'));
 assert(!values[1].includes('时区：Asia/Hong_Kong'));
 assert(values[2].includes('2027 Spring'));
 assert(values[2].includes('截止时刻：未注明；时区：未注明'));
 for (const [index,id] of selected.entries()) for (const deadline of catalog.deadlines.filter(record => record.routeIds.includes(id))) assert(values[index].includes(deadline.note));
 });
test('expired, unknown and future-open dates remain distinguishable without implying future availability', () => {
 const local = {metadata:{checkedDate:'2026-10-01'}, routes:[fakeRoute('a'),fakeRoute('b'),fakeRoute('c')], deadlines:[
  {id:'expired', title:'Expired round', routeIds:['a'], date:'2026-09-01', status:'open'},
  {id:'unknown', title:'Unknown round', routeIds:['b'], date:null, status:'unknown'},
  {id:'future', title:'Future round', routeIds:['c'], date:'2027-06-01', status:'unknown'}
 ]};
 const values = row(projectComparisonRows(local, ['a','b','c']), 'deadlines').values;
 assert(values[0].includes('此轮已截止'));
 assert(values[1].includes(PROJECT_COMPARISON_UNKNOWN));
 assert(values[2].includes('日期已公布；申请状态：开放状态待核实'));
 assert(!values[2].includes('记录标记开放'));
 assert(renderProjectComparison(local, ['a','b','c']).includes('未来截止日期不证明当前开放提交'));
 });
test('difference-only mode hides only identical complete row text and always keeps sources and project links', () => {
 const local = {routes:[fakeRoute('a', {eligibilitySummary:'本科一等荣誉；四年制'}),fakeRoute('b', {eligibilitySummary:'本科一等荣誉；三年制须硕士'})]};
 const all = renderProjectComparison(local, ['a','b']);
 const differences = renderProjectComparison(local, ['a','b'], true);
 assert(all.includes('data-comparison-row="funding"'));
 assert(!differences.includes('data-comparison-row="funding"'));
 assert(differences.includes('data-comparison-row="bachelor"'));
 assert(differences.includes('data-comparison-row="sources"'));
 assert.match(differences, /data-project-differences aria-pressed="true"/);
 assert(differences.includes('含共同未核实项'));
 assert(differences.includes('相同描述不代表条件等同'));
 assert.equal((differences.match(/data-summary-kind="project"/g) || []).length, 2);
 assert(all.includes('data-comparison-row="training"'));
 });
test('missing or mismatched project summaries never fabricate research/training and preserve basic qualification', () => {
 const local = {...catalog, projectSummaries:new Map()};
 const rows = projectComparisonRows(local, ids);
 assert(row(rows,'research').values.every(value => value === PROJECT_COMPARISON_UNKNOWN));
 assert(row(rows,'training').values.every(value => value === PROJECT_COMPARISON_UNKNOWN));
 assert(row(rows,'bachelor').values.every(value => value !== PROJECT_COMPARISON_UNKNOWN));
 const brief = catalog.projectSummaries.get(ids[0]);
 for (const bad of [{...brief, institution:'HKU'}, {...brief, degree:'RA'}, {...brief, routeId:'other'}, {...brief, overview:{text:'invented', sourceIds:['missing']}}]) {
  const amended = {...catalog, projectSummaries:new Map([[ids[0], bad]])};
  assert.equal(row(projectComparisonRows(amended, ids), 'research').values[0], PROJECT_COMPARISON_UNKNOWN);
 }
 });
test('all rendered text and attributes are escaped, and unsafe source URLs are removed', () => {
 const id = 'a" onmouseover="bad';
 const unsafe = '<img src=x onerror="bad">';
 const local = {metadata:{checkedDate:unsafe}, routes:[fakeRoute(id, {program:unsafe, institution:unsafe, department:unsafe, eligibilitySummary:unsafe, notes:[unsafe], requirements:[{kind:'language', text:unsafe, sources:[source]}], sources:[{label:unsafe, url:'https://example.edu/?q="&x=<x>'},{label:'BAD', url:'javascript:alert(1)'},{label:'BAD',url:'data:text/html,test'}, {label:'BAD',url:'file:///private'}]}),fakeRoute('b')], deadlines:[{title:unsafe, routeIds:[id], timezone:unsafe, date:unsafe, note:unsafe}]};
 const html = renderProjectComparison(local, [id,'b']);
 assert(html.includes(e(unsafe)));
 assert(html.includes(`data-remove-project="${e(id)}"`));
 assert(!html.includes('<img'));
 assert(!html.includes('data-remove-project="a" onmouseover='));
 assert(!html.includes('javascript:'));
 assert(!html.includes('data:text/html'));
 assert(!html.includes('file:///'));
 for (const anchor of html.match(/<a\b[^>]*>/g) || []) {
  assert(anchor.includes('target="_blank"'));
  assert(anchor.includes('rel="noopener noreferrer"'));
 }
 });
test('source provenance retains separate verification dates and project summary sources', () => {
 const html = renderProjectComparison(catalog, ['cityu_ds_phd', 'HKUST-CSE-MPhil']);
 assert(html.includes('2026-10-01'));
 assert(html.includes('2026-10-02'));
 assert(html.includes('2026-10-03'));
 const brief = catalog.projectSummaries.get('HKUST-CSE-MPhil');
 for (const source of brief.sources) assert(html.includes(`href="${e(new URL(source.url).href)}"`));
 const repeated = {routes:[fakeRoute('a', {sources:[source,{...source, checkedDate:'2026-10-03'}]}), fakeRoute('b')]};
 assert(renderProjectComparison(repeated, ['a','b']).includes('来源核验：2026-10-01、2026-10-03'));
 });
