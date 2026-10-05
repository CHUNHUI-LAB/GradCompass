import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors,browseRoutes,filterOpportunities} from '../assets/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('data/catalog.json');
const review=read('data/nju-robotics-advisor-review-20261005.json');
const nju=catalog.advisors.filter(a=>a.institution==='NJU');
const expanded=review.advisors.map(a=>a.id);
test('NJU expansion covers robotics, intelligent science, computer science and AI schools',()=>{
 assert.equal(nju.length,28);
 assert.equal(review.advisors.length,25);
 assert.deepEqual(new Set(expanded).size,25);
 for(const dept of ['机器人与自动化学院','智能科学与技术学院','计算机学院','人工智能学院']) assert(nju.some(a=>a.department===dept));
 for(const id of expanded){const a=catalog.advisors.find(x=>x.id===id);assert(a);assert.equal(a.institution,'NJU');assert.equal(a.eligibility,'pending');assert.equal(a.opening,'unknown');assert(a.sources.length>=3);}
});
test('NJU doctoral routes remain references and do not manufacture verified opportunities',()=>{
 for(const id of ['nju-robotics-phd-reference-2026','nju-intelligent-science-phd-reference-2025','nju-cs-embodied-phd-reference-2025','nju-ai-embodied-phd-reference-2026']){
  const r=catalog.routes.find(x=>x.id===id);assert(r);assert.equal(r.degree,'PhD');assert.equal(r.status,'reference');assert.equal(r.projectCycleVerified,id==='nju-cs-embodied-phd-reference-2025'?false:true);assert.equal(r.individualRecruitmentVerified,false);
 }
 assert.equal(filterOpportunities(catalog,{institution:'NJU'}).length,0);
 assert.equal(filterOpportunities(catalog,{institution:'NJU',opportunityType:'PhD'}).length,29);
 for(const id of expanded){const a=catalog.advisors.find(x=>x.id===id);assert.equal(a.cycle2027FallVerified,false);assert.equal(a.cycle2028FallVerified,false);assert.equal(a.fall2028OpeningVerified,false);assert(a.routeAssociations.every(x=>x.verificationStatus==='pending'&&!x.individualRecruitmentVerified));}
});
test('NJU expansion is searchable by representative research directions',()=>{
 for(const q of ['南京大学 空中机器人','南京大学 具身空间智能','南京大学 移动机器人','南京大学 世界模型','南京大学 智能规划']) assert(browseAdvisors(catalog,{query:q}).some(a=>a.institution==='NJU'),q);
 assert.equal(browseAdvisors(catalog,{query:'南京大学 博士'}).filter(a=>a.institution==='NJU').length,28);
 for(const id of ['nju-robotics-phd-reference-2026','nju-intelligent-science-phd-reference-2025','nju-cs-embodied-phd-reference-2025','nju-ai-embodied-phd-reference-2026']) assert(browseRoutes(catalog,{query:'南京大学 博士'}).some(r=>r.id===id));
});
