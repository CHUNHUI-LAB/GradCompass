import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {escapeHTML,readerText,isVerifiedRoute} from '../assets/core.js';

// DOM contracts model native dialog autofocus and focus-driven scrolling.
// The compact case represents the observed 396 × 253 CSS-pixel / 300% viewport;
// these tests are not a substitute for Chrome layout and visual acceptance.
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const originalCatalog=read('catalog.json');
const longProjectId='tsinghua-iiis-msc-085400-tuimian-2027';
const projectIds=originalCatalog.routes.filter(isVerifiedRoute).slice(0,2).map(route=>route.id);
let serial=0;
async function boot({compact=false,delayedFile=null,associations=null,legacyFocus=false}={}){
 const catalog=structuredClone(originalCatalog),nodes=new Map(),events={},navigation={},calls=[];
 if(associations)catalog.advisors.find(advisor=>advisor.id==='tsinghua-dan-wu').routeAssociations=associations;
 const before=JSON.stringify(catalog);
 class Element{
  constructor(selector){Object.assign(this,{selector,id:selector.startsWith('#')?selector.slice(1):'',dataset:{},children:[],value:'',hidden:false,textContent:'',listeners:{},attrs:{},open:false,opens:0,scrollTop:0,scrollLeft:0,_html:'',classList:{toggle(){}}});}
  set innerHTML(value){
   this._html=value;
   if(this.selector==='#detail-content'){
    this.children=[];this.scopes=[];const stack=[this];
    for(const match of value.matchAll(/<(\/?)(article|aside|section|h2|h3|a|button)\b([^>]*)>/g)){
     const [,closing,tag,attributes]=match;
     if(closing){if(['article','aside','section'].includes(tag))stack.pop();continue;}
     if(tag==='h3'){stack.at(-1).heading=value.slice(match.index+match[0].length).split('</h3>')[0].replace(/<[^>]+>/g,'');continue;}
     const child=new Element(tag==='h2'?'#detail-title':'body-control-'+this.children.length);child.tagName=tag.toUpperCase();child.parent=stack.at(-1);child.scopes=[];
     for(const [,key,attribute]of attributes.matchAll(/([\w-]+)="([^"]*)"/g)){
      if(key.startsWith('data-'))child.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=attribute;
      else child.attrs[key]=attribute;
     }
     if(['article','aside','section'].includes(tag)){for(const scope of stack)scope.scopes.push(child);stack.push(child);}
     else{if(tag==='h2')nodes.set('#detail-title',child);for(const scope of stack)scope.children.push(child);}
    }
   }
  }
  get innerHTML(){return this._html;}
  addEventListener(type,listener){this.listeners[type]=listener;}
  setAttribute(key,value){this.attrs[key]=value;}
  getAttribute(key){return this.attrs[key]??null;}
  removeAttribute(key){delete this.attrs[key];}
  focus(options){calls.push({type:'focus',selector:this.selector,options});if(legacyFocus&&options)throw TypeError('Focus options unsupported');document.activeElement=this;if(this.selector==='#detail-title'&&!options?.preventScroll&&compact)el('#detail-dialog').scrollTop=128;}
  showModal(){this.open=true;this.opens++;calls.push({type:'show',selector:this.selector});this.scrollTop=compact?96:24;el(this.selector==='#detail-dialog'?'#detail-back':'#compare-title').focus();}
  close(){this.open=false;this.listeners.close?.();}
  contains(target){return this.children.includes(target);}
  matches(selector){return selector.split(',').some(part=>(this.attrs.class||'').split(' ').includes(part.trim().slice(1)));}
  closest(selector){for(let node=this;node;node=node.parent)if(node.matches(selector))return node;return null;}
  querySelector(selector){return selector==='h3'?(this.heading?{textContent:this.heading}:null):(this.scopes||[]).find(scope=>scope.matches(selector))||null;}
  querySelectorAll(selector){return selector?.startsWith('.')?(this.scopes||[]).filter(scope=>scope.matches(selector)):this.children;}
  getBoundingClientRect(){return{left:0,top:0,right:compact?396:1188,bottom:compact?253:759};}
 }
 const el=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element(selector));return nodes.get(selector);};
 globalThis.document={querySelector:el,querySelectorAll:selector=>selector==='dialog'?[el('#detail-dialog'),el('#compare-dialog')]:[],getElementById:id=>el('#'+id),addEventListener:(type,listener)=>events[type]=listener,activeElement:{tagName:'BODY'}};
 globalThis.location={hash:'#routes'};
 const entries=[{hash:'#routes',state:null}];let index=0;
 const history={get state(){return entries[index].state;},pushState(state,title,hash){entries.splice(index+1);entries.push({hash,state});index++;location.hash=hash;},replaceState(state,title,hash){entries[index]={hash,state};location.hash=hash;},go(offset){index+=offset;location.hash=entries[index].hash;navigation.popstate();navigation.hashchange();},back(){this.go(-1);}};
 globalThis.window={history,addEventListener:(type,listener)=>navigation[type]=listener};
 let release;
 const ready=new Promise(resolve=>release=resolve);
 globalThis.fetch=async url=>{
  const name=new URL(url).pathname.split('/').at(-1);
  if(name===delayedFile)await ready;
  return{ok:true,json:async()=>name==='catalog.json'?catalog:read(name)};
 };
 await import('../assets/app.js?detail-reader-polish='+serial++);await new Promise(resolve=>setImmediate(resolve));
 const click=(selector,dataset={})=>events.click({target:{closest:match=>match===selector?{dataset}:null},preventDefault(){}});
 return{el,calls,catalog,before,history,
  view(view){history.pushState(null,'','#'+view);navigation.hashchange();},
  open(kind,id){click(kind==='advisor'?'[data-detail]':'[data-summary-kind]',kind==='advisor'?{detail:id}:{summaryKind:kind,summaryId:id});},
  close(){click('[data-close]',{close:'detail-dialog'});},
  compare(){for(const id of projectIds)click('[data-compare-project]',{compareProject:id});el('#compare-open').listeners.click();},
  escape(){el('#detail-dialog').listeners.cancel({preventDefault(){}});},
  async release(){release();await new Promise(resolve=>setImmediate(resolve));}
 };
}
function associationItems(app){
 const block=app.el('#detail-content').innerHTML.split('<strong>其他路径与关联限制</strong>')[1]?.split('</ul>')[0];
 assert(block,'advisor detail includes association limitations');return [...block.matchAll(/<li>(.*?)<\/li>/g)].map(match=>match[1]);
}
function assertReaderStart(app){
 assert(app.el('#detail-dialog').open);assert.equal(document.activeElement,app.el('#detail-title'),'heading retains keyboard focus');
 assert.equal(app.el('#detail-dialog').scrollTop,0,'focus must not scroll the first title line underneath the sticky header');
 const focus=app.calls.filter(call=>call.type==='focus'&&call.selector==='#detail-title').at(-1);
 assert.deepEqual(focus?.options,{preventScroll:true},'native focus scrolling is explicitly suppressed');
}
test('Wu Dan MSc and PhD limitations render each identical evidence field once without mutating data',async()=>{
 const app=await boot();app.open('advisor','tsinghua-dan-wu');const items=associationItems(app);
 const associations=app.catalog.advisors.find(advisor=>advisor.id==='tsinghua-dan-wu').routeAssociations.filter(item=>item.status!=='verified');
 assert.equal(items.length,associations.length);
 for(const [index,item]of associations.entries()){
  assert.equal(items[index],escapeHTML([item.degree,item.summary].map(readerText).join('；')));
  assert.equal(items[index].split(escapeHTML(readerText(item.summary))).length-1,1,item.degree+' evidence sentence appears only once');
 }
 assert.equal(JSON.stringify(app.catalog),app.before);
});
test('association deduplication preserves distinct fields, contained text, ordering and HTML escaping',async()=>{
 const association={degree:'MSc',status:'pending',reason:'Shared evidence',summary:{text:'Shared evidence'},note:'Shared evidence; additional condition',association:'<script>source limit</script>',pi_program_association:'A separate final limit'};
 const app=await boot({associations:[association]});app.open('advisor','tsinghua-dan-wu');
 assert.deepEqual(associationItems(app),['MSc；Shared evidence；Shared evidence; additional condition；&lt;script&gt;source limit&lt;/script&gt;；A separate final limit']);
 assert.equal(JSON.stringify(app.catalog),app.before);
});
for(const compact of [false,true])test((compact?'compact 396 × 253':'desktop')+' detail opening, repeated navigation, Back, comparison and dismissal keep a visible start',async()=>{
 const app=await boot({compact}),firstId=compact?longProjectId:projectIds[0];app.open('project',firstId);assertReaderStart(app);
 assert(app.el('#detail-content').innerHTML.includes(escapeHTML(originalCatalog.routes.find(route=>route.id===firstId).program)));
 app.el('#detail-dialog').scrollTop=450;app.open('project',firstId);assertReaderStart(app);
 app.el('#detail-dialog').scrollTop=450;app.open('project',projectIds[1]);assertReaderStart(app);
 app.el('#detail-dialog').scrollTop=450;app.history.back();assertReaderStart(app);
 app.close();assert(!app.el('#detail-dialog').open);assert.equal(location.hash,'#routes');
 app.compare();assert(app.el('#compare-dialog').open);app.open('project',firstId);assert(!app.el('#compare-dialog').open);assertReaderStart(app);
 app.escape();assert(!app.el('#detail-dialog').open);
 app.view('advisors');app.open('advisor','tsinghua-dan-wu');assertReaderStart(app);app.close();assert.equal(location.hash,'#advisors');
 app.view('routes/summary/project/missing-project');assertReaderStart(app);assert(app.el('#detail-content').innerHTML.includes('未找到这条项目记录'));app.close();
});
for(const [file,kind,id]of [
 ['project-summaries.json','project',projectIds[0]],
 ['material-summaries.json','project',projectIds[0]],
 ['advisor-profiles.json','advisor','tsinghua-dan-wu']
])test(file+' arriving while a compact detail is being read preserves scroll and header focus',async()=>{
 const app=await boot({compact:true,delayedFile:file});app.open(kind,id);app.el('#detail-dialog').scrollTop=321;
 app.el('#detail-back').focus({preventScroll:true});const focuses=app.calls.filter(call=>call.type==='focus').length,opens=app.el('#detail-dialog').opens;
 await app.release();assert.equal(app.el('#detail-dialog').scrollTop,321);assert.equal(app.el('#detail-dialog').opens,opens);
 assert.equal(document.activeElement,app.el('#detail-back'),'optional refresh does not steal focus from the persistent reader toolbar');
 assert.equal(app.calls.filter(call=>call.type==='focus').length,focuses,'optional refresh does not trigger heading autofocus');
});
test('a late supplement cannot reopen a dismissed compact detail or jump after newer navigation',async()=>{
 const app=await boot({compact:true,delayedFile:'project-summaries.json'});app.open('project',projectIds[0]);app.close();app.view('sources');
 const calls=app.calls.length;await app.release();assert(!app.el('#detail-dialog').open);assert.equal(location.hash,'#sources');assert.equal(app.calls.length,calls);
});

for(const focusKind of ['title','source','related'])test('late detail data restores a replaced '+focusKind+' control without scrolling',async()=>{
 const app=await boot({compact:true,delayedFile:'project-summaries.json'});app.open('project',projectIds[0]);
 const content=app.el('#detail-content');
 const target=focusKind==='title'?app.el('#detail-title'):content.children.find(node=>focusKind==='source'?node.attrs.href:node.dataset.summaryKind);
 assert(target,'fixture includes the focused body control');target.focus({preventScroll:true});app.el('#detail-dialog').scrollTop=391;
 await app.release();const focused=document.activeElement;assert.notEqual(focused,target,'the old focused node was replaced');assert(content.contains(focused));
 if(focusKind==='title')assert.equal(focused.id,target.id);
 else if(focusKind==='source')assert.equal(focused.attrs.href,target.attrs.href);
 else assert.deepEqual(focused.dataset,target.dataset);
 assert.equal(app.el('#detail-dialog').scrollTop,391);
});
test('focus-options fallback resets after native autofocus and restores a late refresh position',async()=>{
 const app=await boot({compact:true,delayedFile:'project-summaries.json',legacyFocus:true});app.open('project',projectIds[0]);
 assert.equal(document.activeElement,app.el('#detail-title'));assert.equal(app.el('#detail-dialog').scrollTop,0);
 assert(app.calls.some(call=>call.selector==='#detail-title'&&call.options?.preventScroll));
 app.el('#detail-dialog').scrollTop=411;await app.release();assert.equal(document.activeElement,app.el('#detail-title'));assert.equal(app.el('#detail-dialog').scrollTop,411);
});
for(const occurrence of ['second','last'])test('late detail refresh preserves the '+occurrence+' source link when multiple controls share its href',async()=>{
 const app=await boot({compact:true,delayedFile:'material-summaries.json'});app.open('project',projectIds[0]);const content=app.el('#detail-content');
 const source=content.children.find(node=>node.attrs.href&&content.children.filter(other=>other.attrs.href===node.attrs.href).length>=3);
 assert(source,'fixture includes at least three links to the same source');const href=source.attrs.href;
 const matches=()=>content.children.filter(node=>node.attrs.href===href),before=matches();
 const index=occurrence==='second'?1:before.length-1,target=before[index];target.focus({preventScroll:true});app.el('#detail-dialog').scrollTop=417;
 await app.release();assert.equal(matches().length,before.length,'the selected source controls remain in place in this refresh');
 assert(document.activeElement===matches()[index],'restore the original duplicate occurrence, not the first matching URL');
 assert.notEqual(document.activeElement,matches()[0]);assert.equal(app.el('#detail-dialog').scrollTop,417);
});

test('late HKUST project summaries keep the rail source focused when an identical href is inserted into the main article',async()=>{
 const app=await boot({compact:true,delayedFile:'project-summaries.json'});app.open('project','HKUST-ECE-MPhil');
 const content=app.el('#detail-content'),href='https://ece.hkust.edu.hk/admissions/postgraduate';
 const matches=()=>content.children.filter(node=>node.attrs.href===href);
 assert.equal(matches().length,2);const target=matches()[1];assert(target.closest('.reading-rail'));
 target.focus({preventScroll:true});app.el('#detail-dialog').scrollTop=391;await app.release();
 assert.equal(matches().length,3,'summary inserts the same URL before the existing rail link');
 assert(document.activeElement===matches()[2],'the original rail source stays focused');assert(document.activeElement.closest('.reading-rail'));assert.equal(app.el('#detail-dialog').scrollTop,391);
});
for(const [delayedFile,route]of [['project-summaries.json','routes/summary/project/missing-project'],['material-summaries.json','materials/summary/material/missing-material']])test(delayedFile+' preserves the missing-record return button focus and scroll',async()=>{
 const app=await boot({compact:true,delayedFile});app.view(route);
 const content=app.el('#detail-content'),target=content.children.find(node=>node.dataset.close==='detail-dialog');assert(target);
 target.focus({preventScroll:true});app.el('#detail-dialog').scrollTop=117;await app.release();
 const current=content.children.find(node=>node.dataset.close==='detail-dialog');assert.notEqual(current,target);assert(document.activeElement===current,'the replacement missing-record return button stays focused');assert.equal(app.el('#detail-dialog').scrollTop,117);
});

test('late advisor profiles preserve an existing evidence-section link when matching URLs are inserted elsewhere in the main article',async()=>{
 const app=await boot({compact:true,delayedFile:'advisor-profiles.json'});app.open('advisor','tsinghua-dan-wu');
 const content=app.el('#detail-content'),href=app.catalog.advisors.find(advisor=>advisor.id==='tsinghua-dan-wu').profileUrl;
 const matches=()=>content.children.filter(node=>node.attrs.href===href);
 const target=matches().find(node=>node.closest('.detail-section')?.heading==='证据来源');assert(target);
 const count=matches().length;target.focus({preventScroll:true});app.el('#detail-dialog').scrollTop=509;await app.release();
 assert(matches().length>count,'the profile adds matching URLs outside the existing evidence section');
 assert(document.activeElement===matches().find(node=>node.closest('.detail-section')?.heading==='证据来源'));assert.equal(app.el('#detail-dialog').scrollTop,509);
});
test('late project summaries restore the existing related-advisor button without scrolling',async()=>{
 const app=await boot({compact:true,delayedFile:'project-summaries.json'});app.open('project','HKUST-ECE-MPhil');const content=app.el('#detail-content');
 const target=content.children.find(node=>node.dataset.detail);assert(target);target.focus({preventScroll:true});app.el('#detail-dialog').scrollTop=219;await app.release();
 assert(document.activeElement===content.children.find(node=>node.dataset.detail===target.dataset.detail));assert.equal(app.el('#detail-dialog').scrollTop,219);
});
