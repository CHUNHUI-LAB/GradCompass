import {browseAdvisors,filterOpportunities,escapeHTML,readerText,safeUrl,institutionLabel,rankOf,rankLabels,themesFor,textValue} from './core.js?v=67f72bbe4700';
import {profileSummary} from './profiles.js?v=68304478accd';
import {appointmentStatus,appointmentLabels} from './appointments.js?v=bbe93af17e11';

const e=value=>escapeHTML(readerText(value));
const kinds=['degree','employment','reference'];
const groupLabels={degree:'已核实学位关联',employment:'RA 岗位',reference:'博士项目参考'};
const openingLabels={explicit:'已找到招生说明',unknown:'招生年份或名额待确认',closed:'已明确停止招生'};
const profileFor=(profiles,id)=>profiles?.get?.(id)||profiles?.[id];

// Group the existing discovery result, without deriving opportunities from routeIds.
// The same advisor can have several projects of one degree or several distinct jobs.
export function groupAdvisorResults(catalog,filters={}){
  const groups=browseAdvisors(catalog,filters).map(advisor=>({advisor,opportunities:[]}));
  const byAdvisor=new Map(groups.map(group=>[group.advisor.id,group]));
  for(const opportunity of filterOpportunities(catalog,filters)){
    byAdvisor.get(opportunity.advisorId)?.opportunities.push(opportunity);
  }
  return groups;
}

export function advisorResultCount(groups){
  const counts={degree:0,employment:0,reference:0};
  for(const group of groups)for(const opportunity of group.opportunities){
    if(Object.hasOwn(counts,opportunity.kind))counts[opportunity.kind]++;
  }
  return `${groups.length} 位导师 · ${counts.degree} 条已核实学位关联 · ${counts.employment} 个 RA 岗位${counts.reference?` · ${counts.reference} 条博士项目参考`:''}`;
}

function originalLink(url,label){
  const safe=safeUrl(url);
  return safe?`<a class="source-link" href="${e(safe)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`:'';
}

function appointmentMarkup(advisor,profile){
  const status=appointmentStatus(profile),review=profile?.appointmentReview;
  let badges='';
  if(status==='recent'){
    badges=`<span class="badge new">${e(appointmentLabels.recent)}</span>`;
    if(['early_career','previous_faculty','industry_transition'].includes(review.careerContext))badges+=`<span class="badge">${e(appointmentLabels[review.careerContext])}</span>`;
  }else if(!review&&advisor.newPi?.verified){
    badges='<span class="badge new">新入职已核实</span>';
  }
  const date=review?`<p class="small-note advisor-appointment">本校教研入职：${e(review.dateText||'日期待核实')}${status==='boundary'?' · 五年边界待核':''}</p>`:'';
  return {badges,date};
}

function opportunityRow(opportunity,advisor,catalog,compareIds){
  const route=(catalog.routes||[]).find(record=>record.id===opportunity.routeId);
  const job=(catalog.raPositions||[]).find(record=>record.id===opportunity.jobId);
  const employment=opportunity.kind==='employment',reference=opportunity.kind==='reference';
  const title=employment?(job?.title||'研究助理岗位'):(route?.program||route?.degree||'学位项目');
  const referenceNumber=employment&&job?.jobReference?` #${job.jobReference}`:'';
  const label=`${advisor.name} · ${opportunity.type}${referenceNumber} · ${title}`;
  const selected=compareIds.includes(opportunity.id);
  const status=employment?'已发布岗位招聘 · 剩余名额待确认':reference?'项目参考 · 个人关联与余位待核':openingLabels[opportunity.openingStatus]||openingLabels.unknown;
  return `<div class="opportunity-row" data-opportunity-id="${e(opportunity.id)}" data-opportunity-kind="${e(opportunity.kind)}"><div class="opportunity-copy"><span class="opportunity-type">${e(opportunity.type)}${e(referenceNumber)}</span><p class="opportunity-program">${e(title)}</p><p class="small-note opportunity-status">${e(status)}</p></div><div class="opportunity-actions"><button type="button" class="detail-button" data-detail="${e(opportunity.id)}" aria-label="查看${e(label)}的条件与来源">${employment?'岗位详情':'项目与条件'} <span aria-hidden="true">↗</span></button><button type="button" class="compare-button" data-compare="${e(opportunity.id)}" aria-pressed="${selected}" aria-label="${selected?'移出':'加入'}比较：${e(label)}">${selected?'已选':'＋ 比较'}</button></div></div>`;
}

function opportunityGroups(rows,advisor,catalog,compareIds){
  return kinds.map(kind=>{
    const records=rows.filter(row=>row.kind===kind);
    return records.length?`<div class="opportunity-group" data-opportunity-group="${kind}"><h4 class="opportunity-group-title">${groupLabels[kind]}</h4>${records.map(row=>opportunityRow(row,advisor,catalog,compareIds)).join('')}</div>`:'';
  }).join('');
}

export function renderAdvisorCard(group,{catalog,profiles=catalog.advisorProfiles,profileState='loading',compareIds=[]}={}){
  const {advisor,opportunities}=group,profile=profileFor(profiles,advisor.id);
  const appointment=appointmentMarkup(advisor,profile);
  const topics=themesFor(advisor),tags=(topics.length?topics:(advisor.topics||[]).map(textValue)).slice(0,5);
  const profileMessage=profile?'':profileState==='loading'?'专业简介正在载入；先展示已收录的研究摘要':profileState==='unavailable'?'补充简介暂未载入；先展示已收录的研究摘要':'专业简介待补充';
  const rows=kinds.flatMap(kind=>opportunities.filter(opportunity=>opportunity.kind===kind));
  const first=rows.slice(0,2),more=rows.slice(2);
  const opportunitiesMarkup=rows.length?
    opportunityGroups(first,advisor,catalog,compareIds)+(more.length?`<details class="opportunity-more" data-disclosure-key="${e(advisor.id)}:opportunities"><summary>展开其余 ${more.length} 条记录</summary>${opportunityGroups(more,advisor,catalog,compareIds)}</details>`:''):
    '<div class="advisor-research-note"><span class="opportunity-group-title">研究资料</span><p>当前筛选下暂无已核实学位关联或 RA 岗位。项目关联为待核或参考，不表示导师不招生。</p></div>';
  return `<article class="advisor-card" data-advisor-id="${e(advisor.id)}" data-result-key="${e(advisor.id)}" data-profile-state="${profile?'ready':e(profileState)}"><div class="advisor-main"><div class="identity-line"><h3><button type="button" class="name-button" data-detail="${e(advisor.id)}" aria-label="查看${e(advisor.name)}的导师研究档案">${e(advisor.name)}${advisor.nameZh&&advisor.nameZh!==advisor.name?` <span class="name-zh">${e(advisor.nameZh)}</span>`:''}</button></h3>${appointment.badges}</div><div class="institution-line"><strong>${e(institutionLabel(advisor.institution))}</strong>${advisor.department?` · ${e(advisor.department)}`:''}</div><p class="small-note advisor-rank">${e(rankLabels[rankOf(advisor)])} · 原职衔：${e(advisor.position||'未记录')}</p>${appointment.date}<p class="summary">${e(profileSummary(profile,advisor.summary))}</p>${profileMessage?`<p class="profile-state small-note">${e(profileMessage)}</p>`:''}<div class="tags">${tags.map(tag=>`<span class="tag">${e(tag.replaceAll('_',' '))}</span>`).join('')}</div><div class="advisor-primary-actions"><button type="button" class="detail-button" data-detail="${e(advisor.id)}" aria-label="查看${e(advisor.name)}的研究与证据">查看导师详情 <span aria-hidden="true">→</span></button>${originalLink(advisor.profileUrl,'原始主页 ↗')}</div></div><div class="advisor-opportunities">${opportunitiesMarkup}</div></article>`;
}
