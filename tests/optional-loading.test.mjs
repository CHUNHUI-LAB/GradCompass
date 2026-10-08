import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildOpportunities,browseAdvisors,browseRoutes} from '../assets/core.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {normalizeProjectSummaries} from '../assets/record-summaries.js';
import {normalizeExperiences} from '../assets/experiences.js';

// Execute the real app against shipped data with deterministic network/DOM faults.
// These are DOM-contract tests, not a browser, layout, or deployment acceptance.
const read=url=>JSON.parse(fs.readFileSync(url,'utf8'));
const data=name=>read(new URL('../data/'+name,import.meta.url));
const catalog={...data('catalog.json'),raPositions:data('ra-positions.json').raPositions};
const opportunities=buildOpportunities(catalog);
const opportunityCount=`${browseAdvisors(catalog).length} 位导师 · ${opportunities.filter(o=>o.kind==='degree').length} 条已核实学位关联 · ${opportunities.filter(o=>o.kind==='employment').length} 个 RA 岗位`;
const materialCount=catalog.materials.length+normalizeMaterialSupplement(data('material-summaries.json'),catalog).length;
const experienceCount=normalizeExperiences(data('application-experiences.json')).length;
const projectCount=browseRoutes(catalog).length;
const summaryCount=normalizeProjectSummaries(data('project-summaries.json'),catalog).size;
const profileId=data('advisor-profiles.json').profiles[0].advisorId;
const materialId=data('material-summaries.json').records[0].id;
const experienceId=data('application-experiences.json').records[0].id;
const projectIds=[...normalizeProjectSummaries(data('project-summaries.json'),catalog).keys()].slice(0,2);
const files=[
 {file:'material-summaries.json',view:'materials',kind:'material',id:materialId,loaded:app=>assert.equal(app.el('#result-count').textContent,materialCount+' 组材料要求')},
 {file:'application-experiences.json',view:'experiences',loaded:app=>assert.equal(app.el('#result-count').textContent,experienceCount+' 条申请经验')},
 {file:'advisor-profiles.json',view:'advisors',kind:'advisor',id:profileId,loaded:app=>{app.detail('advisor',profileId);assert(app.el('#detail-content').innerHTML.includes('data-profile-advisor="'+profileId+'"'));}},
 {file:'project-summaries.json',view:'routes',kind:'project',id:projectIds[0],loaded:app=>assert(app.el('#view-content').innerHTML.includes('已补充 '+summaryCount+' 个项目'))}
];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
let serial=0;
class Element{
 constructor(){Object.assign(this,{value:'',hidden:false,textContent:'',listeners:{},attrs:{},open:false,opens:0,writes:0,failWrites:0,scrollTop:0,classList:{toggle(){}}});this.html='';}
 set innerHTML(value){this.writes++;if(this.failWrites>0){this.failWrites--;throw Error('Injected optional render failure');}this.html=value;}
 get innerHTML(){return this.html;}
 addEventListener(k,f){this.listeners[k]=f;}
 setAttribute(k,v){this.attrs[k]=v;}
 removeAttribute(k){delete this.attrs[k];}
 focus(){document.activeElement=this;}
 showModal(){this.open=true;this.opens++;}
 close(){this.open=false;this.listeners.close?.();}
}
async function boot({file,mode='loaded',hash='',allPending=false,missingProfileId=null}={}){
 const nodes=new Map(),events={},navigation={},requests=[];
 const el=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
 globalThis.document={querySelector:el,querySelectorAll:s=>s==='dialog'?[el('#detail-dialog'),el('#compare-dialog')]:[],getElementById:id=>el('#'+id),addEventListener:(k,f)=>events[k]=f,activeElement:{tagName:'BODY'}};
 globalThis.window={addEventListener:(k,f)=>navigation[k]=f};globalThis.location={hash};
 let settle;
 globalThis.fetch=async url=>{
  const name=new URL(url).pathname.split('/').at(-1);requests.push(name);
  const target=name===file;
  if(allPending&&files.some(entry=>entry.file===name))return new Promise(()=>{});
  if(target&&mode==='fetch-pending')return new Promise(()=>{});
  if(target&&mode==='fetch-reject')throw Error('Injected fetch rejection');
  const response={ok:!(target&&mode==='404'),json:async()=>{
   if(target&&mode==='json-pending')return new Promise(()=>{});
   if(target&&mode==='json-reject')throw Error('Injected JSON rejection');
   if(target&&mode==='malformed')return file==='advisor-profiles.json'?{profiles:{}}:{records:'bad'};
   if(target&&mode==='profile-absent'){const value=read(url);assert.equal(file,'advisor-profiles.json');assert(value.profiles.some(profile=>profile.advisorId===missingProfileId));return {...value,profiles:value.profiles.filter(profile=>profile.advisorId!==missingProfileId)};}
   if(target&&mode==='json-late')return new Promise((resolve,reject)=>{settle=rejectIt=>rejectIt?reject(Error('Injected late JSON rejection')):resolve(read(url));});
   return read(url);
  }};
  if(target&&mode==='fetch-late')return new Promise((resolve,reject)=>{settle=rejectIt=>rejectIt?reject(Error('Injected late fetch rejection')):resolve(response);});
  return response;
 };
 await import('../assets/app.js?optional-loading-test='+serial++);await tick();
 return {el,requests,async complete(reject=false){assert.equal(typeof settle,'function');settle(reject);await tick();},view(view){location.hash='#'+view;navigation.hashchange();},detail(kind,id,view=kind==='advisor'?'advisors':kind==='project'?'routes':'materials'){location.hash=`#${view}/summary/${kind}/${id}`;navigation.hashchange();},change(name,value){el('#'+name+'-filter').value=value;el('#'+name+'-filter').listeners.change({target:el('#'+name+'-filter')});}};
}
function assertCore(app){assert.equal(app.el('#result-count').textContent,opportunityCount);assert.equal(typeof app.el('#search').listeners.input,'function');assert(!app.el('#view-content').innerHTML.includes('暂时无法读取数据'));}
function assertAvailableSiblings(app,file){
 if(file!=='material-summaries.json'){app.view('materials');assert.equal(app.el('#result-count').textContent,materialCount+' 组材料要求');}
 if(file!=='application-experiences.json'){app.view('experiences');assert.equal(app.el('#result-count').textContent,experienceCount+' 条申请经验');}
 if(file!=='project-summaries.json'){app.view('routes');assert(app.el('#view-content').innerHTML.includes('已补充 '+summaryCount+' 个项目'));}
 app.view('advisors');assertCore(app);
}
for(const entry of files){
 for(const mode of ['fetch-pending','json-pending'])test(entry.file+' '+mode+' cannot block core or independent supplements',async()=>{
  const app=await boot({file:entry.file,mode});assertCore(app);assertAvailableSiblings(app,entry.file);app.view(entry.view);
  if(entry.view==='materials')assert(app.el('#view-content').innerHTML.includes('补充材料资料正在载入'));
  if(entry.view==='experiences')assert.equal(app.el('#result-count').textContent,'经验资料正在载入');
  if(entry.view==='routes')assert(app.el('#view-content').innerHTML.includes('项目培养简介正在载入'));
 });
 for(const mode of ['404','fetch-reject','json-reject','malformed'])test(entry.file+' '+mode+' degrades only its own supplement',async()=>{
  const app=await boot({file:entry.file,mode});assertCore(app);assertAvailableSiblings(app,entry.file);app.view(entry.view);
  if(entry.view==='materials'){assert.equal(app.el('#result-count').textContent,catalog.materials.length+' 组材料要求');assert(app.el('#view-content').innerHTML.includes('补充材料资料暂未载入'));}
  if(entry.view==='experiences'){assert.equal(app.el('#result-count').textContent,'经验资料暂未载入');assert(app.el('#view-content').innerHTML.includes('经验资料暂时无法读取'));}
  if(entry.view==='routes'){assert.equal(app.el('#result-count').textContent,projectCount+' 个学位项目');assert(app.el('#view-content').innerHTML.includes('项目培养简介暂未载入'));}
  if(entry.view==='advisors'){app.detail('advisor',profileId);assert(app.el('#detail-content').innerHTML.includes('专业简介待补充'));assert(app.el('#detail-content').innerHTML.includes('研究方向与代表工作'));}
 });
 for(const mode of ['fetch-late','json-late'])test(entry.file+' '+mode+' respects newer navigation and appears on return',async()=>{
  const app=await boot({file:entry.file,mode});assertCore(app);app.view('sources');const before=app.el('#view-content').innerHTML,writes=app.el('#view-content').writes;
  await app.complete();assert.equal(location.hash,'#sources');assert.equal(app.el('#view-content').innerHTML,before);assert.equal(app.el('#view-content').writes,writes);assert(!app.el('#detail-dialog').open);
  app.view(entry.view);entry.loaded(app);
 });
 test(entry.file+' late rejection remains contained and usable',async()=>{
  const app=await boot({file:entry.file,mode:'fetch-late'});app.view('sources');const writes=app.el('#view-content').writes;await app.complete(true);assert.equal(location.hash,'#sources');assert.equal(app.el('#view-content').writes,writes);app.view('advisors');assertCore(app);
 });
 test(entry.file+' optional render exception retains data for later navigation',async()=>{
  const app=await boot({file:entry.file,mode:'fetch-late',hash:'#'+entry.view});const warnings=[],warn=console.warn;console.warn=(...args)=>warnings.push(args);
  try{app.el('#view-content').failWrites=1;await app.complete();}finally{console.warn=warn;}
  assert.equal(warnings.length,1);assert(!app.el('#view-content').innerHTML.includes('暂时无法读取数据'));app.view('sources');app.view(entry.view);entry.loaded(app);
 });
}
test('all four supplements can remain pending while core pages and filters work',async()=>{
 const app=await boot({allPending:true});assertCore(app);assert(files.every(entry=>app.requests.includes(entry.file)));
 app.change('institution','HKU');assert.notEqual(app.el('#result-count').textContent,opportunityCount);app.view('routes');assert.equal(app.el('#result-count').textContent,projectCount+' 个学位项目');app.view('deadlines');assert(app.el('#view-content').innerHTML.length>0);app.view('advisors');assert.equal(app.el('#institution-filter').value,'HKU');
});
for(const entry of files.filter(entry=>entry.kind)){
 test(entry.file+' updates an active matching detail without resetting scroll',async()=>{
  const app=await boot({file:entry.file,mode:'fetch-late'});app.detail(entry.kind,entry.id);const before=app.el('#detail-content').innerHTML,opens=app.el('#detail-dialog').opens;app.el('#detail-dialog').scrollTop=207;await app.complete();assert.notEqual(app.el('#detail-content').innerHTML,before);assert.equal(app.el('#detail-dialog').scrollTop,207);assert.equal(app.el('#detail-dialog').opens,opens);assert(app.el('#detail-dialog').open);
 });
 test(entry.file+' does not reopen a dismissed detail even while its hash remains',async()=>{
  const app=await boot({file:entry.file,mode:'fetch-late'});app.detail(entry.kind,entry.id);app.el('#detail-dialog').close();const writes=app.el('#detail-content').writes;await app.complete();assert(!app.el('#detail-dialog').open);assert.equal(app.el('#detail-content').writes,writes);
 });
 test(entry.file+' does not overwrite a newer unrelated detail',async()=>{
  const app=await boot({file:entry.file,mode:'fetch-late'});app.detail(entry.kind,entry.id);const other=entry.kind==='advisor'?files[3]:files[2];app.detail(other.kind,other.id);const html=app.el('#detail-content').innerHTML,writes=app.el('#detail-content').writes;await app.complete();assert.equal(app.el('#detail-content').innerHTML,html);assert.equal(app.el('#detail-content').writes,writes);
 });
 test(entry.file+' detail render failure stays contained and can be reopened',async()=>{
  const app=await boot({file:entry.file,mode:'fetch-late'});app.detail(entry.kind,entry.id);const warnings=[],warn=console.warn;console.warn=(...args)=>warnings.push(args);
  try{app.el('#detail-content').failWrites=1;await app.complete();}finally{console.warn=warn;}
  assert.equal(warnings.length,1);app.view('sources');app.detail(entry.kind,entry.id);assert(!app.el('#detail-content').innerHTML.includes('未找到这条'));assert(app.el('#detail-dialog').open);
 });
}
test('late experience data restores the latest reading route rather than a stale list',async()=>{
 const app=await boot({file:'application-experiences.json',mode:'fetch-late',hash:'#experiences'});assert.equal(app.el('#result-count').textContent,'经验资料正在载入');app.view('experiences/'+experienceId);await app.complete();assert.equal(location.hash,'#experiences/'+experienceId);assert.equal(app.el('#results-title').textContent,data('application-experiences.json').records[0].title);assert(!app.el('#view-content').innerHTML.includes('经验资料正在载入'));
});
test('late project summaries refresh only an open current comparison',async()=>{
 const app=await boot({file:'project-summaries.json',mode:'fetch-late'});app.view('routes/compare/'+projectIds.join(','));assert(app.el('#compare-dialog').open);const before=app.el('#compare-content').innerHTML;await app.complete();assert.notEqual(app.el('#compare-content').innerHTML,before);assert(app.el('#compare-dialog').open);
 const closed=await boot({file:'project-summaries.json',mode:'fetch-late'});closed.view('routes/compare/'+projectIds.join(','));closed.el('#compare-dialog').close();const writes=closed.el('#compare-content').writes;await closed.complete();assert(!closed.el('#compare-dialog').open);assert.equal(closed.el('#compare-content').writes,writes);
});
for(const [file,mode] of [['catalog.json','404'],['catalog.json','fetch-reject'],['catalog.json','json-reject'],['catalog.json','malformed'],['ra-positions.json','404'],['update-status.json','json-reject']])test('critical '+file+' '+mode+' keeps the explicit startup error',async()=>{
 const app=await boot({file,mode});assert.equal(app.el('#result-count').textContent,'数据未能载入');assert(app.el('#view-content').innerHTML.includes('暂时无法读取数据'));assert(app.el('#view-content').innerHTML.includes('公开数据文件'));assert(files.every(entry=>!app.requests.includes(entry.file)));
});
test('late profiles preserve the existing PhD reference section',async()=>{
 const referenceIds=new Set(catalog.routes.filter(route=>route.status==='reference'&&route.degree==='PhD').map(route=>route.id));const advisor=catalog.advisors.find(advisor=>advisor.routeIds?.some(id=>referenceIds.has(id)));assert(advisor,'Shipped PhD reference association');
 const app=await boot({file:'advisor-profiles.json',mode:'fetch-late'});app.detail('advisor',advisor.id);assert(app.el('#detail-content').innerHTML.includes('博士项目参考'));await app.complete();assert(app.el('#detail-content').innerHTML.includes('博士项目参考'));assert(app.el('#detail-content').innerHTML.includes('不自动计入已核实学位关联'));
});

test('late materials refresh the active project summary from any originating view and preserve scroll',async()=>{
 for(const view of ['routes','advisors']){
  const app=await boot({file:'material-summaries.json',mode:'fetch-late'});app.detail('project',projectIds[0],view);const hash=location.hash;app.el('#detail-dialog').scrollTop=147;
  assert(app.el('#detail-content').innerHTML.includes('独立材料摘要尚待补充'));await app.complete();assert(app.el('#detail-content').innerHTML.includes(materialId));assert(!app.el('#detail-content').innerHTML.includes('独立材料摘要尚待补充'));assert.equal(location.hash,hash);assert.equal(app.el('#detail-dialog').scrollTop,147);
 }
});
test('late rejected materials keep the active project summary honest and core usable',async()=>{
 const app=await boot({file:'material-summaries.json',mode:'fetch-late'});app.detail('project',projectIds[0]);await app.complete(true);assert(app.el('#detail-content').innerHTML.includes('独立材料摘要尚待补充'));assert(!app.el('#detail-content').innerHTML.includes(materialId));app.view('materials');assert(app.el('#view-content').innerHTML.includes('补充材料资料暂未载入'));app.view('advisors');assertCore(app);
});
test('late materials cannot reopen a dismissed project summary or overwrite a newer detail',async()=>{
 const closed=await boot({file:'material-summaries.json',mode:'fetch-late'});closed.detail('project',projectIds[0]);closed.el('#detail-dialog').close();const writes=closed.el('#detail-content').writes;await closed.complete();assert(!closed.el('#detail-dialog').open);assert.equal(closed.el('#detail-content').writes,writes);
 const newer=await boot({file:'material-summaries.json',mode:'fetch-late'});newer.detail('project',projectIds[0]);newer.detail('advisor',profileId);const html=newer.el('#detail-content').innerHTML;await newer.complete();assert.equal(newer.el('#detail-content').innerHTML,html);
});
test('late materials refresh an active comparison but respect dismissal and newer navigation',async()=>{
 const active=await boot({file:'material-summaries.json',mode:'fetch-late'});active.view('routes/compare/'+projectIds.join(','));const html=active.el('#compare-content').innerHTML;active.el('#compare-dialog').scrollTop=149;await active.complete();assert.notEqual(active.el('#compare-content').innerHTML,html);assert.equal(active.el('#compare-dialog').scrollTop,149);assert(active.el('#compare-dialog').open);
 for(const dismiss of ['close','navigate']){
  const app=await boot({file:'material-summaries.json',mode:'fetch-late'});app.view('routes/compare/'+projectIds.join(','));if(dismiss==='close')app.el('#compare-dialog').close();else app.view('sources');const writes=app.el('#compare-content').writes;await app.complete();assert(!app.el('#compare-dialog').open);assert.equal(app.el('#compare-content').writes,writes);if(dismiss==='navigate')assert.equal(location.hash,'#sources');
 }
});
test('late material comparison render failure stays contained and loaded requirements appear on reopening',async()=>{
 const app=await boot({file:'material-summaries.json',mode:'fetch-late'});app.view('routes/compare/'+projectIds.join(','));const before=app.el('#compare-content').innerHTML,warnings=[],warn=console.warn;console.warn=(...args)=>warnings.push(args);
 try{app.el('#compare-content').failWrites=1;await app.complete();}finally{console.warn=warn;}
 assert.equal(warnings.length,1);assert.equal(app.el('#compare-content').innerHTML,before);app.view('sources');app.view('routes/compare/'+projectIds.join(','));assert.notEqual(app.el('#compare-content').innerHTML,before);assert(app.el('#compare-dialog').open);
});

// Explicit network fixture: the shipped catalog/profile corpus remains unchanged.
test('an explicitly absent pending-adviser supplement retains honest fallback and no verified opportunity',async()=>{
 const id='cuhk_zhongyu_li',shipped=data('advisor-profiles.json');
 assert.equal(shipped.profiles.length,334);assert(shipped.profiles.some(profile=>profile.advisorId===id));
 assert(!opportunities.some(row=>row.advisorId===id));assert(browseAdvisors(catalog).some(advisor=>advisor.id===id));
 const app=await boot({file:'advisor-profiles.json',mode:'profile-absent',missingProfileId:id});
 assertCore(app);app.detail('advisor',id);const html=app.el('#detail-content').innerHTML;
 assert(html.includes('专业简介待补充'));assert(html.includes('研究方向与代表工作'));assert(html.includes('<dt>MSc</dt>'));assert(!html.includes('data-profile-advisor'));
 app.detail('advisor',profileId);assert(app.el('#detail-content').innerHTML.includes('data-profile-advisor="'+profileId+'"'));
 assert.deepEqual(data('advisor-profiles.json'),shipped);
});
