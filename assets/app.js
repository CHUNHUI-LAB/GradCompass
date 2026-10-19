import {renderOpportunityComparison} from './opportunity-comparison.js?v=d70e34caddb6';
import {appointmentStatus,appointmentLabels} from './appointments.js?v=e9737c36e453';
import {groupAdvisorResults,renderAdvisorCard,advisorResultCount} from './advisor-cards.js?v=e811f4a03393';
import {renderProjectCard,renderDeadlineTimeline,renderMaterialCard,renderSourceDirectory} from './editorial-views.js?v=a83a5f62dab4';
import {enhanceReader} from './reader.js?v=45a074f571c2';
import {reconcileResults} from './result-dom.js?v=ea6b026bd694';
import {renderProjectComparison,selectProjectComparisonRoutes} from './project-comparison.js?v=be2763ab06c6';
import {renderPageOverview,overviewPresets} from './page-overviews.js?v=36972bf8d29a';
import {normalizeMaterialSupplement} from './material-supplement.js?v=90879fba1512';
import {renderRecordSummary,supervisorAssociationText,sourceAttribution,normalizeProjectSummaries,filterProjectRoutes} from './record-summaries.js?v=038728ffe5cd';
import {normalizeExperiences,renderExperiences,renderExperienceReading,renderExperienceEvidence,renderExperienceResults} from './experiences.js?v=597682e28760';
import {profileMap,profileSummary,renderProfile,renderProfileReferences,renderHomepageRecruitment} from './profiles.js?v=c6ea2bfe3282';
import {nameInitials,rankOf,rankLabels,escapeHTML,readerText,buildOpportunities,filterOpportunities,safeUrl,sourcesOf,institutionLabel,degreeLabel,degreeDisplay,isVerifiedRoute,isBrowsableRoute,hasVerifiedAssociation,routeEvidenceText,browseAdvisors,browseRoutes,routesFor,hasVerifiedPath,themesFor,filterAdvisors,filterRoutes,deadlineStatus,filterDeadlines,toggleCompare,textValue,matchesSearch} from './core.js?v=05f6d8a849dd';
const $=selector=>document.querySelector(selector);
const e=value=>escapeHTML(readerText(value));
const experienceFilters={query:'',collection:''};
let projectCompareIds=[];let projectDifferencesOnly=false;
let experienceRecords=null;let experienceSupplementState='loading';let materialSupplementState='loading';let projectSummaryState='loading';let catalog;let advisorProfiles=new Map;let updateStatus;let currentView='advisors';let activeExperienceId=null;let compareIds=[];let noticeTimer;let activeDetail=null;let pendingDetailClose=null;let detailOriginSerial=0;const closedDetailOrigins=new Set;
let detailReturnFocus=null,detailReturnPending=false;
let profileSupplementState='loading',searchTimer,searchComposing=false,experienceSearchTimer,experienceComposing=false;
let filterDraft=null,filterAnchor=null,filterDialogClosing=false,appBound=false,introPlayed=false;
let opportunityDifferencesOnly=false,comparisonReturnFocus=null,initializing=false;
const viewLabels={advisors:'找导师',routes:'申请项目',deadlines:'截止日期',materials:'申请材料',experiences:'申请经验',sources:'信息来源'};
const viewDescriptions={advisors:'了解导师的研究方向，查看对应学位项目和研究助理岗位。已核实学位关联与岗位单列；暂无已核实关联的导师仍保留研究资料，不表示不招生。',routes:'先了解项目怎样培养、研究什么，再查看招生方式、前置学历、批次、材料和相关导师。MSc、MPhil、PhD 与 RA 聘用分别核对。',deadlines:'查看已公布的申请截止日期、已截止的轮次和待确认的批次；未来截止日期不代表现在已开放申请。',materials:'按项目查看官方材料要求；提交前请核对当期申请系统的完整清单。',experiences:'',sources:'了解信息来源、核验范围与更新状态。'};
const countsLabel={advisors:'条机会',routes:'个学位项目',deadlines:'项日期记录',materials:'组材料要求'};
const emptyFilters=()=>({query:'',institution:'',topic:'',opportunityType:'',opening:'',rank:'',appointment:''});
const viewFilterKeys={advisors:['query','institution','rank','appointment','topic','opportunityType','opening'],routes:['query','institution','opportunityType'],deadlines:['institution'],materials:['query','institution','opportunityType'],experiences:[],sources:[]};
const filterStates=Object.fromEntries(Object.keys(viewFilterKeys).map(view=>[view,emptyFilters()]));
let state=filterStates.advisors;
const openLabel={explicit:'已找到招生说明',unknown:'招生年份或名额待确认',closed:'已明确停止招生'};
const sustechInstitution='SUSTech';
const displayInstitution=value=>value===sustechInstitution?'南方科技大学':institutionLabel(value);
function sourceLinks(items,limit=99){return sourcesOf(items).slice(0,limit).map(s=>`<a class="source-link" href="${e(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${e(s.label==='公开一手来源'||s.label==='官方来源'?new URL(s.url).hostname:s.label)}</a>`).join('');}
function link(url,label){const safe=safeUrl(url);return safe?`<a class="source-link" href="${e(safe)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`:'';}
function badge(status,label){return `<span class="badge ${['verified','unknown','excluded','expired','new'].includes(status)?status:''}">${e(label)}</span>`;}
function appointmentBadge(a){const p=advisorProfiles.get(a.id),status=appointmentStatus(p);return status==='recent'?badge('new',appointmentLabels.recent)+(['early_career','previous_faculty','industry_transition'].includes(p.appointmentReview.careerContext)?badge('',appointmentLabels[p.appointmentReview.careerContext]):''):'';}
function appointmentDateLine(a){const r=advisorProfiles.get(a.id)?.appointmentReview;if(!r)return '';return `<p class="small-note advisor-appointment">本校教研入职：${e(r.dateText||'日期待核实')}${appointmentStatus(advisorProfiles.get(a.id))==='boundary'?' · 五年边界待核':''}</p>`;}
function advisorStatus(a){return hasVerifiedPath(a,catalog)?'verified':a.eligibility==='excluded'?'excluded':'unknown';}
function aName(a){return `${e(a.name)}${a.nameZh&&a.nameZh!==a.name?` <span class="name-zh">${e(a.nameZh)}</span>`:''}`;}
function publicTags(a){const tags=themesFor(a);return (tags.length?tags:(a.topics||[]).map(textValue)).slice(0,5).map(t=>`<span class="tag">${e(t.replaceAll('_',' '))}</span>`).join('');}
function openingBadge(a,type){const item=(a.openingDetails||[]).find(o=>o.degree===type);const status=item?.status||'unknown';return badge(status==='explicit'?'':status==='closed'?'expired':'unknown',openLabel[status]||openLabel.unknown);}
function routePills(a){return [...new Set(routesFor(a,catalog).filter(isVerifiedRoute).map(degreeLabel))].map(t=>badge('verified',t)).join('');}

function requirementsList(requirements){return (requirements||[]).length?`<ul class="requirement-list">${requirements.map(r=>`<li>${e(textValue(r))}${r?.sources?`<div class="link-list">${sourceLinks(r.sources)}</div>`:''}</li>`).join('')}</ul>`:'';}
function routeCard(r){return renderProjectCard(r,{catalog,selectedIds:projectCompareIds});}
function emptyResult(){if(state.opportunityType==='RA'&&currentView==='routes')return `<div class="empty"><h3>RA 是科研岗位，不是学位项目</h3><p>RA 岗位请到「找导师」查看，本页只列学位项目</p><button data-switch="advisors">去找导师，查看 RA 岗位</button></div>`;if(state.opportunityType==='RA'){const hasVerifiedJobs=filterOpportunities(catalog,{opportunityType:'RA'}).length>0;return hasVerifiedJobs?`<div class="empty"><h3>当前筛选下没有匹配的 RA 岗位</h3><p>目录中仍有已核实岗位，可点击上方条件逐项放宽筛选。个人任职资格、工作许可和剩余名额仍需向雇主核对。</p><button data-reset>清空筛选，查看机会</button></div>`:`<div class="empty"><h3>暂无已核实本科可任职的 RA 岗位</h3><p>当前目录只纳入岗位学历与招募状态已核实的记录。未收录不表示没有岗位；笼统的 RA 招募仍保留在导师详情。</p><button data-reset>查看其他机会</button></div>`;}return `<div class="empty"><h3>没有同时满足这些条件的记录</h3><p>${activeFilterEntries().length?'点击上方已选条件可单独移除，或清空筛选重新查找':'可以减少一个筛选条件，或重新搜索研究方向'}</p><button data-reset>重置筛选</button></div>`;}
function renderAdvisors(){
 const groups=groupAdvisorResults(catalog,state);
 const items=groups.map(group=>({key:group.advisor.id,html:renderAdvisorCard(group,{catalog,profiles:advisorProfiles,profileState:profileSupplementState,compareIds})}));
 if(!items.length)items.push({key:'empty',html:emptyResult()});
 reconcileResults($('#view-content'),items,{scope:'advisors',animate:true});
 $('#result-count').textContent=advisorResultCount(groups);
 renderSupplementStatus();
}
function renderRoutes(){
 const records=filterProjectRoutes(catalog,state),all=[...(catalog.projectSummaries?.values()||[])];
 const covered=records.filter(r=>catalog.projectSummaries?.has(r.id)).length;
 const notice=projectSummaryState==='loading'?'项目培养简介正在载入；可先查看基本申请条件。':projectSummaryState==='unavailable'?'项目培养简介暂未载入；基本申请条件与其他页面仍可查看。':`已补充 ${all.length} 个项目、${new Set(all.map(r=>r.institution)).size} 所学校的培养简介；当前结果中 ${covered} 个有简介。${projectSummaryState==='partial'?' 部分简介未能验证。':''} 其余项目仍展示基本条件，不表示没有相应研究方向。`;
 const items=[{key:'coverage',html:`<p class="small-note projects-intro">${e(notice)}</p>`},...records.map(r=>({key:r.id,html:routeCard(r)}))];
 if(!records.length)items.push({key:'empty',html:emptyResult()});
 reconcileResults($('#view-content'),items,{scope:'routes',animate:true});setCount(records.length);renderSupplementStatus();
}
function renderDeadlines(){
 const records=filterDeadlines(catalog,state);
 $('#view-content').innerHTML=records.length?renderDeadlineTimeline(records,{catalog}):emptyResult();
 setCount(records.length);
}
function materialMatches(m){if(state.institution&&m.institution!==state.institution)return false;const ids=new Set(browseRoutes(catalog,{...state,query:''}).map(r=>r.id));if(m.routeIds?.length&&!m.routeIds.some(id=>ids.has(id)))return false;if(!m.routeIds?.some(id=>ids.has(id)))return false;if(state.query&&!matchesSearch(JSON.stringify([m.title,m.requirements,m.items,m.note,displayInstitution(m.institution)]),state.query))return false;return true;}
function materialCard(m){return renderMaterialCard(m,{catalog});}
function renderMaterials(){
 const records=(catalog.materials||[]).filter(materialMatches),schools=new Set((catalog.materials||[]).map(m=>m.institution));
 const coverage=schools.size===1?`目前独立材料记录仅覆盖${displayInstitution([...schools][0])}，其他学校的材料清单尚待补充。`:'独立材料记录仍不完整，未列出不代表该校无需提交材料。';
 const prefix=materialSupplementState==='loading'?'补充材料资料正在载入，可先查看现有记录。 ':materialSupplementState==='unavailable'?'补充材料资料暂未载入，以下为当前可读取的记录。 ':materialSupplementState==='partial'?'部分补充材料记录未能验证，以下为当前可读取的记录。 ':'';
 const items=[{key:'coverage',html:`<p class="small-note materials-intro">${e(prefix+coverage)} 这里只列入已核实的官方要求；各项目完整清单仍以申请系统及当期指南为准</p>`},...records.map(m=>({key:m.id,html:materialCard(m)}))];
 if(!records.length)items.push({key:'empty',html:state.opportunityType==='RA'?'<div class="empty"><h3>RA 岗位材料清单尚待核对</h3><p>RA 是工作岗位，不能套用学位项目的材料清单。具体文件要求请查看岗位说明及申请系统。</p><button data-switch="advisors">去找导师，查看 RA 岗位</button></div>':'<div class="empty"><h3>该筛选下暂无独立材料清单</h3><p>已核实的学历、英语等申请条件请到「申请项目」查看，并核对官方项目原文。</p><button data-switch="routes">查看申请项目</button></div>'});
 reconcileResults($('#view-content'),items,{scope:'materials',animate:true});setCount(records.length);renderSupplementStatus();
}
function parseDetailLocation(){
 const match=location.hash.match(/^#(advisors|routes|deadlines|materials)\/summary\/(project|deadline|material|advisor)\/([^/]+)$/);
 if(!match)return null;try{return{view:match[1],kind:match[2],id:decodeURIComponent(match[3])};}catch{return null;}
}
function updateDetailBack(){const state=window.history?.state||{},depth=state.gradDetailDepth||0;$('#detail-back').textContent=(depth>1||(depth>0&&state.gradDetailHasList===false))?'← 返回上一条摘要':'← 返回结果';}
// Store semantic identity, not a DOM node: late supplements replace card actions.
function captureDetailOpener(){
 const focused=document.activeElement,key=detailFocusKey(focused);
 for(const scope of ['#view-content','#page-overview']){
  const controls=[...($(scope).querySelectorAll?.('a,button,[tabindex]')||[])];
  if(key&&controls.includes(focused))return{view:currentView,scope,key,index:controls.filter(node=>detailFocusKey(node)===key).indexOf(focused)};
 }
 return{view:currentView};
}
// Only an actual list return may move focus; nested/read-only refreshes must not.
function restoreDetailOpener(view){
 if(!detailReturnPending)return;detailReturnPending=false;
 if(view!==detailReturnFocus?.view||parseDetailLocation()||parseCompareLocation()||$('#detail-dialog').open||$('#compare-dialog').open)return;
 const saved=detailReturnFocus,controls=saved.scope?[...($(saved.scope).querySelectorAll?.('a,button,[tabindex]')||[])]:[];
 const target=controls.filter(node=>detailFocusKey(node)===saved.key)[saved.index];
 focusDetailControl(target||$('#results-title'));
}
function pushDetailRoute(kind,id){
 const hash='#'+currentView+'/summary/'+kind+'/'+encodeURIComponent(id);if(location.hash===hash)return;
 const prior=parseDetailLocation(),old=window.history?.state||{};if(!prior)detailReturnFocus=captureDetailOpener();detailReturnPending=false;const depth=prior&&prior.view===currentView?(old.gradDetailDepth||0)+1:1;
 if(prior&&!old.gradDetailOrigin&&old.gradDetailHasList!==true&&window.history?.replaceState){Object.assign(old,{gradDetailDepth:0,gradDetailBase:currentView,gradDetailHasList:false,gradDetailOrigin:Date.now()+':'+(++detailOriginSerial)});window.history.replaceState(old,'',location.hash);}
 const next={...old,gradDetailOpener:detailReturnFocus,gradDetailDepth:depth,gradDetailBase:currentView,gradDetailHasList:prior?(old.gradDetailHasList??false):true,gradDetailOrigin:prior?(old.gradDetailOrigin||Date.now()+':'+(++detailOriginSerial)):null};
 if(window.history?.pushState)window.history.pushState(next,'',hash);else location.hash=hash;
}
function dismissDetail(){
 const route=parseDetailLocation(),depth=window.history?.state?.gradDetailDepth||0;detailReturnPending=!!route;$('#detail-dialog').close();
 if(!route)return;
 if(window.history?.state?.gradDetailHasList===false){closedDetailOrigins.add(window.history.state.gradDetailOrigin);window.history.replaceState({...window.history.state,gradDetailHasList:true},'',location.hash);if(depth>0)pendingDetailClose=route.view;}
 if(depth>0&&window.history?.go){window.history.go(-depth);return;}
 const hash='#'+route.view;if(window.history?.replaceState)window.history.replaceState(null,'',hash);else location.hash=hash;restoreDetailOpener(route.view);
}
// Reading position is per browser-history entry, never persisted across sessions.
let experienceRestoreSerial=0,experienceRestoring=false,experienceEntrySerial=0,activeExperienceEntryKey=null;const experiencePositions=new Map;
function saveExperiencePosition(id=null,persist=true){
 if(currentView!=='experiences'||experienceRestoring||!window.history?.replaceState)return null;
 const hash=activeExperienceId===null?'#experiences':'#experiences/'+encodeURIComponent(activeExperienceId);
 if(location.hash!==hash)return null;
 const previous=window.history.state||{},prior=experiencePositions.get(previous.gradExperienceKey)||previous.gradExperiencePosition;
 const position={hash,id:id||prior?.id||activeExperienceId,y:Number.isFinite(window.scrollY)?window.scrollY:0,synthesisOpen:!!$('#experience-synthesis')?.open,filters:{...experienceFilters}};
 if(previous.gradExperienceKey)experiencePositions.set(previous.gradExperienceKey,position);
 if(persist)window.history.replaceState({...previous,gradExperiencePosition:position},'',hash);return position;
}
function restoreExperiencePosition(fallbackId=null){
 const serial=++experienceRestoreSerial,hash=location.hash;
 let entry=window.history?.state||{};
 if(!entry.gradExperienceKey&&window.history?.replaceState){entry={...entry,gradExperienceKey:Date.now()+':'+(++experienceEntrySerial)};window.history.replaceState(entry,'',hash);}
 activeExperienceEntryKey=entry.gradExperienceKey;
 let saved=experiencePositions.get(entry.gradExperienceKey)||entry.gradExperiencePosition;
 if(!saved&&activeExperienceId===null&&entry.gradExperienceKey){saved={hash,id:null,y:Number.isFinite(window.scrollY)?window.scrollY:0,synthesisOpen:false,filters:{...experienceFilters}};experiencePositions.set(entry.gradExperienceKey,saved);if(window.history?.replaceState)window.history.replaceState({...entry,gradExperiencePosition:saved},'',hash);}
 experienceRestoring=true;
 const restore=()=>{
  if(serial!==experienceRestoreSerial||location.hash!==hash)return;
  if(currentView!=='experiences'){experienceRestoring=false;return;}
  const position=saved?.hash===hash?saved:null;
  if(activeExperienceId===null){
   const synthesis=$('#experience-synthesis');if(synthesis&&position?.synthesisOpen)synthesis.open=true;
   const id=position?.id||fallbackId;
   const card=[...document.querySelectorAll('.experience-card')].find(card=>card.dataset.experienceId===id);
   const target=card?.querySelector('.experience-read-link');
   if(target){
    target.focus?.({preventScroll:true});
    if(Number.isFinite(position?.y)&&position.y>=0)window.scrollTo?.({top:position.y,behavior:'instant'});
    const rect=target.getBoundingClientRect?.();
    if(!position||!Number.isFinite(position.y)||!rect||rect.top<100||rect.bottom>window.innerHeight)target.scrollIntoView?.({block:'center',behavior:'instant'});
   }else if(id){$('#results-title').focus?.({preventScroll:true});$('#results').scrollIntoView?.({block:'start',behavior:'instant'});}
  }else{
   $('#results-title').focus?.({preventScroll:true});
   if(Number.isFinite(position?.y)&&position.y>=0)window.scrollTo?.({top:position.y,behavior:'instant'});
   else $('#results').scrollIntoView?.({block:'start',behavior:'instant'});
  }
  experienceRestoring=false;
 };
 // Run after native history restoration; newer navigation cancels stale callbacks.
 if(window.requestAnimationFrame)window.requestAnimationFrame(()=>window.requestAnimationFrame(restore));else restore();
}
function navigateExperience(evt){
 const anchor=evt.target.closest('a[href]'),hash=anchor?.getAttribute?.('href');
 if(!hash||!/^#experiences(?:\/[^/]+)?$/.test(hash)||evt.defaultPrevented||evt.button>0||evt.metaKey||evt.ctrlKey||evt.shiftKey||evt.altKey||anchor.target==='_blank'||anchor.hasAttribute?.('download')||!window.history?.pushState)return false;
 if(hash===location.hash){evt.preventDefault();return true;}
 let id=null;try{id=hash.startsWith('#experiences/')?decodeURIComponent(hash.slice(13)):null;}catch{}
 const leaving=activeExperienceId,position=saveExperiencePosition(id);
 const origin=currentView==='experiences'&&leaving===null?position:window.history.state?.gradExperienceReturn;
 const next={};
 if(id!==null&&origin)next.gradExperienceReturn=origin;
 if(hash==='#experiences'&&currentView==='experiences'&&leaving!==null){
  next.gradExperiencePosition=origin?.id===leaving?{...origin,hash}: {hash,id:leaving,y:null};
 }
 evt.preventDefault();window.history.pushState(next,'',hash);routeLocation();return true;
}
function routeLocation(){
 const comparison=parseCompareLocation();if(comparison){detailReturnPending=false;if($('#detail-dialog').open)$('#detail-dialog').close();if(currentView!=='routes')switchView('routes');projectCompareIds=selectProjectComparisonRoutes(catalog,comparison).map(r=>r.id);updateTray();if(projectCompareIds.length>=2)openProjectCompare(true);else{$('#compare-content').innerHTML=renderProjectComparison(catalog,projectCompareIds);if(!$('#compare-dialog').open)$('#compare-dialog').showModal();}return;}if($('#compare-dialog').open)$('#compare-dialog').close();
 const experienceHash=activeExperienceId===null?'#experiences':'#experiences/'+encodeURIComponent(activeExperienceId);
 if(currentView==='experiences'&&location.hash===experienceHash&&window.history?.state?.gradExperienceKey===activeExperienceEntryKey)return;
 if(pendingDetailClose){const view=pendingDetailClose;pendingDetailClose=null;window.history.replaceState(null,'','#'+view);if($('#detail-dialog').open)$('#detail-dialog').close();if(currentView!==view)switchView(view);restoreDetailOpener(view);return;}
 const route=parseDetailLocation();if(!route){const view=location.hash.slice(1)||'advisors';if($('#detail-dialog').open)detailReturnPending=true;if(view===currentView&&activeExperienceId===null&&currentView!=='experiences'){if($('#detail-dialog').open)$('#detail-dialog').close();restoreDetailOpener(view);return;}switchView(view);restoreDetailOpener(view);return;}
 const historyState=window.history?.state;detailReturnFocus=historyState?.gradDetailOpener||{view:route.view};detailReturnPending=false;if(historyState?.gradDetailHasList===false&&closedDetailOrigins.has(historyState.gradDetailOrigin))window.history.replaceState({...historyState,gradDetailHasList:true},'',location.hash);
 if(currentView!==route.view)switchView(route.view);
 if(route.kind==='advisor')openDetail(route.id,true);else openSummary(route.kind,route.id,true);
}
// Native focus can scroll a tall heading behind the sticky reader toolbar.
// Focus without scrolling, then reset after showModal/autofocus has completed.
function focusDetailControl(target){try{target?.focus?.({preventScroll:true});}catch{target?.focus?.();}}
function presentDetail(resetPosition=true){
 enhanceReader($('#detail-content'));
 const dialog=$('#detail-dialog');if(!dialog.open)dialog.showModal();$('#active-filters').hidden=true;
 if(resetPosition){focusDetailControl($('#detail-title'));dialog.scrollTop=0;}
}
function detailFocusKey(target){
 if(target?.id)return 'id:'+target.id;
 if(target?.dataset?.readingSection)return 'section:'+target.dataset.readingSection+':'+target.dataset.readingOrigin;
 if(target?.dataset?.summaryKind&&target.dataset.summaryId)return 'summary:'+target.dataset.summaryKind+':'+target.dataset.summaryId;
 if(target?.dataset?.detail)return 'advisor:'+target.dataset.detail;
 if(target?.dataset?.close)return 'close:'+target.dataset.close;
 const href=target?.getAttribute?.('href');return href?'href:'+href:null;
}
function showMissingDetail(kind,refresh=false){
 const labels={project:'项目',advisor:'导师或岗位',deadline:'日期',material:'材料'};
 if($('#compare-dialog').open)$('#compare-dialog').close();activeDetail=null;updateDetailBack();
 $('#detail-kind').textContent='记录暂不可用';
 $('#detail-content').innerHTML=`<div class="reading-layout"><article class="reading-main"><h2 id="detail-title" class="detail-title" tabindex="-1">未找到这条${e(labels[kind]||'')}记录</h2><div class="empty"><p>这个链接对应的记录不存在或已不在当前资料中。请返回列表重新选择；当前筛选条件会保留。</p><button type="button" data-close="detail-dialog">返回结果</button></div></article></div>`;
 presentDetail(!refresh);
}
function openSummary(kind,id,replay=false,refresh=false){const records=kind==='project'?catalog.routes.filter(isBrowsableRoute):kind==='deadline'?filterDeadlines(catalog):kind==='material'?(catalog.materials||[]):[];const record=records.find(r=>r.id===id);const summary=renderRecordSummary(kind,record,catalog);if(!summary){if(replay)showMissingDetail(kind,refresh);return;}if($('#compare-dialog').open)$('#compare-dialog').close();if(!replay)pushDetailRoute(kind,id);updateDetailBack();$('#detail-kind').textContent=summary.label;const rail=`<section class="rail-panel"><h3>${kind==='project'?'项目信息':kind==='deadline'?'日期阅读提示':'准备前核对'}</h3><dl class="fact-grid"><dt>学校</dt><dd>${e(displayInstitution(record.institution))}</dd>${record.degree?`<dt>学位类型</dt><dd>${e(degreeDisplay(record))}</dd>`:''}<dt>核验日期</dt><dd>${e(record.checkedDate||catalog.metadata.checkedDate)}</dd></dl><p>${kind==='project'?'项目资格、个人条件、导师名额与资助需分别核实。':kind==='deadline'?'账户注册、申请提交、推荐信与补充材料可能有独立截止；未记录的时间不作推断。':'材料名称、格式、语言和提交方式请以当期申请系统为准。'}</p></section><section class="rail-panel"><h3>原始来源</h3>${sourceLinks(record.sources,3)}<p class="small-note">完整依据、来源日期及适用限制保留在正文。</p></section>`;$('#detail-content').innerHTML=`<div class="reading-layout"><article class="reading-main" data-reading-kind="${e(kind)}">${summary.html}</article><aside class="reading-rail" aria-label="关键信息与来源">${rail}</aside></div>`;presentDetail(!refresh);}
function renderSources(){$('#result-count').textContent='核验边界、官方入口与更新状态';$('#view-content').innerHTML=renderSourceDirectory(updateStatus,catalog);}
function renderExperienceView(){renderSupplementStatus();if(experienceSupplementState==='loading'){$('#view-content').innerHTML=`${activeExperienceId!==null?'<a class="experience-back" href="#experiences">← 返回经验列表</a>':''}<div class="empty"><h3>经验资料正在载入</h3><p>可先浏览找导师、找项目等页面，资料载入后会自动显示。</p></div>`;$('#result-count').textContent='经验资料正在载入';return;}const result=activeExperienceId!==null?renderExperienceReading(experienceRecords,activeExperienceId):renderExperiences(experienceRecords,experienceFilters);$('#view-content').innerHTML=result.html;$('#result-count').textContent=result.countLabel;if(activeExperienceId!==null)$('#results-title').textContent=result.title;}
function refreshExperienceResults(){
 const result=renderExperienceResults(experienceRecords,experienceFilters);
 $('#experience-results').innerHTML=result.html;
 $('#experience-result-status').textContent=result.countLabel;
 $('#result-count').textContent=result.countLabel;
 for(const button of document.querySelectorAll('.experience-controls [data-experience-reset]'))button.disabled=!(experienceFilters.query.trim()||experienceFilters.collection);
 saveExperiencePosition();
}
function flushExperienceSearch(){
 clearTimeout(experienceSearchTimer);
 if(currentView!=='experiences'||activeExperienceId!==null||!$('#experience-search'))return;
 experienceFilters.query=$('#experience-search').value;refreshExperienceResults();
}
function queueExperienceSearch(evt){
 if(currentView!=='experiences'||activeExperienceId!==null||evt.target.id!=='experience-search'||experienceComposing||evt.isComposing)return;
 experienceFilters.query=evt.target.value;clearTimeout(experienceSearchTimer);
 experienceSearchTimer=setTimeout(()=>{if(currentView==='experiences'&&activeExperienceId===null)refreshExperienceResults();},120);
}
function bindExperienceTools(){
 document.addEventListener('input',queueExperienceSearch);
 document.addEventListener('compositionstart',evt=>{if(evt.target.id==='experience-search'){experienceComposing=true;clearTimeout(experienceSearchTimer);}});
 document.addEventListener('compositionend',evt=>{if(evt.target.id==='experience-search'){experienceComposing=false;queueExperienceSearch(evt);}});
 document.addEventListener('change',evt=>{if(currentView==='experiences'&&activeExperienceId===null&&evt.target.id==='experience-collection'){clearTimeout(experienceSearchTimer);experienceFilters.collection=['bachelor','cross-background'].includes(evt.target.value)?evt.target.value:'';refreshExperienceResults();}});
}
function setCount(n){$('#result-count').textContent=`${n} ${countsLabel[currentView]||'条记录'}`;}
function syncFilterValues(filters=state){for(const [id,key] of [['search','query'],['institution-filter','institution'],['rank-filter','rank'],['appointment-filter','appointment'],['topic-filter','topic'],['opportunity-filter','opportunityType'],['opening-filter','opening']]){if(id==='search'&&searchComposing)continue;$('#'+id).value=filters[key];}}
// Summarize only this page's supported controls; labels come from the visible option.
const filterControls={query:'search',institution:'institution-filter',rank:'rank-filter',appointment:'appointment-filter',topic:'topic-filter',opportunityType:'opportunity-filter',opening:'opening-filter'};
let activeFilterMarkup='';
function activeFilterEntries(){
 const labels={query:'关键词',institution:'学校',rank:'导师职级',appointment:'入职时间',topic:'研究方向',opportunityType:currentView==='materials'?'适用学位':currentView==='routes'?'学位类型':'申请类型',opening:state.opportunityType==='RA'?'招聘信息':'招生信息'};
 return viewFilterKeys[currentView].filter(key=>state[key]).map(key=>({key,label:labels[key],value:key==='query'?state[key]:[...($('#'+filterControls[key]).options||[])].find(option=>option.value===state[key])?.textContent||state[key]}));
}
function renderActiveFilters(){
 const container=$('#active-filters'),entries=activeFilterEntries();
 const html=entries.length?`<span class="active-filter-label">筛选 ${entries.length} 项</span>${entries.map(({key,label,value})=>`<button type="button" class="filter-chip" data-remove-filter="${key}" aria-label="${escapeHTML(`移除${label}筛选：${value}`)}"><span>${escapeHTML(label)}：${escapeHTML(value)}</span><span class="filter-chip-remove" aria-hidden="true">×</span></button>`).join('')}<button type="button" class="text-button filter-clear" data-clear-filters>清空筛选</button>`:'';
 // Keep unchanged chip nodes (and their keyboard focus) during unrelated renders.
 if(html!==activeFilterMarkup){container.innerHTML=html;activeFilterMarkup=html;}
 container.hidden=!entries.length||!!$('#detail-dialog').open;
}
function focusVisibleFilter(){const keys=viewFilterKeys[currentView];const selector=keys.includes('query')?'#search':keys.includes('institution')?(window.innerWidth<1024?'#mobile-filter-toggle':'#institution-filter'):null;if(selector)$(selector)?.focus({preventScroll:true});}
function changeActiveFilter(evt){
 const chip=evt.target.closest('[data-remove-filter]'),clear=evt.target.closest('[data-clear-filters]');
 if(!chip&&!clear)return;
 const entries=activeFilterEntries(),index=chip?entries.findIndex(entry=>entry.key===chip.dataset.removeFilter):-1;
 if(chip&&index<0)return;
 clearTimeout(searchTimer);if(chip){state[entries[index].key]='';syncFilterValues();updateFilterLabels();renderResults();}else reset();
 // Only an explicit removal moves focus; typing and native selects never do.
 const remaining=activeFilterEntries(),next=chip&&remaining[Math.min(index,remaining.length-1)];
 const target=next?$('#active-filters').querySelector(`[data-remove-filter="${next.key}"]`):$(viewFilterKeys[currentView].includes('query')?'#search':window.innerWidth<1024?'#mobile-filter-toggle':'#institution-filter');
 target?.focus({preventScroll:true});
}
function configureFilters(){
 const keys=viewFilterKeys[currentView],working=filterDraft||state;
 $('.advanced-filters').hidden=!keys.includes('rank')&&!keys.includes('opening');
 $('.filters').hidden=!keys.length;$('.search-surface').hidden=!keys.includes('query');
 $('.workspace').classList.toggle('sources-view',!keys.length);
 for(const [id,key] of [['institution','institution'],['rank','rank'],['appointment','appointment'],['topic','topic'],['opportunity','opportunityType'],['opening','opening']])$('#'+id+'-filter-label').hidden=!keys.includes(key);
 $('#rank-filter-note').hidden=!keys.includes('rank');$('#appointment-filter-note').hidden=!keys.includes('appointment');
 $('#appointment-filter').disabled=advisorProfiles.size===0;
 $('#appointment-filter').setAttribute('aria-describedby','appointment-filter-note');
 $('#appointment-filter-note').textContent=(profileSupplementState==='loading'?'任职资料载入中，完成后可筛选。 ':profileSupplementState==='unavailable'?'任职资料暂未载入，可在结果区重试。 ':'')+'截至 2026-10-19，窗口为 2021-10-19 至 2026-10-19。按本校教研首次任职筛选；教研职业早期线索不等于年龄或博士名额已确认。';
 $('#opportunity-filter-note').hidden=currentView!=='advisors';$('#opening-filter-note').hidden=!keys.includes('opening');
 $('#filter-title').textContent={advisors:'筛选导师',routes:'筛选项目',deadlines:'筛选学校',materials:'筛选材料'}[currentView]||'筛选';
 $('#opportunity-filter-name').textContent=currentView==='materials'?'适用学位':currentView==='routes'?'学位类型':'申请类型';
 const labels={RA:'RA · 研究助理',MSc:'MSc · 硕士项目',MPhil:'MPhil · 研究型硕士',PhD:'PhD · 博士'};
 const types=currentView==='advisors'?['RA','MSc','MPhil','PhD']:['MSc','MPhil','PhD'];
 $('#opportunity-filter').innerHTML=`<option value="">${currentView==='advisors'?'全部申请类型':'全部学位'}</option>`+types.map(value=>`<option value="${value}">${labels[value]}</option>`).join('');
 $('#search').placeholder={advisors:'搜索导师、学校或研究方向…',routes:'搜索项目、方向或申请条件…',materials:'搜索材料名称或要求…'}[currentView]||'';
 $('#search-label').textContent={advisors:'搜索导师、学校或研究方向',routes:'搜索项目名称、研究方向或申请条件',materials:'搜索材料名称或要求'}[currentView]||'搜索';
 updateFilterLabels(working);syncFilterValues(working);updateMobileFilterSummary();
}
const guideLabels={advisors:'先了解研究，再核对机会',routes:'培养方式与申请入口',deadlines:'如何理解截止日期',materials:'按项目核对准备清单',experiences:'如何参考他人的申请经历'};
function renderOverview(){
 const container=$('#page-overview');
 const overview=activeExperienceId===null?renderPageOverview(currentView,catalog,{experiences:experienceRecords,projectSummaryState,materialSupplementState}):'';
 const evidence=currentView==='experiences'&&activeExperienceId===null?renderExperienceEvidence(experienceRecords):'';
 const open=container.querySelector?.('.guide-disclosure')?.open;
 const html=overview||evidence?`<details class="guide-disclosure" data-disclosure-key="guide-${currentView}"${open?' open':''}><summary><span>${e(guideLabels[currentView]||'如何使用')}</span><span class="guide-hint">阅读指南</span></summary><div class="guide-content"><p class="small-note">${e(viewDescriptions[currentView])}</p>${overview}${evidence}</div></details>`:'';
 if(container.innerHTML!==html)container.innerHTML=html;
 container.hidden=!html;
}
function renderResults(){
 if(!catalog)return;
 $('#results-title').textContent=viewLabels[currentView];
 renderActiveFilters();
 ({advisors:renderAdvisors,routes:renderRoutes,deadlines:renderDeadlines,materials:renderMaterials,experiences:renderExperienceView,sources:renderSources}[currentView])();
 updateTray();updateMobileFilterSummary();
}
function updateNavigationIndicator(){
 const nav=$('#primary-nav'),active=nav?.querySelector?.('a[aria-current="page"]');
 if(!nav?.getBoundingClientRect||!active?.getBoundingClientRect)return;
 const box=nav.getBoundingClientRect(),item=active.getBoundingClientRect();
 nav.style.setProperty('--nav-x',`${item.left-box.left}px`);nav.style.setProperty('--nav-width',`${item.width}px`);
}
function render(){
 if(!catalog)return;
 $('main').setAttribute('data-current-view',currentView);renderOverview();configureFilters();
 $('#view-description').textContent=viewDescriptions[currentView];$('#view-description').hidden=true;
 $('#results-note').hidden=currentView!=='advisors';
 $('.intro').hidden=activeExperienceId!==null;
 $('.workspace').classList.toggle('experience-workspace',currentView==='experiences');
 const titles={advisors:'找到适合你的研究方向',routes:'选择下一段研究旅程',deadlines:'让每一步，都有时间准备',materials:'从一份清晰的材料清单开始',experiences:'从他人的经历，找到下一步',sources:'让每一条信息，有据可查'};
 const descriptions={advisors:'研究方向、导师与申请机会，一处梳理。',routes:'了解培养方式与申请条件，比较适合你的学位项目。',deadlines:'按入学季与批次核对日期，保留原始时刻和时区。',materials:'按学校与项目查阅要求，明确必交、条件性和待确认项。',experiences:'阅读真实申请经历，结合背景与年份理解每一种结果。',sources:'官方规则、导师公告与个人经验，各自保留判断边界。'};
 $('#page-title').textContent=titles[currentView];$('#page-description').textContent=descriptions[currentView];
 for(const el of document.querySelectorAll('[data-view]')){if(el.dataset.view===currentView)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}
 $('#supplement-status').hidden=true;
 renderResults();document.title=$('#results-title').textContent+' · GradCompass';updateNavigationIndicator();
 if(!introPlayed){introPlayed=true;$('.intro').classList.toggle('is-intro-play',true);setTimeout(()=>$('.intro').classList.toggle('is-intro-play',false),1000);}
}
function flushSearch(){
 clearTimeout(searchTimer);
 if(!viewFilterKeys[currentView].includes('query')||searchComposing)return;
 state.query=$('#search').value;renderResults();
}
function queueSearch(evt){
 if(!viewFilterKeys[currentView].includes('query')||searchComposing||evt.isComposing)return;
 state.query=evt.target.value;clearTimeout(searchTimer);
 const view=currentView;searchTimer=setTimeout(()=>{if(currentView===view)renderResults();},120);
}
function updateMobileFilterSummary(){
 const count=viewFilterKeys[currentView].filter(key=>key!=='query'&&state[key]).length;
 const button=$('#mobile-filter-toggle');if(!button)return;
 button.hidden=!viewFilterKeys[currentView].length;
 $('#mobile-filter-count').textContent=count?String(count):'';$('#mobile-filter-count').hidden=!count;
 button.setAttribute('aria-label',count?`筛选，已选 ${count} 项条件`:'筛选');
 const toolbar=$('.mobile-filter-toolbar');if(toolbar)toolbar.hidden=!viewFilterKeys[currentView].length;
 if(filterDraft)updateFilterDraftCount();
}
function updateFilterDraftCount(){
 if(!filterDraft)return;
 let count=0,unit='条记录';
 if(currentView==='advisors'){count=browseAdvisors(catalog,filterDraft).length;unit='位导师';}
 else if(currentView==='routes'){count=filterProjectRoutes(catalog,filterDraft).length;unit='个项目';}
 else if(currentView==='deadlines'){count=filterDeadlines(catalog,filterDraft).length;unit='项日期';}
 else if(currentView==='materials'){const saved=state;try{state=filterDraft;count=(catalog.materials||[]).filter(materialMatches).length;}finally{state=saved;}unit='组材料';}
 const countText=`${count} ${unit}`;$('#filter-draft-count').textContent=`匹配 ${countText}`;$('#filter-apply').textContent=`查看 ${countText}`;
}
function openFilterSheet(){
 if(filterDraft||!viewFilterKeys[currentView].length||!document.createComment)return;
 flushSearch();filterDraft={...state};
 const filters=$('.filters'),dialog=$('#filter-dialog'),host=$('.filter-sheet-body');
 filterAnchor=document.createComment('filter sidebar');filters.parentNode.insertBefore(filterAnchor,filters);host.appendChild(filters);
 $('#filter-dialog-title').textContent=$('#filter-title').textContent;
 syncFilterValues(filterDraft);updateFilterLabels(filterDraft);updateFilterDraftCount();
 dialog.showModal();$('#mobile-filter-toggle').setAttribute('aria-expanded','true');$('#institution-filter').focus({preventScroll:true});
}
function closeFilterSheet(apply=false,restoreFocus=true){
 if(!filterDraft||filterDialogClosing)return;
 filterDialogClosing=true;
 const dialog=$('#filter-dialog');
 if(apply)Object.assign(state,filterDraft);
 filterDraft=null;
 if(dialog.open)dialog.close();
 if(filterAnchor?.parentNode){filterAnchor.parentNode.insertBefore($('.filters'),filterAnchor);filterAnchor.remove();}
 filterAnchor=null;filterDialogClosing=false;
 syncFilterValues();updateFilterLabels();$('#mobile-filter-toggle').setAttribute('aria-expanded','false');
 if(apply)renderResults();else updateMobileFilterSummary();
 if(restoreFocus)(apply?$('#results-title'):$('#mobile-filter-toggle'))?.focus({preventScroll:true});
}
function renderSupplementStatus(){
 const statuses={advisors:[profileSupplementState,'profiles','导师简介'],routes:[projectSummaryState,'projects','项目培养简介'],materials:[materialSupplementState,'materials','补充材料'],experiences:[experienceSupplementState,'experiences','申请经验']};
 const status=statuses[currentView],container=$('#supplement-status');if(!container)return;
 const unavailable=status&&['unavailable','partial'].includes(status[0]);
 container.hidden=!unavailable;
 if(unavailable)container.innerHTML=`<span>${e(status[2])}${status[0]==='partial'?'部分资料未能验证':'暂未载入'}，现有记录仍可查阅。</span><button class="text-button" type="button" data-retry-supplement="${status[1]}">重新载入</button>`;
}

function switchView(view){clearTimeout(searchTimer);clearTimeout(experienceSearchTimer);searchComposing=false;experienceComposing=false;closeFilterSheet(false,false);const previousExperience=currentView==='experiences'?activeExperienceId:null;++experienceRestoreSerial;experienceRestoring=false;if($('#detail-dialog').open)$('#detail-dialog').close();const base=view.split('/')[0];currentView=Object.hasOwn(viewLabels,base)?base:'advisors';activeExperienceId=null;if(currentView==='experiences'&&view.startsWith('experiences/')){try{activeExperienceId=decodeURIComponent(view.slice('experiences/'.length));}catch{activeExperienceId='invalid-experience-link';}}state=filterStates[currentView];if(currentView==='experiences'&&activeExperienceId===null){const entry=window.history?.state;const saved=experiencePositions.get(entry?.gradExperienceKey)||entry?.gradExperiencePosition;if(saved?.filters)Object.assign(experienceFilters,saved.filters);}syncFilterValues();render();if(currentView==='experiences')restoreExperiencePosition(previousExperience);else activeExperienceEntryKey=null;}
function reset(){clearTimeout(searchTimer);if(filterDraft){Object.assign(filterDraft,emptyFilters(),{query:state.query});syncFilterValues(filterDraft);updateFilterLabels(filterDraft);updateFilterDraftCount();return;}Object.assign(state,emptyFilters());syncFilterValues();updateFilterLabels();renderResults();}
function showNotice(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').hidden=true,3500);}
function updateTray(){
 const projects=currentView==='routes',ids=projects?projectCompareIds:compareIds;
 const visible=ids.length>0&&['routes','advisors'].includes(currentView);
 $('#compare-tray').hidden=!visible;document.body?.classList?.toggle('has-comparison',visible);
 $('#compare-count').textContent=`已选 ${ids.length} / 3 ${projects?'个项目':'项记录'}`;
 const all=projects?[]:buildOpportunities(catalog,{includeReferencePhd:true});
 const names=projects?ids.map(id=>catalog.routes.find(r=>r.id===id)?.program||''):ids.map(id=>{
  const o=all.find(o=>o.id===id),a=catalog.advisors.find(a=>a.id===o?.advisorId),r=catalog.routes.find(r=>r.id===o?.routeId),job=(catalog.raPositions||[]).find(j=>j.id===o?.jobId);
  return a?`${a.name} · ${o.type}${job?.jobReference?' #'+job.jobReference:' · '+(r?.program||'')}`:'';
 }).filter(Boolean);
 $('#compare-names').textContent=names.join(' / ');$('#compare-names').setAttribute('title',names.join(' / '));
 $('#compare-open').disabled=ids.length<2;$('#compare-open').textContent=projects?'比较申请项目 →':'比较已选机会 →';
 for(const b of document.querySelectorAll('[data-compare]')){
  const selected=compareIds.includes(b.dataset.compare);b.setAttribute('aria-pressed',String(selected));b.textContent=selected?'已选':'＋ 比较';
  const label=b.getAttribute?.('aria-label');if(label)b.setAttribute('aria-label',label.replace(/^(加入|移出)比较/,selected?'移出比较':'加入比较'));
 }
 for(const b of document.querySelectorAll('[data-compare-project]')){const selected=projectCompareIds.includes(b.dataset.compareProject);b.setAttribute('aria-pressed',String(selected));b.textContent=selected?'已选项目':'＋ 加入对比';const label=b.getAttribute?.('aria-label');if(label)b.setAttribute('aria-label',label.replace(/^(加入|移出)比较/,selected?'移出比较':'加入比较'));}
 for(const feedback of document.querySelectorAll('.compare-inline-feedback'))feedback.remove?.();
}
function showCompareLimit(trigger,message){
 showNotice(message);
 if(!trigger?.parentElement||!document.createElement)return;
 let feedback=trigger.parentElement.querySelector('.compare-inline-feedback');
 if(!feedback){feedback=document.createElement('p');feedback.className='small-note compare-inline-feedback';feedback.setAttribute('role','status');trigger.parentElement.append(feedback);}
 feedback.textContent=message;
}
function handleOpportunityComparison(evt){
 const remove=evt.target.closest('[data-remove-opportunity]');
 if(remove){const index=compareIds.indexOf(remove.dataset.removeOpportunity);compareIds=compareIds.filter(id=>id!==remove.dataset.removeOpportunity);updateTray();if(compareIds.length<2)dismissComparison();else openCompare(true,'remove:'+compareIds[Math.min(index,compareIds.length-1)]);return true;}
 if(evt.target.closest('[data-opportunity-differences]')){opportunityDifferencesOnly=!opportunityDifferencesOnly;openCompare(true,'differences');return true;}
 return false;
}
function selectProjectCompare(id,trigger=null){if(!catalog.routes.some(r=>r.id===id&&isBrowsableRoute(r)))return;const next=toggleCompare(projectCompareIds,id);if(next===projectCompareIds){showCompareLimit(trigger,'最多同时比较 3 个项目，先移除一项即可');return;}projectCompareIds=next;updateTray();}
function parseCompareLocation(){const m=location.hash.match(/^#routes\/compare\/([^/]+)$/);if(!m)return null;try{return m[1].split(',').map(decodeURIComponent);}catch{return [];}}
function dismissComparison(){const direct=parseCompareLocation();$('#compare-dialog').close();const enabled=el=>el&&el.isConnected!==false&&!el.disabled&&(!el.getClientRects||el.getClientRects().length>0);const target=enabled(comparisonReturnFocus)?comparisonReturnFocus:!$('#compare-tray').hidden?$('#compare-clear'):$('#results-title');focusDetailControl(target);if(!direct)return;if(window.history?.state?.gradCompareReturn&&window.history?.back)window.history.back();else{window.history?.replaceState?.(null,'','#routes');switchView('routes');}}
function openProjectCompare(replay=false,preferredFocus=null){
 if(projectCompareIds.length<2)return;if($('#detail-dialog').open)$('#detail-dialog').close();
 const dialog=$('#compare-dialog'),content=$('#compare-content');
 if(!dialog.open)comparisonReturnFocus=document.activeElement;
 const focusKey=preferredFocus||(dialog.open?document.activeElement?.dataset?.comparisonFocus:null);
 const previousScroll=dialog.open?dialog.scrollTop:null;
 const previousHorizontal=dialog.open?content.querySelector?.('[data-comparison-focus="table"]')?.scrollLeft:null;
 const hash='#routes/compare/'+projectCompareIds.map(encodeURIComponent).join(',');
 if(!replay&&location.hash!==hash&&window.history?.pushState)window.history.pushState({...window.history.state,gradCompareReturn:location.hash||'#routes'},'',hash);
 $('#compare-title').textContent='把想申请的项目放在一起看';content.innerHTML=renderProjectComparison(catalog,projectCompareIds,projectDifferencesOnly);
 if(!dialog.open)dialog.showModal();
 if(focusKey){const controls=[...(content.querySelectorAll?.('[data-comparison-focus]')||[])];const target=controls.find(control=>control.dataset.comparisonFocus===focusKey)||content.querySelector?.('[data-project-differences]');target?.focus?.({preventScroll:true});}
 if(Number.isFinite(previousScroll))dialog.scrollTop=previousScroll;
 const region=content.querySelector?.('[data-comparison-focus="table"]');if(region&&Number.isFinite(previousHorizontal))region.scrollLeft=previousHorizontal;
}
function handleProjectComparison(evt){const add=evt.target.closest('[data-compare-project]');if(add){selectProjectCompare(add.dataset.compareProject,add);return true;}const remove=evt.target.closest('[data-remove-project]');if(remove){const removedIndex=projectCompareIds.indexOf(remove.dataset.removeProject);projectCompareIds=projectCompareIds.filter(id=>id!==remove.dataset.removeProject);updateTray();if(projectCompareIds.length<2){dismissComparison();}else{window.history?.replaceState?.({...window.history.state},'','#routes/compare/'+projectCompareIds.map(encodeURIComponent).join(','));openProjectCompare(true,removedIndex>=0?'remove:'+projectCompareIds[Math.min(removedIndex,projectCompareIds.length-1)]:null);}return true;}if(evt.target.closest('[data-project-differences]')){projectDifferencesOnly=!projectDifferencesOnly;openProjectCompare(true);$('#compare-content').querySelector?.('[data-project-differences]')?.focus();return true;}return false;}
function selectCompare(id,trigger=null){if(!buildOpportunities(catalog,{includeReferencePhd:true}).some(o=>o.id===id))return;const next=toggleCompare(compareIds,id);if(next===compareIds){showCompareLimit(trigger,'最多同时比较 3 条机会，先移除一项即可');return;}compareIds=next;updateTray();}
function selectedRaStatement(job){return `当前岗位 #${job.jobReference} 的本科任职条件与公开招募已核实；其他 RA 声明仍需逐岗位核实`; }
function openingRows(a,selectedJob=null){const o=a.openings||{};const verifiedRa=buildOpportunities(catalog).some(x=>x.advisorId===a.id&&x.type==='RA');return [['MSc',o.msc??o.MSc],['MPhil',o.mphil??o.MPhil],['PhD',o.phd??o.PhD],['RA',selectedJob?selectedRaStatement(selectedJob):`${readerText(o.ra??o.RA)||'未核实公开招募'}${verifiedRa?'；具体任职条件见对应岗位':'；本科任职条件待核实'}`],['2027 Fall',o.cycle2027??o['2027_fall_specific']],['2028 Fall',o.cycle2028??o['2028_fall_specific']]].map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(textValue(v)||'未找到可核实的公开声明')}</dd>`).join('');}
function detailRoute(r){const reference=r.status==='reference'&&degreeLabel(r)==='PhD';return `<section class="evidence-box"><h4>${e(displayInstitution(r.institution))} · ${e(r.program||r.degree)}${reference?' <span class="quiet">博士项目参考</span>':''}</h4><p class="small-note">${e(routeEvidenceText(r))}</p><p>${e(r.eligibilitySummary)}</p>${r.supervisorAssociation?`<p class="small-note">${e(supervisorAssociationText(r.supervisorAssociation))}</p>`:''}${requirementsList(r.requirements)}<div class="link-list">${sourceLinks(r.sources)}</div>${isBrowsableRoute(r)?`<button type="button" class="detail-button" data-summary-kind="project" data-summary-id="${e(r.id)}">查看项目详情 <span aria-hidden="true">→</span></button>`:''}</section>`;}
function openDetail(id,replay=false,refresh=false){const opportunity=buildOpportunities(catalog,{includeReferencePhd:true}).find(o=>o.id===id);const a=catalog.advisors.find(a=>a.id===(opportunity?.advisorId||id));if(!a){if(replay)showMissingDetail('advisor',refresh);return;}if(!replay)pushDetailRoute('advisor',id);updateDetailBack();$('#detail-kind').textContent='导师与申请信息';activeDetail=id;const rs=opportunity?catalog.routes.filter(r=>r.id===opportunity.routeId):routesFor(a,catalog).filter(r=>isBrowsableRoute(r)&&!(r.status==='reference'&&degreeLabel(r)==='PhD'));const referenceRoutes=routesFor(a,catalog).filter(r=>r.status==='reference'&&degreeLabel(r)==='PhD'&&r.id!==opportunity?.routeId);const job=(catalog.raPositions||[]).find(j=>j.id===opportunity?.jobId);const extraAssociations=(a.routeAssociations||[]).filter(x=>x.status!=='verified');$('#detail-content').innerHTML=`<h2 id="detail-title" class="detail-title" tabindex="-1">${job?e(job.title||"研究助理 RA"):aName(a)}</h2>${job?`<p class="detail-subtitle">${aName(a)} · RA 工作岗位</p>`:""}${opportunity?`<div class="opportunity-context">${e(opportunity.type)} · ${e(rs[0]?.program||job?.title||'研究助理岗位')}</div>`:''}<p class="detail-subtitle">${e(displayInstitution(a.institution))} · ${e(a.department)}<br>${e(a.position)}${a.lab?` · ${e(a.lab)}`:''}</p><div class="status-group">${appointmentBadge(a)}${!advisorProfiles.get(a.id)?.appointmentReview&&a.newPi?.verified?badge('new','新入职已核实'):''}</div><div class="link-list">${link(a.profileUrl,'学校 / 官方档案')}${link(a.labUrl,'课题组 / 个人主页')}</div>${a.email?`<p class="small-note">公开业务邮箱：${e(a.email)}（申请联系偏好以官网为准）</p>`:''}${advisorProfiles.has(a.id)?renderProfile(advisorProfiles.get(a.id)):`<p class="profile-pending small-note">${profileSupplementState==='loading'?'专业简介正在载入':profileSupplementState==='unavailable'?'专业简介暂未载入':'专业简介待补充'}；以下保留已核实的研究方向与代表工作${profileSupplementState==='unavailable'?' <button class="text-button" data-retry-supplement="profiles">重新载入</button>':''}</p><section class="detail-section"><h3>研究方向与代表工作</h3><p>${e(a.summary)}</p><div class="tags detail-tags">${publicTags(a)}</div>${(a.works||[]).map(w=>`<div class="evidence-box"><h4>${e(w.title)} ${w.year?`<span class="quiet">${e(w.year)}</span>`:''}</h4>${w.note||w.evidence?`<p>${e(w.note||w.evidence)}</p>`:''}<div class="link-list">${link(w.url,'作者项目 / 原始论文')}</div></div>`).join('')}</section>`}<section class="detail-section"><h3>${job?'岗位任职条件':'申请路径与条件'}</h3><p class="small-note">${job?'RA 为受雇科研岗位，不授予学位录取资格。':'以下保留项目与研究关联，包括历史参考和待核记录。统考、申请制、推免及硕士前置要求分别核对；项目资格不代表个人导师接收或名额。'}</p>${job?employmentDetail(job):rs.length?rs.map(detailRoute).join(''):'<div class="caution-box"><p>申请路径或导师关联仍待核实</p></div>'}${extraAssociations.length?`<div class="caution-box"><p><strong>其他路径与关联限制</strong></p><ul>${extraAssociations.map(x=>`<li>${e([...new Set([x.degree,x.reason,x.summary,x.note,x.association,x.pi_program_association].filter(Boolean).map(readerText))].join('；')||textValue(x))}</li>`).join('')}</ul></div>`:''}</section>${referenceRoutes.length?`<section class="detail-section"><h3>博士项目参考</h3><p class="small-note">以下内容展示学校正式博士项目与导师研究方向/导师目录的关联。它不自动计入已核实学位关联；普通博士、直博条件和个人导师余位必须按对应来源分别核验。</p>${referenceRoutes.map(detailRoute).join('')}</section>`:''}<section class="detail-section"><h3>招生与招聘 · 按申请类型分开</h3>${renderHomepageRecruitment(advisorProfiles.get(a.id))}<dl class="fact-grid">${openingRows(a,job)}</dl><p class="small-note">${e(a.openingSummary||'未找到声明不等于不招生；未注明年份不能滚动视为 2027 Fall')}</p>${a.recruitmentReview?`<p class="small-note recruitment-review">招募复核于 ${e(a.recruitmentReview.checkedDate)}：${e(a.recruitmentReview.scope)}。其他信息沿用原核验日期。</p>`:''}<div class="link-list">${sourceLinks((a.openingDetails||[]).flatMap(o=>o.sources||[]).filter((s,i,arr)=>arr.findIndex(x=>x.url===s.url)===i))}</div></section>${!advisorProfiles.get(a.id)?.appointmentReview&&(a.newPi?.date||a.newPi?.note)?`<section class="detail-section"><h3>任职时间</h3><p>${e(a.newPi.date||'准确入职日期未确认')} · ${e(a.newPi.note||'')}</p><div class="link-list">${sourceLinks(a.newPi.sources||[])}</div></section>`:''}${(a.caveats||[]).length?`<section class="caution-box"><ul>${a.caveats.map(c=>`<li>${e(c)}</li>`).join('')}</ul></section>`:''}${renderProfileReferences(advisorProfiles.get(a.id))}<section class="detail-section"><h3>证据来源</h3><p class="small-note">核验于 ${e(a.checkedDate||catalog.metadata.checkedDate)}。引用原文的判断范围以各项说明为准。</p><div class="link-list">${sourceLinks(a.sources)}</div></section>`;const advisorBody=$('#detail-content').innerHTML;$('#detail-content').innerHTML=`<div class="reading-layout"><article class="reading-main" data-reading-kind="${job?'ra':'advisor'}">${advisorBody}</article><aside class="reading-rail" aria-label="申请与来源"><section class="rail-panel"><h3>${job?'RA 岗位信息':'学位申请信息'}</h3><p>${job?'RA 是受雇科研岗位，不授予学位录取资格。':'学位资格、导师接收意向和当期剩余名额分别核对。'}</p><dl class="fact-grid">${openingRows(a,job)}</dl></section><section class="rail-panel"><h3>导师与团队</h3>${link(a.profileUrl,'查看导师主页 ↗')}${link(a.labUrl,'查看课题组主页 ↗')}<p class="small-note">核验于 ${e(a.checkedDate||catalog.metadata.checkedDate)}；完整证据和限制见正文。</p></section></aside></div>`;presentDetail(!refresh);}
function employmentDetail(job){const cr=job.currentRecruitment||{};return `<section class="evidence-box"><h4>${e(job.title||'研究助理')} · ${e(job.jobReference||'')}</h4><p>${e(job.employmentEligibility?.requirementText||job.requirementText||'官方岗位已明确接受本科，且不要求已有硕士')}</p><p class="small-note">${e(job.employmentEligibility?.interpretation||'具体学历等值由雇主审核')}</p>${job.duties?`<p>${e(job.duties)}</p>`:''}${job.duration?`<p>任期：${e(job.duration)}${job.workTime?.length?'；'+job.workTime.map(t=>t==='full-time'?'全职':t==='part-time'?'兼职':e(t)).join(' / '):''}</p>`:''}<p>公告：${e(job.noticeDate||'未注明')}；截止日期：${e(cr.deadline||'未公布')}；截止时刻：${e(cr.deadlineTime||'未公布')}</p><p class="small-note">${e(job.advisorAssociation?.detail||'')}</p><p class="small-note">岗位剩余额度与个人工作许可未核实；具体任职资格和到岗时间由雇主审核</p><ul>${(job.caveats||[]).map(c=>`<li>${e(c)}</li>`).join('')}</ul><div class="link-list">${sourceLinks(job.employmentEligibility?.sources||[])}</div></section>`;}
function openCompare(replay=false,preferredFocus=null){
 if(currentView==='routes'){openProjectCompare(replay);return;}
 if(compareIds.length<2)return;
 const dialog=$('#compare-dialog'),content=$('#compare-content');
 const focusKey=preferredFocus||(dialog.open?document.activeElement?.dataset?.opportunityFocus:null);
 const previousScroll=dialog.open?dialog.scrollTop:0;
 const horizontal=dialog.open?content.querySelector?.('[data-opportunity-focus="table"]')?.scrollLeft:0;
 if(!dialog.open)comparisonReturnFocus=document.activeElement;
 $('#compare-title').textContent='研究机会比较';
 content.innerHTML=renderOpportunityComparison(catalog,compareIds,{differencesOnly:opportunityDifferencesOnly,renderEmployment:employmentDetail,renderOpenings:openingRows});
 if(!dialog.open)dialog.showModal();
 if(focusKey){const controls=[...(content.querySelectorAll?.('[data-opportunity-focus]')||[])];focusDetailControl(controls.find(el=>el.dataset.opportunityFocus===focusKey)||content.querySelector?.('[data-opportunity-differences]'));}
 if(Number.isFinite(previousScroll))dialog.scrollTop=previousScroll;
 const table=content.querySelector?.('[data-opportunity-focus="table"]');if(table&&Number.isFinite(horizontal))table.scrollLeft=horizontal;
}
function updateFilterLabels(filters=state){const job=filters.opportunityType==='RA';$('#opening-filter-name').textContent=job?'招聘信息':'招生信息';const labels=job?{explicit:'已发布岗位招聘',unknown:'招聘年份或名额待确认',closed:'已明确停止招聘'}:openLabel;$('#opening-filter').innerHTML=`<option value="">${job?'全部招聘信息':'全部招生信息'}</option>`+Object.entries(labels).map(([value,label])=>`<option value="${value}">${e(label)}</option>`).join('');$('#opening-filter').value=filters.opening;}
function populateFilters(){const institutions=[...new Set([...catalog.advisors,...catalog.routes].map(a=>a.institution).filter(Boolean))];institutions.sort((a,b)=>displayInstitution(a).localeCompare(displayInstitution(b),'zh-CN'));$('#institution-filter').innerHTML='<option value="">全部学校</option>'+institutions.map(i=>`<option value="${e(i)}">${e(displayInstitution(i))}</option>`).join('');const topics=[...new Set(catalog.advisors.flatMap(themesFor))];$('#topic-filter').innerHTML='<option value="">全部研究方向</option>'+topics.map(t=>`<option value="${e(t)}">${e(t)}</option>`).join('');}
function closeNavigationMenu(restoreFocus=false){
 $('.site-header').removeAttribute('data-menu-open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').setAttribute('aria-label','展开主导航');
 if(restoreFocus)$('#menu-toggle').focus({preventScroll:true});
}
function handleDocumentClick(evt){
 const readingSection=evt.target.closest('[data-reading-section]');
 if(readingSection){const target=document.getElementById(readingSection.dataset.readingSection);target?.focus?.({preventScroll:true});target?.scrollIntoView?.({block:'start'});return;}
 if(handleProjectComparison(evt)||handleOpportunityComparison(evt))return;
 const retry=evt.target.closest('[data-retry-supplement]');
 if(retry){retry.disabled=true;retry.textContent='正在载入…';const load={profiles:loadProfileSupplement,projects:loadProjectSummaries,materials:loadMaterialSupplement,experiences:loadExperienceSupplement}[retry.dataset.retrySupplement];void load?.();return;}
 if(evt.target.closest('[data-view]'))closeNavigationMenu($('#menu-toggle').getAttribute?.('aria-expanded')==='true');
 if(evt.target.closest('[data-find-results]')){evt.preventDefault();flushSearch();$('#results').focus?.({preventScroll:true});$('#results').scrollIntoView?.({block:'start'});return;}
 if(evt.target.closest('[data-experience-reset]')&&currentView==='experiences'&&activeExperienceId===null){
  clearTimeout(experienceSearchTimer);Object.assign(experienceFilters,{query:'',collection:''});$('#experience-search').value='';$('#experience-collection').value='';refreshExperienceResults();$('#experience-search').focus({preventScroll:true});return;
 }
 if(evt.target.closest('[data-experience-find]')){
  $('#experience-search')?.focus({preventScroll:true});$('#experience-search')?.scrollIntoView({block:'center',behavior:'instant'});return;
 }
 if(navigateExperience(evt))return;
 const summary=evt.target.closest('[data-summary-kind]');if(summary){openSummary(summary.dataset.summaryKind,summary.dataset.summaryId);return;}
 const detail=evt.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return;}
 const compare=evt.target.closest('[data-compare]');if(compare){selectCompare(compare.dataset.compare,compare);return;}
 const close=evt.target.closest('[data-close]');if(close){
  if(close.dataset.close==='detail-dialog')dismissDetail();else if(close.dataset.close==='compare-dialog')dismissComparison();else if(close.dataset.close==='filter-dialog')closeFilterSheet();else document.getElementById(close.dataset.close).close();return;
 }
 if(evt.target.closest('[data-reset]')){reset();focusVisibleFilter();return;}
 const quick=evt.target.closest('[data-overview-preset]');
 if(quick){const selection=overviewPresets[quick.dataset.overviewPreset];if(selection?.view===currentView){clearTimeout(searchTimer);Object.assign(state,emptyFilters(),selection.filters);syncFilterValues();updateFilterLabels();renderResults();$('#view-content').focus?.({preventScroll:true});$('#view-content').scrollIntoView?.({block:'start'});}return;}
 const expand=evt.target.closest('[data-overview-expand]');
 if(expand?.dataset.overviewExpand==='experience-synthesis'){
  const details=$('#experience-synthesis');if(details){const guide=details.closest?.('.guide-disclosure');if(guide)guide.open=true;details.open=true;details.querySelector?.('summary')?.focus?.({preventScroll:true});details.scrollIntoView?.({block:'start'});}return;
 }
 const sw=evt.target.closest('[data-switch]');if(sw)location.hash=sw.dataset.switch;
}
function bind(){
 if(appBound)return;appBound=true;bindExperienceTools();
 $('#menu-toggle').addEventListener('click',()=>{const expanded=$('#menu-toggle').getAttribute?.('aria-expanded')==='true';if(expanded)closeNavigationMenu();else{$('#menu-toggle').setAttribute('aria-expanded','true');$('#menu-toggle').setAttribute('aria-label','收起主导航');$('.site-header').setAttribute('data-menu-open','');}});
 for(const type of ['institution','topic','opportunity','opening','rank','appointment'])$(`#${type}-filter`).addEventListener('change',evt=>{
  const key=type==='opportunity'?'opportunityType':type,working=filterDraft||state;
  if(!viewFilterKeys[currentView].includes(key)){evt.target.value=working[key];return;}
  if(key==='opportunityType'&&!(currentView==='advisors'?['','RA','MSc','MPhil','PhD']:['','MSc','MPhil','PhD']).includes(evt.target.value)){evt.target.value=working[key];return;}
  working[key]=evt.target.value;clearTimeout(searchTimer);if(key==='opportunityType')updateFilterLabels(working);
  if(filterDraft)updateFilterDraftCount();else renderResults();
 });
 $('#search').addEventListener('input',queueSearch);
 $('#search').addEventListener('compositionstart',()=>{searchComposing=true;clearTimeout(searchTimer);});
 $('#search').addEventListener('compositionend',evt=>{searchComposing=false;queueSearch(evt);});
 $('#search').addEventListener('keydown',evt=>{if(evt.key==='Enter'&&!evt.isComposing&&!searchComposing&&evt.keyCode!==229){evt.preventDefault?.();flushSearch();}});
 $('#reset-filters').addEventListener('click',reset);$('#active-filters').addEventListener('click',changeActiveFilter);
 $('#mobile-filter-toggle')?.addEventListener('click',openFilterSheet);
 $('#filter-cancel')?.addEventListener('click',()=>closeFilterSheet());$('#filter-apply')?.addEventListener('click',()=>closeFilterSheet(true));
 $('#filter-dialog')?.addEventListener('cancel',evt=>{evt.preventDefault();closeFilterSheet();});
 $('#filter-dialog')?.addEventListener('close',()=>closeFilterSheet());
 $('#compare-clear').addEventListener('click',()=>{if(currentView==='routes')projectCompareIds=[];else compareIds=[];updateTray();});
 $('#compare-open').addEventListener('click',()=>openCompare());
 document.addEventListener('click',handleDocumentClick);
 document.addEventListener('keydown',evt=>{
  if(evt.key==='Escape'&&$('#menu-toggle').getAttribute?.('aria-expanded')==='true'){closeNavigationMenu(true);return;}
  if(evt.key==='Enter'&&evt.target?.id==='experience-search'&&!evt.isComposing&&!experienceComposing&&evt.keyCode!==229){evt.preventDefault?.();flushExperienceSearch();return;}
  if(evt.key==='/'&&!evt.ctrlKey&&!evt.metaKey&&!evt.altKey&&!document.activeElement?.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!document.querySelector('dialog[open]')){
   if(currentView==='experiences'&&activeExperienceId===null){evt.preventDefault();$('#experience-search')?.focus();}
   else if(!$('.search-surface').hidden){evt.preventDefault();$('#search').focus();}
  }
 });
 window.addEventListener('scroll',()=>saveExperiencePosition(null,false),{passive:true});
 window.addEventListener('hashchange',routeLocation);window.addEventListener('popstate',routeLocation);
 window.addEventListener('resize',()=>{updateNavigationIndicator();if(filterDraft&&window.innerWidth>=1024)closeFilterSheet(false,false);},{passive:true});
 $('#detail-back').addEventListener('click',()=>{if(((window.history?.state?.gradDetailDepth||0)>1||((window.history?.state?.gradDetailDepth||0)>0&&window.history?.state?.gradDetailHasList===false))&&window.history?.back)window.history.back();else dismissDetail();});
 $('#compare-dialog').addEventListener('cancel',evt=>{evt.preventDefault();dismissComparison();});
 $('#detail-dialog').addEventListener('close',renderActiveFilters);
 $('#detail-dialog').addEventListener('cancel',evt=>{evt.preventDefault();dismissDetail();});
 for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',evt=>{
  if(evt.target!==d)return;const r=d.getBoundingClientRect();
  if(evt.clientX<r.left||evt.clientX>r.right||evt.clientY<r.top||evt.clientY>r.bottom){
   if(d.id==='detail-dialog')dismissDetail();else if(d.id==='compare-dialog')dismissComparison();else if(d.id==='filter-dialog')closeFilterSheet();else d.close();
  }
 });
}
// Supplements must never delay the core catalog, controls, or one another.
// Keep loaded data if a refresh fails; the next navigation/render can recover.
function refreshOptionalView(view){
 if(currentView!==view)return;
 try{configureFilters();renderOverview();renderResults();if(view==='experiences')restoreExperiencePosition();}
 catch(error){console.warn('Optional data view refresh failed',error);}
}
function refreshOptionalDetail(kind){
 const route=parseDetailLocation(),dialog=$('#detail-dialog');
 if(pendingDetailClose||!dialog.open||route?.view!==currentView||route?.kind!==kind)return;
 const scrollTop=dialog.scrollTop,content=$('#detail-content'),focused=document.activeElement;
 const compactContentsOpen=!!content.querySelector?.('.reader-mobile-toc')?.open;
 const focusKey=content.contains?.(focused)?detailFocusKey(focused):null;
 const regionSelector=focused?.closest?.('.reading-rail')?'.reading-rail':'.reading-main';
 const section=focused?.closest?.('.detail-section,.rail-panel'),sectionTitle=section?.querySelector?.('h3')?.textContent;
 const region=()=>content.querySelector?.(regionSelector)||content;
 const sections=()=>[...(region().querySelectorAll?.('.detail-section,.rail-panel')||[])].filter(node=>node.querySelector?.('h3')?.textContent===sectionTitle);
 const sectionIndex=sectionTitle?sections().indexOf(section):-1;
 const scope=()=>sectionTitle?sections()[sectionIndex]:region();
 const matches=()=>[scope(),...(scope()?.querySelectorAll?.('a,button,summary,[tabindex]')||[])].filter(node=>node&&detailFocusKey(node)===focusKey);
 const focusIndex=focusKey?matches().indexOf(focused):-1;
 try{
  if(kind==='advisor')openDetail(route.id,true,true);else openSummary(kind,route.id,true,true);
  const compactContents=content.querySelector?.('.reader-mobile-toc');if(compactContents)compactContents.open=compactContentsOpen;
  // Keep duplicate source links in their original main/rail section and order;
  // new summary sources must not redirect a rail link to the main article.
  // Persistent toolbar controls remain untouched.
  if(focusKey){const target=matches()[focusIndex];if(target)focusDetailControl(target);}
 }
 catch(error){console.warn('Optional data detail refresh failed',error);}
 finally{dialog.scrollTop=scrollTop;}
}
function refreshOptionalComparison(){
 if(currentView!=='routes'||!$('#compare-dialog').open||!parseCompareLocation())return;
 try{openProjectCompare(true);}catch(error){console.warn('Optional data comparison refresh failed',error);}
}
async function optionalJSON(url){
 const response=await fetch(url);
 if(!response.ok)throw Error('Optional data unavailable');
 return response.json();
}
async function loadProjectSummaries(){
 try{const projectData=await optionalJSON(new URL('../data/project-summaries.json?v=bd338f3d5d16',import.meta.url));const summaries=normalizeProjectSummaries(projectData,catalog);catalog={...catalog,projectSummaries:summaries};projectSummaryState=summaries.size===projectData.records.length?'loaded':'partial';}
 catch{projectSummaryState='unavailable';}
 refreshOptionalView('routes');refreshOptionalDetail('project');
 refreshOptionalComparison();
}
async function loadMaterialSupplement(){
 try{const materialData=await optionalJSON(new URL('../data/material-summaries.json?v=f9f659f15e14',import.meta.url));const supplement=normalizeMaterialSupplement(materialData,catalog);catalog={...catalog,materials:[...new Map([...(catalog.materials||[]),...supplement].map(item=>[item.id,item])).values()]};materialSupplementState=supplement.length===materialData.records.length?'loaded':'partial';}
 catch{materialSupplementState='unavailable';}
 refreshOptionalView('materials');refreshOptionalDetail('material');
 // Project reading and comparison also consume the material supplement.
 refreshOptionalDetail('project');refreshOptionalComparison();
}
async function loadExperienceSupplement(){
 try{experienceRecords=normalizeExperiences(await optionalJSON(new URL('../data/application-experiences.json?v=9d025238102e',import.meta.url)));experienceSupplementState='loaded';}
 catch{experienceSupplementState='unavailable';}
 refreshOptionalView('experiences');
}
async function loadProfileSupplement(){
 try{advisorProfiles=profileMap(await optionalJSON(new URL('../data/advisor-profiles.json?v=2fbb1bcdb2e4',import.meta.url)),catalog.advisors);catalog={...catalog,advisorProfiles};profileSupplementState='ready';}
 catch{profileSupplementState='unavailable';}
 refreshOptionalView('advisors');refreshOptionalDetail('advisor');
}
function loadOptionalSupplements(){
 for(const load of [loadMaterialSupplement,loadExperienceSupplement,loadProfileSupplement,loadProjectSummaries]){
  void load().catch(error=>console.warn('Optional data refresh failed',error));
 }
}
async function initialize(){
 if(initializing)return;initializing=true;
 const retry=$('#view-content').querySelector?.('[data-retry-core]');if(retry){retry.disabled=true;retry.textContent='正在载入…';}
 try{
  const responses=await Promise.all(['catalog.json?v=70bd55a0939d','ra-positions.json','update-status.json'].map(name=>fetch(new URL('../data/'+name,import.meta.url))));
  if(responses.some(res=>!res.ok))throw Error('数据读取失败，请重试');
  const [academicData,raData,statusData]=await Promise.all(responses.map(res=>res.json()));
  if(!Array.isArray(academicData.advisors)||!Array.isArray(academicData.routes))throw Error('数据格式暂不可用');
  catalog={...academicData,raPositions:raData.raPositions||[]};updateStatus=statusData;
  $('#checked-date').textContent=`核验于 ${catalog.metadata.checkedDate}`;$('.edition a').textContent=updateStatus.statusLabel;
  populateFilters();bind();switchView(parseDetailLocation()?.view||location.hash.slice(1)||'advisors');
  if(parseDetailLocation()||parseCompareLocation())routeLocation();
  loadOptionalSupplements();
 }catch(err){
  $('#result-count').textContent='数据未能载入';
  $('#view-content').innerHTML=`<div class="empty"><h3>暂时无法读取数据</h3><p>${e(err.message)}</p><p>可以重新载入，或直接阅读公开 JSON 中已保存的记录。</p><button class="primary-button" type="button" data-retry-core>重新载入目录</button><a class="source-link" href="./data/catalog.json">公开数据文件</a></div>`;
  $('#view-content').querySelector?.('[data-retry-core]')?.addEventListener('click',initialize);
 }finally{initializing=false;}
}
initialize();
