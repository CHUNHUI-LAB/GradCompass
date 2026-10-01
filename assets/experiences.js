import {escapeHTML,safeUrl} from './core.js';
const e=escapeHTML;
export function normalizeExperiences(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.records))throw Error('Invalid experience collection');
 const ids=new Set();const urls=new Set();
 return data.records.filter(r=>{
  if(!r||!r.id||ids.has(r.id)||!safeUrl(r.url)||!r.url.startsWith('https://')||urls.has(r.url)||!['bachelor','cross-background'].includes(r.collection)||r.evidenceType!=='first_person_self_report'||r.rulesImpact!=='none'||!Array.isArray(r.actionableMethods)||!Array.isArray(r.excludedClaims))return false;
  if(!['title','platform','author','applicableCycle','background','authorContext','outcome','summary','readScope','dateNote','bachelorApplicability','commercialDisclosure','checkedAt'].every(k=>typeof r[k]==='string'&&r[k].trim()))return false;
  ids.add(r.id);urls.add(r.url);return true;
 });
}
function list(items){return `<ul>${items.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;}
export function applicabilityText(record){return record.bachelorApplicability.replace('仅作跨背景流程对照；','可参考申请流程；');}
export function experienceHref(id){return '#experiences/'+encodeURIComponent(id);}
const briefs={
 'grad-robotics-eth-xiang-2022':{takeaway:'先拆开各项目的材料和时间安排，再区分实际申请、仅考虑与已放弃的项目；不要直接照搬作者的选校清单。',use:'适合已经确定机器人或相近方向、准备比较多个硕士项目的人。重点借鉴项目记录方式、额外材料清单和推荐安排。'},
 'grad-europe-tinsir-2025':{takeaway:'欧陆博士申请需要逐岗位核对研究匹配与资助，并记录每次申请停在哪一步；进入面试也不等于匹配或资助问题已经解决。',use:'适合已有硕士经历、准备按研究岗位申请博士的人。可以参考岗位匹配、硕士论文介绍和资助核对的方法。'},
 'grad-bjut-mty-2026':{takeaway:'把每个项目的录取、拒信、附带条件和通知日期分开记录，让等待期与后续选择更清楚；不要据一个人的结果推断学校偏好。',use:'适合正在准备硕士申请、需要同时跟踪多个项目状态的人。主要借鉴结果表、时间线和录取条件的核对方式。'},
 'grad-sustech-yunzx-2023':{takeaway:'跨专业申请先分清培养目标、先修要求与材料安排；已有科研经历并不自动等于能获得具体、有力的推荐。',use:'适合考虑跨专业申请硕士的人。重点检查课程、研究训练和职业目标是否匹配，并提前与推荐人沟通。'}
};
function brief(record){return briefs[record.id]||{takeaway:record.summary,use:applicabilityText(record)};}
function card(r){return `<article class="experience-card" data-experience-id="${e(r.id)}"><p class="small-note">${e(r.applicableCycle)}</p><h3>${e(r.title)}</h3><p class="experience-takeaway">${e(brief(r).takeaway)}</p><p class="experience-background">作者背景：${e(r.background)}</p><p class="small-note">${e(r.platform)} · ${e(r.author)}</p><a class="experience-read-link" href="${e(experienceHref(r.id))}">阅读经验<span class="sr-only">：${e(r.title)}</span></a></article>`;}
function references(ids,records){const names={'grad-robotics-eth-xiang-2022':'机器人项目申请','grad-sustech-yunzx-2023':'跨专业硕士申请','grad-europe-tinsir-2025':'硕士申请欧陆博士','grad-bjut-mty-2026':'英港新硕士申请'};const linked=ids.map(id=>records.find(r=>r.id===id)).filter(Boolean);return linked.length?`<p class="experience-related">相关经验：${linked.map(r=>`<a href="${e(experienceHref(r.id))}">${e(names[r.id]||r.title)}</a>`).join('、')}</p>`:'';}
function overview(records){const steps=[
 {title:'先定目标，再核对项目或岗位匹配',text:'项目选择要对照培养目标与研究方向；按岗位申请博士时，还要具体到主题和方法是否匹配。',ids:['grad-robotics-eth-xiang-2022','grad-sustech-yunzx-2023','grad-europe-tinsir-2025']},
 {title:'逐项目拆材料，提前安排推荐',text:'两篇本科背景回顾都可用于检查额外材料、修改时间和推荐安排；科研经历本身不能代替推荐沟通。',ids:['grad-robotics-eth-xiang-2022','grad-sustech-yunzx-2023']},
 {title:'持续记结果，同时核对条件和资助',text:'把提交、待结果、录取、拒信与附带条件分开记录；博士岗位还应单独检查资助覆盖，别把未回复当正式拒信。',ids:['grad-bjut-mty-2026','grad-europe-tinsir-2025']}
 ];const synthesisIds=Object.keys(briefs);const covered=records.filter(r=>synthesisIds.includes(r.id));const pending=records.filter(r=>!synthesisIds.includes(r.id)).length;if(covered.length!==synthesisIds.length)return '<section class="experience-overview"><h3>综合总结暂不完整</h3><p>部分已综合的案例暂未载入。可先逐篇阅读，避免把不完整资料当作全部结论。</p></section>';const available=steps.filter(p=>p.ids.some(id=>records.some(r=>r.id===id)));if(!available.length)return '';return `<section class="experience-overview" aria-labelledby="experience-overview-title"><h3 id="experience-overview-title">这 ${covered.length} 篇经验的综合总结</h3>${pending?`<p class="small-note">另有 ${pending} 篇新收录经验尚未纳入本节归纳，可在下方单独阅读。</p>`:''}<p>比起照抄去向清单，更值得参考的是项目匹配、材料安排和结果记录。按案例内容，可以这样安排准备顺序：</p><ol>${available.map(p=>`<li><strong>${e(p.title)}</strong><p>${e(p.text)}</p>${references(p.ids,records)}</li>`).join('')}</ol><h4>背景不同，参考重点也不同</h4><p>三篇本科起点的经历可参考硕士申请准备，其中跨专业案例更重视培养目标与先修要求；一篇硕士申博经历主要帮助核对岗位匹配和资助，不能用来判断本科直博资格。不同背景的结果不宜直接比较，也不能据此推导录取概率。</p></section>`;}
export function renderExperienceReading(records,id){
 const back='<a class="experience-back" href="#experiences">← 返回经验列表</a>';
 if(records===null)return {title:'经验资料暂时无法读取',countLabel:'请刷新后重试',html:back+'<div class="empty"><p>该篇资料尚未载入；可先返回经验列表或浏览其他页面。</p></div>'};
 const r=(records||[]).find(record=>record.id===id);
 if(!r)return {title:'未找到这篇经验',countLabel:'请返回列表选择现有经验',html:back+'<div class="empty"><p>这个链接对应的经验不存在或已不在当前资料中。</p></div>'};
 const b=brief(r);
 const html=`${back}<article class="experience-reading" data-reading-experience="${e(r.id)}"><section class="experience-reading-lead"><h3>这篇经验的总结</h3><p>${e(b.takeaway)}</p></section><section><h3>背景与申请目标</h3><p>${e(r.authorContext)}</p><p class="small-note">${e(r.applicableCycle)}</p></section><section><h3>文中记录与结果</h3>${r.summary===b.takeaway?'':`<p>${e(r.summary)}</p>`}<p>${e(r.outcome)}</p></section><section><h3>可借鉴的做法</h3>${list(r.actionableMethods)}</section><section><h3>适合怎么用</h3><p>${e(b.use)}</p>${b.use===applicabilityText(r)?'':`<p>${e(applicabilityText(r))}</p>`}</section><section><h3>不能照搬的部分</h3>${list(r.excludedClaims)}</section><details><summary>来源日期、核读范围与商业披露</summary><dl class="experience-evidence"><dt>来源日期</dt><dd>${e(r.dateNote)}</dd><dt>核读范围</dt><dd>${e(r.readScope)}</dd><dt>商业披露</dt><dd>${e(r.commercialDisclosure)}</dd><dt>来源复查</dt><dd>${e(r.checkedAt)} · 可提取网页正文；不代表录取真实性或完整图片核验</dd></dl></details><section class="experience-reading-actions"><p class="small-note">以上归纳来自已核读正文，具体叙述和上下文请看原帖。</p><a class="experience-read-link" href="${e(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">查看原帖</a><a href="#experiences">返回经验列表</a></section></article>`;
 return {title:r.title,countLabel:`${r.platform} · ${r.author}`,html};
}
export function renderExperiences(records){
 const selected=records||[];
 const intro='<p class="experience-intro">这些历史申请自述用于参考准备方法；每篇都注明背景、结果与适用限制。</p>';
 return {countLabel:records===null?'经验资料暂未载入':`${selected.length} 条申请经验`,html:intro+(records===null?'<div class="empty"><h3>经验资料暂时无法读取</h3><p>可刷新后重试；找导师与找项目仍可正常浏览。</p></div>':selected.length?overview(selected)+`<h3 class="experience-list-title">选择一篇阅读</h3><div class="experience-grid">${selected.map(card).join('')}</div>`:'<div class="empty"><h3>暂无符合来源要求的申请经验</h3><p>不使用搜索摘要、失效签名链接或未核读内容补齐数量。</p></div>')};
}
