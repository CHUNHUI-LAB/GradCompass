import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
// Synthetic fixtures only: no public profile records or personal contact data.
class Element{constructor(){this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.listeners={};this.attrs={};this.classList={toggle(){}};}addEventListener(k,f){this.listeners[k]=f}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}focus(){document.activeElement=this}}
const nodes=new Map();const el=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s)};const events={};const navigation={};
globalThis.document={querySelector:el,querySelectorAll:()=>[],addEventListener:(k,f)=>events[k]=f,activeElement:{tagName:'BODY'}};globalThis.window={addEventListener:(k,f)=>navigation[k]=f};globalThis.location={hash:''};
const record={id:'sample-bachelor',title:'Synthetic preparation example',url:'https://example.org/bachelor',platform:'Sample source',author:'Example author',applicableCycle:'2020 historical cycle',background:'Bachelor',authorContext:'Synthetic background',outcome:'Self-reported outcome',summary:'Preparation example',readScope:'Main text only',dateNote:'Publication unknown',bachelorApplicability:'Methods only',commercialDisclosure:'Not assessed',checkedAt:'2026-10-01',evidenceType:'first_person_self_report',rulesImpact:'none',collection:'bachelor',actionableMethods:['Plan ahead'],excludedClaims:['Success guarantees']};
globalThis.fetch=async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('application-experiences.json')?{schemaVersion:1,records:[record,{...record,id:'sample-master',url:'https://example.org/master',collection:'cross-background'}]}:String(url).endsWith('update-status.json')?{statusLabel:'Test fixture'}:{metadata:{checkedDate:'2026-10-01'},advisors:[],routes:[],raPositions:[],profiles:[]}});
await import('../assets/app.js');await new Promise(r=>setImmediate(r));const view=name=>{location.hash='#'+name;navigation.hashchange()};
test('experience navigation shows all backgrounds independently and preserves advisor filters',()=>{el('#rank-filter').value='associate';el('#rank-filter').listeners.change({target:el('#rank-filter')});view('experiences');assert(el('.filters').hidden);assert(el('.search-surface').hidden);assert.equal(el('#results-title').textContent,'申请经验');assert.equal(el('#result-count').textContent,'2 条申请经验');assert(el('#view-content').innerHTML.includes('sample-bachelor'));assert(el('#view-content').innerHTML.includes('sample-master'));assert(!el('#view-content').innerHTML.includes('data-experience-scope'));view('experiences');assert.equal((el('#view-content').innerHTML.match(/class="experience-card"/g)||[]).length,2);view('advisors');assert(!el('.filters').hidden);assert.equal(el('#rank-filter').value,'associate');assert.equal(el('#result-count').textContent,'0 条机会 · 0 位导师');view('experiences');assert.equal(el('#result-count').textContent,'2 条申请经验');assert(el('#view-content').innerHTML.includes('sample-master'));});

test('navigation names explain the task while preserving existing hash URLs',()=>{const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const nav=html.match(/<nav aria-label="主导航">([\s\S]*?)<\/nav>/)[1];for(const [id,label,purpose] of [['advisors','找导师','看方向与招生'],['routes','找项目','查学位与条件'],['deadlines','申请日历','查截止日期'],['materials','准备材料','查官方材料要求'],['experiences','申请经验','看他人申请经历']]){assert(nav.includes(`href="#${id}" data-view="${id}"`));assert(nav.includes(`<span>${label}</span>`));assert(nav.includes(purpose));}assert.equal((nav.match(/data-view=/g)||[]).length,5);assert(!html.match(/<header[\s\S]*?<\/header>/)[0].includes('href="#sources"'));assert(html.match(/<footer>[\s\S]*?<\/footer>/)[0].includes('href="#sources" data-view="sources"'));});
test('every destination has a matching heading and an honest visible purpose',()=>{for(const [id,title,purpose] of [['advisors','找导师','同一导师可能有多条机会'],['routes','找项目','MSc、MPhil、PhD'],['deadlines','申请日历','未来截止日期不代表现在已开放申请'],['materials','准备材料','当期申请系统的完整清单'],['sources','数据说明与更新状态','核验范围']]){view(id);assert.equal(el('#results-title').textContent,title);assert(el('#view-description').textContent.includes(purpose));}view('routes');assert.equal(el('#result-count').textContent,'0 个学位项目');});
test('advisor filters do not enter degree or material pages, and return intact',()=>{view('advisors');el('#opportunity-filter').value='RA';el('#opportunity-filter').listeners.change({target:el('#opportunity-filter')});view('routes');assert.equal(el('#opportunity-filter').value,'');assert(!el('#view-content').innerHTML.includes('RA 是科研岗位，不是学位项目'));assert(el('#rank-filter-label').hidden);view('materials');assert(el('#view-content').innerHTML.includes('去找项目，查看申请条件'));assert(el('#view-content').innerHTML.includes('data-switch="routes"'));view('advisors');assert.equal(el('#opportunity-filter').value,'RA');el('#reset-filters').listeners.click();});
test('experience routes support direct reading, list return, and history-style navigation',()=>{view('experiences/sample-master');assert.equal(el('#results-title').textContent,record.title);assert(el('#view-content').innerHTML.includes('data-reading-experience="sample-master"'));assert(el('.intro').hidden);assert(el('.filters').hidden);assert(el('.search-surface').hidden);assert(el('#view-description').hidden);assert(!el('#detail-dialog').open);view('experiences');assert.equal(el('#result-count').textContent,'2 条申请经验');assert(!el('.intro').hidden);view('experiences/sample-master');assert(el('#view-content').innerHTML.includes('sample-master'));view('experiences/missing');assert.equal(el('#results-title').textContent,'未找到这篇经验');assert(el('#view-content').innerHTML.includes('href="#experiences"'));view('experiences/%E0%A4%A');assert.equal(el('#results-title').textContent,'未找到这篇经验');view('experiences');});

test('reading return restores the originating card scroll and focus across repeated history journeys',()=>{
 const entries=[{hash:'#experiences',state:null}];let index=0,frames=[],card,readLink;window.scrollY=6400;window.innerHeight=900;
 const oldAll=document.querySelectorAll;document.querySelectorAll=selector=>selector==='.experience-card'?[card]:oldAll(selector);
 readLink=new Element;readLink.getBoundingClientRect=()=>({top:300,bottom:350});readLink.scrollIntoView=()=>readLink.scrolled=true;
 card=new Element;card.dataset={experienceId:'sample-master'};card.querySelector=selector=>selector==='.experience-read-link'?readLink:null;
 window.scrollTo=({top})=>window.scrollY=top;window.requestAnimationFrame=fn=>frames.push(fn);const flush=()=>{while(frames.length)frames.shift()()};
 window.history={get state(){return entries[index].state},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;location.hash=hash},replaceState(state,title,hash){entries[index]={state,hash};location.hash=hash},go(n){index+=n;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange()}};
 view('advisors');location.hash='#experiences';navigation.hashchange();flush();
 const click=(hash,extra={})=>{let prevented=false;events.click({target:{closest:selector=>selector==='a[href]'?{getAttribute:()=>hash,hasAttribute:()=>false}:null},button:0,preventDefault(){prevented=true},...extra});return prevented};
 assert(click('#experiences/sample-master'));flush();assert.equal(el('#results-title').textContent,record.title);assert.equal(window.history.state.gradExperienceReturn.id,'sample-master');
 window.scrollY=700;navigation.scroll();assert(click('#experiences'));flush();assert.equal(window.scrollY,6400);assert.equal(document.activeElement,readLink);assert.equal(location.hash,'#experiences');
 window.history.go(-1);flush();assert.equal(window.scrollY,700);assert.equal(el('#results-title').textContent,record.title);
 window.history.go(-1);flush();assert.equal(window.scrollY,6400);assert.equal(document.activeElement,readLink);
 window.history.go(1);flush();assert.equal(window.scrollY,700);window.history.go(1);flush();assert.equal(document.activeElement,readLink);
 for(let n=0;n<3;n++){assert(click('#experiences/sample-master'));flush();assert(click('#experiences'));flush();assert.equal(document.activeElement,readLink);assert.equal(window.scrollY,6400);}
 const count=entries.length;assert(click('#experiences'));assert.equal(entries.length,count,'repeated current-link activation is idempotent');
 for(const modifier of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}]){assert(!click('#experiences/sample-master',modifier));assert.equal(entries.length,count,'native modified-click behavior is preserved');}
 // A newer destination cancels a queued restoration instead of stealing its focus.
 click('#experiences/sample-master');click('#experiences');view('advisors');document.activeElement={tagName:'BODY'};flush();assert.equal(document.activeElement.tagName,'BODY');
 window.history=null;delete window.requestAnimationFrame;document.querySelectorAll=oldAll;
});

test('cold reading links return to matching card and invalid links fall back to list heading',()=>{
 let frames=[],state=null,card,readLink;const oldAll=document.querySelectorAll;document.querySelectorAll=s=>s==='.experience-card'?[card]:oldAll(s);
 window.history={get state(){return state},replaceState(s,t,h){state=s;location.hash=h},pushState(s,t,h){state=s;location.hash=h}};window.requestAnimationFrame=fn=>frames.push(fn);const flush=()=>{while(frames.length)frames.shift()()};
 readLink=new Element;readLink.scrollIntoView=()=>readLink.scrolled=true;readLink.getBoundingClientRect=()=>({top:6000,bottom:6050});card=new Element;card.dataset={experienceId:'sample-master'};card.querySelector=()=>readLink;
 const click=()=>events.click({target:{closest:s=>s==='a[href]'?{getAttribute:()=>'#experiences',hasAttribute:()=>false}:null},button:0,preventDefault(){}});
 view('experiences/sample-master');flush();click();flush();assert.equal(document.activeElement,readLink);assert(readLink.scrolled);
 state=null;view('experiences/missing');flush();click();flush();assert.equal(document.activeElement,el('#results-title'));
 window.history=null;delete window.requestAnimationFrame;document.querySelectorAll=oldAll;
});

test('jumping between same-URL list history entries restores each original reading card',()=>{
view('advisors');const oldAll=document.querySelectorAll;
let frames=[];window.requestAnimationFrame=fn=>frames.push(fn);const flush=()=>{while(frames.length)frames.shift()()};
const links=Object.fromEntries(['sample-bachelor','sample-master'].map(id=>{const l=new Element;l.id=id;l.getBoundingClientRect=()=>({top:300,bottom:350});return [id,l]}));
const cards=Object.entries(links).map(([id,l])=>({dataset:{experienceId:id},querySelector:()=>l}));
document.querySelectorAll=s=>s==='.experience-card'?cards:[];
window.innerHeight=900;window.scrollY=1000;window.scrollTo=({top})=>window.scrollY=top;
const entries=[{hash:'#experiences',state:null}];let index=0;
window.history={get state(){return entries[index].state},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;location.hash=hash},replaceState(state,title,hash){entries[index]={state,hash};location.hash=hash},go(n){index+=n;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange()}};
view('experiences');flush();
const click=hash=>{events.click({target:{closest:s=>s==='a[href]'?{getAttribute:()=>hash,hasAttribute:()=>false}:null},button:0,preventDefault(){}});flush()};
click('#experiences/sample-bachelor');window.scrollY=500;navigation.scroll();click('#experiences');
window.scrollY=6000;navigation.scroll();click('#experiences/sample-master');window.scrollY=800;navigation.scroll();click('#experiences');
window.history.go(-4);flush();
assert.equal(document.activeElement,links['sample-bachelor'],'focus should correspond to selected history entry when its URL equals current URL');
assert.equal(window.scrollY,1000);window.history.go(4);flush();assert.equal(document.activeElement,links['sample-master']);assert.equal(window.scrollY,6000);
window.history=null;delete window.requestAnimationFrame;document.querySelectorAll=oldAll;
});
