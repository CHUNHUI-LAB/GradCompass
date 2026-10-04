import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors, filterOpportunities} from '../assets/core.js';
const read = p => JSON.parse(fs.readFileSync(new URL('../'+p, import.meta.url), 'utf8'));
const catalog = read('data/catalog.json');
const schools = [
  ['ZJU','浙江大学','zju-ai-phd-reference-2027','zju-advisor-review-20261005.json',4],
  ['Fudan','复旦大学','fudan-ai-phd-reference-2026','fudan-advisor-review-20261005.json',4],
  ['SJTU','上海交通大学','sjtu-robotics-phd-reference-2026','sjtu-advisor-review-20261005.json',3],
  ['NJU','南京大学','nju-ai-phd-reference-2026','nju-advisor-review-20261005.json',3],
  ['USTC','中国科学技术大学','ustc-ai-phd-reference-2026','ustc-advisor-review-20261005.json',3],
  ['Tongji','同济大学','tongji-robotics-phd-reference-2026','tongji-advisor-review-20261005.json',4],
  ['SEU','东南大学','seu-robotics-phd-reference-2026','seu-advisor-review-20261005.json',3]
];
test('seven mainland universities are recorded in the requested order with bounded PhD references', () => {
  const order = [...new Set(catalog.advisors.slice(-24).map(a=>a.institution))];
  assert.deepEqual(order, schools.map(s=>s[0]));
  for (const [institution, zh, routeId, file, count] of schools) {
    const review = read('data/'+file);
    assert.equal(review.institution, institution);
    assert.equal(review.institutionZh, zh);
    assert.equal(review.checkedDate, '2026-10-05');
    assert.equal(review.advisors.length, count);
    const route = catalog.routes.find(r=>r.id===routeId);
    assert(route);
    assert.equal(route.degree, 'PhD');
    assert.equal(route.status, 'reference');
    assert.equal(route.projectCycleVerified, true);
    assert.equal(route.individualRecruitmentVerified, false);
    assert.equal(filterOpportunities(catalog,{institution,opportunityType:'PhD'}).length, count);
    assert.equal(filterOpportunities(catalog,{institution}).length, 0);
    for (const advisor of review.advisors) {
      assert(advisor.sources.length >= 2);
      assert.equal(advisor.cycle2027FallVerified, false);
      assert.equal(advisor.cycle2028FallVerified, false);
      assert(advisor.sources.every(source=>source.url.startsWith('https://')));
      assert(advisor.sources.every(source=>source.checkedDate==='2026-10-05'));
    }
  }
});
test('new school advisors have no profile association or opening overclaim', () => {
  const ids = schools.flatMap(([institution,,, ,])=>catalog.advisors.filter(a=>a.institution===institution).map(a=>a.id));
  assert.equal(ids.length, 24);
  for (const id of ids) {
    const a = catalog.advisors.find(x=>x.id===id);
    assert.equal(a.eligibility, 'pending');
    assert.equal(a.cycle2028FallVerified ?? false, false);
    assert.equal(a.opening, 'unknown');
    assert(a.caveats.some(c=>c.includes('2028')));
  }
});
