// Synthetic DOM/history contracts only. Native dialogs, layout and touch still need browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const dataKey = value => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
let run = 0;

async function setup({hash = '#routes', delayedProjects = false} = {}) {
 const nodes = new Map(), events = {}, navigation = {};
 class Element {
  constructor(id = '', tagName = 'DIV') { Object.assign(this, {id, tagName, value:'', hidden:false, textContent:'', listeners:{}, attrs:{}, dataset:{}, open:false, disabled:false, children:[], opens:0, scrollTop:0, scrollLeft:0, _html:''}); this.classList = {toggle(){}}; }
  set innerHTML(value) {
   this._html = value; this.children = [];
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
  showModal() { this.open = true; this.opens++; }
  close() { const wasOpen = this.open; this.open = false; if (wasOpen) this.listeners.close?.(); }
  matches(selector) {
   const match = selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);
   return !!match && Object.hasOwn(this.dataset, dataKey(match[1])) && (match[2] === undefined || this.dataset[dataKey(match[1])] === match[2]);
  }
  closest(selector) { return this.matches(selector) ? this : null; }
  querySelector(selector) { return this.children.find(child => child.matches(selector)) || null; }
  querySelectorAll(selector) { return this.children.filter(child => child.matches(selector)); }
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
 if (!delayedProjects) releaseProjects();
 globalThis.fetch = async url => {
  const filename = new URL(url).pathname.split('/').pop();
  if (filename === 'project-summaries.json') await ready;
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

test('project selection toggles between 0–3, disables under two and refuses a fourth or unverified route', async () => {
 const app = await setup();
 assert(app.el('#compare-tray').hidden);
 app.choose('project-a'); assert(app.el('#compare-open').disabled); assert.match(app.el('#compare-count').textContent, /1 \/ 3/);
 app.choose('project-b'); assert(!app.el('#compare-open').disabled);
 app.choose('project-b'); assert(app.el('#compare-open').disabled);
 app.choose('project-b'); app.choose('project-c'); app.choose('project-d'); app.choose('unverified'); app.choose('missing');
 assert.match(app.el('#compare-count').textContent, /3 \/ 3/); assert.match(app.el('#notice').textContent, /最多同时比较 3 个项目/);
 assert(!app.el('#compare-names').textContent.includes('project-d'));
 for (const id of ['project-a','project-b','project-c']) assert.equal(app.el('#view-content').querySelector(`[data-compare-project="${id}"]`).attrs['aria-pressed'], 'true');
 app.choose('project-a'); app.choose('project-b'); app.choose('project-c'); assert(app.el('#compare-tray').hidden);
});

test('two-project comparison retains filters and repeated opening does not duplicate modal or history', async () => {
 const app = await setup(); setFilters(app); app.choose('project-a'); app.choose('project-b');
 const list = app.el('#view-content').innerHTML;
 app.compare(); assert(app.el('#compare-dialog').open); assert.equal(columns(app),2); assert.equal(location.hash,hashFor(['project-a','project-b']));
 const length = app.entries.length, opens = app.el('#compare-dialog').opens;
 app.compare(); app.compare(); assert.equal(app.entries.length,length); assert.equal(app.el('#compare-dialog').opens,opens);
 assertFilters(app); assert.equal(app.el('#view-content').innerHTML,list);
 assert(app.el('#compare-content').innerHTML.includes('截止时刻：23:59；时区：Asia/Hong_Kong'));
 assert(app.el('#compare-content').innerHTML.includes('开放状态待核实'));
});

test('difference-only can be toggled repeatedly without losing provenance, source actions or history', async () => {
 const app = await setup(); app.choose('project-a'); app.choose('project-b'); app.compare(); const length = app.entries.length;
 for (const expected of ['true','false','true','false']) {
  app.click('[data-project-differences]');
  assert(app.el('#compare-content').innerHTML.includes(`data-project-differences aria-pressed="${expected}"`));
  assert(app.el('#compare-content').innerHTML.includes('data-comparison-row="sources"'));
  assert(app.el('#compare-content').innerHTML.includes('data-summary-id="project-a"'));
  assert(app.el('#compare-content').innerHTML.includes('来源核验：2026-10-01'));
  assert.equal(app.entries.length,length);
 }
});

test('three-project removal updates the comparison URL, repeated removal is harmless and one project returns to list', async () => {
 const app = await setup(); setFilters(app); ['project-a','project-b','project-c'].forEach(app.choose); app.compare(); assert.equal(columns(app),3);
 app.remove('project-c'); assert.equal(columns(app),2); assert.equal(location.hash,hashFor(['project-a','project-b']));
 const length = app.entries.length; app.remove('project-c'); assert.equal(columns(app),2); assert.equal(app.entries.length,length);
 app.remove('project-b'); assert(!app.el('#compare-dialog').open); assert.equal(location.hash,'#routes'); assert.match(app.el('#compare-count').textContent,/1 \/ 3/); assertFilters(app);
 app.choose('project-c'); app.compare(); assert.equal(columns(app),2); assert.equal(location.hash,hashFor(['project-a','project-c']));
});

test('Back and Forward reopen the same comparison while keeping the filtered project list', async () => {
 const app = await setup(); setFilters(app); app.choose('project-a'); app.choose('project-b'); app.compare();
 app.history.back(); assert.equal(location.hash,'#routes'); assert(!app.el('#compare-dialog').open); assertFilters(app);
 app.history.forward(); assert(app.el('#compare-dialog').open); assert.equal(columns(app),2); assertFilters(app);
 app.history.back(); app.history.forward(); assert.equal(columns(app),2); assert.equal(app.el('#compare-count').textContent,'已选 2 / 3 个项目');
});

test('comparison project details and Back/Forward never leave two modal dialogs open', async () => {
 const app = await setup(); setFilters(app); app.choose('project-a'); app.choose('project-b'); app.compare();
 app.summary('project-a'); assert(app.el('#detail-dialog').open); assert(!app.el('#compare-dialog').open); assert.match(location.hash,/summary\/project\/project-a$/);
 assert(app.el('#detail-content').innerHTML.includes('project-a sourced bachelorEntry with complete condition'));
 app.history.back(); assert(app.el('#compare-dialog').open); assert(!app.el('#detail-dialog').open, 'Back must close the project detail before reopening comparison'); assertFilters(app);
 app.history.forward(); assert(app.el('#detail-dialog').open); assert(!app.el('#compare-dialog').open);
 app.close('detail-dialog'); assert(app.el('#compare-dialog').open); assert(!app.el('#detail-dialog').open); assertFilters(app);
 app.close('compare-dialog'); assert.equal(location.hash,'#routes'); assertFilters(app);
});

test('Close and Escape return to the filtered list without adding fake history entries', async () => {
 for (const method of ['close','escape']) {
  const app = await setup(); setFilters(app); app.choose('project-a'); app.choose('project-b'); app.compare(); const length = app.entries.length;
  app[method]('compare-dialog'); assert.equal(location.hash,'#routes'); assert(!app.el('#compare-dialog').open); assert.equal(app.entries.length,length); assertFilters(app);
  app.history.back(); assert.equal(location.hash,'#external-before'); assert(!app.el('#compare-dialog').open);
  app.history.forward(); assert.equal(location.hash,'#routes'); assertFilters(app); app.compare(); app[method]('compare-dialog'); assertFilters(app);
 }
});

test('cold comparison URLs render on initial load and close safely to projects', async () => {
 const app = await setup({hash:hashFor(['project-a','project-b'])});
 assert(app.el('#compare-dialog').open, 'initial comparison hash must be replayed during initialize'); assert.equal(columns(app),2);
 assert(app.el('#compare-content').innerHTML.includes('project-a sourced overview with complete condition'));
 app.close('compare-dialog'); assert.equal(location.hash,'#routes'); assert(!app.el('#compare-dialog').open); assert.equal(app.entries[0].hash,'#external-before');
 app.history.back(); assert.equal(location.hash,'#external-before'); assert(!app.el('#compare-dialog').open);
});

test('invalid and repeated IDs in cold comparison links do not gain academic columns', async () => {
 for (const hash of [hashFor(['project-a','unverified']), hashFor(['project-a','project-a']), '#routes/compare/%E0%A4%A']) {
  const app = await setup({hash}); assert(app.el('#compare-dialog').open); assert.equal(columns(app),0); assert(app.el('#compare-content').innerHTML.includes('请选择 2–3 个项目进行对比'));
  app.escape('compare-dialog'); assert.equal(location.hash,'#routes'); assert(!app.el('#compare-dialog').open);
 }
});

test('late project-summary loading refreshes an open comparison without clearing selection or filters', async () => {
 const app = await setup({delayedProjects:true}); setFilters(app); app.choose('project-a'); app.choose('project-b'); app.compare();
 assert(!app.el('#compare-content').innerHTML.includes('project-a sourced overview with complete condition'));
 app.releaseProjects(); await new Promise(resolve => setImmediate(resolve));
 assert(app.el('#compare-content').innerHTML.includes('project-a sourced overview with complete condition'), 'the open table must refresh when the optional source-backed summaries arrive');
 assert.equal(columns(app),2); assertFilters(app); assert(app.el('#compare-dialog').open);
});

test('comparison backdrop dismissal uses the same history-aware path as Close and Escape', async () => {
 const app = await setup(); setFilters(app); app.choose('project-a'); app.choose('project-b'); app.compare();
 const dialog = app.el('#compare-dialog'); dialog.listeners.click({target:dialog, clientX:0, clientY:0});
 assert(!dialog.open); assert.equal(location.hash,'#routes', 'backdrop must not leave a closed comparison hash active'); assertFilters(app);
});

test('switching away dismisses comparison and preserves project selection and independent advisor filters', async () => {
 const app = await setup(); app.navigate('#advisors'); app.change('rank','assistant'); app.navigate('#routes'); setFilters(app); app.choose('project-a'); app.choose('project-b'); app.compare();
 app.navigate('#materials'); assert(!app.el('#compare-dialog').open); assert(app.el('#compare-tray').hidden);
 app.navigate('#advisors'); assert.equal(app.el('#rank-filter').value,'assistant'); assert(app.el('#compare-tray').hidden);
 app.navigate('#routes'); assertFilters(app); assert.match(app.el('#compare-count').textContent,/2 \/ 3/); app.compare(); assert.equal(columns(app),2);
});

test('an invalid comparison hash dismisses an existing project detail before showing recovery', async () => {
 const app = await setup(); app.summary('project-a'); assert(app.el('#detail-dialog').open);
 app.navigate(hashFor(['project-a','unverified']));
 assert(app.el('#compare-dialog').open); assert.equal(columns(app),0);
 assert(!app.el('#detail-dialog').open, 'invalid comparison recovery must not stack over a stale detail dialog');
 app.escape('compare-dialog'); assert.equal(location.hash,'#routes'); assert(!app.el('#detail-dialog').open);
});

test('keyboard removal focuses a current surviving remove control instead of the detached original', async () => {
 for(const removed of ['project-a','project-b','project-c']){
  const app=await setup();['project-a','project-b','project-c'].forEach(app.choose);app.compare();
  const original=app.el('#compare-content').querySelector(`[data-remove-project="${removed}"]`);original.focus();app.remove(removed);
  const current=app.el('#compare-content').children;
  assert(!current.includes(original),'the old node is detached by rendering');assert(current.includes(document.activeElement),'focus must belong to the current comparison');
  assert.notEqual(document.activeElement,original);assert.equal(document.activeElement.dataset.removeProject,removed==='project-c'?'project-b':removed==='project-b'?'project-c':'project-b');
 }
});

test('late summaries preserve current keyboard focus for toggle, detail and source controls', async () => {
 for(const key of ['differences','detail:project-b','source:project-b:https://example.edu/programs']){
  const app=await setup({delayedProjects:true});app.choose('project-a');app.choose('project-b');app.compare();
  const original=app.el('#compare-content').querySelector(`[data-comparison-focus="${key}"]`);assert(original,key);original.focus();app.el('#compare-dialog').scrollTop=430;
  app.releaseProjects();await new Promise(resolve=>setImmediate(resolve));
  assert(!app.el('#compare-content').children.includes(original));assert(app.el('#compare-content').children.includes(document.activeElement),'focus must target newly rendered DOM');
  assert.equal(document.activeElement.dataset.comparisonFocus,key);assert.equal(app.el('#compare-dialog').scrollTop,430);
 }
});

test('late comparison refresh does not steal focus from its persistent close control', async () => {
 const app=await setup({delayedProjects:true});app.choose('project-a');app.choose('project-b');app.compare();const persistent=app.el('#compare-close-fixture');persistent.focus();
 app.releaseProjects();await new Promise(resolve=>setImmediate(resolve));assert.equal(document.activeElement,persistent);
});

test('new invalid project advisor date and material URLs replace stale content and replay truthfully', async () => {
 for(const [view,kind,id] of [['routes','project','project-a'],['advisors','advisor','synthetic-advisor'],['deadlines','deadline','date-a'],['materials','material','material-a']]){
  const app=await setup({hash:'#'+view});const valid=`#${view}/summary/${kind}/${id}`,invalid=`#${view}/summary/${kind}/not-a-record`;
  app.navigate(valid);assert(app.el('#detail-dialog').open);const previous=app.el('#detail-content').innerHTML;assert(!previous.includes('未找到这条'));
  app.navigate(invalid);assert(app.el('#detail-dialog').open);assert.notEqual(app.el('#detail-content').innerHTML,previous);assert(app.el('#detail-content').innerHTML.includes('未找到这条'));assert(!app.el('#detail-content').innerHTML.includes('Synthetic official evidence'));
  app.history.back();assert.equal(location.hash,valid);assert.equal(app.el('#detail-content').innerHTML,previous);
  app.history.forward();assert.equal(location.hash,invalid);assert(app.el('#detail-content').innerHTML.includes('未找到这条'));
  app.close('detail-dialog');assert.equal(location.hash,'#'+view);assert(!app.el('#detail-dialog').open);
 }
});

test('late summaries preserve table-region focus and horizontal offset including third-column actions', async () => {
 for(const key of ['table','source:project-c:https://example.edu/programs','detail:project-c']){
  const app=await setup({delayedProjects:true});['project-a','project-b','project-c'].forEach(app.choose);app.compare();
  const oldRegion=app.el('#compare-content').querySelector('[data-comparison-focus="table"]');assert(oldRegion);oldRegion.scrollLeft=640;app.el('#compare-dialog').scrollTop=380;
  const focused=app.el('#compare-content').querySelector(`[data-comparison-focus="${key}"]`);assert(focused);focused.focus();
  app.releaseProjects();await new Promise(resolve=>setImmediate(resolve));
  const region=app.el('#compare-content').querySelector('[data-comparison-focus="table"]');
  assert.notEqual(region,oldRegion);assert.equal(region.scrollLeft,640);assert.equal(app.el('#compare-dialog').scrollTop,380);
  assert.notEqual(document.activeElement,focused);assert(app.el('#compare-content').children.includes(document.activeElement));assert.equal(document.activeElement.dataset.comparisonFocus,key);
 }
});
