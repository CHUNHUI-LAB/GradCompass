import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterDeadlines,buildOpportunities} from '../assets/core.js';
import {renderRecordSummary} from '../assets/record-summaries.js';

const read=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url)));
const realCatalog={...read('data/catalog.json'),raPositions:read('data/ra-positions.json').raPositions};
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
freeze(realCatalog);

test('real RA deadline projection preserves original source verification date without changing records or employment identity',()=>{
 const before=JSON.stringify(realCatalog),rows=filterDeadlines(realCatalog).filter(row=>row.jobId);
 assert.equal(rows.length,2);
 assert.equal(realCatalog.metadata.checkedDate,'2026-10-06');
 for(const row of rows){
  const job=realCatalog.raPositions.find(job=>job.id===row.jobId);
  assert.equal(row.checkedDate,'2026-10-01');
  assert.equal(row.checkedDate,job.currentRecruitment.checkedDate);
  assert.strictEqual(row.sources,job.currentRecruitment.sources);
  assert(row.sources.every(source=>source.checkedDate==='2026-10-01'));
  assert.deepEqual(row.routeIds,[]);
  assert.equal(row.id,job.id+'-deadline');
  assert.equal(row.date,job.currentRecruitment.deadline);
  assert.equal(buildOpportunities(realCatalog).find(item=>item.jobId===job.id).kind,'employment');
  const html=renderRecordSummary('deadline',row,realCatalog).html;
  assert(html.includes('来源核验日期：2026-10-01；'));
  assert(!html.includes('来源核验日期：2026-10-06'));
  assert(!html.includes('data-summary-kind="project"'));
  assert(html.includes(job.currentRecruitment.sources[0].url.replaceAll('&','&amp;')));
 }
 assert.equal(JSON.stringify(realCatalog),before);
});

test('RA date provenance prefers recruitment date, retains recorded job fallback, and never borrows the global date',()=>{
 const original=realCatalog.raPositions[0];
 for(const [recruitmentDate,jobDate,expected] of [
  ['2026-09-30','2026-10-01','2026-09-30'],
  [undefined,'2026-10-01','2026-10-01'],
  [null,'2026-10-01','2026-10-01'],
  [undefined,undefined,'未记录'],
  ['',null,'未记录'],
 ]){
  const job={...original,checkedDate:jobDate,currentRecruitment:{...original.currentRecruitment,checkedDate:recruitmentDate}};
  const catalog={...realCatalog,raPositions:[job]};
  const row=filterDeadlines(catalog).find(row=>row.jobId);
  assert.equal(row.checkedDate,expected);
  assert.strictEqual(row.sources,job.currentRecruitment.sources);
  assert(renderRecordSummary('deadline',row,catalog).html.includes('来源核验日期：'+expected+'；'));
 }
});

test('academic deadlines and RA eligibility gates remain unchanged',()=>{
 const rows=filterDeadlines(realCatalog),degreeOnly=filterDeadlines({...realCatalog,raPositions:[]});
 assert.deepEqual(rows.filter(row=>!row.jobId),degreeOnly);
 for(const row of degreeOnly)assert.strictEqual(row,realCatalog.deadlines.find(record=>record.id===row.id));
 const job=realCatalog.raPositions[0];
 for(const altered of [
  {...job,status:'unknown'},
  {...job,currentRecruitment:{...job.currentRecruitment,status:'closed'}},
  {...job,employmentEligibility:{...job.employmentEligibility,noMasterRequired:false}},
 ])assert.equal(filterDeadlines({...realCatalog,raPositions:[altered]}).filter(row=>row.jobId).length,0);
});

// Synthetic DOM-contract fixture: no real contact or profile data are copied.
class Element{
 constructor(){this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.listeners={};this.attrs={};this.open=false;this.opens=0;this.classList={toggle(){}};}
 addEventListener(key,fn){this.listeners[key]=fn;}
 setAttribute(key,value){this.attrs[key]=value;}
 removeAttribute(key){delete this.attrs[key];}
 focus(){document.activeElement=this;}
 showModal(){this.open=true;this.opens++;}
 close(){this.open=false;}
}
const nodes=new Map(),el=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);};
const events={},navigation={};
globalThis.document={querySelector:el,querySelectorAll:()=>[],getElementById:id=>el('#'+id),addEventListener:(key,fn)=>events[key]=fn,activeElement:{tagName:'BODY'}};
globalThis.window={addEventListener:(key,fn)=>navigation[key]=fn};
globalThis.location={hash:''};
const advisor={id:'example-advisor',name:'Example Researcher',institution:'Example University',department:'Example Department',position:'Professor',routeIds:[],openingDetails:[],topics:[],sources:[],checkedDate:'2026-10-05'};
const job={id:'example-job',advisorId:advisor.id,institution:advisor.institution,opportunityType:'RA',title:'RA: Example employment',jobReference:'Example Ref',status:'verified',checkedDate:'2026-10-02',employmentEligibility:{bachelorEligible:true,noMasterRequired:true,explicitJobRequirement:true,sources:[{url:'https://example.org/job',label:'Job source'}]},currentRecruitment:{status:'open',checkedDate:'2026-10-01',deadline:'2027-01-07',sources:[{url:'https://example.org/job',label:'Recruitment source',checkedDate:'2026-10-01'}]},caveats:['RA is employment; degree admission is separate']};
const fixture={metadata:{checkedDate:'2026-10-06'},advisors:[advisor],routes:[],deadlines:[],materials:[],raPositions:[job]};
globalThis.fetch=async url=>{
 const name=new URL(url).pathname.split('/').at(-1);
 if(name==='catalog.json')return {ok:true,json:async()=>fixture};
 if(name==='ra-positions.json')return {ok:true,json:async()=>({raPositions:fixture.raPositions})};
 if(name==='update-status.json')return {ok:true,json:async()=>({statusLabel:'Synthetic test fixture'})};
 return {ok:false};
};
await import('../assets/app.js');
await new Promise(resolve=>setImmediate(resolve));
const view=name=>{location.hash='#'+name;navigation.hashchange();};
const summary=()=>events.click({target:{closest:selector=>selector==='[data-summary-kind]'?{dataset:{summaryKind:'deadline',summaryId:job.id+'-deadline'}}:null}});
const close=()=>events.click({target:{closest:selector=>selector==='[data-close]'?{dataset:{close:'detail-dialog'}}:null}});
const assertProvenance=expected=>{
 const html=el('#detail-content').innerHTML;
 assert(html.includes('来源核验日期：'+expected+'；'));
 assert(html.includes('<dt>核验日期</dt><dd>'+expected+'</dd>'));
 assert(!html.includes('2026-10-06'));
 assert(html.includes('href="https://example.org/job"'));
 assert(!html.includes('学位类型'));
 assert(!html.includes('data-summary-kind="project"'));
};

test('RA deadline main content and rail retain source date through repeated opens, Close, and cold-link replay',()=>{
 view('deadlines');const list=el('#view-content').innerHTML;
 summary();assert(el('#detail-dialog').open);assertProvenance('2026-10-01');
 const opens=el('#detail-dialog').opens;summary();assert.equal(el('#detail-dialog').opens,opens);assertProvenance('2026-10-01');
 close();assert(!el('#detail-dialog').open);assert.equal(el('#view-content').innerHTML,list);
 view('deadlines/summary/deadline/'+job.id+'-deadline');assertProvenance('2026-10-01');
 el('#detail-back').listeners.click();assert.equal(location.hash,'#deadlines');assert(!el('#detail-dialog').open);
});

test('RA deadline missing provenance is explicit in both main content and rail',()=>{
 const recruitmentDate=job.currentRecruitment.checkedDate,jobDate=job.checkedDate;
 delete job.currentRecruitment.checkedDate;delete job.checkedDate;
 try{view('deadlines/summary/deadline/'+job.id+'-deadline');assertProvenance('未记录');close();}
 finally{job.currentRecruitment.checkedDate=recruitmentDate;job.checkedDate=jobDate;}
});

test('RA job detail stays an employment record rather than a degree programme',()=>{
 const opportunity=buildOpportunities(fixture).find(row=>row.jobId===job.id);
 assert.equal(opportunity.kind,'employment');assert.equal(opportunity.routeId,undefined);
 view('advisors');
 events.click({target:{closest:selector=>selector==='[data-detail]'?{dataset:{detail:opportunity.id}}:null}});
 const html=el('#detail-content').innerHTML;
 for(const text of ['data-reading-kind="ra"','RA 工作岗位','RA 为受雇科研岗位，不授予学位录取资格','RA 岗位信息'])assert(html.includes(text));
 assert(!html.includes('data-reading-kind="project"'));
 close();
});
