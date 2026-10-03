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
const advisor={id:'sample-advisor',institution:'HKU',name:'Sample Researcher',position:'Assistant Professor',department:'Robotics',summary:'robot learning and SLAM',topics:['robot learning'],eligibility:'verified',routeIds:[route.id],openingDetails:[{degree:'MSc',status:'explicit'}]};
const catalog={metadata:{checkedDate:'2026-10-01'},advisors:[advisor],routes:[route],materials:[{id:'sample-material',institution:'HKU',title:'Sample statement',routeIds:[route.id],sources:[{url:'https://example.org/material'}]}],deadlines:[{id:'sample-date',institution:'HKU',title:'Sample deadline',date:'2027-01-10',routeIds:[route.id],sources:[{url:'https://example.org/date'}]}]};
let releaseProjects;const projectsReady=new Promise(resolve=>releaseProjects=resolve);
globalThis.fetch=async url=>{const name=new URL(url).pathname.split('/').pop();if(name==='project-summaries.json')await projectsReady;return{ok:true,json:async()=>name==='catalog.json'?catalog:name==='update-status.json'?{statusLabel:'Synthetic fixture'}:name==='ra-positions.json'?{raPositions:[]}:{records:[]}}};
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

test('empty feedback stays hidden; each current-page field uses its native visible label',()=>{
 assert(row().hidden);assert.equal(chips().length,0);
 search('Sample');change('institution','HKU');change('rank','assistant');change('topic','机器人学习');change('opportunity','MSc');change('opening','explicit');
 assert(!row().hidden);assert.equal(chips().length,6);assert(row().innerHTML.includes('筛选 6 项'));
 for(const [key,label] of [['query','关键词：Sample'],['institution','学校：香港大学'],['rank','导师职级：助理教授 · Assistant Professor'],['topic','研究方向：机器人学习'],['opportunityType','申请类型：MSc · 理学硕士'],['opening','招生信息：已找到招生说明']])assert(chip(key).textContent.includes(label));
 assert.equal(document.activeElement,el('#opening-filter'),'select changes retain native control focus');
 assert.equal(el('#result-count').textContent,'1 条机会 · 1 位导师');reset();
});

test('keywords and option labels are escaped as text in visible and accessible chip labels',()=>{
 const query='"\'><img src=x onerror=alert(1)> & <script>test</script>';
 search(query);assert.equal(chips().length,1);assert(!row().innerHTML.includes('<img'));assert(!row().innerHTML.includes('<script>'));assert(row().innerHTML.includes('&lt;img'));assert(row().innerHTML.includes('&quot;'));assert(row().innerHTML.includes('&#39;'));assert(row().innerHTML.includes('&amp;'));
 assert.equal(chip('query').attrs['aria-label'],'移除关键词筛选：'+query);assert.equal(document.activeElement,el('#search'));
 el('#institution-filter').options.push({value:'test-label',textContent:'Example <Lab> & "School"'});change('institution','test-label');assert(row().innerHTML.includes('Example &lt;Lab&gt; &amp; &quot;School&quot;'));reset();
});

test('single removal retains other conditions and moves focus to a neighbor, then search',()=>{
 search('Sample');change('institution','HKU');change('rank','assistant');
 const old=chip('institution');remove('institution');assert.equal(el('#institution-filter').value,'');assert.equal(el('#search').value,'Sample');assert.equal(el('#rank-filter').value,'assistant');assert.equal(document.activeElement,chip('rank'));assert.equal(chips().length,2);
 row().listeners.click({target:old});assert.equal(chips().length,2,'repeated stale activation is harmless');
 remove('rank');assert.equal(document.activeElement,chip('query'));remove('query');assert(row().hidden);assert.equal(document.activeElement,el('#search'));assert.equal(el('#result-count').textContent,'1 条机会 · 1 位导师');
});

test('typing never steals focus and an unchanged render preserves the focused chip node',()=>{
 search('S');assert.equal(document.activeElement,el('#search'));search('Sa');assert.equal(document.activeElement,el('#search'));search('Sample');assert.equal(document.activeElement,el('#search'));
 const original=chip('query'),writes=row().writes;original.focus();el('#search').listeners.input({target:el('#search')});assert.equal(chip('query'),original);assert.equal(row().writes,writes);assert.equal(document.activeElement,original);reset();
});

test('zero results keep a one-click way to relax a single condition',()=>{
 change('institution','HKU');search('no-matching-record');assert.equal(el('#result-count').textContent,'0 条机会 · 0 位导师');assert(el('#view-content').innerHTML.includes('点击上方已选条件可单独移除'));assert.equal(chips().length,2);
 remove('query');assert.equal(el('#result-count').textContent,'1 条机会 · 1 位导师');assert.equal(el('#institution-filter').value,'HKU');assert.equal(document.activeElement,chip('institution'));reset();
});

test('view-specific chips and clear-all preserve inactive page filters and comparison selection',()=>{
 dataClick('[data-compare]',{compare:'sample-advisor::sample-msc'});const selected=el('#compare-names').textContent;
 change('institution','HKU');change('rank','assistant');change('opportunity','MSc');
 view('routes');assert(row().hidden);assert.equal(el('#rank-filter').value,'');search('Sample');change('opportunity','MSc');assert.equal(chips().length,2);assert(chip('opportunityType').textContent.includes('学位类型：MSc · 理学硕士'));assert(!chip('rank'));
 clear();assert(row().hidden);assert.equal(document.activeElement,el('#search'));assert.equal(el('#compare-names').textContent,'');assert(el('#compare-tray').hidden);assert.equal(el('#compare-count').textContent,'已选 0 / 3 个项目');
 view('advisors');assert.equal(el('#compare-names').textContent,selected);assert.equal(chips().length,3);assert.equal(el('#rank-filter').value,'assistant');assert.equal(el('#opportunity-filter').value,'MSc');clear();assert.equal(el('#compare-count').textContent,'已选 1 / 3 项机会');
 view('materials');change('opportunity','MSc');assert.equal(chips().length,1);assert(chip('opportunityType').textContent.includes('适用学位：MSc · 理学硕士'));clear();view('advisors');
});

test('deadline removal focuses the visible school select and ignores unsupported query/rank changes',()=>{
 view('deadlines');change('institution','HKU');search('ignored');change('rank','assistant');assert.equal(chips().length,1);assert(!chip('query'));assert(!chip('rank'));remove('institution');assert(row().hidden);assert.equal(document.activeElement,el('#institution-filter'));assert.equal(el('#result-count').textContent,'1 项日期记录');view('advisors');
});

test('recruitment labels follow RA employment terminology while the condition remains selected',()=>{
 change('opening','explicit');change('opportunity','RA');assert.equal(chips().length,2);assert(chip('opening').textContent.includes('招聘信息：已发布岗位招聘'));assert(el('#view-content').innerHTML.includes('暂无已核实本科可任职的 RA 岗位'));assert(el('#view-content').innerHTML.includes('未收录不表示没有岗位'));assert(!el('#view-content').innerHTML.includes('目录中仍有已核实岗位'));
 remove('opportunityType');assert.equal(el('#opening-filter').value,'explicit');assert(chip('opening').textContent.includes('招生信息：已找到招生说明'));reset();
});

test('feedback is hidden in details, experiences, reading and sources, then restored with page state',()=>{
 change('institution','HKU');dataClick('[data-detail]',{detail:'sample-advisor::sample-msc'});assert(el('#detail-dialog').open);assert(row().hidden);dataClick('[data-close]',{close:'detail-dialog'});assert(!row().hidden);assert.equal(chips().length,1);
 for(const destination of ['experiences','experiences/missing','sources']){view(destination);assert(row().hidden);assert.equal(chips().length,0);view('advisors');assert(!row().hidden);assert.equal(el('#institution-filter').value,'HKU');}
 view('routes');change('opportunity','MSc');dataClick('[data-summary-kind]',{summaryKind:'project',summaryId:route.id});assert(row().hidden);view('sources');assert(row().hidden);view('routes');assert(!row().hidden);assert.equal(chips().length,1);reset();view('advisors');reset();
});

test('async project refresh preserves active-chip keyboard focus and visible labels',async()=>{
 view('routes');change('opportunity','MSc');const original=chip('opportunityType');original.focus();const writes=row().writes;releaseProjects();await new Promise(resolve=>setImmediate(resolve));assert.equal(chip('opportunityType'),original);assert.equal(document.activeElement,original);assert.equal(row().writes,writes);assert(chip('opportunityType').textContent.includes('学位类型：MSc · 理学硕士'));reset();
});

test('feedback uses semantic native actions, bounded color transitions, wrapping and reduced-motion opt-out',()=>{
 assert.match(html,/<div id="active-filters"[^>]*role="group"[^>]*aria-label="当前筛选条件"[^>]*hidden/);
 assert(html.indexOf('id="result-count"')<html.indexOf('id="active-filters"'));assert(html.indexOf('id="active-filters"')<html.indexOf('id="view-description"'));
 const css=fs.readFileSync(new URL('../assets/style.css',import.meta.url),'utf8'),rules=css.match(/\.filter-chip\{[^}]+\}/)[0];
 assert.match(rules,/max-width:100%/);assert.match(css,/overflow-wrap:anywhere/);assert.match(css,/min-height:44px/);assert.match(css,/160ms ease/);assert(!rules.match(/transition:[^}]*\b(?:all|transform|height|width)\b/));assert(!rules.includes('animation:'));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*?transition:none!important/);
});


test('explicit empty-result recovery restores a visible filter instead of the removed button',()=>{
 view('advisors');reset();search('no matching record');const recovery=new Element('', 'BUTTON');recovery.focus();dataClick('[data-reset]',{});assert.equal(document.activeElement,el('#search'));assert.equal(el('#result-count').textContent,'1 条机会 · 1 位导师');
 view('deadlines');change('institution','missing-school');recovery.focus();dataClick('[data-reset]',{});assert.equal(document.activeElement,el('#institution-filter'));assert.equal(el('#result-count').textContent,'1 项日期记录');view('advisors');reset();
});
