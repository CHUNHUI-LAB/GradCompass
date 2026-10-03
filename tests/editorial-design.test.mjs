import {maintenanceBaseline} from './maintenance-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('assets/style.css'),app=read('assets/app.js');
test('editorial discovery is search-first with synthesis retained before results',()=>{
 assert(html.indexOf('class="search-surface"')<html.indexOf('class="landing-guide"'));
 assert(html.indexOf('class="landing-guide"')<html.indexOf('id="page-overview"'));
 assert(html.indexOf('id="page-overview"')<html.indexOf('id="results"'));
 for(const id of ['search','institution-filter','topic-filter','rank-filter','opportunity-filter','opening-filter','reset-filters'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert(html.includes('class="advanced-filters"'));assert(html.includes('查看筛选结果'));
});
test('landing navigation is internal and fictional scenery cannot impersonate an institution',()=>{
 const guide=html.split('class="landing-guide"')[1].split('id="page-overview"')[0];
 for(const v of ['advisors','routes','experiences'])assert(guide.includes('href="#'+v+'"'));
 assert(!guide.includes('https://'));assert(html.includes('AI 校园意境插画 · 非真实院校'));
 assert(html.includes('class="campus-art"'));assert(html.includes('src="./assets/campus-art.webp" alt=""'));
 assert(css.includes('.hero-title-accent{color:var(--accent)}'));assert(css.includes('prefers-reduced-motion'));
});
test('search action moves focus to existing results without changing routing or collecting data',()=>{
 assert(app.includes("evt.target.closest('[data-find-results]')"));
 assert(app.includes("$('#results').focus?.({preventScroll:true})"));assert(app.includes("$('#results').scrollIntoView?.({block:'start'})"));
 assert(!app.includes('localStorage'));assert(!app.includes('sessionStorage'));
});
test('visual baseline source bytes remain reconstructible after separately reviewed date maintenance',()=>{
 const expected={'catalog.json':'2b0a98994dc7ae639b06989889621be973fa4289','advisor-profiles.json':'910aa0b3db20e72ab4a2268ac910276a8e619cc2','application-experiences.json':'5d92afd2178bf6e7554d9d468d359474cc060066','project-summaries.json':'bbbd93fd3f6466b84ff45e22182b952754fb2f5e','material-summaries.json':'58265c08b97c0d689cd6b910fbd2b4e822c169b4'};
 for(const [path,sha] of Object.entries(expected)){const raw=fs.readFileSync(new URL('../data/'+path,import.meta.url));const b=['catalog.json','material-summaries.json','project-summaries.json','application-experiences.json'].includes(path)?Buffer.from(JSON.stringify(maintenanceBaseline(JSON.parse(raw)),null,2)+'\n'):raw;assert.equal(crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,path);}
});

// Exercise menu and landing actions with real application bindings; this is DOM-contract QA.
class Element{constructor(){this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.checked=true;this.disabled=false;this.listeners={};this.attrs={};this.dataset={};this.classList={toggle(){}};}addEventListener(e,f){this.listeners[e]=f}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}removeAttribute(k){delete this.attrs[k]}showModal(){this.open=true}close(){this.open=false}focus(){document.activeElement=this}scrollIntoView(){this.scrolled=true}}
const elements=new Map,el=s=>{if(!elements.has(s))elements.set(s,new Element);return elements.get(s)};
const navs=['advisors','routes','deadlines','materials','experiences','sources'].map(v=>{const a=new Element;a.dataset.view=v;return a}),events={},wevents={};
globalThis.document={querySelector:el,querySelectorAll:s=>s==='[data-view]'?navs:s==='dialog'?[el('#detail-dialog'),el('#compare-dialog')]:[],addEventListener:(n,f)=>events[n]=f,getElementById:id=>el('#'+id),activeElement:{tagName:'BODY'}};
globalThis.window={addEventListener:(n,f)=>wevents[n]=f};globalThis.location={hash:''};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(read('data/'+new URL(url).pathname.split('/').at(-1)))});
await import('../assets/app.js');await new Promise(r=>setImmediate(r));
test('mobile menu opens, repeats, closes on navigation and Escape restores button focus',()=>{
 const menu=el('#menu-toggle');menu.listeners.click();assert.equal(menu.getAttribute('aria-expanded'),'true');assert.equal(el('.site-header').getAttribute('data-menu-open'),'');
 menu.listeners.click();assert.equal(menu.getAttribute('aria-expanded'),'false');
 menu.listeners.click();events.click({target:{closest:s=>s==='[data-view]'?{dataset:{view:'routes'}}:null}});assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,menu);
 menu.listeners.click();events.keydown({key:'Escape'});assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,menu);
});
test('landing search and advisor guide focus the results without adding a history entry',()=>{
 let prevented=false;const old=location.hash;events.click({preventDefault(){prevented=true},target:{closest:s=>s==='[data-find-results]'?{}:null}});
 assert(prevented);assert.equal(location.hash,old);assert.equal(document.activeElement,el('#results'));assert(el('#results').scrolled);
});
