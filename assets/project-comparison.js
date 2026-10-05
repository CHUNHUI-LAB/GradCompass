import {escapeHTML, readerText, safeUrl, sourcesOf, institutionLabel, degreeLabel, degreeDisplay, isBrowsableRoute, routeEvidenceText, deadlineStatus} from './core.js?v=79b44f84ac83';
import {supervisorAssociationText} from './record-summaries.js?v=a3bc1afa9310';

export const PROJECT_COMPARISON_UNKNOWN = '未核实，以当期官方要求为准';
const e = value => escapeHTML(readerText(value));
const list = value => Array.isArray(value) ? value : [];
const text = value => typeof value === 'string' ? value : value?.text || value?.requirement || '';
const unique = values => [...new Set(values.map(text).filter(value => value.trim()))];
const join = values => unique(values).join('\n') || PROJECT_COMPARISON_UNKNOWN;
const requirementLabels = {required:'已明确要求', conditional:'符合相应条件时适用', published:'已公布', not_specified:'未明确统一要求', unknown:'待确认', optional:'选交', required_count_unknown:'需要提交，数量待确认', required_for_hkpfs:'仅 HKPFS 申请需要', published_school_only:'仅确认学校统一要求'};
const applicationLabels = {open:'记录标记开放，当前实际提交状态仍需核对', unknown:'开放状态待核实', closed:'此轮已关闭', expired:'此轮已截止'};
const dateLabels = {upcoming:'已公布后续日期', unknown:'日期或批次待核实', expired:'此轮已截止', closed:'此轮已截止', published:'日期已公布'};

// Only raw academic route IDs are accepted. Advisor-opportunity IDs and
// employment records cannot become academic routes through a matching label.
export function selectProjectComparisonRoutes(catalog, selectedIds) {
 const routes = list(catalog?.routes);
 return [...new Set(list(selectedIds).filter(id => typeof id === 'string'))]
  .map(id => routes.find(route => route.id === id))
  .filter(route => route && isBrowsableRoute(route)
   && ['MSc','MPhil','PhD','MRes'].includes(degreeLabel(route))
   && !/\bRA\b/i.test(route.degree || '') && route.opportunityType !== 'RA'
   && route.kind !== 'employment' && !route.jobId && !list(route.jobIds).length)
  .slice(0, 3);
}

function summaryFor(catalog, route) {
 const brief = catalog?.projectSummaries?.get?.(route.id);
 return brief?.routeId === route.id && brief.institution === route.institution && brief.degree === route.degree ? brief : null;
}
function fact(brief, key) {
 const value = brief?.[key];
 const sourceIds = list(value?.sourceIds);
 return text(value) && sourceIds.length && sourceIds.every(id => list(brief.sources).some(source => source.id === id && safeUrl(source.url))) ? text(value) : '';
}
function cautions(brief) {
 return list(brief?.cautions).filter(value => list(value?.sourceIds).length && value.sourceIds.every(id => list(brief.sources).some(source => source.id === id && safeUrl(source.url)))).map(text);
}
function materialRecords(catalog, route) {
 return list(catalog?.materials).filter(record => record.status === 'verified' && record.institution === route.institution
  && list(record.routeIds).includes(route.id) && record.opportunityType !== 'RA' && !list(record.jobIds).length);
}
function explicitRequirements(route, materials, kind) {
 const fromRoute = list(route.requirements).filter(value => value?.kind === kind && text(value) && sourcesOf(value.sources || route.sources).length)
  .map(value => ({value, scope:[], sources:value.sources || route.sources}));
 const fromMaterials = materials.flatMap(record => list(record.requirements)
  .filter(value => value?.kind === kind && text(value) && sourcesOf(value.sources).length)
  .map(value => ({value, scope:unique([record.admissionYear, record.scope, ...list(record.scopeNotes)]), sources:value.sources})));
 return [...fromRoute, ...fromMaterials];
}
function requirementText(entries) {
 return join(entries.map(({value, scope}) => join([
  value.requirementStatus ? `${requirementLabels[value.requirementStatus] || value.requirementStatus}：${text(value)}` : text(value),
  ...scope.map(value => `适用范围：${value}`)
 ])));
}
function deadlineText(deadlines, checkedDate) {
 return join(deadlines.map(deadline => {
  const status = deadlineStatus(deadline, checkedDate);
  const statusLabel = status === 'expired' ? '此轮已截止' : status === 'open' ? applicationLabels.open : applicationLabels.unknown;
  return join([
   deadline.title || '申请截止',
   `截止日期：${deadline.date || PROJECT_COMPARISON_UNKNOWN}`,
   `截止时刻：${deadline.deadlineTime || '未注明'}；时区：${deadline.timezone || '未注明'}`,
   `日期状态：${deadline.dateStatus ? dateLabels[deadline.dateStatus] || deadline.dateStatus : deadline.date ? '日期已公布' : '日期待确认'}；申请状态：${statusLabel}`,
   deadline.admissionYear && `适用批次：${deadline.admissionYear}`,
   deadline.note,
   deadline.checkedDate && `日期记录核验于 ${deadline.checkedDate}`,
   deadline.cycleReview?.reason,
   deadline.cycleReview?.checkedDate && `批次复核于 ${deadline.cycleReview.checkedDate}`
  ]);
 }));
}
function allSources(groups) {
 const sources = new Map();
 for (const raw of groups.flatMap(value => Array.isArray(value) ? value : value ? [value] : [])) {
  const source = sourcesOf([raw])[0];
  const url = source && safeUrl(source.url);
  if (!url) continue;
  if (!sources.has(url)) sources.set(url, {url, labels:[], checkedDates:[]});
  const saved = sources.get(url);
  if (!saved.labels.includes(source.label)) saved.labels.push(source.label);
  if (typeof raw?.checkedDate === 'string' && !saved.checkedDates.includes(raw.checkedDate)) saved.checkedDates.push(raw.checkedDate);
 }
 return [...sources.values()];
}
function comparisonModel(catalog, selectedIds) {
 const columns = selectProjectComparisonRoutes(catalog, selectedIds).map(route => {
  const brief = summaryFor(catalog, route);
  const materials = materialRecords(catalog, route);
  const language = explicitRequirements(route, materials, 'language');
  const funding = explicitRequirements(route, materials, 'funding');
  const academic = list(route.requirements).filter(value => value?.kind === 'academic').map(text);
  const deadlines = list(catalog?.deadlines).filter(deadline => list(deadline.routeIds).includes(route.id) && !deadline.jobId);
  return {route, brief, language, funding, academic, deadlines, sources:allSources([
   route.sources, ...list(route.requirements).filter(value => value?.kind === 'academic').map(value => value.sources),
   brief?.sources, route.cycleReview?.sources,
   ...deadlines.flatMap(deadline => [deadline.sources, deadline.cycleReview?.sources]),
   ...[...language, ...funding].map(entry => entry.sources)
  ])};
 });
 const definitions = [
  ['research', '研究方向', column => join([fact(column.brief, 'overview')])],
  ['training', '培养方式', column => join([fact(column.brief, 'training'), column.route.duration && `已记录学制：${column.route.duration}`])],
  ['bachelor', '本科申请条件', column => join([fact(column.brief, 'bachelorEntry'), column.route.eligibilitySummary, ...column.academic])],
  ['cycle', '申请批次与方式', column => join([fact(column.brief, 'cycle'), column.route.admissionYear, column.route.applicationMethod,
   `申请状态：${applicationLabels[column.route.applicationStatus] || column.route.applicationStatus || '未核实'}`,
   column.route.cycleReview?.reason, column.route.cycleReview?.checkedDate && `批次复核于 ${column.route.cycleReview.checkedDate}`])],
  ['language', '语言要求', column => requirementText(column.language)],
  ['funding', '资助', column => requirementText(column.funding)],
  ['deadlines', '截止日期', column => deadlineText(column.deadlines, catalog?.metadata?.checkedDate)],
  ['cautions', '适用边界', column => join([routeEvidenceText(column.route),...cautions(column.brief), ...list(column.route.notes), supervisorAssociationText(column.route.supervisorAssociation)])]
 ];
 const rows = definitions.map(([key, label, value]) => {
  const values = columns.map(value);
  // Compare complete text, including qualifiers and unknowns. Never compare only
  // a numeric threshold or collapse distinct cycles into an apparent match.
  return {key, label, values, different:new Set(values).size > 1};
 });
 return {columns, rows};
}

export function projectComparisonRows(catalog, selectedIds) {
 return comparisonModel(catalog, selectedIds).rows;
}
const paragraphs = value => value.split('\n').map(line => `<p>${e(line)}</p>`).join('');
function sourceCell(column) {
 const sources = column.sources.length ? `<ul class="project-comparison-sources">${column.sources.map(source => `<li><a class="source-link" data-comparison-focus="${e('source:'+column.route.id+':'+source.url)}" href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.labels.join(' / '))} · ${e(new URL(source.url).hostname)}</a>${source.checkedDates.length ? `<span class="project-comparison-meta">来源核验：${e(source.checkedDates.join('、'))}</span>` : ''}</li>`).join('')}</ul>` : `<p>${PROJECT_COMPARISON_UNKNOWN}</p>`;
 return `${sources}<button type="button" class="project-comparison-detail project-comparison-control detail-button" data-summary-kind="project" data-summary-id="${e(column.route.id)}" data-comparison-focus="${e('detail:'+column.route.id)}" aria-label="查看${e(column.route.program || column.route.degree)}项目简介">查看项目简介 <span aria-hidden="true">→</span></button>`;
}

// Pure rendering: selection, persistence, event handling, dialog and navigation
// remain the host application's responsibility. No data is mutated or fetched.
export function renderProjectComparison(catalog, selectedIds, differencesOnly = false) {
 const {columns, rows} = comparisonModel(catalog, selectedIds);
 if (columns.length < 2) return '<section class="project-comparison-empty" role="status"><h3>请选择 2–3 个项目进行对比</h3><p>请返回项目列表，选择目录中的学位项目。</p></section>';
 const shown = differencesOnly ? rows.filter(row => row.different) : rows;
 const hiddenCount = rows.length - shown.length;
 return `<section class="project-comparison" aria-label="学位项目对比"><div class="project-comparison-toolbar"><div class="project-comparison-guidance"><strong>先对照研究匹配和资格，再确认资助与截止。</strong><p class="project-comparison-meta">比较已收录的学位路径，历史参考、待核和限制分别标注；研究方向不代表导师名额，本科入口不保证个人资格、录取或资助。未来截止日期不证明当前开放提交。</p></div><button type="button" class="project-comparison-differences project-comparison-control" data-comparison-focus="differences" data-project-differences aria-pressed="${Boolean(differencesOnly)}"><span class="project-comparison-toggle" aria-hidden="true"></span>仅看差异</button></div><p class="project-comparison-meta project-comparison-status" role="status">${differencesOnly ? `已收起 ${hiddenCount} 个文字相同的比较项（含共同未核实项）；相同描述不代表条件等同。` : '完整保留已记录的条件与批次；未核实项须向当期官方来源确认。'}${catalog?.metadata?.checkedDate ? ` 目录核验于 ${e(catalog.metadata.checkedDate)}。` : ''}</p><div class="project-comparison-scroll" role="region" aria-label="项目对比表，可横向滚动" tabindex="0" data-comparison-focus="table"><table class="project-comparison-table columns-${columns.length}"><caption class="sr-only">${columns.length} 个学位项目的研究、申请条件与截止日期对比</caption><thead><tr><th scope="col" class="project-comparison-row-label">比较项目</th>${columns.map((column, index) => `<th scope="col" id="project-comparison-column-${index}" class="project-comparison-heading"><div class="project-comparison-project"><span class="project-comparison-school-mark" aria-hidden="true">${e(column.route.institution)}</span><div><h3>${e(column.route.program || column.route.degree)}</h3><p class="project-comparison-institution">${e(institutionLabel(column.route.institution))}</p><p class="project-comparison-degree">${e(degreeDisplay(column.route))}</p>${column.route.department ? `<p class="project-comparison-meta">${e(column.route.department)}</p>` : ''}</div><button type="button" class="project-comparison-remove project-comparison-control" data-remove-project="${e(column.route.id)}" data-comparison-focus="${e('remove:'+column.route.id)}" aria-label="移除${e(column.route.program || column.route.degree)}"><span aria-hidden="true">×</span></button></div></th>`).join('')}</tr></thead><tbody>${shown.map(row => `<tr data-comparison-row="${row.key}"${row.different ? ' class="project-comparison-different"' : ''}><th scope="row" id="project-comparison-row-${row.key}">${row.label}</th>${row.values.map((value, index) => `<td headers="project-comparison-row-${row.key} project-comparison-column-${index}">${paragraphs(value)}</td>`).join('')}</tr>`).join('')}<tr data-comparison-row="sources"><th scope="row" id="project-comparison-row-sources">原始来源</th>${columns.map((column, index) => `<td headers="project-comparison-row-sources project-comparison-column-${index}">${sourceCell(column)}</td>`).join('')}</tr></tbody></table></div></section>`;
}
