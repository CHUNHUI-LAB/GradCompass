import {appointmentStatus,appointmentLabels,appointmentWindow} from './appointments.js?v=bbe93af17e11';
import {escapeHTML,safeUrl} from './core.js?v=bb95e1b2a919';
const e=escapeHTML;
const link=(url,label)=>{const safe=safeUrl(url);return safe?`<a class="source-link" href="${e(safe)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`:'';};
export function profileMap(data,advisors){const known=new Set(advisors.map(a=>a.id));const map=new Map;for(const p of data?.profiles||[]){if(known.has(p.advisorId)&&!map.has(p.advisorId))map.set(p.advisorId,p);}return map;}
export function profileSummary(profile,fallback){return profile?.cardSummaryZh||fallback||'研究方向见官方主页与代表工作';}
const fact=p=>p?.textZh?`<p>${e(p.textZh)}</p>`:'';
export function renderProfileLinks(profile){
 if(!profile)return '';
 const urls=new Set,links=[];
 const reviewed=profile.homepageReview?.links,existing=profile.links;
 for(const item of [...(Array.isArray(reviewed)?reviewed:[]),...(Array.isArray(existing)?existing:[])]){
  const url=safeUrl(item?.url);
  if(!url||urls.has(url))continue;
  urls.add(url);links.push(link(url,typeof item.label==='string'&&item.label?item.label:new URL(url).hostname));
 }
 if(!links.length)return '';
 const review=profile.homepageReview;
 return `<section class="detail-section profile-homepages"><h3>个人主页、实验室与相关链接</h3>${review?.textZh?`<p>${e(review.textZh)}</p>`:''}${review?.checkedDate?`<p class="small-note">主页补充核验于 ${e(review.checkedDate)}；各项原始简介与招生信息仍按各自核验日期和适用年份阅读</p>`:''}<div class="link-list">${links.join('')}</div></section>`;
}
export function renderHomepageRecruitment(profile){
 const review=profile?.homepageReview;
 if(!review?.recruitmentNoteZh)return '';
 return `<div class="caution-box homepage-recruitment"><h4>个人主页招生补充</h4><p>${e(review.recruitmentNoteZh)}</p><p class="small-note">补充核验于 ${e(review.checkedDate||'日期未核实')}；提前联系与公开招募均不代表个人剩余名额已经核实。</p><div class="link-list">${(review.links||[]).map(item=>link(item.url,item.label)).join('')}</div></div>`;
}
export function renderAppointmentReview(profile){
 const r=profile?.appointmentReview;if(!r)return '';const status=appointmentStatus(profile);
 const date=status!=='unknown'?r.dateText:'日期待核实';
 const context=status==='recent'&&['early_career','previous_faculty','industry_transition'].includes(r.careerContext)?`<p>${e(appointmentLabels[r.careerContext])}；按公开履历分类，不推断年龄。</p>`:'';
 return `<section class="detail-section appointment-review"><h3>任职时间 · 本校教研首次任职</h3><p><strong>${e(date)}</strong> · ${e(appointmentLabels[status])}</p>${context}<p>${e(r.noteZh)}</p><p class="small-note">核查截至 ${e(appointmentWindow.asOf)}；近五年窗口 ${e(appointmentWindow.start)} 至 ${e(appointmentWindow.end)}。指本校首个非学生、非博士后、非访问的教研岗位，校内晋升及转院不重新计时。教研职业早期线索仅描述已公开履历，不证明年龄、完整职业史或博士名额。</p><div class="link-list">${(Array.isArray(r.sources)?r.sources:[]).map(s=>link(s.url,`${s.title||'任职来源'} · 核验 ${s.checkedDate||'日期待核'}`)).join('')}</div></section>`;
}
export function renderProfile(profile){if(!profile)return '';const lab=profile.labSnapshot||{};return `<div class="advisor-profile" data-profile-advisor="${e(profile.advisorId)}"><section class="detail-section"><h3>个人职业概况</h3>${fact(profile.overview)}</section>${renderAppointmentReview(profile)}${renderProfileLinks(profile)}<section class="detail-section"><h3>实验室与研究资源</h3><h4 class="profile-lab-name">${e(lab.name||'实验室名称待补充')}</h4>${fact(lab.affiliation)}${lab.themes?.length?`<div class="tags detail-tags">${lab.themes.map(t=>`<span class="tag">${e(t)}</span>`).join('')}</div>`:''}${fact(lab.structure)}${lab.resources?.length?`<ul class="profile-resources">${lab.resources.map(r=>`<li>${e(r.textZh)}</li>`).join('')}</ul>`:''}<p class="small-note">公开研究平台与合作信息不代表该岗位或每位学生的资源分配保证</p></section><section class="detail-section"><h3>近期代表成果</h3><div class="profile-works">${(profile.representativeWorks||[]).map(w=>`<article class="profile-work"><p class="profile-work-meta">${e(w.year||'年份未核实')} · ${e(w.venue||'成果类型待核实')}</p><h4>${e(w.title)}</h4><p>${e(w.summaryZh||'')}</p><div class="link-list">${link(w.url,'项目 / 论文来源')}</div></article>`).join('')}</div></section></div>`;}
export function renderProfileReferences(profile){if(!profile)return '';const urls=new Set;const sources=[];function collect(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(collect);return;}for(const s of v.sources||[]){if(safeUrl(s.url)&&!urls.has(s.url)){urls.add(s.url);sources.push(s);}}Object.entries(v).filter(([k])=>k!=='sources').forEach(([,v])=>collect(v));}collect(profile);return `<section class="detail-section profile-references"><h3>简介参考与待确认信息</h3><p class="small-note">专业简介核验于 ${e(profile.checkedDate||'日期未核实')}；简介补充不改变下列机会的招生、任职或资格判断</p>${profile.unknowns?.length?`<ul>${profile.unknowns.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:''}<div class="link-list">${sources.map(s=>link(s.url,new URL(s.url).hostname)).join('')}</div></section>`;}
