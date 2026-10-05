import {escapeHTML,buildOpportunities,browseRoutes as filterRoutes,browseAdvisors,filterDeadlines,deadlineStatus,themesFor,institutionLabel} from './core.js?v=79b44f84ac83';

const e=escapeHTML;
const count=(rows,predicate)=>rows.filter(predicate).length;
const summaryAction=(kind,record,label)=>record?{kind,id:record.id,label}:null;
const preset=(id,label)=>({preset:id,label});
const caseAction=(records,id,label)=>records?.some(r=>r.id===id)?{href:'#experiences/'+encodeURIComponent(id),label}:null;

// Page-wide synthesis intentionally stays separate from the filtered result list.
// Counts and links come from the same validated records used by that list.
export const overviewPresets={
 'advisors-manipulation':{view:'advisors',filters:{topic:'灵巧操作与触觉'}},
 'advisors-recruitment':{view:'advisors',filters:{opening:'explicit'}},
 'advisors-ra':{view:'advisors',filters:{opportunityType:'RA'}},
 'routes-mphil':{view:'routes',filters:{opportunityType:'MPhil'}},
 'routes-msc':{view:'routes',filters:{opportunityType:'MSc'}}
};

export function buildPageOverview(view,catalog,{experiences=null,projectSummaryState='loading',materialSupplementState='unavailable'}={}){
 const routes=filterRoutes(catalog);
 if(view==='advisors'){
  const opportunities=buildOpportunities(catalog);
  const people=browseAdvisors(catalog);
  const topicCount=topic=>count(people,a=>themesFor(a).includes(topic));
  const degreeOpportunities=opportunities.filter(o=>o.kind==='degree');
  const explicit=count(degreeOpportunities,o=>o.openingStatus==='explicit');
  const ra=opportunities.filter(o=>o.type==='RA');
  return {label:'导师总览',title:'先对研究问题，再核对学位与招募',scope:`全页 ${people.length} 位导师 · ${opportunities.length} 条已核实关联/岗位`,insights:[
   {title:'研究侧重并不相同',text:`张富侧重多传感定位与自主飞行，刘希慧涉及多模态导航与全身移动操作。灵巧操作与触觉涉及 ${topicCount('灵巧操作与触觉')} 位（方向可重叠）；按代表工作选题。`,action:preset('advisors-manipulation','只看灵巧操作与触觉')},
   {title:'学位机会与 RA 分开选',text:`MPhil（${count(opportunities,o=>o.type==='MPhil')} 条）、PhD（${count(opportunities,o=>o.type==='PhD')} 条）为主，另有 ${ra.length} 个已核实 RA 岗位。学位看培养与指导关系；RA 看工作内容、任期与任职条件。`,action:ra.length?preset('advisors-ra','只看 RA 岗位'):null},
   {title:'有招募说明，也要再核当轮',text:`${degreeOpportunities.length} 条学位机会中，${explicit} 条有分学位招募说明，其余待确认。常年招募、院系招生都不等于导师本轮名额；联系前核对对应机会的条件与来源。`,action:preset('advisors-recruitment','只看有招募说明的机会')}
  ],note:'全页概览不随筛选变化；下方显示筛选结果。方向人数可重叠，已核实关联/岗位数不等于导师人数；待核和参考导师也保留。'};
 }
 if(view==='routes'){
  const covered=routes.filter(r=>catalog.projectSummaries?.has(r.id));
  const schools=new Set(covered.map(r=>r.institution));
  const mscIntroductions=catalog.projectSummaries?.has('cuhk_robotics_msc')&&catalog.projectSummaries?.has('polyu_ire_msc');
  const brief=projectSummaryState==='loading'?'培养简介正在载入，可先看基本申请条件。':projectSummaryState==='unavailable'?'培养简介暂未载入，基本申请条件仍可阅读。':`${covered.length} 个项目有培养与研究简介，覆盖 ${schools.size} 所学校；另外 ${routes.length-covered.length} 个目前仅有基本条件。${projectSummaryState==='partial'?'部分简介未能验证。':''}`;
  return {label:'项目总览',title:'先分清培养方式，再比较入口与批次',scope:`全页 ${routes.length} 个项目 · ${new Set(routes.map(r=>r.institution)).size} 所学校`,insights:[
   {title:'研究型学位重在持续研究',text:`现有 ${count(routes,r=>r.degree==='MPhil')} 个 MPhil、${count(routes,r=>r.degree==='PhD')} 个 PhD。`+(catalog.projectSummaries?.has('HKUST-CSE-MPhil')?'以港科大 CSE MPhil 为例，2 年培养结合课程、研讨课与论文研究，毕业需口头答辩。比较时应看具体研究训练，不能只看学位名称。':'培养简介暂未完整载入；可先分开核对同校不同学位的本科入口、学制、导师关联与基本要求。'),action:summaryAction('project',routes.find(r=>r.id==='HKUST-CSE-MPhil'),catalog.projectSummaries?.has('HKUST-CSE-MPhil')?'读 CSE 的研究与培养':'查看 CSE 项目条件')},
   {title:'硕士项目须分别核对培养类型',text:mscIntroductions?'PolyU IRE 可选修课或论文路线，两者仍授 MSc；CUHK Robotics 强调课程与动手项目，已核课程方案为 2026/27。不能把课程或论文安排理解成固定导师名额。':`已收录 ${count(routes,r=>r.degree==='MSc')} 个 MSc 类硕士项目。课程、项目或论文安排应逐项比较，不能由名称推定研究型学位或固定导师名额。`,action:preset('routes-msc','只看硕士项目')},
   {title:'简介覆盖与时间表有边界',text:brief+' 先读简介，再查目标入学年；项目已公布条件不等于导师当轮接收。',action:preset('routes-mphil','只看 MPhil 项目')}
  ],note:'全页概览不随筛选变化；项目详情中的入学年份与来源说明优先于笼统的学校标签。'};
 }
 if(view==='deadlines'){
  const records=filterDeadlines(catalog);const checked=catalog.metadata.checkedDate;
  const future=records.filter(d=>d.date&&deadlineStatus(d,checked)!=='expired');
  const pending=records.filter(d=>!d.date&&deadlineStatus(d,checked)!=='expired');
  const expired=records.filter(d=>deadlineStatus(d,checked)==='expired');
  const next=future[0];const nextText=next?`${next.date.slice(0,10)}，${institutionLabel(next.institution)}「${next.title}」。这只是本页已记录日期中最早的后续截止，开放状态、具体时刻和剩余名额仍须核对。`:'本页暂没有可列出的后续截止日期；请先核对目标项目的当期公告。';
  return {label:'日历总览',title:'先核最近一轮，再补尚未明确的时间',scope:`日期目录核验于 ${checked}`,insights:[
   {title:'全部学校中最早的后续截止',text:nextText,action:summaryAction('deadline',next,'查看这轮日期与条件')},
   {title:'有日期 ≠ 已开放提交',text:`本页有 ${future.length} 条后续日期记录、${pending.length} 条日期或批次待确认。主轮、早轮、补录和 RA 招聘各有适用范围；补录尤其要确认是否仍有余额。`,action:summaryAction('deadline',records.find(d=>d.id==='cuhk_mae_rpg-clearing'),'查看补录轮限制')},
   {title:'旧轮次与资料缺口要保留',text:`${expired.length} 条已截止记录单独保留。日历尚未覆盖所有项目的新批次说明；即使本页标为待核，也应打开项目摘要继续核对，不能据此断言学校尚未公布。`,action:{href:'#routes',label:'去项目摘要核对入学年'}}
  ],note:`全页概览不随学校筛选变化；下方显示筛选结果。本页按日期目录核验日 ${checked} 分组，不是实时开放状态；正式安排提交前请核对官网。`};
 }
 if(view==='materials'){
  const materials=catalog.materials||[];const find=id=>materials.find(m=>m.id===id);
  const covered=new Set(materials.flatMap(m=>m.routeIds||[]).filter(id=>routes.some(r=>r.id===id)));
  const research=find('polyu-aae-ise-rpg-materials');const redbird=find('hkust-gz-rbm-materials');const cuhk=find('cuhk-mae-rpg-materials');
  const incomplete=materialSupplementState!=='loaded';
  return {label:'材料总览',title:'先做共用底稿，再按项目补差异',scope:`当前载入 ${materials.length} 组摘要 · 关联 ${covered.size} 个项目`,insights:[
   {title:'先安排需要他人配合的部分',text:cuhk?'推荐数量与提交方式不能统一套用。CUHK MAE 的 MPhil 需 2 份报告，研究型博士需 3 份；选定学位后，再确认推荐人、系统邀请和到达期限。':'先按目标学位核对推荐报告、语言证明与学术文件，给推荐人及文件办理留时间；目前载入的记录不足以概括各校差异。',action:summaryAction('material',cuhk,'查看 MAE 推荐要求')},
   {title:'研究计划不能用一份规则通吃',text:research&&redbird?'PolyU AAE / ISE 研究型项目要求 CV、PS 和指定表格研究计划；港科广红鸟的 PS、研究计划和推荐信则明确为鼓励但非必需。先分清必交、条件性和选交，再动笔。':'研究计划、CV 与个人陈述须按项目确认是否必交、是否有模板；“本次未明确”不能理解成免交。',action:summaryAction('material',research||redbird,research?'查看理大指定材料':'查看红鸟可选材料')},
   {title:'有关联，不等于清单已齐',text:`${incomplete?'补充材料未完整载入，目前仅归纳可读取的记录。':`材料摘要已关联 ${covered.size} 个学位项目，但仍保留数量、格式或批次待确认项。`}各校年份和渠道不同，尤其不能把 HKPFS 要求套到普通轮；RA 岗位文件需另外核对。`,action:summaryAction('material',find('cityu-ds-phd-materials')||redbird,find('cityu-ds-phd-materials')?'查看 CityU 分渠道要求':'查看红鸟材料范围')}
  ],note:'这些是已核读的官方要求摘要，提交前仍须核对当期申请系统的完整清单；全页概览不随筛选变化。'};
 }
 if(view==='experiences'){
  if(experiences===null)return {label:'经验总览',title:'经验资料暂未载入',scope:'不将缺失资料当成完整结论',insights:[{title:'仍可先核对官方信息',text:'经验摘要读取恢复后再归纳案例。找项目、日历与材料页可继续查看官方条件。',action:{href:'#routes',label:'先看官方项目条件'}}],note:'刷新后可重试；未载入不表示没有相关经历。'};
  if(!experiences.length)return {label:'经验总览',title:'当前没有可归纳的经验',scope:'0 篇已载入',insights:[],note:'案例准备方法与官方申请规则分别核对。'};
  const citedIds=['grad-europe-tinsir-2025','grad-bjut-mty-2026','grad-ptt-tum-rci-2022','grad-ngaizean-hkustgz-2026','grad-szu-mingkangchen-2025','grad-wangbard-cryptography-phd-2025','grad-robotics-eth-xiang-2022','grad-sustech-yunzx-2023','grad-dcard-ece-ra-phd-2025','grad-dcard-bme-ece-2026','grad-reddit-cs-interviews-2025','grad-xhs-xiga-ra-mphil-2025','grad-gter-chuyeyue-ra-phd-2024','grad-gter-sscomebady-mphil-2018','grad-gter-imhigh-hkust-mphil-2015','grad-drishti-akash-hkust-intern-2023','grad-sustech-lisr-hkust-2025','grad-ruakoyo-hku-interview-2024','grad-shufly-w-hongkong-2024','grad-scut-fengyt-redbird-2023','grad-benjamin-hkustgz-research-2026','grad-zuoyihang-redbird-camp-2022','grad-1p3-c98sd-cuhksz-phd-2026','grad-sustech-luanwd-cuhksz-msds-2021','grad-sustech-dengrb-robotics-2021','grad-zuoduan-westlake-ai4sci-2024'];
  if(!citedIds.every(id=>experiences.some(r=>r.id===id)))return {label:'经验总览',title:'部分归纳依据暂未载入',scope:`当前载入 ${experiences.length} 篇公开自述`,insights:[{title:'先逐篇确认背景与结果',text:'支撑本页概览的部分案例暂未读取，暂不把不完整资料写成整体结论。下方保留已载入案例，可先看各篇的准备方法和适用限制。'}],note:'公开自述不能推导录取概率，申请规则仍以当期官方资料为准。'};
  const pending=experiences.filter(r=>!citedIds.includes(r.id)).length;
  return {label:'综合总结',title:'借鉴准备方法，保留每种结果的边界',scope:pending?`已归纳 ${citedIds.length} 篇公开自述 · 另 ${pending} 篇待综合`:`全页 ${experiences.length} 篇公开自述`,insights:[
   {title:'先拆清单，再排准备顺序',text:'机器人与跨专业申硕案例的共通做法，是先比较课程、培养目标和额外材料，再安排推荐与时间线。SHUFly 的授课硕士与 lisr20 的两季申请还提示，要把补件、推荐安排和本人决定独立记录；选校名单不能照搬。红鸟2022—2023年案例进一步提醒，把条件录取、毕业材料和正式通知分成独立节点。港中深MSDS旧例还要分清入学季；Delft海外参考则把项目与奖学金分别跟进。',action:caseAction(experiences,'grad-robotics-eth-xiang-2022','读机器人项目准备案例')},
   {title:'面试要讲清自己做过什么',text:'RA 后申博、医工跨方向与 CS 面试案例，分别涉及研究报告、论文作业和拓展讨论。港大工程失利的记录补充了研究表达和设备准备；自述失败不能证明单一原因，准备仍以自己的面试邀请为准。Benjamin 的本科科研面试也强调项目实现与个人贡献。2022年红鸟挑战营补充团队与个人答辩；西湖2024年未优营复盘提醒核对PI具体方向，港中深2021年题目只作练习参考。',action:caseAction(experiences,'grad-dcard-ece-ra-phd-2025','读 RA 后申博面试案例')},
   {title:'经历与录取结论分开看',text:'案例包含拒信、候补、资助不合适和未完成申请。HKUST 口头支持未落实、SHUFly 主动放弃也要分别看。RA offer、暑研和学位录取是不同结果；2015 / 2018 年历史 MPhil 案例不证明当季要求。Benjamin 属于本科科研/实习相关经历，没有全职 RA 雇佣或学位录取证据；红鸟旧例的疫情期语言安排不能沿用。港中深2026年申博截至发帖时仍未定，RA谈话不等于合同；新红鸟个案仅为营选参与，Delft仅作海外对照。',action:{expand:'experience-synthesis',label:'查看完整归纳与案例依据'}}
  ],note:'公开自述不是录取率或现行政策；近年机器人 MPhil 正式录取的完整流程、全职 RA 合同与入职细节仍有资料缺口。'};
 }
 return null;
}

function renderAction(action){
 if(!action)return '';
 const label=`${e(action.label)} <span aria-hidden="true">→</span>`;
 if(action.href)return `<a class="overview-action" href="${e(action.href)}">${label}</a>`;
 if(action.kind)return `<button class="overview-action" data-summary-kind="${e(action.kind)}" data-summary-id="${e(action.id)}">${label}</button>`;
 if(action.preset)return `<button class="overview-action" data-overview-preset="${e(action.preset)}">${label}</button>`;
 if(action.expand)return `<button class="overview-action" data-overview-expand="${e(action.expand)}">${label}</button>`;
 return '';
}
export function renderPageOverview(view,catalog,options){
 const model=buildPageOverview(view,catalog,options);if(!model)return '';
 return `${view==='experiences'&&options?.experiences?.length?'<div class="experience-entry"><button type="button" data-experience-find>直接查找经验 ↓</button><span>或先阅读下方综合总结</span></div>':''}<section class="page-overview" data-page-overview="${e(view)}" aria-labelledby="page-overview-title"><div class="overview-heading"><div><p class="overview-kicker">${e(model.label)}</p><h3 id="page-overview-title">${e(model.title)}</h3></div><p class="overview-scope">${e(model.scope)}</p></div><div class="overview-insights">${model.insights.map((insight,i)=>`<section class="overview-insight"><h4><span aria-hidden="true">0${i+1}</span>${e(insight.title)}</h4><p>${e(insight.text)}</p>${renderAction(insight.action)}</section>`).join('')}</div><p class="overview-note">${e(model.note)}</p></section>`;
}
