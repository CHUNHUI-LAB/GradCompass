export const institutionNames = {HKUST:'香港科技大学',HKU:'香港大学',CUHK:'香港中文大学',CityU:'香港城市大学',CityUHK:'香港城市大学','CUHK-Shenzhen':'香港中文大学（深圳）',PolyU:'香港理工大学',HKBU:'香港浸会大学','HKUST(GZ)':'香港科技大学（广州）','HKUST-GZ':'香港科技大学（广州）','CUHK(SZ)':'香港中文大学（深圳）','CUHK-SZ':'香港中文大学（深圳）',Westlake:'西湖大学',XJTLU:'西交利物浦大学'};
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
export function isVerifiedRoute(route){return route.status==='verified'&&route.bachelorEligible===true&&route.noTuimianRequired===true&&route.noMasterRequired===true;}
export function routesFor(advisor,catalog){return (advisor.routeIds||[]).map(id=>catalog.routes.find(r=>r.id===id)).filter(Boolean);}
export function hasVerifiedPath(advisor,catalog){return advisor.eligibility==='verified'&&advisor.defaultVisible!==false&&routesFor(advisor,catalog).some(isVerifiedRoute);}
export function themesFor(advisor){const str=[...(advisor.topics||[]),advisor.summary||''].join(' ');return topicRules.filter(([,r])=>r.test(str)).map(([label])=>label);}
export function searchText(advisor,catalog){return [advisor.name,advisor.nameZh,advisor.institution,institutionLabel(advisor.institution),advisor.department,advisor.summary,...(advisor.topics||[]),...themesFor(advisor),...(advisor.works||[]).map(w=>w.title),...routesFor(advisor,catalog).map(r=>r.program)].join(' ').toLowerCase();}
export function openingMatches(advisor,filters={}){
 if(!filters.opening)return true;
 if(filters.degree){const row=(advisor.openingDetails||[]).find(o=>o.degree===filters.degree);return row?row.status===filters.opening:filters.opening==='unknown';}
 return advisor.opening===filters.opening;
}
export function filterAdvisors(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase();
 return catalog.advisors.filter(a=>{
  if(filters.eligibleOnly!==false&&!hasVerifiedPath(a,catalog))return false;
  if(filters.institution&&a.institution!==filters.institution)return false;
  if(filters.topic&&!themesFor(a).includes(filters.topic))return false;
  if(filters.degree&&!routesFor(a,catalog).some(r=>degreeLabel(r)===filters.degree&&(filters.eligibleOnly===false||isVerifiedRoute(r))))return false;
  if(!openingMatches(a,filters))return false;
  return !q||q.split(/\s+/).every(t=>searchText(a,catalog).includes(t));
 }).sort((a,b)=>a.institution.localeCompare(b.institution,'en')||a.name.localeCompare(b.name,'en'));
}
export function filterRoutes(catalog,filters={}){
 const q=(filters.query||'').trim().toLowerCase();
 return catalog.routes.filter(r=>{
  if(filters.eligibleOnly!==false&&!isVerifiedRoute(r))return false;
  if(filters.institution&&r.institution!==filters.institution)return false;
  if(filters.degree&&degreeLabel(r)!==filters.degree)return false;
  if(filters.topic&&!catalog.advisors.some(a=>(a.routeIds||[]).includes(r.id)&&themesFor(a).includes(filters.topic)))return false;
  if(filters.opening&&!catalog.advisors.some(a=>(a.routeIds||[]).includes(r.id)&&openingMatches(a,{...filters,degree:degreeLabel(r)})))return false;
  return !q||[r.institution,institutionLabel(r.institution),r.program,r.department,r.degree,r.eligibilitySummary].join(' ').toLowerCase().includes(q)||catalog.advisors.some(a=>(a.routeIds||[]).includes(r.id)&&searchText(a,catalog).includes(q));
 });
}
export function deadlineStatus(deadline,checkedDate='2026-10-01'){
 if(deadline.status==='expired'||deadline.status==='closed')return 'expired';
 if(deadline.date&&/^\d{4}-\d{2}-\d{2}/.test(deadline.date)&&deadline.date.slice(0,10)<checkedDate)return 'expired';
 return deadline.status==='open'?'open':'unknown';
}
export function filterDeadlines(catalog,filters={}){
 const routeIds=new Set(filterRoutes(catalog,filters).map(r=>r.id));
 return (catalog.deadlines||[]).filter(d=>{
  if(filters.institution&&d.institution!==filters.institution)return false;
  if((d.routeIds||[]).length&&!d.routeIds.some(id=>routeIds.has(id)))return false;
  if(filters.eligibleOnly!==false&&!(d.routeIds||[]).some(id=>routeIds.has(id)))return false;
  if(filters.query&&!([d.title,d.note,institutionLabel(d.institution)].join(' ').toLowerCase().includes(filters.query.toLowerCase())||(d.routeIds||[]).some(id=>routeIds.has(id))))return false;
  return true;
 }).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
}
export function toggleCompare(ids,id,limit=3){if(ids.includes(id))return ids.filter(i=>i!==id);if(ids.length>=limit)return ids;return [...ids,id];}
