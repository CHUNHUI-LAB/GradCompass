import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors, filterOpportunities} from '../assets/core.js';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const catalog = JSON.parse(read('data/catalog.json'));
const review = JSON.parse(read('data/pku-advisor-review-20261004.json'));

test('PKU 2027 intelligent robotics PhD references are explicit and bounded', () => {
  assert.equal(review.institution, 'PKU');
  assert.equal(review.advisors.length, 5);
  const route = catalog.routes.find(r => r.id === 'pku-sai-phd-reference-2027');
  assert.equal(route.status, 'reference');
  assert.equal(route.degree, 'PhD');
  assert.equal(route.cycle2027Verified, true);
  const advisors = browseAdvisors(catalog, {institution: 'PKU'});
  assert.equal(advisors.length, 5);
  const rows = filterOpportunities(catalog, {institution: 'PKU', opportunityType: 'PhD'});
  assert.equal(rows.length, 5);
  assert(rows.every(row => row.reference === true));
  assert.equal(filterOpportunities(catalog, {institution: 'PKU'}).length, 0);
  assert(review.admissionEvidence.some(e => e.id === 'pku-sai-phd-2027-guide'));
  for (const advisor of review.advisors) {
    assert.equal(advisor.cycle2027FallReference, true);
    assert.equal(advisor.cycle2027FallVerified, false);
    assert.equal(advisor.cycle2028FallVerified, false);
    assert(advisor.sources.length >= 2);
    for (const source of advisor.sources) {
      assert(source.url.startsWith('https://'));
      assert.equal(source.checkedDate, '2026-10-04');
    }
  }
});
