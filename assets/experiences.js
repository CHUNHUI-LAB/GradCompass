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
function references(ids,records){const names={'grad-robotics-eth-xiang-2022':'机器人项目申请','grad-sustech-yunzx-2023':'跨专业硕士申请','grad-europe-tinsir-2025':'硕士申请欧陆博士','grad-bjut-mty-2026':'英港新硕士申请','grad-ptt-tum-rci-2022':'德国机器人硕士','grad-dcard-ece-ra-phd-2025':'工作后 RA 再申博','grad-dcard-bme-ece-2026':'医工/ECE 面试','grad-reddit-cs-interviews-2025':'CS 博士面试','grad-ngaizean-hkustgz-2026':'红鸟与博士不同结果','grad-szu-mingkangchen-2025':'科研接触与港大群面','grad-xhs-xiga-ra-mphil-2025':'RA 与 MPhil 待完成记录'};const linked=ids.map(id=>records.find(r=>r.id===id)).filter(Boolean);return linked.length?`<p class="experience-related">相关经验：${linked.map(r=>`<a href="${e(experienceHref(r.id))}">${e(names[r.id]||r.title)}</a>`).join('、')}</p>`:'';}
const synthesis={
 "scopeRecordIds": [
  "grad-robotics-eth-xiang-2022",
  "grad-europe-tinsir-2025",
  "grad-bjut-mty-2026",
  "grad-sustech-yunzx-2023",
  "grad-ptt-tum-rci-2022",
  "grad-dcard-ece-ra-phd-2025",
  "grad-dcard-bme-ece-2026",
  "grad-reddit-cs-interviews-2025",
  "grad-ngaizean-hkustgz-2026",
  "grad-szu-mingkangchen-2025",
  "grad-xhs-xiga-ra-mphil-2025",
  "grad-gter-chuyeyue-ra-phd-2024",
  "grad-gter-sscomebady-mphil-2018",
  "grad-gter-imhigh-hkust-mphil-2015",
  "grad-drishti-akash-hkust-intern-2023",
  "grad-wangbard-cryptography-phd-2025"
 ],
 "intro": "这些案例覆盖本科申硕、跨专业、硕士申博、工作后返校做研究，也包括暑研入口和申请受挫后的调整。它们提供不同环节的准备方法，不代表录取规律；2015 与 2018 年案例已明确标为历史。",
 "steps": [
  {
   "title": "先明确想学什么，再找对应项目与导师",
   "text": "本科申硕的案例提醒我们核对培养目标与先修课；医工跨方向案例进一步展示了从研究问题反查院系的做法。硕士申博则更需要核对具体研究主题和岗位。",
   "sourceIds": [
    "grad-robotics-eth-xiang-2022",
    "grad-sustech-yunzx-2023",
    "grad-dcard-bme-ece-2026",
    "grad-europe-tinsir-2025"
   ]
  },
  {
   "title": "把材料拆成清单，也给核验和推荐留时间",
   "text": "除了文书和推荐，德国机器人案例还涉及课程说明、学历预审和语言条件。可把这些与各项目额外写作任务分开安排，再回官网确认本年度要求。 2018 年 CUHK 案例把语言、港校网申与国内考研分阶段安排；2015 年 HKUST 案例则区分材料各自说明的能力。旧帖只参考组织方法。",
   "sourceIds": [
    "grad-robotics-eth-xiang-2022",
    "grad-sustech-yunzx-2023",
    "grad-ptt-tum-rci-2022",
    "grad-xhs-xiga-ra-mphil-2025",
    "grad-gter-sscomebady-mphil-2018",
    "grad-gter-imhigh-hkust-mphil-2015"
   ]
  },
  {
   "title": "面试准备具体到研究、作业与追问",
   "text": "这里既有研究报告，也有读论文完成作业后再解释思路的面试。另一篇 CS 自述显示，面试官对拓展讨论的期待并不相同。准备应以真实邀请要求为起点，不能照抄一种模板。 密码学案例的后段转折也涉及重新组织硕士论文展示；这不证明展示改进是录取的唯一原因。",
   "sourceIds": [
    "grad-dcard-ece-ra-phd-2025",
    "grad-dcard-bme-ece-2026",
    "grad-reddit-cs-interviews-2025",
    "grad-europe-tinsir-2025",
    "grad-szu-mingkangchen-2025",
    "grad-wangbard-cryptography-phd-2025"
   ]
  },
  {
   "title": "持续记状态，把录取、候补、放弃和资助分开",
   "text": "结果表不只记录拿到哪些录取。不同案例还有条件录取、候补后拒绝、主动放弃考核、未回复，以及研究有兴趣但资助不合适。同一学校的不同项目也可能给出不同结果。 尚在办理合同或计划以后申请的经历，要保留未完成状态。 新补充的 CUHK 案例须分开 2023 年 RA offer 与 2024 年 PhD 更新；HKUST 旧帖还区分 PhD 招募邀请与正式学位 offer。",
   "sourceIds": [
    "grad-bjut-mty-2026",
    "grad-ptt-tum-rci-2022",
    "grad-dcard-bme-ece-2026",
    "grad-reddit-cs-interviews-2025",
    "grad-europe-tinsir-2025",
    "grad-ngaizean-hkustgz-2026",
    "grad-szu-mingkangchen-2025",
    "grad-xhs-xiga-ra-mphil-2025",
    "grad-gter-chuyeyue-ra-phd-2024",
    "grad-gter-imhigh-hkust-mphil-2015"
   ]
  }
 ],
 "differences": [
  {
   "title": "RA 是经历，不是学位或保录承诺",
   "text": "这里既有硕士毕业后返校做 RA，也有本科阶段联系课题组、做研究再申请的经历。它们可用于了解研究安排，不能推导 RA 转博保证或其他项目的录取资格。 小红书案例发帖时仍在办合同和签证，也不能称作已获 MPhil 录取。 CUHK 后续申博更新没有补齐 RA 实际任职；HKUST 暑研则是科研实习，不能混写为全职 RA。",
   "sourceIds": [
    "grad-dcard-ece-ra-phd-2025",
    "grad-ngaizean-hkustgz-2026",
    "grad-szu-mingkangchen-2025",
    "grad-xhs-xiga-ra-mphil-2025",
    "grad-gter-chuyeyue-ra-phd-2024",
    "grad-drishti-akash-hkust-intern-2023"
   ]
  },
  {
   "title": "相近名称也可能对应不同申请内容",
   "text": "机器人、ECE、医工与跨专业硕士案例应按自身目标取用；材料、面试和结果不能直接横比。",
   "sourceIds": [
    "grad-robotics-eth-xiang-2022",
    "grad-sustech-yunzx-2023",
    "grad-ptt-tum-rci-2022",
    "grad-dcard-bme-ece-2026"
   ]
  },
  {
   "title": "历史样本与相关经历分别取用",
   "text": "两篇历史 MPhil 个案提供已结束的选择过程，不证明当季门槛。暑研案例只补充科研入口；密码学申博是同季受挫后调整，与跨申请季再申不同。背景标签也要与成绩、科研和论文状态一起看，不能简化为低背景逆袭。",
   "sourceIds": [
    "grad-gter-sscomebady-mphil-2018",
    "grad-gter-imhigh-hkust-mphil-2015",
    "grad-drishti-akash-hkust-intern-2023",
    "grad-wangbard-cryptography-phd-2025"
   ]
  }
 ]
};
function overview(records){
 const covered=records.filter(r=>synthesis.scopeRecordIds.includes(r.id));
 const pending=records.filter(r=>!synthesis.scopeRecordIds.includes(r.id)).length;
 if(covered.length!==synthesis.scopeRecordIds.length)return '<section class="experience-overview"><h3>综合总结暂不完整</h3><p>部分已综合的案例暂未载入。可先逐篇阅读，避免把不完整资料当作全部结论。</p></section>';
 return `<details id="experience-synthesis" class="experience-overview experience-synthesis"><summary><span id="experience-overview-title">这 ${covered.length} 篇经验的综合总结</span><small>展开阅读准备步骤、差异与对应案例</small></summary><div class="experience-synthesis-body">${pending?`<p class="small-note">另有 ${pending} 篇新收录经验尚未纳入本节归纳，可在下方单独阅读。</p>`:''}<p>${e(synthesis.intro)}按案例内容，可以这样安排准备顺序：</p><ol>${synthesis.steps.map(p=>`<li><strong>${e(p.title)}</strong><p>${e(p.text)}</p>${references(p.sourceIds,records)}</li>`).join('')}</ol><h4>背景不同，参考重点也不同</h4>${synthesis.differences.map(p=>`<p><strong>${e(p.title)}</strong>：${e(p.text)}</p>${references(p.sourceIds,records)}`).join('')}<p>不同背景的结果不宜直接比较，也不能据此推导录取概率。</p></div></details>`;
}
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
