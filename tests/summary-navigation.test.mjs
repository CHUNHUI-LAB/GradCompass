import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
// Fully synthetic fixtures: never copy public contact/profile data into this test.
class Element{constructor(){this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.listeners={};this.attrs={};this.open=false;this.opens=0;this.classList={toggle(){}};}addEventListener(k,f){this.listeners[k]=f}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}focus(){document.activeElement=this}showModal(){this.open=true;this.opens++}close(){this.open=false}}
const nodes=new Map();const el=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s)};const events={};const navigation={};
globalThis.document={querySelector:el,querySelectorAll:()=>[],getElementById:id=>el('#'+id),addEventListener:(k,f)=>events[k]=f,activeElement:{tagName:'BODY'}};globalThis.window={addEventListener:(k,f)=>navigation[k]=f};globalThis.location={hash:''};
const route={id:'sample-project',program:'Sample MSc',institution:'Example University',degree:'MSc',status:'verified',bachelorEligible:true,noTuimianRequired:true,noMasterRequired:true,eligibilitySummary:'Sample degree condition',requirements:[{text:'Sample language condition'}],sources:[{url:'https://example.org/program'}]};
const date={id:'sample-date',title:'Sample date',institution:'Example University',routeIds:[route.id],date:'2027-01-10',status:'unknown',sources:[{url:'https://example.org/date'}]};
const material={id:'sample-material',title:'Sample material',institution:'Example University',routeIds:[route.id],requirement:'Sample statement condition',scope:'Sample batch',sources:[{url:'https://example.org/material'}]};
const experience={id:'sample-experience',title:'Sample experience',url:'https://example.org/experience',platform:'Sample source',author:'Example author',applicableCycle:'Historical cycle',background:'Bachelor',authorContext:'Synthetic background',outcome:'Self-reported outcome',summary:'Preparation example',readScope:'Main text only',dateNote:'Publication unknown',bachelorApplicability:'Methods only',commercialDisclosure:'Not assessed',checkedAt:'2026-10-01',evidenceType:'first_person_self_report',rulesImpact:'none',collection:'bachelor',actionableMethods:['Plan ahead'],excludedClaims:['Success guarantees']};
const fixture={metadata:{checkedDate:'2026-10-01'},advisors:[],routes:[route],deadlines:[date],materials:[material],raPositions:[],profiles:[]};
globalThis.fetch=async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('application-experiences.json')?{schemaVersion:1,records:[experience]}:String(url).endsWith('update-status.json')?{statusLabel:'Test fixture'}:fixture});
await import('../assets/app.js');await new Promise(r=>setImmediate(r));const view=name=>{location.hash='#'+name;navigation.hashchange()};
const summary=(kind,id)=>events.click({target:{closest:s=>s==='[data-summary-kind]'?{dataset:{summaryKind:kind,summaryId:id}}:null}});
const close=()=>events.click({target:{closest:s=>s==='[data-close]'?{dataset:{close:'detail-dialog'}}:null}});
const change=(name,value)=>{el('#'+name+'-filter').value=value;el('#'+name+'-filter').listeners.change({target:el('#'+name+'-filter')})};
test('project, date and material cards first open in-site summaries and preserve page state',()=>{for(const [viewId,kind,id] of [['routes','project',route.id],['deadlines','deadline',date.id],['materials','material',material.id]]){view(viewId);const list=el('#view-content').innerHTML;assert(list.includes(`data-summary-kind="${kind}"`));assert(!list.includes('target="_blank"'));const oldHash=location.hash;summary(kind,id);assert(el('#detail-dialog').open);assert(el('#detail-content').innerHTML.includes('打开官网'));assert.equal(location.hash,oldHash+'/summary/'+kind+'/'+id);assert.equal(el('#view-content').innerHTML,list);const opens=el('#detail-dialog').opens;summary(kind,id);assert.equal(el('#detail-dialog').opens,opens);close();assert(!el('#detail-dialog').open);assert.equal(el('#view-content').innerHTML,list);}});
test('related record links stay in the same dialog and invalid records do nothing',()=>{view('deadlines');summary('deadline',date.id);summary('project',route.id);assert.equal(el('#detail-kind').textContent,'项目摘要');assert(el('#detail-content').innerHTML.includes('data-summary-kind="material"'));summary('material',material.id);assert.equal(el('#detail-kind').textContent,'材料摘要');summary('project',route.id);assert(el('#detail-content').innerHTML.includes('Sample MSc'));const old=el('#detail-content').innerHTML;summary('project','missing');assert.equal(el('#detail-content').innerHTML,old);close();summary('project','missing');assert(!el('#detail-dialog').open);});
test('experience link enters a complete in-site reading page without a dialog',()=>{view('experiences');assert(!el('#view-content').innerHTML.includes('target="_blank"'));assert(el('#view-content').innerHTML.includes('href="#experiences/sample-experience"'));view('experiences/'+experience.id);assert(!el('#detail-dialog').open);const h=el('#view-content').innerHTML;assert(h.includes(experience.outcome));assert(h.includes('href="https://example.org/experience"'));assert(h.indexOf('可借鉴的做法')<h.indexOf('查看原帖'));assert.equal(location.hash,'#experiences/sample-experience');view('experiences');assert.equal(el('#result-count').textContent,'1 条申请经验');});
test('plain filter names and degree options keep their underlying semantics',()=>{view('advisors');const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const text of ['申请类型','研究方向','招生信息','MSc · 理学硕士','MPhil · 研究型硕士','PhD · 博士','RA 是研究助理工作岗位'])assert(html.includes(text));change('opening','explicit');change('opportunity','RA');assert.equal(el('#opening-filter-name').textContent,'招聘信息');assert(el('#opening-filter').innerHTML.includes('已发布岗位招聘'));assert.equal(el('#opening-filter').value,'explicit');change('opportunity','PhD');assert.equal(el('#opening-filter-name').textContent,'招生信息');assert.equal(el('#opening-filter').value,'explicit');el('#reset-filters').listeners.click();assert.equal(el('#opening-filter').value,'');});
test('materials coverage describes the actual stored records',()=>{view('materials');assert(el('#view-content').innerHTML.includes('独立材料记录仅覆盖Example University'));assert(el('#view-content').innerHTML.includes('其他学校的材料清单尚待补充'));assert(!el('#view-content').innerHTML.includes('本科路径已核实'));});

test('new navigation dismisses an open summary rather than leaving an old overlay',()=>{view('routes');summary('project',route.id);assert(el('#detail-dialog').open);view('experiences');assert(!el('#detail-dialog').open);assert.equal(el('#results-title').textContent,'申请经验');});

test('unavailable material supplement is explicit and preserves original material records',()=>{view('materials');assert(el('#view-content').innerHTML.includes('补充材料资料暂未载入'));assert(el('#view-content').innerHTML.includes(material.requirement));assert(!el('#view-content').innerHTML.includes('完整覆盖'));assert.equal(el('#result-count').textContent,'1 组材料要求');view('routes');assert(el('#view-content').innerHTML.includes(route.program));});


test('summary history restores nested records and closes to the filtered result without reopening on Back',()=>{
 view('routes');change('opportunity','MSc');const original=el('#view-content').innerHTML;
 const entries=[{hash:'#advisors',state:null},{hash:'#routes',state:null}];let index=1;
 window.history={get state(){return entries[index].state},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;location.hash=hash},replaceState(state,title,hash){entries[index]={state,hash};location.hash=hash},go(offset){index+=offset;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange()},back(){this.go(-1)}};
 summary('project',route.id);assert.equal(window.history.state.gradDetailDepth,1);const projectHash=location.hash;
 summary('project',route.id);assert.equal(entries.length,3,'repeated click adds no duplicate history');
 summary('material',material.id);assert.equal(window.history.state.gradDetailDepth,2);assert.equal(el('#detail-back').textContent,'← 返回上一条摘要');
 window.history.back();assert.equal(location.hash,projectHash);assert.equal(el('#detail-kind').textContent,'项目摘要');assert(el('#detail-dialog').open);
 window.history.go(1);assert.equal(el('#detail-kind').textContent,'材料摘要');el('#detail-back').listeners.click();assert.equal(el('#detail-kind').textContent,'项目摘要');
 close();assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open);assert.equal(el('#opportunity-filter').value,'MSc');assert.equal(el('#view-content').innerHTML,original);
 window.history.back();assert.equal(location.hash,'#advisors');assert(!el('#detail-dialog').open,'Back after close does not reopen obsolete overlay');
 window.history.go(1);summary('project',route.id);el('#detail-dialog').listeners.cancel({preventDefault(){}});assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open,'Escape returns to result history');
 window.history=null;
});

test('cold shared summary URL opens with a safe return to its result page',()=>{
 view('routes/summary/project/'+route.id);assert(el('#detail-dialog').open);assert.equal(el('#detail-kind').textContent,'项目摘要');assert.equal(el('#detail-back').textContent,'← 返回结果');
 el('#detail-back').listeners.click();assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open);
});


test('nested cold-shared summaries close and Escape to results without inserting a fake prior page',()=>{
 for(const action of ['close','escape']){
  view('routes/summary/project/'+route.id);
  const entries=[{hash:'#external-before',state:null},{hash:location.hash,state:null}];let index=1;
  window.history={get state(){return entries[index].state},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;location.hash=hash},replaceState(state,title,hash){entries[index]={state,hash};location.hash=hash},go(offset){index+=offset;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange()},back(){this.go(-1)}};
  summary('material',material.id);assert.equal(entries.length,3);assert.equal(el('#detail-back').textContent,'← 返回上一条摘要');
  window.history.back();assert.equal(el('#detail-kind').textContent,'项目摘要');window.history.go(1);assert.equal(el('#detail-kind').textContent,'材料摘要');
  if(action==='close')close();else el('#detail-dialog').listeners.cancel({preventDefault(){}});
  assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open);assert.equal(index,1);assert.equal(entries.length,3,'no artificial duplicate list entries');assert.equal(entries[0].hash,'#external-before','external predecessor is preserved');
  window.history.go(1);assert.equal(el('#detail-kind').textContent,'材料摘要');assert.equal(el('#detail-back').textContent,'← 返回结果');el('#detail-back').listeners.click();assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open);
  window.history=null;
 }
});


test('cold chain closure relabels earlier Forward entries according to the replaced results origin',()=>{
 view('routes/summary/project/'+route.id);
 const entries=[{hash:location.hash,state:null}];let index=0;
 window.history={get state(){return entries[index].state},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;location.hash=hash},replaceState(state,title,hash){entries[index]={state,hash};location.hash=hash},go(offset){index+=offset;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange()},back(){this.go(-1)}};
 summary('material',material.id);summary('project',route.id);close();assert.equal(location.hash,'#routes');
 window.history.go(1);assert.equal(el('#detail-kind').textContent,'材料摘要');assert.equal(el('#detail-back').textContent,'← 返回结果');
 window.history.go(1);assert.equal(el('#detail-kind').textContent,'项目摘要');assert.equal(el('#detail-back').textContent,'← 返回上一条摘要');
 el('#detail-back').listeners.click();assert.equal(el('#detail-back').textContent,'← 返回结果');el('#detail-back').listeners.click();assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open);
 window.history=null;
});


test('closing the cold origin after Back also relabels its surviving Forward summary',()=>{
 view('routes/summary/project/'+route.id);const entries=[{hash:location.hash,state:null}];let index=0;
 window.history={get state(){return entries[index].state},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;location.hash=hash},replaceState(state,title,hash){entries[index]={state,hash};location.hash=hash},go(offset){index+=offset;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange()},back(){this.go(-1)}};
 summary('material',material.id);window.history.back();assert.equal(el('#detail-kind').textContent,'项目摘要');close();assert.equal(location.hash,'#routes');
 window.history.go(1);assert.equal(el('#detail-kind').textContent,'材料摘要');assert.equal(el('#detail-back').textContent,'← 返回结果');el('#detail-back').listeners.click();assert.equal(location.hash,'#routes');assert(!el('#detail-dialog').open);window.history=null;
});
