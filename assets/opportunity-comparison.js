import {buildOpportunities,escapeHTML,readerText,safeUrl,sourcesOf,institutionLabel,routeEvidenceText,textValue,themesFor} from './core.js?v=64326cc257e3';
import {profileSummary} from './profiles.js?v=d00cdb86b357';
import {supervisorAssociationText} from './record-summaries.js?v=c3c17520a806';

const e=value=>escapeHTML(readerText(value));
const list=value=>Array.isArray(value)?value:[];
const unknown='未核实，请核对当期官方来源';
const paragraphs=values=>list(values).filter(value=>value!=null&&textValue(value).trim()).map(value=>`<p>${e(textValue(value))}</p>`).join('')||`<p>${unknown}</p>`;
const unique=values=>[...new Set(values.map(textValue).filter(Boolean))];
const openingLabels={explicit:'已找到该类型公开招募说明',unknown:'招生年份或名额待确认',closed:'已明确停止招生'};

function columnsFor(catalog,ids){
  if(!Array.isArray(catalog?.advisors)||!Array.isArray(catalog?.routes))return [];
  const opportunities=new Map(buildOpportunities(catalog,{includeReferencePhd:true}).map(row=>[row.id,row]));
  return [...new Set(list(ids).filter(id=>typeof id==='string'))].map(id=>opportunities.get(id)).filter(Boolean).slice(0,3).map(opportunity=>({
    opportunity,
    advisor:catalog.advisors.find(advisor=>advisor.id===opportunity.advisorId),
    route:catalog.routes.find(route=>route.id===opportunity.routeId),
    job:list(catalog.raPositions).find(job=>job.id===opportunity.jobId)
  }));
}

function titleFor(column){
  return column.job?.title||column.route?.program||column.route?.degree||'项目名称待确认';
}

function associationText({opportunity}){
  if(opportunity.kind==='employment')return '独立 RA 岗位；本科任职条件与公开招募有岗位级依据。RA 是受雇科研岗位，不授予学位录取资格。个人资格、工作许可与剩余名额仍需核对。';
  if(opportunity.kind==='reference')return '博士项目参考；个人关联、当期接收意向与余位待核，不能计作已核实学位关联。';
  return '已核实导师与项目的关联；项目资格、个人条件、导师接收意向和当期剩余名额仍需分别核对。';
}

function sourceLinks(sources){
  return sourcesOf(sources).map(source=>`<a class="source-link" href="${e(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${e(source.label)}</a>`).join(' ');
}

function conditionsCell(column,renderEmployment){
  const {route,job}=column;
  // These callbacks are the host's existing safe HTML renderers, not data text.
  if(job&&typeof renderEmployment==='function')return renderEmployment(job);
  if(job)return paragraphs([
    'RA 为受雇科研岗位，不授予学位录取资格。',job.employmentEligibility?.requirementText||job.requirementText,
    job.employmentEligibility?.interpretation,job.eligibilityMeaning,job.duties,
    job.duration&&`任期：${job.duration}`,job.advisorAssociation?.detail,
    '个人工作许可与实际到岗条件仍需向雇主核对。'
  ])+sourceLinks(job.employmentEligibility?.sources);
  if(!route)return `<p>${unknown}</p>`;
  return paragraphs([
    routeEvidenceText(route),route.eligibilitySummary,
    route.applicationMethod,route.admissionMethod,route.admissionYear,
    supervisorAssociationText(route.supervisorAssociation)
  ])+(list(route.requirements).length?`<ul>${route.requirements.map(requirement=>`<li>${e(textValue(requirement))}${requirement?.sources?`<div class="link-list">${sourceLinks(requirement.sources)}</div>`:''}</li>`).join('')}</ul>`:'');
}

function recruitmentCell({advisor,opportunity,job}){
  if(job){
    const current=job.currentRecruitment||{};
    return paragraphs([
      `当前岗位${job.jobReference?' #'+job.jobReference:''}的本科任职条件与公开招募已核实；其他 RA 声明仍需逐岗位核实。`,
      current.evidence,
      `公告日期：${job.noticeDate||'未注明'}；截止日期：${current.deadline||'未公布'}；截止时刻：${current.deadlineTime||'未公布'}`,
      `招募核验于 ${current.checkedDate||job.checkedDate||'未记录'}；公开广告不保证剩余名额或申请入口当前可提交。`
    ]);
  }
  const opening=list(advisor.openingDetails).find(row=>row.degree===opportunity.type);
  return paragraphs([
    openingLabels[opening?.status]||openingLabels.unknown,
    opening?.summary||advisor.openings?.[opportunity.type.toLowerCase()]||'未核实该类型的公开招募声明',
    opening?.cycle&&`记录周期：${opening.cycle}`,
    opening?.noticeDate&&`公告日期：${opening.noticeDate}`,
    opening?.checkedDate&&`该项核验于 ${opening.checkedDate}`,
    '公开招募说明不等于当年仍有名额；其他学位或 RA 信号不能替代本项核验。'
  ]);
}

function otherOpeningsCell(column,renderOpenings){
  if(typeof renderOpenings==='function')return `<dl class="fact-grid">${renderOpenings(column.advisor,column.job||null)}</dl>`;
  const entries=Object.entries(column.advisor.openings||{});
  return entries.length?`<dl class="fact-grid">${entries.map(([type,value])=>`<dt>${e(type==='cycle2027'?'2027 年份':type.toUpperCase())}</dt><dd>${e(value)}</dd>`).join('')}</dl>`:`<p>${unknown}</p>`;
}

function collectSources(column){
  const {advisor,route,job}=column;
  const raw=[
    ...list(advisor.sources),...list(route?.sources),...list(route?.cycleReview?.sources),...list(job?.sources),
    ...list(route?.requirements).flatMap(value=>list(value?.sources)),
    ...list(advisor.openingDetails).flatMap(value=>list(value.sources)),
    ...list(advisor.routeAssociations).filter(value=>value.routeId===route?.id).flatMap(value=>list(value.sources)),
    ...list(job?.employmentEligibility?.sources),...list(job?.currentRecruitment?.sources),...list(job?.advisorAssociation?.sources),
    {label:'导师官方档案',url:advisor.profileUrl},{label:'课题组 / 个人主页',url:advisor.labUrl},
    {label:'岗位官方申请入口',url:job?.applicationUrl}
  ];
  const sources=new Map;
  for(const item of raw){
    const source=sourcesOf([item])[0];if(!source)continue;
    const url=safeUrl(source.url);
    if(!sources.has(url))sources.set(url,{url,labels:[],dates:[]});
    const saved=sources.get(url);
    if(!saved.labels.includes(source.label))saved.labels.push(source.label);
    if(typeof item?.checkedDate==='string'&&!saved.dates.includes(item.checkedDate))saved.dates.push(item.checkedDate);
  }
  return [...sources.values()];
}

function sourcesAndLimitsCell(column,catalog){
  const {advisor,route,job}=column;
  const restrictions=unique([
    ...list(advisor.caveats),...list(route?.notes),...list(route?.caveats),...list(job?.caveats),
    route?.cycleReview?.reason,job?.eligibilityMeaning,
    `导师记录核验于 ${advisor.checkedDate||catalog?.metadata?.checkedDate||'未记录'}`,
    route?.checkedDate&&`项目记录核验于 ${route.checkedDate}`,
    job?.checkedDate&&`岗位记录核验于 ${job.checkedDate}`
  ]);
  const sources=collectSources(column);
  return paragraphs(restrictions)+(sources.length?`<ul class="project-comparison-sources">${sources.map(source=>`<li><a class="source-link" href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.labels.join(' / '))}</a>${source.dates.length?`<span class="project-comparison-meta">来源核验：${e(source.dates.join('、'))}</span>`:''}</li>`).join('')}</ul>`:`<p>${unknown}</p>`);
}

function rowModel(columns,catalog,options){
  const definitions=[
    ['institution','学校与院系',column=>paragraphs([institutionLabel(column.advisor.institution),column.advisor.department])],
    ['research','研究方向',column=>{
      const profile=catalog.advisorProfiles?.get?.(column.advisor.id)||catalog.advisorProfiles?.[column.advisor.id];
      const themes=themesFor(column.advisor);
      return paragraphs([profileSummary(profile,column.advisor.summary),...(themes.length?themes:list(column.advisor.topics))]);
    }],
    ['association','关联状态',column=>paragraphs([associationText(column)])],
    ['conditions','项目与申请 / RA 任职条件',column=>conditionsCell(column,options.renderEmployment)],
    ['recruitment','该机会公开招募',recruitmentCell],
    ['other-openings','其他类型招募与年份',column=>otherOpeningsCell(column,options.renderOpenings)],
    ['sources','来源与限制',column=>sourcesAndLimitsCell(column,catalog)]
  ];
  return definitions.map(([key,label,render])=>{
    const values=columns.map(render);
    // Exact rendered facts include scope, unknowns and source URLs. Never
    // compare only a degree label, a number, or an advisor's shared identity.
    return {key,label,values,different:new Set(values).size>1};
  });
}

// Pure presentation. The host owns selections, routes, dialog and focus recovery.
export function renderOpportunityComparison(catalog,ids,{differencesOnly=false,renderEmployment,renderOpenings}={}){
  const columns=columnsFor(catalog,ids);
  if(columns.length<2)return '<section class="project-comparison-empty" role="status"><h3>请选择 2–3 条具体机会进行比较</h3><p>请返回导师列表，选择具体学位项目、RA 岗位或博士项目参考；失效或未收录的记录无法加入比较。</p></section>';
  const rows=rowModel(columns,catalog,{renderEmployment,renderOpenings});
  const shown=differencesOnly?rows.filter(row=>row.different):rows;
  const hiddenCount=rows.length-shown.length;
  return `<section class="project-comparison opportunity-comparison" aria-label="研究机会比较"><div class="project-comparison-toolbar"><div class="project-comparison-guidance"><strong>逐项比较具体项目与岗位，再核对个人条件。</strong><p class="project-comparison-meta">每列对应一条学位关联、独立 RA 岗位或博士项目参考。同一导师的不同项目与岗位分别保留；公开招募、项目资格与当期名额分别核验。</p></div><button type="button" class="project-comparison-differences project-comparison-control" data-opportunity-differences data-opportunity-focus="differences" aria-pressed="${Boolean(differencesOnly)}"><span class="project-comparison-toggle" aria-hidden="true"></span>仅看差异</button></div><p class="project-comparison-meta project-comparison-status" role="status">${differencesOnly?`已收起 ${hiddenCount} 个文字与来源相同的比较项（含共同未核实项）；相同描述不代表条件等同。`:'完整保留已记录的条件、来源与限制；未知项仍需逐条确认。'}</p><div class="project-comparison-scroll" role="region" aria-label="研究机会对比表，可横向滚动" tabindex="0" data-opportunity-focus="table"><table class="project-comparison-table columns-${columns.length}"><caption class="sr-only">${columns.length} 条研究机会的关联、申请条件、招募与来源对比</caption><thead><tr><th scope="col" class="project-comparison-row-label">比较项目</th>${columns.map((column,index)=>`<th scope="col" id="opportunity-comparison-column-${index}" class="project-comparison-heading" data-opportunity-column="${e(column.opportunity.id)}"><div class="project-comparison-project"><div><h3>${e(column.advisor.name)}${column.advisor.nameZh&&column.advisor.nameZh!==column.advisor.name?` <span class="name-zh">${e(column.advisor.nameZh)}</span>`:''}</h3><p class="project-comparison-degree">${e(column.opportunity.type)}${column.job?.jobReference?` · #${e(column.job.jobReference)}`:''}${column.opportunity.kind==='reference'?' · 项目参考':''}</p><p class="project-comparison-institution">${e(titleFor(column))}</p></div><button type="button" class="project-comparison-remove project-comparison-control" data-remove-opportunity="${e(column.opportunity.id)}" data-opportunity-focus="${e('remove:'+column.opportunity.id)}" aria-label="移除${e(column.advisor.name)} · ${e(titleFor(column))}${column.job?.jobReference?' · #'+e(column.job.jobReference):''}"><span aria-hidden="true">×</span></button></div></th>`).join('')}</tr></thead><tbody>${shown.map(row=>`<tr data-opportunity-row="${row.key}"${row.different?' class="project-comparison-different"':''}><th scope="row" id="opportunity-comparison-row-${row.key}">${row.label}</th>${row.values.map((value,index)=>`<td headers="opportunity-comparison-row-${row.key} opportunity-comparison-column-${index}">${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
