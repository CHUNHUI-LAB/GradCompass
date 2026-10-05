import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterOpportunities} from '../assets/core.js';
const read = p => JSON.parse(fs.readFileSync(new URL('../'+p, import.meta.url), 'utf8'));
const catalog = read('data/catalog.json');
const schools = [
  {institution:'ZJU', zh:'浙江大学', baseRoute:'zju-ai-phd-reference-2027', review:'zju-advisor-review-20261005.json', advisorIds:['zju-wu-fei','zju-zhuang-yueting','zju-li-xi','zju-chen-pei']},
  {institution:'Fudan', zh:'复旦大学', baseRoute:'fudan-ai-phd-reference-2026', review:'fudan-advisor-review-20261005.json', advisorIds:['fudan-zhang-wenqiang','fudan-chen-tao','fudan-leng-siyang','fudan-cheng-yuan']},
  {institution:'SJTU', zh:'上海交通大学', baseRoute:'sjtu-robotics-phd-reference-2026', review:'sjtu-advisor-review-20261005.json', advisorIds:['sjtu-chen-weidong','sjtu-zhang-weidong','sjtu-yu-gan']},
  {institution:'NJU', zh:'南京大学', baseRoute:'nju-ai-phd-reference-2026', review:'nju-advisor-review-20261005.json', advisorIds:['nju-li-yufeng','nju-shen-furao','nju-zhao-jinxi']},
  {institution:'USTC', zh:'中国科学技术大学', baseRoute:'ustc-ai-phd-reference-2026', review:'ustc-advisor-review-20261005.json', advisorIds:['ustc-ren-shaoqing','ustc-hu-qiqiang','ustc-zhang-tianzhu']},
  {institution:'Tongji', zh:'同济大学', baseRoute:'tongji-robotics-phd-reference-2026', review:'tongji-advisor-review-20261005.json', advisorIds:['tongji-he-bin','tongji-wang-zhipeng','tongji-xu-yang','tongji-jiang-shuo']},
  {institution:'SEU', zh:'东南大学', baseRoute:'seu-robotics-phd-reference-2026', review:'seu-advisor-review-20261005.json', advisorIds:['seu-li-zhongguo','seu-huang-yongming','seu-chang-zhiyong','seu-wei-xiucan','seu-song-mofei','seu-feng-lei','seu-zhang-yu']}
];
const expectedPhdCounts = {ZJU:36,Fudan:4,SJTU:56,NJU:29,USTC:4,Tongji:4,SEU:7};
const cycleRoutes = [
  ['nju-lamda-phd-reference-2027','NJU'],
  ['ustc-tong-plan-phd-reference-2027','USTC'],
  ['seu-palm-phd-reference-2027','SEU']
];
test('seven mainland universities are recorded with bounded PhD references', () => {
  assert.deepEqual(schools.map(s=>s.institution), ['ZJU','Fudan','SJTU','NJU','USTC','Tongji','SEU']);
  for (const school of schools) {
    const review = read('data/'+school.review);
    assert.equal(review.institution, school.institution);
    assert.equal(review.institutionZh, school.zh);
    assert.equal(review.checkedDate, '2026-10-05');
    assert.equal(review.advisors.length, school.advisorIds.length);
    assert.deepEqual(new Set(review.advisors.map(a=>a.id)), new Set(school.advisorIds));
    const route = catalog.routes.find(r=>r.id===school.baseRoute);
    assert(route);
    assert.equal(route.degree, 'PhD');
    assert.equal(route.status, 'reference');
    assert.equal(route.projectCycleVerified, true);
    assert.equal(route.individualRecruitmentVerified, false);
    assert.equal(filterOpportunities(catalog,{institution:school.institution,opportunityType:'PhD'}).length, expectedPhdCounts[school.institution]);
    assert.equal(filterOpportunities(catalog,{institution:school.institution}).length, 0);
    for (const advisor of review.advisors) {
      assert(advisor.sources.length >= 2);
      assert.equal(advisor.cycle2027FallVerified, false);
      assert.equal(advisor.cycle2028FallVerified, false);
      assert(advisor.sources.every(source=>source.url.startsWith('https://')));
      assert(advisor.sources.every(source=>source.checkedDate==='2026-10-05'));
    }
  }
});
test('cycle-specific 2027 routes preserve project-level and personal-level boundaries', () => {
  for (const [id,institution] of cycleRoutes) {
    const route = catalog.routes.find(r=>r.id===id);
    assert(route && route.institution===institution);
    assert.equal(route.degree,'PhD');
    assert.equal(route.status,'reference');
    assert.equal(route.sourceCycle,'2027');
    assert(route.requirements?.length >= 3);
    assert(route.cycleReview?.sources?.length >= 1);
    assert.equal(route.projectCycleVerified,true);
    assert.equal(route.individualRecruitmentVerified,false);
  }
  for (const id of ['nju-li-yufeng','ustc-zhang-tianzhu','seu-wei-xiucan','seu-song-mofei','seu-feng-lei','seu-zhang-yu']) {
    const advisor = catalog.advisors.find(a=>a.id===id);
    assert(advisor);
    assert.equal(advisor.cycle2027FallReference,true);
    assert.equal(advisor.cycle2027FallVerified ?? false,false);
    assert.equal(advisor.cycle2028FallVerified ?? false,false);
    assert.equal(advisor.opening,'unknown');
  }
});
test('new school advisors have no profile association or opening overclaim', () => {
  const ids = schools.flatMap(s=>s.advisorIds);
  assert.equal(ids.length, 28);
  for (const id of ids) {
    const a = catalog.advisors.find(x=>x.id===id);
    assert.equal(a.eligibility, 'pending');
    assert.equal(a.cycle2028FallVerified ?? false, false);
    assert.equal(a.opening, 'unknown');
    assert(Array.isArray(a.caveats) && a.caveats.length > 0);
  }
});
