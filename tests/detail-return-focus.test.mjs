// Synthetic DOM/history contracts only. Native dialogs, layout and touch still need browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const dataKey = value => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
let run = 0;

async function setup({hash = '#routes', delayedProjects = false, delayedFile = null} = {}) {
 const nodes = new Map(), events = {}, navigation = {};
 class Element {
  constructor(id = '', tagName = 'DIV') { Object.assign(this, {id, tagName, value:'', hidden:false, textContent:'', listeners:{}, attrs:{}, dataset:{}, open:false, disabled:false, children:[], opens:0, scrollTop:0, scrollLeft:0, _html:''}); this.classList = {toggle(){}}; }
  set innerHTML(value) {
   if(this.children.includes(globalThis.document?.activeElement))document.activeElement={tagName:'BODY'};this._html = value; this.children = [];
   if (this.tagName === 'SELECT') this.options = [...value.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(([, value, label]) => ({value:decode(value), textContent:decode(label)}));
   for (const [, tag, attributes, contents] of value.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const button = new Element('', tag.toUpperCase()); button.parent = this; button.textContent = decode(contents.replace(/<[^>]+>/g, ''));
    for (const [, key, quoted] of attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
     if (key.startsWith('data-')) button.dataset[dataKey(key.slice(5))] = decode(quoted || '');
     else button.attrs[key] = decode(quoted || '');
    }
    this.children.push(button);
   }
   for(const [, focusKey] of value.matchAll(/<div\b[^>]*data-comparison-focus="([^"]+)"[^>]*>/g)){
    const region=new Element('', 'DIV');region.parent=this;region.dataset.comparisonFocus=decode(focusKey);region.attrs.tabindex='0';this.children.push(region);
   }
  }
  get innerHTML() { return this._html; }
  get selectedOptions() { return (this.options || []).filter(option => option.value === this.value); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  focus() { document.activeElement = this; }
  scrollIntoView() {}
  getBoundingClientRect() { return {left:20, top:20, right:800, bottom:700}; }
  showModal() { this.previousFocus=document.activeElement;this.open = true; this.opens++; }
  close() { const wasOpen = this.open; this.open = false; if (wasOpen){const old=this.previousFocus;document.activeElement=old&&(!old.parent||old.parent.children.includes(old))?old:{tagName:'BODY'};this.listeners.close?.();} }
  matches(selector) {
   const match = selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);
   return !!match && Object.hasOwn(this.dataset, dataKey(match[1])) && (match[2] === undefined || this.dataset[dataKey(match[1])] === match[2]);
  }
  closest(selector) { return this.matches(selector) ? this : null; }
  querySelector(selector) { return this.children.find(child => child.matches(selector)) || null; }
  querySelectorAll(selector) { return selector==='a,button,[tabindex]'?this.children:this.children.filter(child => child.matches(selector)); }
 }
 const el = selector => {
  if (!nodes.has(selector)) nodes.set(selector, new Element(selector.slice(1), selector.endsWith('-filter') ? 'SELECT' : selector === '#search' ? 'INPUT' : 'DIV'));
  return nodes.get(selector);
 };
 const dialogs = [el('#detail-dialog'), el('#compare-dialog')];
 globalThis.document = {
  querySelector: selector => selector === 'dialog[open]' ? dialogs.find(dialog => dialog.open) || null : el(selector),
  querySelectorAll: selector => selector === 'dialog' ? dialogs : [...nodes.values()].flatMap(node => node.children).filter(child => child.matches(selector)),
  getElementById: id => el('#' + id), addEventListener:(type, listener) => events[type] = listener, activeElement:{tagName:'BODY'}
 };
 globalThis.location = {hash};
 const entries = [{hash:'#external-before', state:null}, {hash, state:null}]; let index = 1;
 const replay = () => { navigation.popstate?.(); navigation.hashchange?.(); };
 const history = {
  get state() { return entries[index].state; },
  pushState(state, title, hash) { entries.splice(index + 1); entries.push({state:structuredClone(state), hash}); index++; location.hash = hash; },
  replaceState(state, title, hash) { entries[index] = {state:structuredClone(state), hash}; location.hash = hash; },
  go(offset) { const next = index + offset; if (next < 0 || next >= entries.length) return; index = next; location.hash = entries[index].hash; replay(); },
  back() { this.go(-1); }, forward() { this.go(1); }
 };
 globalThis.window = {history, addEventListener:(type, listener) => navigation[type] = listener};
 const source = {id:'source', label:'Synthetic official evidence', url:'https://example.edu/programs', checkedDate:'2026-10-01'};
 const route = (id, degree = 'MSc', institution = 'HKU', extra = {}) => ({id, institution, department:'Synthetic Robotics Department', degree, program:`${id} robotics ${degree}`, status:'verified', bachelorEligible:true, noMasterRequired:true, noTuimianRequired:true, defaultVisible:true, eligibilitySummary:`${id}: honours bachelor, language and individual requirements remain conditional`, applicationStatus:'unknown', admissionYear:'2027/28 synthetic cycle', sources:[source], notes:['No admission, funding or vacancy guarantee'], ...extra});
 const routes = [route('project-a'), route('project-b'), route('project-c'), route('project-d', 'PhD', 'HKUST'), route('unverified', 'PhD', 'HKUST', {status:'unknown'})];
 const advisor = {id:'synthetic-advisor', name:'Synthetic Researcher', institution:'HKU', department:'Synthetic Robotics Department', position:'Assistant Professor', summary:'robot learning', eligibility:'verified', routeIds:['project-a'], topics:['robot learning']};
 const material = {id:'material-a', title:'Synthetic language material', institution:'HKU', routeIds:['project-a'], status:'verified', requirement:'Synthetic material condition', scope:'Synthetic cycle only', sources:[source]};
 const fixture = {metadata:{checkedDate:'2026-10-01'}, routes, advisors:[advisor], materials:[material], deadlines:[{id:'date-a', title:'Synthetic deadline', institution:'HKU', routeIds:['project-a'], date:'2027-03-01', deadlineTime:'23:59', timezone:'Asia/Hong_Kong', status:'unknown', note:'The future date does not verify currently open submission', sources:[source]}]};
 const projects = {schemaVersion:1, sources:[source], records:routes.slice(0, 4).map(route => ({routeId:route.id, degree:route.degree, institution:route.institution, checkedDate:'2026-10-02', ...Object.fromEntries(['overview','training','bachelorEntry','cycle'].map(key => [key, {text:`${route.id} sourced ${key} with complete condition`, sourceIds:['source']}])), cautions:[{text:'Keep academic and employment pathways separate', sourceIds:['source']}]}))};
 let releaseProjects;
 const ready = new Promise(resolve => releaseProjects = resolve);
 if (!delayedProjects&&!delayedFile) releaseProjects();
 globalThis.fetch = async url => {
  const filename = new URL(url).pathname.split('/').pop();
  if ((delayedProjects&&filename === 'project-summaries.json')||filename===delayedFile) await ready;
  const payload = filename === 'catalog.json' ? fixture : filename === 'project-summaries.json' ? projects : filename === 'ra-positions.json' ? {raPositions:[]} : filename === 'update-status.json' ? {statusLabel:'Synthetic fixture'} : filename === 'advisor-profiles.json' ? {schemaVersion:1, profiles:[]} : {schemaVersion:1, sources:[], records:[]};
  return {ok:true, json:async () => payload};
 };
 await import(`../assets/app.js?f2-comparison-contract=${++run}`);
 await new Promise(resolve => setImmediate(resolve));
 const click = (selector, dataset = {}) => events.click({target:{closest:match => match === selector ? {dataset} : null}, preventDefault(){}});
 const choose = id => click('[data-compare-project]', {compareProject:id});
 const remove = id => click('[data-remove-project]', {removeProject:id});
 const compare = () => el('#compare-open').listeners.click();
 const summary = id => click('[data-summary-kind]', {summaryKind:'project', summaryId:id});
 const close = id => click('[data-close]', {close:id});
 const escape = id => { let prevented = false; el('#' + id).listeners.cancel({preventDefault(){ prevented = true; }}); assert(prevented); };
 const change = (name, value) => { const input = el('#' + name + '-filter'); input.value = value; input.listeners.change({target:input}); };
 const search = value => { const input = el('#search'); input.value = value; input.listeners.input({target:input}); };
 const navigate = hash => { history.pushState(null, '', hash); navigation.hashchange(); };
 return {el, events, navigation, history, entries, choose, remove, compare, summary, close, escape, change, search, navigate, click, releaseProjects, projects, fixture, get index(){ return index; }};
}
const hashFor = ids => '#routes/compare/' + ids.map(encodeURIComponent).join(',');
const columns = app => (app.el('#compare-content').innerHTML.match(/class="project-comparison-heading"/g) || []).length;
const assertFilters = app => { assert.equal(app.el('#institution-filter').value, 'HKU'); assert.equal(app.el('#opportunity-filter').value, 'MSc'); assert.equal(app.el('#search').value, 'robotics'); };
const setFilters = app => { app.change('institution','HKU'); app.change('opportunity','MSc'); app.search('robotics'); };


// Synthetic native-dialog focus contract, not browser layout or accessibility QA.
const actions = app => app.el('#view-content').querySelectorAll('[data-summary-id="project-a"]');
const openFrom = (app,index=0) => {const opener=actions(app)[index];assert(opener);opener.focus();app.summary('project-a');return opener;};
for(const method of ['close','escape','back'])for(const index of [0,1])test(`late supplement restores duplicate opener ${index} after ${method}`,async()=>{
 const app=await setup({delayedProjects:true});setFilters(app);const old=openFrom(app,index);
 app.releaseProjects();await new Promise(resolve=>setImmediate(resolve));const replacement=actions(app)[index];assert.notEqual(old,replacement);
 if(method==='back')app.history.back();else app[method]('detail-dialog');
 assert.equal(location.hash,'#routes');assertFilters(app);assert.equal(document.activeElement,replacement);
 app.history.forward();assert(app.el('#detail-dialog').open);assert.equal(document.activeElement,app.el('#detail-title'));
 app.history.back();assert.equal(document.activeElement,replacement,'Forward replay retains original opener identity');
});
test('nested detail Back retains modal focus; final Close restores original duplicate opener',async()=>{
 const app=await setup({delayedProjects:true});const old=openFrom(app,1);
 app.click('[data-summary-kind]',{summaryKind:'material',summaryId:'material-a'});
 assert.equal(document.activeElement,app.el('#detail-title'));
 app.releaseProjects();await new Promise(resolve=>setImmediate(resolve));const replacement=actions(app)[1];assert.notEqual(old,replacement);
 app.history.back();assert(app.el('#detail-dialog').open);assert.equal(document.activeElement,app.el('#detail-title'));
 app.history.forward();assert(app.el('#detail-dialog').open);assert.equal(document.activeElement,app.el('#detail-title'));
 app.close('detail-dialog');assert.equal(location.hash,'#routes');assert.equal(document.activeElement,replacement);
});
test('missing opener falls back to the results heading',async()=>{
 const app=await setup();openFrom(app,1);app.el('#view-content').innerHTML='';app.close('detail-dialog');
 assert.equal(location.hash,'#routes');assert.equal(document.activeElement,app.el('#results-title'));
});
test('cold shared summary returns to a usable list heading',async()=>{
 const app=await setup({hash:'#routes/summary/project/project-a'});app.close('detail-dialog');
 assert.equal(location.hash,'#routes');assert.equal(document.activeElement,app.el('#results-title'));
});
test('comparison return does not redirect focus behind the reopened modal',async()=>{
 const app=await setup();app.choose('project-a');app.choose('project-b');app.compare();
 const opener=app.el('#compare-content').querySelector('[data-summary-id="project-a"]');opener.focus();app.summary('project-a');
 app.close('detail-dialog');assert(app.el('#compare-dialog').open);assert.notEqual(document.activeElement,app.el('#results-title'));
});
test('cross-section navigation does not focus the previous list or fallback heading',async()=>{
 const app=await setup();openFrom(app);let fallbackCalls=0;const heading=app.el('#results-title');heading.focus=()=>{fallbackCalls++;document.activeElement=heading;};
 app.navigate('#materials');assert(!app.el('#detail-dialog').open);assert.equal(fallbackCalls,0);
});

for(const [view,kind,file,key] of [['advisors','advisor','advisor-profiles.json','detail'],['materials','material','material-summaries.json','summaryId']])test(`late ${view} supplement restores the second card action`,async()=>{
 const app=await setup({hash:'#'+view,delayedFile:file});
 const controls=()=>app.el('#view-content').children.filter(node=>node.dataset[key]);
 const old=controls()[1];assert(old);old.focus();
 if(kind==='advisor')app.click('[data-detail]',{detail:old.dataset.detail});else app.click('[data-summary-kind]',{summaryKind:kind,summaryId:old.dataset.summaryId});
 app.releaseProjects();await new Promise(resolve=>setImmediate(resolve));const replacement=controls()[1];assert.notEqual(old,replacement);
 app.close('detail-dialog');assert.equal(location.hash,'#'+view);assert.equal(document.activeElement,replacement);
});
