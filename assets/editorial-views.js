import {escapeHTML,readerText,safeUrl,sourcesOf,institutionLabel,degreeDisplay,routeEvidenceText,deadlineStatus,textValue} from './core.js?v=67f72bbe4700';
import {sourceAttribution,supervisorAssociationText} from './record-summaries.js?v=127e40e7b02d';

const e = value => escapeHTML(readerText(value));
const list = value => Array.isArray(value) ? value : [];
const displayInstitution = value => value === 'SUSTech' ? '南方科技大学' : institutionLabel(value);
const badge = (status,label) => `<span class="badge ${['verified','unknown','excluded','expired'].includes(status)?status:''}">${e(label)}</span>`;
function sourceLinks(items) {
 return sourcesOf(items).map(source => `<a class="source-link" href="${e(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${e(['公开一手来源','官方来源'].includes(source.label)?new URL(source.url).hostname:source.label)}</a>`).join('');
}

// Presentation only. Eligibility, filtering, selection and navigation remain in
// their existing owners; complete qualifiers remain available in each record.
export function renderProjectCard(route,{catalog,selectedIds=[]}={}) {
 const brief = catalog?.projectSummaries?.get(route.id);
 const selected = selectedIds.includes(route.id);
 return `<article class="route-card project-row" data-project-id="${e(route.id)}">
  <div class="project-context"><span class="route-label">${e(displayInstitution(route.institution))}${route.department?' · '+e(route.department):''}</span>
   <h3><button class="card-title-button" data-summary-kind="project" data-summary-id="${e(route.id)}">${e(route.program||route.degree)}</button></h3>
   ${brief?.overview?.text?`<p>${e(brief.overview.text)}</p>`:''}<span class="project-degree">${e(degreeDisplay(route))}</span>${sourceAttribution(route)}</div>
  <div class="project-insights"><h4>怎样培养</h4><p>${e(brief?.training?.text||'培养与课程安排请核对官方项目介绍')}</p>
   <p class="small-note project-evidence">${e(routeEvidenceText(route))}</p>
   <details class="project-eligibility"><summary>申请条件与适用范围</summary><div>
    <p>${e(route.eligibilitySummary||'具体申请条件尚待核实，请核对当期官方要求')}</p>
    ${route.supervisorAssociation?`<p class="small-note">导师关联：${e(supervisorAssociationText(route.supervisorAssociation))}</p>`:''}
    ${route.admissionYear?`<p class="small-note">适用批次：${e(route.admissionYear)}</p>`:''}
   </div></details></div>
  <div class="project-actions"><button class="detail-button" data-summary-kind="project" data-summary-id="${e(route.id)}">查看项目摘要 <span aria-hidden="true">→</span></button>
   <button class="compare-button" data-compare-project="${e(route.id)}" aria-label="${selected?'移出':'加入'}比较：${e(displayInstitution(route.institution))} ${e(route.program||route.degree)}" aria-pressed="${selected}">${selected?'已选项目':'＋ 加入对比'}</button></div>
 </article>`;
}

function deadlineCard(record,catalog) {
 const checkedDate = catalog?.metadata?.checkedDate;
 const recruitment = list(catalog?.raPositions).find(job=>job.id===record.jobId)?.currentRecruitment;
 const status = deadlineStatus(record,checkedDate);
 const date = record.date&&/^\d{4}-\d{2}-\d{2}/.test(record.date)?record.date.slice(0,10):null;
 // Keep the original offset/time text. A date-only record never gains a time.
 const originalTime = record.deadlineTime || recruitment?.deadlineTime || (record.date?.includes('T')?record.date.slice(record.date.indexOf('T')+1):'未注明');
 return `<article class="deadline-row" data-deadline-id="${e(record.id)}"><div class="deadline-date">${date?`<time datetime="${e(record.date)}">${e(date.slice(5).replace('-','.'))}</time>`:'待定'}<small>${date?e(date.slice(0,4)):'尚未确认'}</small></div><div>
  <div class="status-group">${badge(status==='open'?'verified':status,status==='open'&&date?'官方日期已公布':status==='expired'?'此轮已截止':date?'日期已公布 · 开放状态待核':'日期 / 批次待核')}<span class="route-label">${e(displayInstitution(record.institution))}</span></div>
  <h3><button class="card-title-button" data-summary-kind="deadline" data-summary-id="${e(record.id)}">${e(record.title)}</button></h3>
  <dl class="deadline-meta"><div><dt>适用批次</dt><dd>${e(record.admissionYear||'未注明')}</dd></div><div><dt>原始时刻</dt><dd>${e(originalTime)}</dd></div><div><dt>时区</dt><dd>${e(record.timezone||recruitment?.timezone||'未注明')}</dd></div></dl>
  <p>${e(record.note||'具体适用申请类别请核对官方原文')}</p>${sourceAttribution(record)}<button class="detail-button" data-summary-kind="deadline" data-summary-id="${e(record.id)}">查看日期摘要 <span aria-hidden="true">→</span></button></div></article>`;
}
export function renderDeadlineTimeline(records,{catalog}={}) {
 const checkedDate = catalog?.metadata?.checkedDate;
 const groups = [
  ['upcoming','已公布的后续截止日期',records.filter(record=>record.date&&deadlineStatus(record,checkedDate)!=='expired')],
  ['unknown','日期或批次仍待确认',records.filter(record=>!record.date&&deadlineStatus(record,checkedDate)!=='expired')],
  ['expired','已截止的轮次',records.filter(record=>deadlineStatus(record,checkedDate)==='expired')]
 ];
 return `<div class="deadline-timeline"><p class="small-note deadline-baseline">分组基准日：${e(checkedDate||'未注明')}。截止状态以核验日为准。早申结束、项目截止与导师名额是不同信息；已公布未来日期不代表当前已开放提交。</p>${groups.filter(([, ,rows])=>rows.length).map(([key,title,rows])=>{
  const months = new Map();
  for(const record of rows) {
   const month = /^\d{4}-\d{2}-\d{2}/.test(record.date||'')?record.date.slice(0,7):'unknown';
   if(!months.has(month))months.set(month,[]);
   months.get(month).push(record);
  }
  const ordered = [...months].sort(([a],[b])=>a==='unknown'?1:b==='unknown'?-1:a.localeCompare(b));
  return `<section class="deadline-group" data-deadline-group="${key}"><h3 class="deadline-group-title">${title}<span class="small-note">${rows.length} 项</span></h3>${ordered.map(([month,items])=>`<section class="deadline-month" data-month="${month}"><h4 class="deadline-month-title">${month==='unknown'?'日期待确认':`${month.slice(0,4)} 年 ${Number(month.slice(5))} 月`}</h4>${items.map(record=>deadlineCard(record,catalog)).join('')}</section>`).join('')}</section>`;
 }).join('')}</div>`;
}

const requirementLabels = {required:'已明确要求',conditional:'符合相应条件时适用',published:'已公布',not_specified:'未明确统一要求',unknown:'待确认',optional:'选交',required_count_unknown:'需要提交，数量待确认',required_for_hkpfs:'仅 HKPFS 申请需要',published_school_only:'仅确认学校统一要求'};
const materialLabels = {academic:'学历与成绩',transcript:'学历与成绩材料',researchProposal:'研究计划',cvPersonalStatement:'简历与个人陈述',cvPersonalStatementResearchProposal:'简历、个人陈述与研究计划',personalStatementResearchProposalReferences:'个人陈述、研究计划与推荐材料',researchOutputs:'研究成果',deadline:'申请日期',degree_certificate:'学历证明',language:'语言要求',references:'推荐信',recommendation:'推荐信',research_proposal:'研究计划',personal_statement:'个人陈述',cv:'简历',portfolio:'作品或研究材料',funding:'资助',application:'申请文件'};
function materialItems(items) {
 return `<ul class="material-requirements">${items.map(item=>`<li>${typeof item==='object'?`<strong>${e(materialLabels[item.kind]||'材料要求')}${item.requirementStatus?' · '+e(requirementLabels[item.requirementStatus]||'具体适用条件见正文'):''}</strong>`:''}<p>${e(textValue(item))}</p></li>`).join('')}</ul>`;
}
export function renderMaterialCard(material,{catalog}={}) {
 const requirements = list(material.requirements||material.items||(material.requirement?[material.requirement]:[]));
 const related = list(catalog?.routes).filter(route=>list(material.routeIds).includes(route.id));
 const unknowns = list(material.unknowns);
 const scope = [...new Set([material.scope,material.admissionYear,...list(material.scopeNotes)].filter(Boolean))];
 return `<article class="route-card material-list-card" data-material-id="${e(material.id)}"><span class="material-icon" aria-hidden="true">▤</span><div class="material-context">
  <span class="route-label">${e(displayInstitution(material.institution))}${material.degree?' · '+e(material.degree):''}</span>
  <h3><button class="card-title-button" data-summary-kind="material" data-summary-id="${e(material.id)}">${e(material.title||material.program||'申请要求')}</button></h3>
  ${material.summary?`<p>${e(material.summary)}</p>`:''}${material.note?`<p class="small-note">${e(material.note)}</p>`:''}
  ${scope.length?`<p class="small-note material-scope">适用范围：${scope.map(e).join('；')}</p>`:''}
  ${related.length?`<p class="small-note material-projects">适用项目：${related.map(route=>e(route.program||route.degree)).join('；')}</p>`:''}
  ${requirements.length?materialItems(requirements.slice(0,2)):'<p class="small-note">具体材料清单尚待核对。</p>'}
  ${requirements.length>2?`<details class="material-more"><summary>查看其余 ${requirements.length-2} 项要求与条件</summary>${materialItems(requirements.slice(2))}</details>`:''}
  ${unknowns.length?`<details class="material-unknowns"><summary>仍需确认 · ${unknowns.length} 项</summary><ul>${unknowns.map(item=>`<li>${e(item)}</li>`).join('')}</ul></details>`:''}
  ${sourceAttribution(material)}</div><button class="detail-button" data-summary-kind="material" data-summary-id="${e(material.id)}">查看材料摘要 <span aria-hidden="true">→</span></button></article>`;
}

function sourceWatchGroups(watches) {
 const groups = new Map();
 for(const watch of watches) {
  const institution = watch.institution||watch.school||'其他来源';
  if(!groups.has(institution))groups.set(institution,[]);
  groups.get(institution).push(watch);
 }
 return `<div class="source-directory">${[...groups].map(([institution,records])=>`<details class="source-institution" data-source-institution="${e(institution)}"><summary><span class="source-group-name">${e(displayInstitution(institution))}</span><span class="source-group-count">${records.length} 个观察入口</span></summary><div class="source-watch">${records.map(watch=>`<section class="evidence-box"><h4>${e(watch.label||watch.category||watch.kind||watch.institution||watch.school||'官方观察入口')}</h4><p class="small-note">${e(watch.scope||watch.kind||'任职、招生及项目规则变更')}</p>${watch.checkedDate?`<p class="small-note">入口核验于 ${e(watch.checkedDate)}</p>`:''}<div class="link-list">${sourceLinks(watch.sources||watch.urls||watch.url&&[watch.url]||[])}</div></section>`).join('')}</div></details>`).join('')}</div>`;
}

export function renderSourceDirectory(updateStatus,catalog) {
 const watches = catalog.watchSources||[];
 return `<div class="methodology"><div class="source-principles"><section><h3>官方规则</h3><p>院校官网、院系项目页与正式招生文件，用于核对学位设置、申请资格、材料和批次。</p></section><section><h3>导师公告</h3><p>导师与实验室公开页面，用于核对研究方向、任职和招募声明。名额与年份单独确认。</p></section><section><h3>个人经验</h3><p>公开第一人称自述，可借鉴流程与方法。作者经历与结果不改写官方资格结论。</p></section></div><p>GradCompass 将项目资格、导师关联和公开招募分开记录。首批收录聚焦机器人与具身智能，内容来自高校、院系、实验室、作者项目及原始论文。</p><h3>如何理解记录</h3><ol><li><strong>公开浏览范围：</strong>导师研究资料与已收录学位项目均可查看，统考、申请制、推免和硕士起点条件分别保留，待核与历史参考明确标注。RA 必须另有官方岗位要求明确接受本科、无已有硕士前置，且当前招募可核实；不能借用导师的学位招生资格。这不是对个人成绩、英语、学历等值或录取机会的判断。</li><li><strong>导师关联：</strong>只有精确到导师和项目、且有直接来源的已核实关联计入学位关联数；院系归属或项目整体资格不能自动证明个人指导关系。需要入学后双向选择的项目明确提示，不承诺预先锁定导师。</li><li><strong>公开招募：</strong>MSc、MPhil、PhD 是学位路径，RA 是工作岗位，分别呈现。有 PhD 声明不等于有 MPhil 名额，常年招募不等于 2027 Fall 已确认。</li><li><strong>职级筛选：</strong>根据已记录的原职衔保守归类；研究系列、其他与未知分别保留。具名教授头衔仅对已审阅记录归类，不把 Chair、PI 或行政职务自动视为教授。职级不代表终身教职、指导资格、招生名额或新 PI。原职衔与入职证据各自保留。</li><li><strong>新入职：</strong>只有可追溯的任命或入职日期才标记。职称、晋升和行政任命不自动算作新 PI。</li><li><strong>来源冲突：</strong>保留原始时间、限制与待核项；待核、历史参考和受限路径仍可查阅，不计作已确认的个人招生或剩余名额。</li></ol><h3>更新状态</h3><div class="evidence-box"><h4>数据核验日：${e(catalog.metadata.checkedDate)}</h4><p>${e(updateStatus.statusLabel)}。调度状态与证据核验日期独立记录；首轮执行尚未验证，不能视为已经完成数据更新。</p><p>公开招募与批次可能随时变化，请在正式申请前再次核对原始来源。</p></div><h3>有界观察入口</h3><p>下列入口覆盖任职、招生、项目规则与批次变化。官网、社媒、论坛正文与有价值的评论可提供线索；访问和覆盖缺口需如实记录。社交线索不会直接改写官方资格结论。</p>${sourceWatchGroups(watches)}<h3>隐私与使用</h3><p>本站没有账号、上传、后台或外部分析。搜索和比较只在当前浏览器页面运行，不保存个人材料与申请策略。打开官方链接时会离开本站。</p><p>本页面提供来源支持的信息整理，不代表学校或导师，不提供录取概率预测。第三方页面和论文的版权归原权利人；链接不构成转载许可。</p><div class="link-list"><a class="source-link" href="./data/catalog.json">学位与导师数据</a><a class="source-link" href="./data/ra-positions.json">独立 RA 岗位证据</a><a class="source-link" href="./data/update-status.json">每日检查状态</a><a class="source-link" href='./data/sustech-advisor-review-20261004.json?v=2f34732eed51'>南科大导师核查</a><a class="source-link" href='./data/tsinghua-advisor-review-20261004.json?v=8e27ae2cb8ec'>清华导师核查</a><a class="source-link" href='./data/pku-advisor-review-20261004.json?v=4e9b1e330018'>北大导师核查</a><a class="source-link" href='./data/zju-advisor-review-20261005.json?v=a2a4f78d0dc0'>浙大导师核查</a><a class="source-link" href='./data/fudan-advisor-review-20261005.json?v=2dee95e1440b'>复旦导师核查</a><a class="source-link" href='./data/sjtu-advisor-review-20261005.json?v=0b186320f906'>上交导师核查</a><a class="source-link" href='./data/sjtu-robotics-advisor-review-20261005.json?v=f533bbe54ae9'>上交机器人与具身导师扩展核查</a><a class="source-link" href='./data/nju-advisor-review-20261005.json?v=b74cef5a262d'>南大导师核查</a><a class="source-link" href='./data/nju-robotics-advisor-review-20261005.json?v=88ffa55bdc31'>南大机器人与具身导师扩展核查</a><a class="source-link" href='./data/ustc-advisor-review-20261005.json?v=369728adf172'>中科大导师核查</a><a class="source-link" href='./data/tongji-advisor-review-20261005.json?v=4aa6a65e7754'>同济导师核查</a><a class="source-link" href='./data/seu-advisor-review-20261005.json?v=fd30a4dd0320'>东南导师核查</a></div></div>`;
}
