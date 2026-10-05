import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors,filterOpportunities} from '../assets/core.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const review=JSON.parse(fs.readFileSync(new URL('../data/sjtu-robotics-advisor-review-20261005.json',import.meta.url),'utf8'));
const sjtu=catalog.advisors.filter(a=>a.institution==='SJTU');
test('SJTU expansion covers three official schools and 58 new advisor records',()=>{
 assert.equal(sjtu.length,61);assert.equal(review.advisors.length,58);
 for(const dept of ['自动化与感知学院','人工智能学院','溥渊未来技术学院']) assert(sjtu.some(a=>a.department===dept));
 assert.equal(new Set(review.advisors.map(a=>a.id)).size,58);
});
test('SJTU doctoral references stay separate from verified opportunities',()=>{
 assert(catalog.routes.some(r=>r.id==='sjtu-ai-phd-reference-2026'&&r.degree==='PhD'&&r.status==='reference'&&r.projectCycleVerified===true));
 assert.equal(filterOpportunities(catalog,{institution:'SJTU',opportunityType:'PhD'}).length,55);
 assert.equal(sjtu.filter(a=>a.routeAssociations?.some(x=>x.status==='verified')).length,0);
 assert(sjtu.every(a=>a.cycle2027FallVerified===false&&a.cycle2028FallVerified===false&&a.fall2028OpeningVerified===false));
 assert.equal(catalog.routes.filter(r=>r.institution==='SJTU').length,2);
});
test('SJTU expansion is searchable by representative directions',()=>{
 for(const [q,id] of [['上海交通大学 柔性连续体机器人','sjtu-gao-anzhu'],['上海交通大学 具身智能 VLA','sjtu-zhang-zhipeng'],['上海交通大学 机器人抓取','sjtu-chen-lipeng'],['上海交通大学 多机器人强化学习','sjtu-yuan-liwei'],['上海交通大学 世界模型','sjtu-li-yanwei'],['上海交通大学 移动机器人 SLAM','sjtu-wang-jingchuan']]) {
  const rows=browseAdvisors(catalog,{query:q});assert(rows.some(a=>a.id===id),`${q} should find ${id}`);
 }
});
