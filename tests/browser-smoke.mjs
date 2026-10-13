// Optional local browser acceptance. Playwright is test-only and never shipped.
// Install with npm ci, or set NODE_PATH to an existing compatible Playwright runtime.
// An existing runtime avoids installation; CHROMIUM_EXECUTABLE can select a browser.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {browseAdvisors, buildOpportunities, filterOpportunities} from '../assets/core.js';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const out=process.env.QA_OUTPUT||'/tmp/gradcompass-qa';
fs.mkdirSync(out,{recursive:true});
const executablePath=process.env.CHROMIUM_EXECUTABLE||['/usr/bin/chromium','/opt/google/chrome/chrome'].find(file=>fs.existsSync(file));
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox']});
const checks=[],errors=[];
const check=(name,condition)=>{assert(condition,name);checks.push({name,passed:true});};
const data=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const catalog={...data('catalog.json'),raPositions:data('ra-positions.json').raPositions};
const expectedPeople=browseAdvisors(catalog).length;
const expectedOpportunities=buildOpportunities(catalog);
const metricFile=process.env.PERFORMANCE_OUTPUT;

async function collectMetrics(){
 const runs=[];
 for(let repeat=1;repeat<=3;repeat++){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   window.__qaPerf={cls:0,lcp:null,firstResultsMs:null,layoutShifts:[]};
   const resultsObserver=new MutationObserver(()=>{if(document.querySelector('.advisor-card')){resultsObserver.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__qaPerf.firstResultsMs=performance.now()));}});resultsObserver.observe(document,{childList:true,subtree:true});
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput){window.__qaPerf.cls+=entry.value;if(window.__qaPerf.layoutShifts.length<12)window.__qaPerf.layoutShifts.push({value:entry.value,atMs:entry.startTime,sources:(entry.sources||[]).map(source=>({node:source.node?.id||source.node?.className||source.node?.nodeName,previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()}))});}}).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(list=>{const entries=list.getEntries();window.__qaPerf.lcp=entries.at(-1)?.startTime??null;}).observe({type:'largest-contentful-paint',buffered:true});
  });
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.advisor-card');
  await page.waitForFunction(()=>window.__qaPerf.firstResultsMs!==null);
  const firstResultsMs=await page.evaluate(()=>window.__qaPerf.firstResultsMs);
  await page.waitForLoadState('networkidle');
  const initial=await page.evaluate(()=>({...window.__qaPerf,domContentLoadedMs:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd}));
  const searchMs=await page.evaluate(()=>new Promise((resolve,reject)=>{
   const input=document.querySelector('#search'),count=document.querySelector('#result-count');
   const timeout=setTimeout(()=>{observer.disconnect();reject(Error('Search count did not update'));},5000);
   const observer=new MutationObserver(()=>{
    if(!count.textContent.startsWith('1 位导师'))return;
    observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timeout);resolve(performance.now()-start);}));
   });
   observer.observe(count,{childList:true,subtree:true,characterData:true});
   input.focus();input.value='Xihui';const start=performance.now();input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'Xihui'}));
  }));
  runs.push({repeat,firstResultsMs,searchInputToPaintMs:searchMs,...initial});
  await context.close();
 }
 const median=key=>runs.map(run=>run[key]).filter(Number.isFinite).sort((a,b)=>a-b)[1]??null;
 return {label:process.env.PERFORMANCE_LABEL||'candidate',url:base,browser:await browser.version(),executablePath:executablePath||'playwright default',viewport:{width:1440,height:900},freshBrowserContexts:true,motion:'normal',networkThrottling:'none; local HTTP',repeats:runs.length,runs,medians:{firstResultsMs:median('firstResultsMs'),searchInputToPaintMs:median('searchInputToPaintMs'),lcpMs:median('lcp'),cls:median('cls')}};
}

try{
 if(process.env.METRICS_ONLY==='1'){
  const metrics=await collectMetrics();
  if(metricFile){fs.mkdirSync(path.dirname(metricFile),{recursive:true});const previous=fs.existsSync(metricFile)?JSON.parse(fs.readFileSync(metricFile,'utf8')):{};previous[metrics.label]=metrics;fs.writeFileSync(metricFile,JSON.stringify(previous,null,2)+'\n');}
  console.log(JSON.stringify(metrics,null,2));
 }else{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const waitCount=async count=>page.waitForFunction(expected=>document.querySelectorAll('.advisor-card').length===expected,count);
  const search=async value=>{await page.locator('#search').fill(value);await page.locator('#search').press('Enter');};
  const navigate=async view=>{await page.locator(`nav [data-view="${view}"]`).click();await page.waitForFunction(view=>document.querySelector('main').dataset.currentView===view,view);};
  const closeDetail=async()=>{await page.keyboard.press('Escape');await page.waitForSelector('#detail-dialog[open]',{state:'detached'});};
  const withinViewport=async locator=>{const box=await locator.boundingBox();const size=page.viewportSize();return !!box&&box.y>=0&&box.y+box.height<=size.height&&box.x>=0&&box.x+box.width<=size.width;};
  const noOverflow=async()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  await page.goto(base);await waitCount(expectedPeople);await page.waitForLoadState('networkidle');
  check('one visible card per catalog advisor',(await page.locator('.advisor-card').count())===expectedPeople);
  check('unique advisor identities',await page.locator('.advisor-card').evaluateAll(cards=>new Set(cards.map(card=>card.dataset.advisorId)).size===cards.length));
  const countText=await page.locator('#result-count').innerText();
  check('degree and RA counts remain separate',countText.includes(`${expectedOpportunities.filter(row=>row.kind==='degree').length} 条已核实学位关联`)&&countText.includes(`${expectedOpportunities.filter(row=>row.kind==='employment').length} 个 RA 岗位`));
  for(const selector of ['.name-button','.summary','.detail-button'])check(`desktop first advisor ${selector} in first viewport`,await withinViewport(page.locator('.advisor-card').first().locator(selector).first()));
  await page.screenshot({path:`${out}/desktop.png`,fullPage:false});

  // Search updates only results; composition does not filter partially committed text.
  await page.locator('#search').focus();
  const beforeIme=await page.locator('#result-count').innerText();
  await page.locator('#search').dispatchEvent('compositionstart');
  await page.locator('#search').fill('Xihui');
  await page.waitForTimeout(180);
  check('IME composition leaves existing results stable',(await page.locator('#result-count').innerText())===beforeIme);
  await page.locator('#search').dispatchEvent('compositionend');await waitCount(1);
  check('search input keeps focus',await page.locator('#search').evaluate(node=>node===document.activeElement));
  const survivor=await page.locator('.advisor-card').first().elementHandle();
  await search('Xihui Liu');await waitCount(1);
  check('unchanged advisor card node survives search',await survivor.evaluate(node=>node.isConnected));
  await page.locator('#institution-filter').selectOption('HKU');await waitCount(1);
  const detailButton=page.locator('.advisor-card .detail-button').first();
  const originalDetail=await detailButton.getAttribute('data-detail');
  await detailButton.click();await page.waitForSelector('#detail-dialog[open]');
  check('detail retains safe source links',await page.locator('#detail-dialog a[target="_blank"][rel="noopener noreferrer"]').count()>0);
  await page.screenshot({path:`${out}/detail.png`,fullPage:false});
  const detailHash=new URL(page.url()).hash;
  if(await page.locator('#detail-content .reader-toc [data-reading-section]').count()){
   await page.locator('#detail-content .reader-toc [data-reading-section]').first().click();
   check('reader contents navigation preserves detail URL',new URL(page.url()).hash===detailHash);
  }
  const projectLink=page.locator('#detail-content [data-summary-kind="project"]').first();
  check('advisor detail contains linked project',await projectLink.count()===1);
  await projectLink.click();await page.waitForFunction(()=>location.hash.includes('/summary/project/'));
  await page.goBack();await page.waitForFunction(hash=>location.hash===hash,detailHash);
  check('nested project Back restores advisor reader',await page.locator('#detail-dialog').isVisible());
  await closeDetail();
  check('detail return restores exact filters',(await page.locator('#search').inputValue())==='Xihui Liu'&&(await page.locator('#institution-filter').inputValue())==='HKU');
  check('detail return restores original trigger focus',await page.evaluate(id=>document.activeElement?.dataset.detail===id,originalDetail));

  await page.locator('#reset-filters').click();await waitCount(expectedPeople);
  await page.locator('#opportunity-filter').selectOption('RA');await waitCount(1);
  const jobs=filterOpportunities(catalog,{opportunityType:'RA'});
  check('RA contains one mentor and two independent job controls',await page.locator('.advisor-card [data-compare]').count()===jobs.length&&jobs.length===2);
  for(const job of jobs){
   await page.locator(`[data-detail="${job.id}"]`).first().click();
   check(`RA ${job.id} retains employment uncertainty`,(await page.locator('#detail-content').innerText()).includes('工作许可未核实')&&(await page.locator('#detail-content').innerText()).includes('截止时刻：未公布'));
   await closeDetail();await page.locator(`[data-compare="${job.id}"]`).click();
  }
  check('RA comparison counts records instead of mentors',(await page.locator('#compare-count').innerText()).includes('2')&&!(await page.locator('#compare-count').innerText()).includes('位导师'));
  await page.locator('#compare-open').click();check('RA comparison retains two columns',await page.locator('[data-opportunity-column]').count()===2);
  await page.locator('[data-opportunity-differences]').click();check('RA differences preserve both independent jobs',await page.locator('[data-opportunity-differences]').getAttribute('aria-pressed')==='true'&&await page.locator('[data-opportunity-column]').count()===2);
  await page.locator(`[data-remove-opportunity="${jobs[1].id}"]`).click();await page.waitForSelector('#compare-dialog[open]',{state:'detached'});
  check('removing RA comparison item keeps remaining selection',(await page.locator('#compare-count').innerText()).includes('1 / 3'));
  check('two-to-one comparison removal restores a usable focus target',await page.evaluate(()=>{const node=document.activeElement,box=node?.getBoundingClientRect();return node&&node!==document.body&&node.isConnected&&!node.disabled&&box.width>0&&box.height>0&&getComputedStyle(node).visibility!=='hidden';}));
  await page.locator(`[data-compare="${jobs[1].id}"]`).click();await page.locator('#compare-open').click();check('RA removed job can be reselected',await page.locator('[data-opportunity-column]').count()===2);
  await page.locator('[data-close="compare-dialog"]').click();await page.locator('#compare-clear').click();
  await page.locator('#reset-filters').click();await waitCount(expectedPeople);

  await navigate('routes');
  for(let i=0;i<2;i++)await page.locator('[data-compare-project]').nth(i).click();
  await page.locator('#compare-open').click();check('two projects compare independently',await page.locator('.project-comparison-heading').count()===2);
  const compareHash=new URL(page.url()).hash;await page.locator('[data-project-differences]').click();
  check('difference-only changes table without URL mutation',await page.locator('[data-project-differences]').getAttribute('aria-pressed')==='true'&&new URL(page.url()).hash===compareHash);
  await page.locator('[data-close="compare-dialog"]').click();
  await page.locator('[data-compare-project]').nth(2).click();await page.locator('[data-compare-project]').nth(3).click();
  check('project comparison caps at three',(await page.locator('#compare-count').innerText()).includes('3 / 3'));
  await page.locator('#compare-open').click();check('three projects render three headings',await page.locator('.project-comparison-heading').count()===3);
  await page.screenshot({path:`${out}/compare.png`,fullPage:false});
  await page.locator('[data-remove-project]').last().click();check('removal keeps two projects',await page.locator('.project-comparison-heading').count()===2);
  await page.locator('[data-close="compare-dialog"]').click();await page.locator('#compare-clear').click();
  await page.goto(base+'/'+compareHash);await page.waitForSelector('#compare-dialog[open]');
  check('cold project comparison deep link works',await page.locator('.project-comparison-heading').count()===2);
  await page.locator('[data-close="compare-dialog"]').click();

  await navigate('experiences');await page.waitForSelector('.experience-card');
  const readLink=page.locator('.experience-read-link').first(),readingHref=await readLink.getAttribute('href');
  await readLink.scrollIntoViewIfNeeded();const listScroll=await page.evaluate(()=>scrollY);
  await readLink.click();await page.waitForSelector('[data-reading-experience]');await page.goBack();await page.waitForSelector('.experience-card');
  check('experience Back restores originating reader link',await page.evaluate(href=>document.activeElement?.getAttribute('href')===href,readingHref));
  check('experience Back restores list scroll',Math.abs((await page.evaluate(()=>scrollY))-listScroll)<5);
  await page.locator('#experience-search').fill('zero-nonexistent-experience');await page.waitForFunction(()=>document.querySelector('#experience-result-status').textContent.includes('0 /'));
  check('experience empty state supports reset',await page.locator('[data-experience-reset]').count()>0);await page.locator('[data-experience-reset]').first().click();
  await navigate('deadlines');check('deadline records retain historical context',(await page.locator('#view-content').innerText()).includes('已截止'));
  await navigate('materials');check('materials preserve official requirement content',(await page.locator('#view-content').innerText()).includes('至少 2'));
  await navigate('sources');check('update status remains honest',(await page.locator('#view-content').innerText()).includes('首轮'));
  await page.goBack();check('Back restores materials route',new URL(page.url()).hash==='#materials');

  await navigate('advisors');await page.locator('#reset-filters').click();
  await search('zero-nonexistent-name');await waitCount(0);check('empty result gives recovery',(await page.locator('#view-content').innerText()).includes('没有同时满足'));
  await page.locator('[data-reset]').click();await waitCount(expectedPeople);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  for(const selector of ['.name-button','.summary','.detail-button'])check(`mobile first advisor ${selector} in first viewport`,await withinViewport(page.locator('.advisor-card').first().locator(selector).first()));
  check('mobile has no horizontal overflow',await noOverflow());await page.screenshot({path:`${out}/mobile.png`,fullPage:false});
  await page.locator('#mobile-filter-toggle').click();await page.waitForSelector('#filter-dialog[open]');
  await page.locator('#institution-filter').selectOption('HKU');check('mobile draft does not change current results',await page.locator('.advisor-card').count()===expectedPeople);
  await page.locator('#filter-cancel').click();check('mobile cancel discards draft',await page.locator('#institution-filter').inputValue()==='');
  await page.locator('#mobile-filter-toggle').click();await page.locator('#opportunity-filter').selectOption('RA');await page.locator('#filter-apply').click();await waitCount(1);
  check('mobile applies draft as a complete filter',(await page.locator('#opportunity-filter').inputValue())==='RA');
  await page.locator('.advisor-card .detail-button').first().click();check('mobile reader does not overflow',await page.locator('#detail-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));await closeDetail();
  await page.locator('[data-clear-filters]').click();await waitCount(expectedPeople);
  for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:900});check(`${width}px viewport has no horizontal overflow`,await noOverflow());}
  await page.setViewportSize({width:720,height:450});check('200% equivalent layout reflows without page overflow',await noOverflow());
  // Supplement arrival must preserve preedit and the current reader control.
  async function pendingProfiles(viewport){
   const testPage=await browser.newPage({viewport,reducedMotion:'reduce'});testPage.on('pageerror',error=>errors.push('delayed profile: '+String(error)));
   let release;const response=new Promise(resolve=>release=resolve);
   await testPage.route('**/data/advisor-profiles.json*',async route=>{await response;await route.continue();});
   await testPage.goto(base,{waitUntil:'domcontentloaded'});await testPage.waitForSelector('.advisor-card');return {testPage,release};
  }
  {
   const {testPage,release}=await pendingProfiles({width:1440,height:900});
   const input=testPage.locator('#search'),committed=await testPage.locator('#result-count').innerText(),preedit=catalog.advisors.find(advisor=>advisor.id==='hku-xihui-liu').nameZh||'Xihui';
   await input.focus();await input.dispatchEvent('compositionstart');await input.fill(preedit);release();
   await testPage.waitForFunction(()=>document.querySelectorAll('.advisor-card[data-profile-state="ready"]').length===document.querySelectorAll('.advisor-card').length);
   check('late profile arrival preserves IME preedit and input focus',await input.inputValue()===preedit&&await input.evaluate(node=>node===document.activeElement));
   check('late profile arrival retains committed results during composition',(await testPage.locator('#result-count').innerText())===committed);
   await input.dispatchEvent('compositionend');await testPage.waitForFunction(()=>document.querySelectorAll('.advisor-card').length===1);
   check('preserved IME preedit commits normally',await testPage.locator('.advisor-card').count()===1);await testPage.close();
  }
  {
   const {testPage,release}=await pendingProfiles({width:1440,height:900});
   await testPage.locator('.advisor-card .detail-button').first().click();
   await testPage.locator('.reader-toc [data-reading-section]').filter({hasText:'申请路径与条件'}).click();
   const chapter=await testPage.evaluate(()=>document.activeElement.id),readerHash=new URL(testPage.url()).hash;release();
   await testPage.waitForSelector('#detail-content [data-profile-advisor]');
   check('late profile arrival restores focused TOC chapter itself',await testPage.evaluate(id=>document.activeElement.id===id,chapter));
   check('late reader enhancement preserves detail URL',new URL(testPage.url()).hash===readerHash);await testPage.close();
  }
  {
   const {testPage,release}=await pendingProfiles({width:390,height:844});
   await testPage.locator('.advisor-card .detail-button').first().click();await testPage.locator('.reader-mobile-toc>summary').click();
   const summaryId=await testPage.locator('.reader-mobile-toc>summary').getAttribute('id');release();
   await testPage.waitForSelector('#detail-content [data-profile-advisor]');
   check('late profile arrival retains expanded mobile contents',await testPage.locator('.reader-mobile-toc').evaluate(node=>node.open));
   check('late profile arrival restores mobile summary focus',!!summaryId&&await testPage.evaluate(id=>document.activeElement.id===id,summaryId));await testPage.close();
  }
  // Real browser recovery paths complement the deterministic supplement unit cases.
  const coreFault=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  coreFault.on('pageerror',error=>errors.push('core retry: '+String(error)));
  let rejectCatalog=true;
  await coreFault.route('**/data/catalog.json*',route=>rejectCatalog?route.fulfill({status:503,body:'temporarily unavailable'}):route.continue());
  await coreFault.goto(base);await coreFault.waitForFunction(()=>document.querySelector('#result-count').textContent==='数据未能载入');
  check('catalog failure exposes saved source and retry',await coreFault.locator('#view-content a[href="./data/catalog.json"]').count()===1);
  rejectCatalog=false;await coreFault.getByRole('button',{name:/重新载入|重试/}).click();
  await coreFault.waitForFunction(expected=>document.querySelectorAll('.advisor-card').length===expected,expectedPeople);
  check('catalog retry recovers real advisor results',await coreFault.locator('.advisor-card').count()===expectedPeople);await coreFault.close();

  const profileFault=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  profileFault.on('pageerror',error=>errors.push('profile retry: '+String(error)));
  let rejectProfiles=true;
  await profileFault.route('**/data/advisor-profiles.json*',route=>rejectProfiles?route.fulfill({status:503,body:'temporarily unavailable'}):route.continue());
  await profileFault.goto(base);await profileFault.waitForSelector('[data-retry-supplement="profiles"]');
  check('failed profile supplement keeps all core advisors',await profileFault.locator('.advisor-card').count()===expectedPeople);
  check('failed profile supplement differs from missing research',(await profileFault.locator('.profile-state').first().innerText()).includes('暂未载入'));
  rejectProfiles=false;await profileFault.locator('[data-retry-supplement="profiles"]').click();
  await profileFault.waitForFunction(()=>document.querySelectorAll('.advisor-card[data-profile-state="ready"]').length===document.querySelectorAll('.advisor-card').length);
  check('profile retry restores enriched research',await profileFault.locator('.profile-state').count()===0);await profileFault.close();

  const delayedProjects=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  delayedProjects.on('pageerror',error=>errors.push('delayed projects: '+String(error)));
  let releaseProjects;const projectResponse=new Promise(resolve=>releaseProjects=resolve);
  await delayedProjects.route('**/data/project-summaries.json*',async route=>{await projectResponse;await route.continue();});
  await delayedProjects.goto(base,{waitUntil:'domcontentloaded'});await delayedProjects.waitForSelector('.advisor-card');
  await delayedProjects.locator('nav [data-view="routes"]').click();
  check('slow introduction never hides core projects',await delayedProjects.locator('.project-row').count()===catalog.routes.length&&(await delayedProjects.locator('.projects-intro').innerText()).includes('正在载入'));
  releaseProjects();await delayedProjects.waitForFunction(()=>document.querySelector('.projects-intro').textContent.includes('已补充'));
  check('delayed introduction updates the current projects',await delayedProjects.locator('.project-row').count()===catalog.routes.length);await delayedProjects.close();
  check('no unexpected runtime or CSP errors',errors.length===0);
  fs.writeFileSync(`${out}/browser-report.json`,JSON.stringify({checks,errors,scope:'Local candidate browser behavior; no deployment claim.'},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
 }
}catch(error){fs.writeFileSync(`${out}/browser-report.json`,JSON.stringify({checks,errors,failure:String(error)},null,2)+'\n');throw error;}
finally{await browser.close();}
