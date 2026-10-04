import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const review = JSON.parse(read('data/sustech-advisor-review-20261004.json'));

test('SUSTech review keeps 2027 department evidence separate from 2028 PI openings', () => {
  assert.equal(review.institution, 'SUSTech');
  assert.equal(review.checkedDate, '2026-10-04');
  assert.equal(review.advisors.length, 8);
  assert(review.admissionEvidence.some(e => e.cycle === '2027 Fall reference'));
  assert(review.admissionEvidence.some(e => e.id === 'sustech-mee-phd-program-reference'));
  const phdRoutes = JSON.parse(read('data/catalog.json')).routes.filter(r => r.institution === 'SUSTech' && r.degree === 'PhD' && r.status === 'reference');
  assert.equal(phdRoutes.length, 2);
  assert(phdRoutes.some(r => r.id === 'sustech-mee-phd-reference-2026'));
  assert(phdRoutes.some(r => r.id === 'sustech-aim-phd-reference-2027'));
  for (const advisor of review.advisors) {
    assert.equal(advisor.catalogStatus, 'verification_queue');
    assert.equal(advisor.cycle2027FallReference, true);
    assert.equal(advisor.cycle2028FallVerified, false);
    assert(advisor.profileUrl.startsWith('https://'));
    assert(advisor.researchZh.length > 10);
    assert(advisor.sources.length >= 2);
    for (const source of advisor.sources) {
      assert(source.url.startsWith('https://'));
      assert.equal(source.checkedDate, '2026-10-04');
    }
  }
});

test('SUSTech review records no individual 2028 vacancy or funding claim', () => {
  const text = JSON.stringify(review);
  for (const phrase of ['confirmedVacancy', 'remainingHeadcountVerified', '名额已确认', '资助已确认']) {
    assert(!text.includes(phrase), phrase);
  }
  assert.match(review.conclusionZh, /未检出.*2028/);
});
