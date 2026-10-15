// Keep unchanged result cards, disclosure state and keyboard focus across filters
// and late supplementary data. The public data/qualification layer is untouched.
const renderedMarkup=new WeakMap();
const resultAnimations=new WeakMap();

function controlKey(node){
  if(!node)return null;
  for(const name of ['data-detail','data-compare','data-compare-project','data-summary-id','data-disclosure-key']){
    if(node.hasAttribute?.(name))return [name,node.getAttribute(name),node.className||''];
  }
  if(node.id)return ['id',node.id,''];
  if(node.tagName==='SUMMARY')return ['summary',node.parentElement?.dataset.disclosureKey||'',node.textContent];
  if(node.tagName==='A')return ['href',node.getAttribute('href'),node.textContent];
  return null;
}
function sameKey(node,key){return JSON.stringify(controlKey(node))===JSON.stringify(key);}

/** items: [{ key: stableRecordId, html: oneRootElementHTML }] */
export function reconcileResults(container,items,{scope='results',animate=false}={}){
  if(!container)return;
  // Contract tests without a browser still exercise the real renderers.
  if(!document.createElement||!container.children||!container.insertBefore){
    container.innerHTML=items.map(item=>item.html).join('');return;
  }
  // Parse the initial result set in one operation. Keyed reconciliation is for
  // later updates, where keeping existing nodes actually benefits the reader.
  if(container.dataset.resultScope!==scope||!container.firstElementChild?.dataset.resultKey){
    container.innerHTML=items.map(item=>item.html).join('');
    [...container.children].forEach((node,index)=>{
      node.dataset.resultKey=String(items[index].key);renderedMarkup.set(node,items[index].html);
    });
    container.dataset.resultScope=scope;return;
  }
  const focused=document.activeElement;
  const focusKey=container.contains(focused)?controlKey(focused):null;
  const focusedCard=focusKey?focused.closest('[data-result-key]')?.dataset.resultKey:null;
  const old=new Map([...container.children].map(node=>[node.dataset.resultKey,node]));
  const keep=new Set();
  let cursor=container.firstElementChild;
  for(const {key,html} of items){
    let node=old.get(String(key));
    if(!node||renderedMarkup.get(node)!==html||container.dataset.resultScope!==scope){
      const template=document.createElement('template');template.innerHTML=html;
      const next=template.content.firstElementChild;
      if(!next)continue;
      next.dataset.resultKey=String(key);
      // Persist user-opened sections even when a profile refresh changes text.
      const open=new Map([...(node?.querySelectorAll('details[data-disclosure-key]')||[])].map(item=>[item.dataset.disclosureKey,item.open]));
      for(const item of next.querySelectorAll('details[data-disclosure-key]')){
        if(open.has(item.dataset.disclosureKey))item.open=open.get(item.dataset.disclosureKey);
      }
      if(node){if(cursor===node)cursor=next;node.replaceWith(next);}
      node=next;renderedMarkup.set(node,html);
    }
    keep.add(node);
    if(node!==cursor)container.insertBefore(node,cursor);
    cursor=node.nextElementSibling;
  }
  for(const node of [...container.children])if(!keep.has(node))node.remove();
  container.dataset.resultScope=scope;
  if(focusKey&&!container.contains(focused)){
    const card=[...container.children].find(node=>node.dataset.resultKey===focusedCard);
    const target=[...(card?.querySelectorAll('a,button,summary,[tabindex]')||[])].find(node=>sameKey(node,focusKey));
    target?.focus({preventScroll:true});
  }
  if(animate&&container.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    resultAnimations.get(container)?.cancel();
    resultAnimations.set(container,container.animate([{opacity:.86},{opacity:1}],{duration:140,easing:'cubic-bezier(.22,1,.36,1)'}));
  }
}
