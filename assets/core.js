// Rank is a display/filter normalization of the recorded title, never eligibility,
// tenure, a supervision entitlement, recruitment capacity, or evidence of new-PI status.
export const rankLabels={professor:'教授',associate:'副教授',assistant:'助理教授',research:'研究系列',other:'其他职衔',unknown:'职级待核实'};
export function rankOf(advisor){
 const raw=typeof advisor.position==='string'?advisor.position.trim():'';
 if(!raw||/未纳入|未核实|待核|unknown|unverified/i.test(raw))return 'unknown';
 const parts=raw.split(/[;；/]/).map(x=>x.trim());
 const primary=parts[0];
 if(parts.slice(1).some(x=>/^(?:Research )?(?:Assistant |Associate )?Professor$/i.test(x)))return 'unknown';
 if(/^(?:Research (?:Assistant |Associate )?Professor|研究(?:助理|副)?教授)$/i.test(primary))return 'research';
 if(/^(?:Assistant Professor|助理教授)$/i.test(primary))return 'assistant';
 if(/^(?:Associate Professor|副教授)$/i.test(primary))return 'associate';
 // This named professorship is explicitly present in the reviewed catalog.
 // Do not generalize arbitrary Chair/Director/PI titles into professor rank.
 if(/^(?:Professor|Tenured Professor|Choh-Ming Li Professor|教授)$/i.test(primary))return 'professor';
 return 'other';
}
export function rankMatches(advisor,filters={}){return !filters.rank||rankOf(advisor)===filters.rank;}
export const institutionNames = {HKUST:'香港科技大学',HKU:'香港大学',CUHK:'香港中文大学',CityU:'香港城市大学',CityUHK:'香港城市大学','CUHK-Shenzhen':'香港中文大学（深圳）',PolyU:'香港理工大学',HKBU:'香港浸会大学','HKUST(GZ)':'香港科技大学（广州）','HKUST-GZ':'香港科技大学（广州）','CUHK(SZ)':'香港中文大学（深圳）','CUHK-SZ':'香港中文大学（深圳）',Westlake:'西湖大学',SUSTech:'南方科技大学',Tsinghua:'清华大学',XJTLU:'西交利物浦大学'};
export const topicRules = [
 ['具身导航',/navigat|导航|interactive_navigation/i],
 ['机器人学习',/reinforcement|imitation|robot learning|robot_learning|强化学习|模仿学习|机器人学习|policy learning|策略学习/i],
 ['移动操作',/loco.?manip|mobile.manip|移动操作|腿式移动|轮足|legged_mobile/i],
 ['全身控制',/whole.body|whole_body|WBC|全身|humanoid|人形/i],
 ['SLAM 与空间感知',/SLAM|mapping|spatial|地图|空间|三维|3D|state.estimat|状态估计/i],
 ['灵巧操作与触觉',/dexter|tactile|manipulation|操作|触觉|grasp|抓取/i],
 ['安全规划与控制',/safe|planning|control|规划|安全|控制/i],
 ['世界模型与 VLA',/world.model|VLA|vision.language.action|世界模型|video.action|foundation|大模型/i]
];
export const textValue = value => value == null ? '' : typeof value === 'string' ? value : typeof value === 'object' ? value.text || value.requirement || value.detail || value.summary || value.note || value.status || JSON.stringify(value) : String(value);
export function escapeHTML(value){return textValue(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export function normalizeSource(source){return typeof source === 'string' ? {label:new URL(source).hostname,url:source}: {label:source.label||source.title||source.name||'官方来源',url:source.url||source.source};}
export function sourcesOf(sources=[]){return (Array.isArray(sources)?sources:[sources]).filter(Boolean).map(s=>{try{return normalizeSource(s)}catch{return {label:'来源',url:null}}}).filter(s=>safeUrl(s.url));}
export function institutionLabel(value){return institutionNames[value]||value||'学校待核';}
export function degreeLabel(route){return /PhD|博士/i.test(route.degree)?'PhD':/MPhil|哲学硕士/i.test(route.degree)?'MPhil':/MSc/i.test(route.degree)?'MSc':/MRes/i.test(route.degree)?'MRes':route.degree;}
export function degreeDisplay(route){return route.nativeDegreeLabel||(route.degree==='MSc'?'硕士项目（MSc类）':route.degree);}
export function isVerifiedRoute(route){return route.status==='verified'&&route.bachelorEligible===true&&route.noTuimianRequired===true&&route.noMasterRequired===true;}
export function routesFor(advisor,catalog){return (advisor.routeIds||[]).map(id=>catalog.routes.find(r=>r.id===id)).filter(Boolean);}
export function hasVerifiedPath(advisor,catalog){return advisor.eligibility==='verified'&&advisor.defaultVisible!==false&&routesFor(advisor,catalog).some(isVerifiedRoute);}
export function themesFor(advisor){const str=[...(advisor.topics||[]),advisor.summary||''].join(' ');return topicRules.filter(([,r])=>r.test(str)).map(([label])=>label);}
export function searchText(advisor,catalog){return [advisor.name,advisor.nameZh,advisor.institution,institutionLabel(advisor.institution),advisor.department,advisor.summary,...(advisor.topics||[]),...themesFor(advisor),...(advisor.works||[]).map(w=>w.title),...routesFor(advisor,catalog).map(r=>r.program)].join(' ').toLowerCase();}
// Public discovery is independent of the original bachelor-entry convenience filter.
// A reference or pending record is readable evidence, not a verified application or vacancy.
export function isBrowsableRoute(route){return !!route?.id&&['MSc','MPhil','PhD','MRes'].includes(route.degree)&&route.opportunityType!=='RA'&&route.kind!=='employment'&&!route.jobId&&!(route.jobIds||[]).length;}
export function isVerifiedAdmissionRoute(route){return isBrowsableRoute(route)&&route.status==='verified'&&route.currentCycleVerificationStatus!=='pending';}
export function hasVerifiedAssociation(advisor,route){
 if(!isVerifiedAdmissionRoute(route)||(advisor.routeIds||[]).includes(route.id)===false)return false;
 return (advisor.routeAssociations||[]).some(a=>a.routeId===route.id&&a.status==='verified'&&(!a.verificationStatus||a.verificationStatus==='verified')&&a.scope!=='program_reference_only'&&sourcesOf(a.sources).length>0);
}
export function browseAdvisors(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase(),degree=filters.opportunityType||filters.degree;
 return (catalog.advisors||[]).filter(a=>{
  if(filters.institution&&a.institution!==filters.institution||!rankMatches(a,filters)||filters.topic&&!themesFor(a).includes(filters.topic))return false;
  if(degree==='RA')return filterOpportunities(catalog,filters).some(o=>o.advisorId===a.id&&o.type==='RA');
  if(degree&&degree!=='RA'&&!routesFor(a,catalog).some(r=>isBrowsableRoute(r)&&degreeLabel(r)===degree))return false;
  if(!openingMatches(a,{...filters,degree}))return false;
  const searchable=[searchText(a,catalog),...(catalog.raPositions||[]).filter(j=>j.advisorId===a.id).map(j=>j.title)].join(' ').toLowerCase();
  return !q||q.split(/\s+/).every(t=>searchable.includes(t));
 }).sort((a,b)=>a.institution.localeCompare(b.institution,'en')||a.name.localeCompare(b.name,'en'));
}
export function browseRoutes(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase(),degree=filters.opportunityType||filters.degree;
 return (catalog.routes||[]).filter(r=>{
  if(!isBrowsableRoute(r)||filters.institution&&r.institution!==filters.institution||degree&&degreeLabel(r)!==degree)return false;
  const related=browseAdvisors(catalog,{...filters,query:'',opportunityType:'',degree:''}).filter(a=>(a.routeIds||[]).includes(r.id));
  if((filters.rank||filters.topic||filters.opening)&&!related.length)return false;
  return !q||[r.institution,institutionLabel(r.institution),r.program,r.department,r.degree,r.eligibilitySummary,r.admissionMethod,r.admissionMode,r.sourceCycle].join(' ').toLowerCase().includes(q)||related.some(a=>searchText(a,catalog).includes(q));
 });
}
export function routeEvidenceText(route){
 const status={verified:'项目依据已核实',reference:'历史或项目参考',unknown:'项目证据待核',pending:'项目证据待核',excluded:'受限或不适用记录：请读原始原因'}[route.status]||'项目证据待核';
 const mode={national_exam:'统考',application:'申请制',application_assessment:'申请考核制',recommendation_exemption:'推荐免试',other:'其他通道',unknown:'招生方式待核'}[route.admissionMode];
 const values=[status,mode,route.sourceCycle?`来源周期：${route.sourceCycle}`:'',route.currentCycleVerificationStatus==='pending'?'当期招生仍待核':''];
 if(route.noTuimianRequired===false)values.push('推免要求或具体路径条件见正文');
 if(route.noMasterRequired===false)values.push('硕士前置或其他学历条件见正文');
 return values.filter(Boolean).join(' · ');
}
export function openingMatches(advisor,filters={}){
 if(!filters.opening)return true;
 if(filters.degree){const row=(advisor.openingDetails||[]).find(o=>o.degree===filters.degree);return row?row.status===filters.opening:filters.opening==='unknown';}
 return (advisor.opening||'unknown')===filters.opening;
}
export function filterAdvisors(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase();
 return catalog.advisors.filter(a=>{
  if(!hasVerifiedPath(a,catalog))return false;
  if(filters.institution&&a.institution!==filters.institution)return false;
  if(!rankMatches(a,filters))return false;
  if(filters.topic&&!themesFor(a).includes(filters.topic))return false;
  if(filters.degree&&!routesFor(a,catalog).some(r=>degreeLabel(r)===filters.degree&&isVerifiedRoute(r)))return false;
  if(!openingMatches(a,filters))return false;
  return !q||q.split(/\s+/).every(t=>searchText(a,catalog).includes(t));
 }).sort((a,b)=>a.institution.localeCompare(b.institution,'en')||a.name.localeCompare(b.name,'en'));
}
export function filterRoutes(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase();
 return catalog.routes.filter(r=>{
  if(!isVerifiedRoute(r))return false;
  if(filters.institution&&r.institution!==filters.institution)return false;
  if((filters.opportunityType||filters.degree)&&degreeLabel(r)!==(filters.opportunityType||filters.degree))return false;
  // All advisor-specific criteria must be true of one eligible linked advisor.
  // A mere association to this route cannot confer eligibility on the advisor.
  const related=catalog.advisors.filter(a=>hasVerifiedPath(a,catalog)&&(a.routeIds||[]).includes(r.id)&&rankMatches(a,filters)&&(!filters.topic||themesFor(a).includes(filters.topic))&&openingMatches(a,{...filters,degree:degreeLabel(r)}));
  if((filters.rank||filters.topic||filters.opening)&&!related.length)return false;
  return !q||[r.institution,institutionLabel(r.institution),r.program,r.department,r.degree,r.eligibilitySummary].join(' ').toLowerCase().includes(q)||related.some(a=>searchText(a,catalog).includes(q));
 });
}
export function deadlineStatus(deadline,checkedDate='2026-10-01'){
 if(deadline.status==='expired'||deadline.status==='closed')return 'expired';
 if(deadline.date&&/^\d{4}-\d{2}-\d{2}/.test(deadline.date)&&deadline.date.slice(0,10)<checkedDate)return 'expired';
 return deadline.status==='open'?'open':'unknown';
}
export function filterDeadlines(catalog,filters={}){
 const routeIds=new Set(browseRoutes(catalog,filters).map(r=>r.id));
 const academic=(catalog.deadlines||[]).filter(d=>{
  if(filters.institution&&d.institution!==filters.institution)return false;
  if(!(d.routeIds||[]).some(id=>routeIds.has(id)))return false;
  if(filters.query&&!([d.title,d.note,institutionLabel(d.institution)].join(' ').toLowerCase().includes(filters.query.toLowerCase())||(d.routeIds||[]).some(id=>routeIds.has(id))))return false;
  return true;
 });
 const jobIds=new Set(filterOpportunities(catalog,filters).filter(o=>o.kind==='employment').map(o=>o.jobId));
 const jobs=(catalog.raPositions||[]).filter(j=>jobIds.has(j.id)).map(j=>({id:`${j.id}-deadline`,title:j.title,institution:j.institution,routeIds:[],jobId:j.id,date:j.currentRecruitment.deadline||null,status:j.currentRecruitment.status==='open'?'open':'unknown',note:`RA 岗位 ${j.jobReference||''}；截止时刻${j.currentRecruitment.deadlineTime||'未公布'}；公开广告不保证剩余额度`,sources:j.currentRecruitment.sources}));
 return [...academic,...jobs].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
}
export function toggleCompare(ids,id,limit=3){if(ids.includes(id))return ids.filter(i=>i!==id);if(ids.length>=limit)return ids;return [...ids,id];}

// A job must carry its own employment evidence; academic admission routes are never a substitute.
export function isVerifiedRaPosition(job){
 const e=job.employmentEligibility||{};const current=job.currentRecruitment||{};
 return job.defaultVisible!==false&&(!current.deadline||!job.checkedDate||current.deadline.slice(0,10)>=job.checkedDate)&&job.opportunityType==='RA'&&job.status==='verified'&&e.bachelorEligible===true&&e.noMasterRequired===true&&e.explicitJobRequirement===true&&sourcesOf(e.sources).length>0&&current.status==='open'&&sourcesOf(current.sources).length>0;
}
// Concurrent 5c27c78 exposes doctoral project references when explicitly requested.
// They are a separate kind, never a verified degree association or a vacancy.
export function buildReferencePhdPaths(catalog){
 const rows=[];
 for(const a of catalog.advisors||[])for(const r of routesFor(a,catalog)){
  if(r.status!=='reference'||r.degree!=='PhD'||!sourcesOf(r.sources).length)continue;
  rows.push({id:`${a.id}::${r.id}`,advisorId:a.id,routeId:r.id,type:'PhD',kind:'reference',reference:true,openingStatus:'unknown'});
 }
 return rows;
}
export function buildOpportunities(catalog,options={}){
 const opportunities=[];
 for(const a of catalog.advisors){
  for(const r of routesFor(a,catalog).filter(r=>hasVerifiedAssociation(a,r))){
   const type=degreeLabel(r);if(!['MSc','MPhil','PhD','MRes'].includes(type))continue;
   opportunities.push({id:`${a.id}::${r.id}`,advisorId:a.id,routeId:r.id,type,kind:'degree',openingStatus:(a.openingDetails||[]).find(o=>o.degree===type)?.status||'unknown'});
  }
 }
 for(const job of catalog.raPositions||[]){
  if(isVerifiedRaPosition(job)&&catalog.advisors.some(a=>a.id===job.advisorId))opportunities.push({id:`${job.advisorId}::RA::${job.id}`,advisorId:job.advisorId,jobId:job.id,type:'RA',kind:'employment',openingStatus:'explicit'});
 }
 return options.includeReferencePhd===true?[...opportunities,...buildReferencePhdPaths(catalog)]:opportunities;
}
export function filterOpportunities(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase();
 return buildOpportunities(catalog,{includeReferencePhd:(filters.opportunityType||filters.degree)==='PhD'}).filter(o=>{
  const a=catalog.advisors.find(a=>a.id===o.advisorId);const type=filters.opportunityType||filters.degree;
  if(type&&o.type!==type)return false;
  if(filters.institution&&a.institution!==filters.institution)return false;
  if(!rankMatches(a,filters))return false;
  if(filters.topic&&!themesFor(a).includes(filters.topic))return false;
  if(filters.opening&&o.openingStatus!==filters.opening)return false;
  const route=catalog.routes.find(r=>r.id===o.routeId);const job=(catalog.raPositions||[]).find(j=>j.id===o.jobId);
  const searchable=[searchText(a,catalog),o.type,route?.program,job?.title].join(' ').toLowerCase();
  return !q||q.split(/\s+/).every(word=>searchable.includes(word));
 }).sort((x,y)=>{const a=catalog.advisors.find(a=>a.id===x.advisorId),b=catalog.advisors.find(a=>a.id===y.advisorId);return a.institution.localeCompare(b.institution,'en')||a.name.localeCompare(b.name,'en')||x.type.localeCompare(y.type,'en')||x.id.localeCompare(y.id,'en');});
}

const readerPhrases = {
  "Not assessed; degree equivalence, academic results, English, graduation timing, supervisor consent, funding and quotas remain individual checks": "学历等值、成绩、英语、毕业时间、导师同意与名额需按个人情况核实",
  "The cited ordinary direct-application route does not list mainland 推免 qualification as a prerequisite; collaborative/partner nomination routes are not included": "此处为普通直接申请通道，不要求内地推免资格；不包含合作院校提名通道",
  "Institution profile indexed official text; direct web fetch returned 403. Lab and PI team page opened successfully; team page says updated 2026-09-19.": "学校档案以官方索引内容核对，正文暂不可访问；实验室与团队主页已核验，团队页更新于 2026-09-19",
  "University entrance page successfully inspected in cloud browser after web extraction errors; MNE department text retrieved by official indexed result": "学校招生要求已核验；机械工程系信息来自官方网页的索引内容",
  "Graduate School page opened successfully; department page's official indexed full text checked but direct web and cloud-browser access failed": "研究生院要求已核验；院系原页暂不可访问，已核对其官方索引全文",
  "not publicly verified": "未核实公开声明",
  "an honours degree or an equivalent qualification": "荣誉学位或同等资格",
  "12 months": "12 个月",
  "not in current CLOVER notice": "当前 CLOVER 公告未提及此学位",
  "programme director; no lab admission guarantee": "担任项目主任，不代表实验室录取或名额保证",
  "publicly advertised": "有公开招募声明",
  "publicly advertised; six-month initial contract in notice": "有公开招募声明；公告注明初始合同为 6 个月",
  "PhD explicit; not MPhil": "明确的是 PhD 招募，MPhil 尚未确认",
  "Fall 2027 explicitly advertised": "明确面向 2027 年秋季招募",
  "several openings explicitly advertised": "公开声明有多个名额",
  "not explicitly specified; evergreen notice only": "仅有常年招募声明，具体入学年份未明确",
  "year-round publicly advertised": "公开常年招募",
  "PolyU MSc dissertation students invited to enquire": "欢迎理大 MSc 学生咨询论文指导",
  "programme supervisor association verified; personal vacancy unverified": "已核实项目导师关联，个人名额尚未确认",
  "current students visible; personal vacancy unverified": "可见在读学生信息，尚未确认新增名额",
  "named programme supervisor; personal new intake not explicitly advertised": "列于项目导师名单，个人本轮招募未明确",
  "RAIDS homepage advertises opportunities; precise MSc programme/supervision arrangement not verified": "RAIDS 主页有招募信息，具体 MSc 项目与指导安排尚未核实",
  "RAIDS homepage advertises opportunities, undated": "RAIDS 主页有招募信息，未注明日期",
  "not stated; 2026/27 news must not be treated as 2027/28 quota": "2027/28 名额未明确；2026/27 公告不能沿用为下一年名额",
  "multiple positions advertised": "公开招募多个名额",
  "dissertation supervision enquiries welcomed; separate from MSc admission": "欢迎咨询论文指导，MSc 入学申请另行办理",
  "DS has 2027/28 programme info, PI quota unknown": "Data Science 已发布 2027/28 项目信息，导师个人名额未知",
  "not available through current DS programme: department explicitly does not consider MPhil applications": "当前 Data Science 项目明确不接受 MPhil 申请",
  "accepting PhD students on official scholar profile": "学校个人档案明确招收 PhD 学生",
  "Current department is Data Science; old Mechanical Engineering newsletter or lab logo is not current affiliation evidence.": "现属 Data Science；旧机械工程系简讯或实验室标志不能证明当前归属",
  "not personally advertised in inspected sources": "尚未核实导师个人招募声明",
  "supervision active; no current vacancy statement found": "有在读指导记录，未找到当前名额声明",
  "MSc programme Sep 2027 confirmed; individual PI openings unknown": "MSc 项目确认于 2027 年 9 月入学，个人指导名额未知",
  "programme leadership only, individual supervision availability unknown": "仅确认项目负责人身份，个人指导名额未知",
  "advertised, with PI-specific prior master's and other requirements": "有招募声明，但导师另要求已有硕士等条件",
  "established faculty; not newly appointed": "已任职教师，无新入职证据",
  "established senior PI": "已长期任职的导师",
  "Assistant Professor from 2023; Research Assistant Professor from 2021": "2023 年起任助理教授；2021 年起曾任研究助理教授",
  "joining date unverified; do not infer new PI from title or 2022 PhD": "入职时间尚未核实，职称与博士毕业年份不足以证明新入职",
  "established lab; RAIDS established 2020; exact institution joining date not verified in inspected institution page": "RAIDS 实验室成立于 2020 年；具体入职日期尚未核实",
  "Not a first-time new PI: lab leader since 2020; PolyU faculty 2020–2023; exact CityU joining date not verified": "2020 年起已带领实验室，2020–2023 年曾任理大教师；具体加入 CityU 的日期尚未核实",
  "Official scholar biography says GAIRLAB leadership since 2023; exact faculty appointment date unverified": "学校履历注明 2023 年起带领 GAIRLAB；具体教师任命日期尚未核实",
  "Official departmental spotlight reports August 2023 joining": "官方院系报道注明于 2023 年 8 月加入",
  "established PI; Associate Professor since 2023": "已任职导师，2023 年起任副教授",
  "CUHK Legged Robot Lab's Fall 2027 recruitment is separately attributed to Yunhui Liu, not automatically to Zhongyu Li.": "CUHK Legged Robot Lab 的 2027 秋季招募属于刘云辉团队，不能归到李钟毓名下",
  "Do not confuse the CUHK robotics PI with a Shanghai Jiao Tong medical-imaging researcher of the same English name.": "此处为 CUHK 机器人方向教师，与上海交通大学的同英文名医学影像研究者不同",
  "No current institutional/PI-homepage 2027 announcement found; an older self-authored social post advertises Fall 2026, which must not be rolled forward": "未核实学校或个人主页的 2027 招募；早期自发社交帖面向 2026 秋季，不能沿用",
  "University verifies year 2025; month October is from PI's public CV. Assistant Professor title alone is not the evidence.；recent appointment verified": "学校确认 2025 年入职；10 月来自本人公开简历，近期入职有据可查",
  "Both streams accept a recognised bachelor's degree, normally at least Second Class Honours, or an honours bachelor's programme with average B or above, or equivalent. Intended discipline must be related. Full-time PhD without research master's: 48 months.": "MPhil 和 PhD 均接受认可本科学历，通常须达到二等荣誉，或荣誉本科平均 B 及以上，或同等资格；学科需相关。未获研究型硕士的全日制 PhD 通常为 48 个月",
  "Relevant engineering/science bachelor's degree, normally Second Class Honours or B average, or recognised equivalent/background specified by programme": "相关工程或理科学士，通常须达到二等荣誉或平均 B；也可按项目规定审核同等资格或相关背景",
  "MPhil: bachelor's Second Class Honours or equivalent. Four-year PhD: First Class Honours bachelor's or equivalent is an alternative to master's. Three-year PhD normally requires research master's and is a separate route.": "MPhil 接受二等荣誉本科或同等资格。四年制 PhD 可凭一等荣誉本科或同等资格申请，无须已有硕士；三年制 PhD 通常要求研究型硕士，是另一条路径",
  "MPhil: bachelor's Second Class Honours or equivalent. Four-year PhD: First Class Honours bachelor's or equivalent is an alternative to master's. The three-year PhD research-master prerequisite does not apply to the four-year bachelor's-entry route.": "MPhil 接受二等荣誉本科或同等资格。四年制 PhD 可凭一等荣誉本科或同等资格申请；三年制 PhD 的研究型硕士前置要求不适用于此本科直入路径",
  "Honours bachelor's in relevant engineering or related science, or equivalent; other relevant qualifications/experience may also be considered": "相关工程或理科荣誉本科，或同等资格；项目也可能考虑其他相关资格与经历",
  "MPhil: relevant bachelor's First or Second Class Honours or equivalent. PhD: First Class Honours bachelor's or equivalent is an alternative to a master's.": "MPhil 接受相关专业一等或二等荣誉本科，或同等资格。PhD 可凭一等荣誉本科或同等资格申请，无须已有硕士",
  "Recognised bachelor's with First Class Honours or equivalent is an explicitly accepted entry route.": "明确接受认可的一等荣誉本科或同等资格",
  "MPhil applications are explicitly not considered by the department": "该系明确不接受 MPhil 申请",
  "MPhil: recognised honours bachelor's, normally First/Second Class, or equivalent. PhD: First Class Honours bachelor's plus research achievement/experience; may initially be admitted to MPhil with progression assessment.": "MPhil 接受认可的荣誉本科，通常须一等或二等，或同等资格。PhD 本科起点要求一等荣誉及研究成果或经历，也可能先录入 MPhil 后通过考核转为 PhD",
  "PI explicitly requires master's degree with dissertation completed before studies, despite university-wide bachelor's-entry PhD route": "虽然学校设本科直申博路径，这位导师仍明确要求入学前完成含学位论文的硕士",
  "PI's official Research Supervision guidelines": "导师本人公开的研究指导要求",
  "No personal MPhil opening confirmed": "未确认导师个人 MPhil 招募",
  "unknown": "待核实",
  "not stated": "未注明",
  "not found": "未找到公开声明",
  "not verified": "未核实",
  "not advertised": "未公开招募",
  "not publicly specified": "未公开明确说明",
  "not publicly stated": "未公开注明",
  "not verified in inspected sources": "现有来源尚未核实",
  "not individually advertised": "未见个人招募声明",
  "not explicitly advertised": "未见明确招募声明",
  "not publicly advertised": "未见公开招募声明",
  "not advertised in inspected sources": "现有来源未见招募声明",
  "no current public statement found": "未找到当前公开声明",
  "no current individual statement found": "未找到当前个人声明",
  "not verified for this programme": "此项目关联尚未核实",
  "not publicly specified for this PI": "这位导师未公开明确说明",
  "not verified in current inspected sources": "现有来源尚未核实",
  "not explicit in inspected current sources": "现有来源尚未明确说明",
  "not explicitly stated": "未明确注明",
  "not personally advertised": "未见个人招募声明",
  "not verified for this PI": "这位导师的关联尚未核实",
  "not publicly confirmed": "未公开确认",
  "not in inspected sources": "现有来源未提及",
  "not in current notice": "当前公告未提及",
  "not separately advertised": "未单独招募",
  "not specifically advertised": "未明确招募",
  "not individually verified": "个人情况尚未核实",
  "not explicitly verified": "尚未明确核实",
  "not verified; do not infer from PhD": "尚未核实，不能从 PhD 招募推断",
  "not separately verified": "尚未单独核实",
  "个人官网明确 actively looking": "个人官网明确招募中",
  "官网同时列 LimX Dynamics Chief Research Scientist，不将企业职位当作 HKU 学位通道": "官网另列 LimX Dynamics 首席研究科学家职务；企业职位与 HKU 学位申请是独立路径",
  "实验室当前主页明确 multiple openings for MPhil students": "实验室当前主页明确招募多名 MPhil 学生",
  "同页明确 multiple openings": "同页明确有多个招募名额",
  "官方系页明确当时作为 Assistant Professor 加入 HKU；当前 Associate Professor": "官方系页注明以助理教授身份加入 HKU，现任副教授",
  "明确 Fall 2027 0–1 openings，local/international；取决于 quota/funding/project needs/screening": "明确面向 2027 秋季招募 0–1 名 MPhil，本地与国际申请人均可；取决于名额、经费、项目需求与筛选",
  "明确 Fall 2027 0–1 openings；与 MPhil 分开": "明确面向 2027 秋季招募 0–1 名 PhD，与 MPhil 名额分开",
  "院系个人页明确欢迎 PhD and MPhil applications；个人 openings 未给 MPhil 年份/名额": "院系个人页明确欢迎 PhD 与 MPhil 申请；个人招募页未注明 MPhil 年份或名额",
  "个人 openings 明确 2027/28 Fall 1–2（funded/self-funded）": "个人招募页明确 2027/28 秋季招募 1–2 名，可为资助或自费形式",
  "正式加入HKUST(GZ)任Assistant Professor；2026晋升Associate Professor": "加入香港科技大学（广州）时任助理教授，2026 年晋升副教授",
  "PI本人主页公开招1–2名Spring2027博士做Perceptive Behavior Foundation Model；尚未核实Fall2027专属名额": "本人主页招募 1–2 名 2027 春季 PhD，研究感知行为基础模型；2027 秋季专属名额未确认",
  "Spring 2027 PhD 明确，Fall 2027 未确认": "2027 春季 PhD 招募明确，2027 秋季未确认",
  "同一PI主页公开RA及visiting student": "同一主页公开招募 RA 与访问学生",
  "EAR Lab公开招Spring2027/Fall2027 PhD，称fully-funded；校级2027规则仍需更新核查": "EAR Lab 公开招募 2027 春季与秋季 PhD，并注明全额资助；校级 2027 规则仍需复核",
  "Current MAE faculty; individual MPhil recruitment not advertised": "现任 MAE 教师，未公开个人 MPhil 招募",
  "MAE faculty association verified, but this lab's recruitment notice does not name MPhil": "已核实 MAE 教师身份，实验室招募公告未提及 MPhil",
  "Department offers MPhil, but individual MPhil supervision/opening not verified": "院系开设 MPhil，但个人指导关联与名额尚未核实",
  "Current MAE faculty verified; the inspected university profile lists ROSE5760 Robot Learning teaching. Named 2027 MPhil/PhD supervision acceptance has not been established.；Programme entry route verified, but current PI-level recruitment/supervision association still needs first-party confirmation": "已核实 MAE 教师身份与机器人学习授课信息；项目本科入口已确认，个人 2027 指导关联与招募仍待核实",
  "teaching association only; no individual supervision opening verified": "仅有授课关联，未核实个人指导名额"
};
export function readerText(value){const text=textValue(value);return readerPhrases[text]||text;}
