import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors,browseRoutes,filterOpportunities} from '../assets/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('data/catalog.json');
const review=read('data/zju-robotics-advisor-review-20261005.json');
const expanded=catalog.advisors.filter(a=>a.institution==='ZJU');
test('ZJU expansion covers multiple robotics and embodied-AI schools',()=>{
 assert.equal(expanded.length,36);
 assert.equal(review.advisors.length,32);
 assert.equal(new Set(review.advisors.map(a=>a.id)).size,32);
 assert(expanded.some(a=>a.id==='zju-gao-fei'));
 assert(expanded.some(a=>a.id==='zju-ye-qi'));
 assert(expanded.some(a=>a.id==='zju-cao-huazi'));
 assert(expanded.some(a=>a.id==='zju-li-tiefeng'));
});
test('ZJU expansion keeps doctoral reference and 2028 boundaries explicit',()=>{
 const route=catalog.routes.find(r=>r.id==='zju-robotics-phd-directory-reference-2026');
 assert(route);
 assert.equal(route.degree,'PhD');
 assert.equal(route.status,'reference');
 assert.equal(route.projectCycleVerified,false);
 assert.equal(route.individualRecruitmentVerified,false);
 assert.equal(filterOpportunities(catalog,{institution:'ZJU',opportunityType:'PhD'}).length,36);
 for(const a of expanded.filter(a=>a.id!=='zju-wu-fei'&&a.id!=='zju-zhuang-yueting'&&a.id!=='zju-li-xi'&&a.id!=='zju-chen-pei')){
  assert.equal(a.opening,'unknown');
  assert.equal(a.cycle2028FallVerified,false);
  assert.equal(a.fall2028OpeningVerified,false);
  assert.equal(a.routeAssociations[0].verificationStatus,'pending');
  assert(a.sources.length>=3);
 }
 const cai=expanded.find(a=>a.id==='zju-cai-gangwei');
 assert(cai.openingDetails[0].summary.includes('2027/2028'));
});
test('ZJU expansion is searchable by lab direction and degree evidence',()=>{
 assert(browseAdvisors(catalog,{query:'空中机器人'}).some(a=>a.id==='zju-gao-fei'));
 assert(browseAdvisors(catalog,{query:'灵巧手 博士'}).some(a=>a.id==='zju-ye-qi'));
 assert(browseAdvisors(catalog,{query:'医疗机器人'}).some(a=>a.id==='zju-lu-haojian'));
 assert(browseRoutes(catalog,{query:'浙江大学 博士 导师'}).some(r=>r.id==='zju-robotics-phd-directory-reference-2026'));
});
