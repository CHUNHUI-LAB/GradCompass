// Current browse behavior against the pinned 5e7cd36 data fixture: 43 people / 34 projects, with 57 verified degree associations / 2 RA jobs.
// Legacy eligible-only 41-person / 28-project / 59-opportunity counts remain independently asserted in historical-source-baseline.test.mjs.
// Application DOM contracts only: these do not establish browser layout or native history QA.
import test from 'node:test';import assert from 'node:assert/strict';import fs from './historical-source-fs.mjs';
class Element{
 constructor(){this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.listeners={};this.attrs={};this.dataset={};this.open=false;this.disabled=false;this.classList={toggle(){}};}
 addEventListener(n,f){this.listeners[n]=f}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}showModal(){this.open=true}close(){this.open=false}focus(){document.activeElement=this;this.focused=true}scrollIntoView(){this.scrolled=true}querySelector(){return this.summary||(this.summary=new Element)}
}
const elements=new Map;const el=s=>{if(!elements.has(s))elements.set(s,new Element);return elements.get(s)};
const docListeners={},winListeners={};const navs=['advisors','routes','deadlines','materials','experiences','sources'].map(view=>{const x=new Element;x.dataset.view=view;return x});
globalThis.document={querySelector:el,querySelectorAll:s=>s==='[data-view]'?navs:s==='dialog'?[el('#detail-dialog'),el('#compare-dialog')]:[],addEventListener:(n,f)=>docListeners[n]=f,getElementById:id=>el('#'+id),activeElement:{tagName:'BODY'}};
globalThis.window={addEventListener:(n,f)=>winListeners[n]=f};globalThis.location={hash:'#routes'};
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)));
let releaseProjects;const projectsReady=new Promise(resolve=>releaseProjects=resolve);
globalThis.fetch=async url=>{const name=new URL(String(url)).pathname.split('/').pop();if(name==='project-summaries.json')await projectsReady;return{ok:true,json:async()=>read(name)}};
await import('../assets/app.js');await new Promise(resolve=>setImmediate(resolve));
const view=name=>{location.hash='#'+name;winListeners.hashchange()};
const change=(selector,value)=>{el(selector).value=value;el(selector).listeners.change({target:el(selector)})};
const click=(selector,dataset)=>docListeners.click({target:{closest:s=>s===selector?{dataset}:null}});

test('async project introductions refresh overview and list while preserving active filters',async()=>{
 assert(!el('#page-overview').hidden);assert(el('#page-overview').innerHTML.includes('正在载入'));change('#institution-filter','HKU');assert.equal(el('#result-count').textContent,'6 个学位项目');
 releaseProjects();await new Promise(resolve=>setImmediate(resolve));assert(el('#page-overview').innerHTML.includes('28 个项目有培养与研究简介'));assert.equal(el('#institution-filter').value,'HKU');assert.equal(el('#result-count').textContent,'6 个学位项目');assert(el('#view-content').innerHTML.includes('当前结果中 5 个有简介'));
});
test('overview remains page-wide under zero results and direct summary actions still work',()=>{
 view('routes');el('#search').listeners.input({target:{value:'no-matching-project-xyz'}});assert(el('#result-count').textContent.startsWith('0 '));assert(el('#page-overview').innerHTML.includes('全页 34 个项目'));
 click('[data-summary-kind]',{summaryKind:'project',summaryId:'HKUST-CSE-MPhil'});assert(el('#detail-dialog').open);assert(el('#detail-content').innerHTML.includes('培养与研究简介'));click('[data-close]',{close:'detail-dialog'});assert(!el('#detail-dialog').open);assert(el('#result-count').textContent.startsWith('0 '));
});
test('named quick filters deterministically replace only the current page filters',()=>{
 view('advisors');change('#institution-filter','HKU');change('#rank-filter','professor');click('[data-overview-preset]',{overviewPreset:'advisors-ra'});assert.equal(el('#result-count').textContent,'1 位导师 · 0 条已核实学位关联 · 2 个 RA 岗位');assert.equal(el('#institution-filter').value,'');assert.equal(el('#rank-filter').value,'');assert.equal(el('#opportunity-filter').value,'RA');assert(el('#view-content').focused);assert(el('#view-content').scrolled);
 click('[data-overview-preset]',{overviewPreset:'advisors-ra'});assert.equal(el('#result-count').textContent,'1 位导师 · 0 条已核实学位关联 · 2 个 RA 岗位');view('routes');assert(el('#result-count').textContent.startsWith('0 '));click('[data-overview-preset]',{overviewPreset:'routes-msc'});assert.equal(el('#result-count').textContent,'3 个学位项目');view('advisors');assert.equal(el('#opportunity-filter').value,'RA');assert.equal(el('#result-count').textContent,'1 位导师 · 0 条已核实学位关联 · 2 个 RA 岗位');
});
test('wrong-page or unknown overview presets cannot alter current page filters',()=>{
 const count=el('#result-count').textContent;click('[data-overview-preset]',{overviewPreset:'routes-mphil'});assert.equal(el('#result-count').textContent,count);click('[data-overview-preset]',{overviewPreset:'not-a-preset'});assert.equal(el('#result-count').textContent,count);
});
test('all five list pages show one overview and sources/detail pages show none',()=>{
 for(const page of ['advisors','routes','deadlines','materials','experiences']){view(page);assert(!el('#page-overview').hidden);assert.equal((el('#page-overview').innerHTML.match(/data-page-overview=/g)||[]).length,1);assert(el('#page-overview').innerHTML.includes(`data-page-overview="${page}"`));}
 view('experiences/grad-robotics-eth-xiang-2022');assert(el('#page-overview').hidden);assert.equal(el('#page-overview').innerHTML,'');assert(el('#view-content').innerHTML.includes('data-reading-experience'));
 view('experiences');assert(!el('#page-overview').hidden);assert(el('#page-overview').innerHTML.includes('experience-synthesis'));view('sources');assert(el('#page-overview').hidden);
});
test('experience synthesis action opens, focuses and scrolls to the retained full summary',()=>{
 view('experiences');assert(!el('#experience-synthesis').open);click('[data-overview-expand]',{overviewExpand:'experience-synthesis'});assert(el('#experience-synthesis').open);assert(el('#experience-synthesis').scrolled);assert(el('#experience-synthesis').summary.focused);assert.equal(location.hash,'#experiences');click('[data-overview-expand]',{overviewExpand:'experience-synthesis'});assert(el('#experience-synthesis').open);
});
test('repeated list/detail/list navigation keeps the original route contract and filter states',()=>{
 view('routes');assert.equal(el('#opportunity-filter').value,'MSc');view('materials');change('#institution-filter','CityUHK');assert(el('#result-count').textContent.startsWith('2 '));view('routes');assert.equal(el('#opportunity-filter').value,'MSc');assert.equal(el('#result-count').textContent,'3 个学位项目');view('materials');assert.equal(el('#institution-filter').value,'CityUHK');assert(el('#page-overview').innerHTML.includes('15 组摘要'));click('[data-summary-kind]',{summaryKind:'material',summaryId:'cuhk-mae-rpg-materials'});assert(el('#detail-dialog').open);view('deadlines');assert(!el('#detail-dialog').open);assert(el('#page-overview').innerHTML.includes('日期目录核验于 2026-10-01'));
});
