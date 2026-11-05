// Local desktop/mobile acceptance; browser installation is separate from node tests.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {priorityCounts} from '../assets/advisor-priorities.js';
import {browseAdvisors} from '../assets/core.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:4199',out=process.env.QA_OUTPUT||'/tmp/gradcompass-priority-qa';
fs.mkdirSync(out,{recursive:true});
const c=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
c.advisorProfiles=new Map(JSON.parse(fs.readFileSync(new URL('../data/advisor-profiles.json',import.meta.url))).profiles.map(p=>[p.advisorId,p]));
const expected=priorityCounts(c),errors=[],checks=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const button=(page,value)=>page.locator(`#advisor-priorities [data-priority-value="${value}"]`);
const waitCount=(page,n)=>page.waitForFunction(n=>document.querySelector('#result-count').textContent.startsWith(n+' 位导师'),n);
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:960}}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.querySelector('[data-priority-value="recent"]').disabled);
  assert.equal(await button(page,'recent').locator('.priority-count').innerText(),String(expected.recent));
  assert.equal(await button(page,'fall2028_phd').locator('.priority-count').innerText(),String(expected.fall2028_phd));
  assert(await page.locator('#advisor-priorities').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
  await page.screenshot({path:path.join(out,`priorities-${width}.png`)});
  await button(page,'recent').click();await waitCount(page,expected.recent);
  assert.equal(await page.locator('.advisor-card').count(),expected.recent);
  await button(page,'year2028_phd').click();
  const intersection=browseAdvisors(c,{appointment:'recent',intake:'year2028_phd'}).length;await waitCount(page,intersection);
  await button(page,'recent').click();await waitCount(page,expected.year2028_phd);
  await button(page,'fall2028_phd').click();await waitCount(page,expected.fall2028_phd);
  if(expected.fall2028_phd===0){assert(await page.locator('.empty').innerText().then(t=>t.includes('没有匹配的明确 2028 Fall')));await page.locator('.empty [data-priority-value="year2028_phd"]').click();await waitCount(page,expected.year2028_phd);}
  await page.locator('.advisor-card [data-detail]').first().click();await page.locator('#detail-dialog').waitFor({state:'visible'});await page.goBack();await page.locator('#detail-dialog').waitFor({state:'hidden'});await page.goForward();await page.locator('#detail-dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#detail-dialog').waitFor({state:'hidden'});
  await page.screenshot({path:path.join(out,`year-evidence-${width}.png`)});
  if(width<1024){
   await page.locator('#mobile-filter-toggle').click();await page.locator('#filter-dialog').waitFor({state:'visible'});
   if(await page.locator('#filter-dialog .advanced-filters').getAttribute('open')===null)await page.locator('#filter-dialog .advanced-filters > summary').click();
   await page.locator('#intake-filter').selectOption('unknown');await page.locator('#filter-cancel').click();
   assert.equal(await page.locator('#intake-filter').inputValue(),'year2028_phd');
   await page.locator('#mobile-filter-toggle').click();await page.locator('#intake-filter').selectOption('unknown');await page.locator('#filter-apply').click();await waitCount(page,expected.unknown);
  }
  checks.push({width,passed:true});await context.close();
 }
 // Recruitment remains usable when optional profile loading fails.
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage();
 await page.route('**/advisor-profiles.json*',route=>route.abort());await page.goto(base,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#advisor-priorities').textContent.includes('任职资料未载入'));
 assert(await button(page,'recent').isDisabled());await button(page,'year2028_phd').click();await waitCount(page,expected.year2028_phd);checks.push({profileFailure:true,passed:true});await context.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,expected},null,2));console.log(JSON.stringify({checks,errors,expected},null,2));
}finally{await browser.close();}
