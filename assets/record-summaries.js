import {escapeHTML,readerText,safeUrl,sourcesOf,institutionLabel,degreeDisplay,deadlineStatus,isBrowsableRoute,routeEvidenceText,browseRoutes as filterRoutes} from './core.js?v=dbee3ac4ba07';
const e=value=>escapeHTML(readerText(value));
// Display-only wording: preserve source records and their qualification caveats.
const supervisorAssociationLabels=new Map([
 ['已保留导师研究与院系线索；必须查看各导师 routeAssociations 的独立核验状态，不能由院系任职推导个人接收或名额。','已保留导师研究与院系线索；请查看导师详情中的独立关联核验状态，不能由院系任职推导个人接收或名额。'],
 ['导师与院系/项目的关联见各导师 routeAssociations；项目资格不等于名额确认','导师与院系、项目的关联说明见导师详情；符合项目申请条件不代表已确认招生名额'],
 ['导师学科归属见各导师 routeAssociations；仍须核实目标轮次名额与指导资格','导师所属学科见导师详情；仍须核实目标轮次名额与指导资格'],
 ['逐导师、逐学位证据见 routeAssociations；授课型硕士不保证进组或论文指导','各导师与学位项目的关联说明见导师详情；授课型硕士不保证进组或论文指导']
]);
export function supervisorAssociationText(value){return supervisorAssociationLabels.get(value)||value;}

const items=values=>`<ul>${values.map(value=>`<li>${e(value?.text||value?.requirement||value)}</li>`).join('')}</ul>`;
const section=(title,body)=>body?`<section class="detail-section"><h3>${e(title)}</h3>${body}</section>`:'';
const paragraph=value=>value?`<p>${e(value)}</p>`:'';
const exactText=value=>typeof value==='string'?value:value?.text||value?.requirement||'';
const uniqueText=values=>values.filter((value,index)=>value&&values.indexOf(value)===index);
const requirements=record=>record.requirements||record.items||(record.requirement?[record.requirement]:[]);
const materialKinds={academic:'学历与专业条件',language:'语言要求',transcript:'学历与成绩材料',researchProposal:'研究计划',references:'推荐材料',cv:'简历',cvPersonalStatement:'简历与个人陈述',cvPersonalStatementResearchProposal:'简历、个人陈述与研究计划',personalStatementResearchProposalReferences:'个人陈述、研究计划与推荐材料',researchOutputs:'研究成果',deadline:'申请日期'};
const requirementStatuses={required:'已明确要求',conditional:'符合相应条件时适用',published:'日期已公布',not_specified:'未明确统一要求',unknown:'待确认',optional:'选交',required_count_unknown:'需要提交，数量待确认',required_for_hkpfs:'HKPFS 申请需要',published_school_only:'仅确认学校统一日期'};
const projectFacts=['overview','training','bachelorEntry','cycle'];
export function normalizeProjectSummaries(data,catalog){
 if(data?.schemaVersion!==1||!Array.isArray(data.records)||!Array.isArray(data.sources))throw Error('Invalid project summaries');
 const sources=new Map();
 for(const s of data.sources){if(!s?.id||sources.has(s.id)||!s.label||!safeUrl(s.url)||!s.url.startsWith('https://')||!/^\d{4}-\d{2}-\d{2}$/.test(s.checkedDate||''))throw Error('Invalid project source');sources.set(s.id,s);}
 const summaries=new Map();
 const validFact=f=>typeof f?.text==='string'&&f.text.trim()&&Array.isArray(f.sourceIds)&&f.sourceIds.length&&f.sourceIds.every(id=>sources.has(id));
 for(const r of data.records){
  const route=catalog.routes?.find(route=>route.id===r?.routeId);
  if(!route||!isBrowsableRoute(route)||(route.status!=='verified'&&!(r.evidenceScope==='reference'&&r.sourceCycle!=null&&String(r.sourceCycle)===String(route.sourceCycle)))||r.institution!==route.institution||r.degree!==route.degree||summaries.has(r.routeId)||!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedDate||'')||!projectFacts.every(k=>validFact(r[k]))||!Array.isArray(r.cautions)||!r.cautions.length||!r.cautions.every(validFact))continue;
  const sourceIds=[...new Set([...projectFacts.map(k=>r[k]),...r.cautions].flatMap(f=>f.sourceIds))];
  summaries.set(r.routeId,{...Object.fromEntries(['routeId','institution','degree','checkedDate',...projectFacts,'cautions'].map(k=>[k,r[k]])),sources:sourceIds.map(id=>sources.get(id))});
 }
 return summaries;
}
export function filterProjectRoutes(catalog,filters={}){const q=(filters.query||'').trim().toLowerCase();if(!q)return filterRoutes(catalog,filters);const originalIds=new Set(filterRoutes(catalog,filters).map(r=>r.id));return filterRoutes(catalog,{...filters,query:''}).filter(r=>{const brief=catalog.projectSummaries?.get(r.id);return originalIds.has(r.id)||brief&&[...projectFacts.map(k=>brief[k].text),...brief.cautions.map(f=>f.text)].join(' ').toLowerCase().includes(q);});}
function projectIntroduction(brief){if(!brief)return '';return section('培养与研究简介',paragraph(brief.overview.text)+`<h4>怎样培养</h4>${paragraph(brief.training.text)}<h4>本科申请入口</h4>${paragraph(brief.bachelorEntry.text)}<h4>批次边界</h4>${paragraph(brief.cycle.text)}`+items(brief.cautions)+`<p class="small-note">简介核读于 ${e(brief.checkedDate)}。招生方式、推免资格和前置学历须按对应项目逐项核对；简介不构成个人资格、导师名额或资助保证。</p>`);}
function materialItems(values){return `<ul class="material-requirements">${values.map(value=>{if(typeof value!=='object')return `<li>${e(value)}</li>`;const sources=sourcesOf(value.sources);return `<li><strong>${e(materialKinds[value.kind]||'材料要求')}${value.requirementStatus?' · '+e(requirementStatuses[value.requirementStatus]||'具体适用条件见下文'):''}</strong><p>${e(value.text||value.requirement)}</p>${sources.length?`<p class="small-note">依据：${sources.map(s=>e(s.label)).join('；')}</p>`:''}</li>`;}).join('')}</ul>`;}
const relatedProjects=(record,catalog)=>catalog.routes.filter(r=>(record.routeIds||[]).includes(r.id)&&isBrowsableRoute(r));
const projects=(records)=>records.length?`<div class="link-list">${records.map(r=>`<button class="text-button" data-summary-kind="project" data-summary-id="${e(r.id)}">${e(r.program||r.degree)}</button>`).join('')}</div>`:'';
export function sourceAttribution(record){const hosts=[...new Set(sourcesOf(record.sources).map(s=>safeUrl(s.url)).filter(Boolean).map(url=>new URL(url).hostname))];return hosts.length?`<p class="small-note source-attribution">来源：${hosts.map(e).join(' · ')} · 官网链接在摘要中</p>`:'';}
function officialSources(record){const sources=sourcesOf([...(record.sources||[]),...requirements(record).flatMap(r=>typeof r==='object'?r.sources||[]:[])]).filter((source,index,all)=>all.findIndex(s=>s.url===source.url)===index);return `<p class="small-note">以下是本文摘要采用的官方来源；点击后会在新标签页打开。</p><div class="link-list">${sources.map(s=>{const url=safeUrl(s.url);return url?`<a class="source-link" href="${e(url)}" target="_blank" rel="noopener noreferrer">打开官网：${e(s.label)} · ${e(new URL(url).hostname)}</a>`:'';}).join('')}</div>`;}
export function renderRecordSummary(kind,record,catalog){
 if(!record||!['project','deadline','material'].includes(kind))return null;
 const checked=record.checkedDate||catalog.metadata?.checkedDate||'未记录';
 let title;let body;let label;const brief=kind==='project'?catalog.projectSummaries?.get(record.id):null;
 if(kind==='project'){
  if(!isBrowsableRoute(record))return null;
  title=record.program||record.degree;label='项目摘要';
  const deadlines=(catalog.deadlines||[]).filter(d=>(d.routeIds||[]).includes(record.id));
  const materials=(catalog.materials||[]).filter(m=>(m.routeIds||[]).includes(record.id));
  const materialLinks=materials.length?`<div class="link-list">${materials.map(m=>`<button class="text-button" data-summary-kind="material" data-summary-id="${e(m.id)}">${e(m.title||'材料摘要')}</button>`).join('')}</div>`:'<p>该项目的独立材料摘要尚待补充，请核对下方官网。</p>';
  const degreeNames={MSc:'硕士项目（MSc类）',MPhil:'MPhil · 研究型硕士',PhD:'PhD · 博士'};
  const overview=`<dl class="fact-grid"><dt>学校</dt><dd>${e(institutionLabel(record.institution))}</dd><dt>院系</dt><dd>${e(record.department||'未记录')}</dd><dt>项目名称</dt><dd>${e(record.program||record.degree)}</dd><dt>学位类型</dt><dd>${e(record.nativeDegreeLabel||degreeNames[record.degree]||record.degree)}</dd>${record.duration?`<dt>已记录学制</dt><dd>${e(record.duration)}</dd>`:''}</dl>${brief?'':'<p class="small-note">目前整理了项目基本信息与申请条件；培养方向、课程安排与资助详情请查阅下方官方项目介绍。</p>'}`;
  const advisors=(catalog.advisors||[]).filter(a=>(a.routeIds||[]).includes(record.id));
  const advisorLinks=advisors.length?`<div class="link-list">${advisors.map(a=>`<button class="text-button" data-detail="${e(a.id)}">${e(a.nameZh||a.name)}</button>`).join('')}</div>`:'';
  const deadlineLinks=deadlines.length?`<ul>${deadlines.map(d=>`<li><button class="text-button" data-summary-kind="deadline" data-summary-id="${e(d.id)}">${e(d.title)}</button>：${e(d.date||'日期待确认')}</li>`).join('')}</ul>`:'<p>尚未收录该项目可核对的截止日期；请检查当期官网。</p>';
  const distinctRequirements=requirements(record).filter(value=>exactText(value)!==record.eligibilitySummary);
  body=projectIntroduction(brief)+section('项目概览',paragraph(routeEvidenceText(record))+overview)+section('申请条件',paragraph(record.eligibilitySummary)+(distinctRequirements.length?items(distinctRequirements):''))+section('申请方式与批次',paragraph(record.applicationMethod)+paragraph(record.admissionYear))+section('导师与名额',paragraph(supervisorAssociationText(record.supervisorAssociation)||'具体导师关联与名额仍需另行确认。')+paragraph('以下为目录研究关联，包含待核与历史参考；不代表每位导师已确认接收该项目申请。')+advisorLinks)+section('准备材料',materialLinks)+section('申请日期',deadlineLinks)+section('需要留意',(record.notes||[]).length?items(record.notes):'<p>项目要求不等于个人资格或录取结果，申请前仍需核对当期要求。</p>');
 }else if(kind==='deadline'){
  title=record.title;label='日期摘要';
  const status=deadlineStatus(record,catalog.metadata?.checkedDate);
  const dateLabel=status==='expired'?'此轮已截止':record.date?'截止日期已公布':'截止日期待确认';
  const missingDateLabel=record.cycleReview?.sourceConflict?'待复核（来源版本不一致）':'未公布';
  body=section('日期与适用范围',`<dl class="fact-grid"><dt>截止日期</dt><dd>${e(record.date||missingDateLabel)}</dd><dt>截止时刻</dt><dd>${e(record.deadlineTime||missingDateLabel)}</dd><dt>时区</dt><dd>${e(record.timezone||'未注明')}</dd><dt>日期状态</dt><dd>${e(dateLabel)}</dd></dl>`+paragraph(record.admissionYear)+paragraph(record.note))+section('相关项目',projects(relatedProjects(record,catalog)))+section('申请前确认','<p>截止日期、申请系统是否开放和导师名额需要分别确认；未知的时刻与批次不作推断。</p>');
 }else{
  title=record.title||record.program||'申请材料';label='材料摘要';
  let scopeNote=record.summary&&record.note?.startsWith(record.summary)?record.note.slice(record.summary.length).trim():record.note;
  const repeatedPrefix='适用范围：'+record.admissionYear+'；';
  if(record.admissionYear&&scopeNote?.startsWith(repeatedPrefix))scopeNote=scopeNote.slice(repeatedPrefix.length);
  const scopeParagraphs=uniqueText([record.scope,record.admissionYear,scopeNote]);
  const scopeNotes=uniqueText(record.scopeNotes||[]).filter(value=>!scopeParagraphs.includes(value));
  body=section('准备概览',paragraph(record.summary))+section('具体要求与适用条件',requirements(record).length?materialItems(requirements(record)):'<p>尚未收录具体材料清单。</p>')+section('适用范围',scopeParagraphs.map(paragraph).join('')+(scopeNotes.length?items(scopeNotes):''))+section('仍需确认',(record.unknowns||[]).length?items(record.unknowns):'')+section('相关项目',projects(relatedProjects(record,catalog)))+section('准备时注意','<p>这里只总结已收录的要求，不代表完整申请清单。材料名称、格式、语言与提交方式请以当期申请系统为准。</p>');
 }
 const review=record.cycleReview;const reviewNote=review?section('批次复核说明',paragraph(review.reason)+`<p class="small-note">批次复核于 ${e(review.checkedDate)}；原记录与原来源的核验日期保留，其他条件不视为此次重新核验。</p>`):'';
 return {label,html:`<h2 id="detail-title" class="detail-title" tabindex="-1">${e(title)}</h2><p class="detail-subtitle">${e(institutionLabel(record.institution))}${record.degree?' · '+e(degreeDisplay(record)):''}</p>${body}${reviewNote}<section class="detail-section"><h3>官方来源</h3><p class="small-note">来源核验日期：${e(checked)}；日期不随浏览时间自动更新。</p>${officialSources(record)}${brief?`<h4>项目简介来源 · ${e(brief.checkedDate)} 核读</h4>${officialSources(brief)}`:''}${review?`<h4>批次复核来源 · ${e(review.checkedDate)} 核读</h4>${officialSources(review)}`:''}</section>`};
}
