import {filterOpportunities as referenceFilter,buildOpportunities as verifiedOpportunities} from '../assets/core.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors, browseRoutes, buildOpportunities} from '../assets/core.js';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const catalog = JSON.parse(read('data/catalog.json'));
const review = JSON.parse(read('data/tsinghua-advisor-review-20261004.json'));
const ra = JSON.parse(read('data/ra-positions.json'));

test('Tsinghua retains all seven research profiles and five separately labelled reference routes', () => {
  assert.equal(review.institution, 'Tsinghua');
  assert.equal(review.advisors.length, 7);
  const advisors = browseAdvisors(catalog, {institution: 'Tsinghua'});
  assert.equal(advisors.length, 7);
  assert(advisors.every(a => a.defaultVisible && a.eligibility === 'pending'));
  assert.equal(browseRoutes(catalog, {institution: 'Tsinghua'}).length, 5);
  const phdRoutes = catalog.routes.filter(r => r.institution === 'Tsinghua' && r.degree === 'PhD' && r.status === 'reference');
  assert.equal(phdRoutes.length, 2);
  assert(phdRoutes.every(r => r.cycle2027Verified === true && r.bachelorEligible === false));
  assert.deepEqual(new Set(advisors.map(a => a.nameZh)), new Set(['刘莉','赵慧婵','陈睿','李曙光','姜峣','吴丹','高阳']));
});

test('Tsinghua review keeps doctoral eligibility and Fall 2028 boundaries explicit', () => {
  const text = JSON.stringify(review);
  assert.match(review.conclusionZh, /2027\/2028 招生名额待核/);
  assert.match(text, /普通博士/);
  assert.match(text, /推荐免试/);
  for (const advisor of review.advisors) {
    assert.equal(advisor.cycle2027FallReference, true);
    assert.equal(advisor.cycle2028FallVerified, false);
    assert(advisor.sources.length >= 2);
    for (const source of advisor.sources) {
      assert(source.url.startsWith('https://'));
      assert.equal(source.checkedDate, '2026-10-04');
    }
  }
  const rows = buildOpportunities({...catalog, raPositions: ra.raPositions}).filter(o => o.advisorId?.startsWith('tsinghua-'));
  assert.equal(rows.length, 0);
  assert(catalog.advisors.filter(a=>a.institution==='Tsinghua').every(a=>a.routeAssociations.every(x=>x.verificationStatus==='pending')));
  assert(catalog.advisors.filter(a => a.institution === 'Tsinghua').every(a => a.routeIds.some(id => id.includes('phd-reference'))));
  assert(review.admissionEvidence.some(e => e.id === 'tsinghua-me-phd-2027'));
  assert(review.admissionEvidence.some(e => e.id === 'tsinghua-iiis-phd-2027'));
});

test('concurrent 5c27 PhD filter preserves Tsinghua references without counting verified associations',()=>{const c=JSON.parse(read('data/catalog.json'));const rows=referenceFilter(c,{institution:'Tsinghua',opportunityType:'PhD'});assert.equal(rows.length,7);assert(rows.every(o=>o.reference===true&&o.kind==='reference'));assert(!verifiedOpportunities(c).some(o=>rows.some(r=>r.id===o.id)));});
