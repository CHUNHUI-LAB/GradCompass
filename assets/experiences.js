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
export function filterExperiences(records,scope='bachelor'){
 return (records||[]).filter(r=>r.collection===(scope==='cross-background'?'cross-background':'bachelor'));
}
function list(items){return `<ul>${items.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;}
function card(r){return `<article class="experience-card" data-experience-id="${e(r.id)}"><div class="status-group"><span class="badge unknown">历史亲历 · 结果自报</span><span class="route-label">${e(r.applicableCycle)}</span></div><h3>${e(r.title)}</h3><p class="experience-background">${e(r.background)}</p><p>${e(r.summary)}</p><div class="caution-box"><strong>对本科申请的适用范围</strong><p>${e(r.bachelorApplicability)}</p></div><h4>可迁移的准备方法</h4>${list(r.actionableMethods)}<details><summary>背景、核读范围与不采纳的判断</summary><dl class="experience-evidence"><dt>作者背景</dt><dd>${e(r.authorContext)}</dd><dt>历史结果</dt><dd>${e(r.outcome)}</dd><dt>来源日期</dt><dd>${e(r.dateNote)}</dd><dt>核读范围</dt><dd>${e(r.readScope)}</dd><dt>商业披露</dt><dd>${e(r.commercialDisclosure)}</dd><dt>来源复查</dt><dd>${e(r.checkedAt)} · 可提取网页正文；不代表录取真实性或完整图片核验</dd></dl><h4>未采纳为事实或建议</h4>${list(r.excludedClaims)}</details><p class="small-note">${e(r.platform)} · 公开作者：${e(r.author)}</p><a class="source-link" href="${e(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">查看原文与上下文</a></article>`;}
export function renderExperiences(records,scope='bachelor'){
 const cross=scope==='cross-background';const selected=filterExperiences(records,scope);
 const intro=`<div class="experience-intro"><p>借鉴准备方法，同时看清背景差异。个人经历不代表当前招生政策、名额、录取率或个人资格；本页不计入导师与机会数量。</p><p class="small-note">当前要求请回到申请路径和官方来源逐项核实。这里不复用旧年份的分数、费用、签证或招生机制判断。</p><div class="experience-tabs" role="group" aria-label="申请经验适用范围"><button type="button" data-experience-scope="bachelor" aria-pressed="${!cross}">本科申请方法</button><button type="button" data-experience-scope="cross-background" aria-pressed="${cross}">跨背景流程对照</button></div><p class="small-note">${cross?'硕士申博等背景差异较大的历史个案，仅供流程对照，不作为本科入口证据。':'默认只展示本科背景的申请方法；跨背景个案需主动切换查看。'} 导师库的学校、职级与机会筛选不用于本页，返回时保留。</p></div>`;
 return {countLabel:records===null?'经验资料暂未载入':`${selected.length} 条历史经验 · ${cross?'跨背景流程对照':'本科申请方法'}`,html:intro+(records===null?'<div class="empty"><h3>经验资料暂时无法读取</h3><p>可刷新后重试；导师与申请路径仍可正常浏览。</p></div>':selected.length?`<div class="experience-grid">${selected.map(card).join('')}</div>`:'<div class="empty"><h3>这个范围暂无符合来源要求的经验</h3><p>不使用搜索摘要、失效签名链接或未核读内容补齐数量。</p></div>')};
}
