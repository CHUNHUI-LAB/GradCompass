// DOM-contract regression: native layout, touch, and screen-reader behavior need browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
class Element{
 constructor(id='',tagName='DIV'){this.id=id;this.tagName=tagName;this.value='';this.hidden=false;this.textContent='';this.listeners={};this.attrs={};this.dataset={};this.open=false;this.disabled=false;this.options=[];this.children=[];this.classList={toggle(){}};this._html='';this.writes=0;}
 set innerHTML(html){
  if(this.children.includes(globalThis.document?.activeElement))document.activeElement={tagName:'BODY'};
  this._html=html;this.writes++;this.children=[];
  if(this.tagName==='SELECT')this.options=[...html.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(([,value,textContent])=>({value:decode(value),textContent:decode(textContent)}));
  if(this.id==='active-filters')for(const [,attributes,content] of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
   const button=new Element('', 'BUTTON');button.parent=this;button.textContent=decode(content.replace(/<[^>]+>/g,''));
   const key=attributes.match(/data-remove-filter="([^"]+)"/)?.[1];if(key)button.dataset.removeFilter=key;
   if(attributes.includes('data-clear-filters'))button.dataset.clearFilters='';
   button.attrs['aria-label']=decode(attributes.match(/aria-label="([^"]*)"/)?.[1]||'');this.children.push(button);
  }
 }
 get innerHTML(){return this._html}
 get selectedOptions(){return this.options.filter(option=>option.value===this.value)}
 addEventListener(type,listener){this.listeners[type]=listener}
 setAttribute(key,value){this.attrs[key]=value}removeAttribute(key){delete this.attrs[key]}
 focus(){document.activeElement=this}scrollIntoView(){}
 showModal(){this.open=true}close(){this.open=false;this.listeners.close?.()}
 querySelector(selector){const key=selector.match(/^\[data-remove-filter="([^"]+)"\]$/)?.[1];return key?this.children.find(child=>child.dataset.removeFilter===key):null}
 closest(selector){return selector==='[data-remove-filter]'&&this.dataset.removeFilter?this:selector==='[data-clear-filters]'&&Object.hasOwn(this.dataset,'clearFilters')?this:null}
}
const nodes=new Map(),events={},navigation={};
const el=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element(selector.slice(1),selector.endsWith('-filter')?'SELECT':selector==='#search'?'INPUT':'DIV'));return nodes.get(selector)};
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const [,id,options] of html.matchAll(/<select id="([^"]+)">([\s\S]*?)<\/select>/g))el('#'+id).innerHTML=options;
globalThis.document={querySelector:el,querySelectorAll:s=>s==='dialog'?[el('#detail-dialog'),el('#compare-dialog')]:[],addEventListener:(type,listener)=>events[type]=listener,getElementById:id=>el('#'+id),activeElement:{tagName:'BODY'}};
globalThis.window={addEventListener:(type,listener)=>navigation[type]=listener};globalThis.location={hash:'#advisors'};
const route={id:'sample-msc',institution:'HKU',program:'Sample robotics MSc',degree:'MSc',status:'verified',bachelorEligible:true,noTuimianRequired:true,noMasterRequired:true,eligibilitySummary:'Synthetic requirement',sources:[{url:'https://example.org/program'}]};
const advisor={id:'sample-advisor',institution:'HKU',name:'Sample Researcher',position:'Assistant Professor',department:'Robotics',summary:'robot learning and SLAM',topics:['robot learning'],eligibility:'verified',routeIds:[route.id],routeAssociations:[{routeId:route.id,status:'verified',sources:[{url:'https://example.org/synthetic-advisor-project-association',checkedDate:'2026-10-01'}]}],openingDetails:[{degree:'MSc',status:'explicit'}]};
const catalog={metadata:{checkedDate:'2026-10-01'},advisors:[advisor],routes:[route],materials:[{id:'sample-material',institution:'HKU',title:'Sample statement',routeIds:[route.id],sources:[{url:'https://example.org/material'}]}],deadlines:[{id:'sample-date',institution:'HKU',title:'Sample deadline',date:'2027-01-10',routeIds:[route.id],sources:[{url:'https://example.org/date'}]}]};
let releaseProfiles;const profilesReady=new Promise(resolve=>releaseProfiles=resolve);
let releaseProjects;const projectsReady=new Promise(resolve=>releaseProjects=resolve);
globalThis.fetch=async url=>{const name=new URL(url).pathname.split('/').pop();if(name==='project-summaries.json')await projectsReady;if(name==='advisor-profiles.json')await profilesReady;return{ok:true,json:async()=>name==='advisor-profiles.json'?{profiles:[{advisorId:advisor.id,appointmentReview:{status:'verified',eventType:'first_faculty_research_appointment_current_institution',appointmentConfirmed:true,dateText:'2024 年',earliestDate:'2024-01-01',latestDate:'2024-12-31',careerContext:'early_career',noteZh:'Public synthetic CV',sources:[{url:'https://example.org/cv',title:'CV',checkedDate:'2026-10-10'}]}}]}:name==='catalog.json'?catalog:name==='update-status.json'?{statusLabel:'Synthetic fixture'}:name==='ra-positions.json'?{raPositions:[]}:{records:[]}}};
await import('../assets/app.js');await new Promise(resolve=>setImmediate(resolve));
const row=()=>el('#active-filters');
const chips=()=>row().children.filter(child=>child.dataset.removeFilter);
const chip=key=>chips().find(child=>child.dataset.removeFilter===key);
const change=(name,value)=>{const control=el('#'+name+'-filter');control.value=value;control.focus();control.listeners.change({target:control})};
const search=value=>{const control=el('#search');control.value=value;control.focus();control.listeners.input({target:control})};
const view=name=>{location.hash='#'+name;navigation.hashchange()};
const click=button=>{assert(button,'expected visible filter action');button.focus();row().listeners.click({target:button})};
const remove=key=>click(chip(key));
const clear=()=>click(row().children.find(child=>Object.hasOwn(child.dataset,'clearFilters')));
const dataClick=(selector,dataset)=>events.click({target:{closest:s=>s===selector?{dataset}:null}});
const reset=()=>el('#reset-filters').listeners.click();

test('appointment data loading, school/type combinations, chips and per-view state remain independent',async()=>{
 releaseProjects();view('advisors');reset();assert(el('#appointment-filter').disabled,'pending optional evidence cannot activate appointment filters');
 change('institution','HKU');const original=chip('institution');original.focus();releaseProfiles();await new Promise(resolve=>setImmediate(resolve));assert(!el('#appointment-filter').disabled);assert.equal(document.activeElement,original);
 change('appointment','recent');change('opportunity','MSc');assert.equal(chips().length,3);assert(chip('appointment').textContent.includes('入职时间：近五年入职'));assert.equal(el('#result-count').textContent,'1 位导师 · 1 条已核实学位关联 · 0 个 RA 岗位');
 assert(el('#view-content').innerHTML.includes('近五年入职'));assert(el('#view-content').innerHTML.includes('本校教研入职：2024 年'));
 change('appointment','earlier');assert.equal(el('#result-count').textContent,'0 位导师 · 0 条已核实学位关联 · 0 个 RA 岗位');remove('appointment');assert.equal(el('#result-count').textContent,'1 位导师 · 1 条已核实学位关联 · 0 个 RA 岗位');
 change('appointment','early_career');view('routes');assert(el('#appointment-filter-label').hidden);assert(!chip('appointment'));view('advisors');assert.equal(el('#appointment-filter').value,'early_career');assert(chip('appointment'));clear();assert.equal(el('#appointment-filter').value,'');assert(row().hidden);
});
