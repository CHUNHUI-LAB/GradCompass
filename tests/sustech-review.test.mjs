import {filterOpportunities as referenceFilter,buildOpportunities as verifiedOpportunities} from '../assets/core.js';
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
    assert.equal(advisor.catalogStatus, 'profile_visible_association_pending');
    assert.equal(advisor.cycle2027FallReference, advisor.referencePhdRouteIds.includes('sustech-aim-phd-reference-2027'));assert.equal(advisor.individualRecruitmentVerified,false);assert(advisor.routeAssociations.every(x=>x.verificationStatus==='pending'));
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
  assert.match(review.conclusionZh, /当期接收和名额待核/);assert.match(review.conclusionZh,/缺直接证据不等于无资格/);
});

test('concurrent 5c27 PhD filter preserves SUSTech references without counting verified associations',()=>{const c=JSON.parse(read('data/catalog.json'));const rows=referenceFilter(c,{institution:'SUSTech',opportunityType:'PhD'});assert.equal(rows.length,8);assert(rows.every(o=>o.reference===true&&o.kind==='reference'));assert(!verifiedOpportunities(c).some(o=>rows.some(r=>r.id===o.id)));});
