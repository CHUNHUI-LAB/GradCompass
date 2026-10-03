import {maintenanceBaseline} from './maintenance-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeExperiences,filterExperiences,renderExperienceResults,renderExperiences,renderExperienceEvidence,renderExperienceReading} from '../assets/experiences.js';
import {renderPageOverview} from '../assets/page-overviews.js';
const records=normalizeExperiences(JSON.parse(fs.readFileSync(new URL('../data/application-experiences.json',import.meta.url))));
test('experience search examines readable context and methods, case-insensitively, without mutation',()=>{
 const before=JSON.stringify(records);
 for(const r of records){assert(filterExperiences(records,{query:r.title}).some(x=>x.id===r.id));assert(filterExperiences(records,{query:r.author}).some(x=>x.id===r.id));assert(filterExperiences(records,{query:r.actionableMethods[0]}).some(x=>x.id===r.id));}
 assert.deepEqual(filterExperiences(records,{query:'  RA  '}),filterExperiences(records,{query:'ra'}));
 assert.equal(filterExperiences(records,{query:'  '}).length,21);assert.equal(JSON.stringify(records),before);
});
test('background and text filters intersect; missing source data is never mistaken for no matches',()=>{
 const cross=filterExperiences(records,{collection:'cross-background'});assert.equal(cross.length,4);assert(cross.every(r=>r.collection==='cross-background'));
 assert.equal(filterExperiences(records,{collection:'bachelor'}).length,17);
 assert.equal(filterExperiences(records,{query:cross[0].title,collection:'bachelor'}).length,0);
 assert(renderExperienceResults(records,{query:'no-match-string'}).html.includes('data-experience-reset'));
 assert.equal(renderExperienceResults(records,{query:'no-match-string'}).countLabel,'找到 0 / 21 条申请经验');
 assert(renderExperiences(null).html.includes('暂时无法读取'));assert(!renderExperiences(null).html.includes('experience-search'));
 assert(renderExperiences([]).html.includes('暂无符合来源要求'));assert(!renderExperiences([]).html.includes('没有匹配'));
});
test('one stable workspace uses labels and an announced count without hiding card summaries',()=>{
 const h=renderExperiences(records).html;
 for(const x of ['查找经验','type="search"','id="experience-collection"','role="status"','aria-live="polite"','归纳范围不随筛选变化','不是申请资格判断'])assert(h.includes(x),x);
 assert.equal((h.match(/id="experience-search"/g)||[]).length,1);assert(h.includes('data-experience-reset disabled'));
 assert(!renderExperiences(records,{query:'RA'}).html.includes('data-experience-reset disabled'));
 assert(!h.includes('<details'));assert(!h.includes('target="_blank"'));
 for(const r of records){const card=h.split(`data-experience-id="${r.id}"`)[1].split('</article>')[0];assert(card.includes('experience-takeaway'));assert(card.includes('公开自述'));assert(card.indexOf('experience-takeaway')<card.indexOf('阅读经验'));assert(card.includes(r.applicableCycle.replaceAll('&','&amp;')));}
});
test('synthesis stays global and evidence preserves every existing boundary under filtering',()=>{
 const options={experiences:records};const global=renderPageOverview('experiences',{routes:[]},options);const full=renderExperienceEvidence(records);
 assert(global.includes('21 篇公开自述'));assert(global.includes('综合总结'));assert(!global.includes('<details'));assert(full.includes('不同背景的结果不宜直接比较'));
 for(const r of records){assert(full.includes('#experiences/'+r.id));const reading=renderExperienceReading(records,r.id).html;assert(reading.indexOf('不能照搬的部分')<reading.indexOf('查看原帖'));}
 renderExperiences(records,{query:'RA',collection:'bachelor'});assert.equal(renderPageOverview('experiences',{routes:[]},options),global);assert.equal(renderExperienceEvidence(records),full);
});
test('query and record text are escaped in controls, empty state and visible summaries',()=>{
 const query='"<script>bad</script>&';const h=renderExperiences(records,{query}).html;assert(!h.includes('<script>'));assert(h.includes('&lt;script&gt;'));assert(h.includes('&quot;'));
});
test('whole-page changes leave source records and official eligibility datasets byte-identical',()=>{
 for(const [name,hash] of Object.entries({'application-experiences.json':'05b5bc420009910cdb9432bcb199df050007034c178fa2d2b9e7531cc76beb9b','application-experience-provenance.json':'0a057d4264371c0adbca86d6af5257919a45f5a767e40f39d9457e0698d9ccf8','catalog.json':'ea7eb2a1ea4ac00ea23ea17c4f12f9561874e27a7dcd2b7d085db30a46d05ff9'}))assert.equal(crypto.createHash('sha256').update(['catalog.json','application-experiences.json','application-experience-provenance.json'].includes(name)?JSON.stringify(maintenanceBaseline(JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)))),null,2)+'\n':fs.readFileSync(new URL('../data/'+name,import.meta.url))).digest('hex'),hash,name);
 const css=fs.readFileSync(new URL('../assets/style.css',import.meta.url),'utf8').split('/* Application experience:')[1];assert(css.includes('grid-template-columns:minmax(0,1fr) auto'));assert(css.includes('min-height:46px'));assert(css.includes('font-size:16px'));assert(css.includes('prefers-reduced-motion:reduce'));assert(!css.includes('line-clamp')&&!css.includes('max-height'));
});
