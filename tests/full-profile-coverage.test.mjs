import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { profileMap, renderProfile, renderProfileReferences } from '../assets/profiles.js';
import { buildOpportunities, safeUrl } from '../assets/core.js';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const supplement = JSON.parse(read('data/advisor-profiles.json'));
const catalog = JSON.parse(read('data/catalog.json'));
const data = { ...catalog, raPositions: JSON.parse(read('data/ra-positions.json')).raPositions };
const generatedIds = new Set(supplement.batch11Review.newAdvisorIds);
const generated = supplement.profiles.filter((p) => generatedIds.has(p.advisorId));
const factsOf = (p) => [p.overview, p.labSnapshot.affiliation, p.labSnapshot.structure, ...p.labSnapshot.resources, p.recruitment, ...p.representativeWorks];

test('every catalog advisor has exactly one profile supplement and full coverage joins without creating opportunities', () => {
  assert.equal(catalog.advisors.length, 334);
  assert.equal(supplement.profiles.length, 334);
  assert.equal(profileMap(supplement, catalog.advisors).size, 334);
  assert.equal(new Set(supplement.profiles.map((p) => p.advisorId)).size, 334);
  assert.equal(buildOpportunities(data).length, 59);
  assert.equal(supplement.batch11Review.newAdvisorIds.length, 268);
  assert.equal(supplement.batch11Review.preservedProfiles, 66);
  assert.equal(supplement.batch11Review.catalogMutation, false);
});

test('all generated profiles use catalog-backed sources, keep boundaries and render safely', () => {
  assert.equal(generated.length, 268);
  for (const p of generated) {
    assert.equal(p.confirmedVacancy, false);
    assert.equal(p.profileScope, 'public_professional_and_lab_overview');
    assert.ok(p.cardSummaryZh.length > 25);
    assert.ok(p.labSnapshot.themes.length >= 1);
    assert.ok(p.labSnapshot.resources.length >= 1);
    assert.ok(p.representativeWorks.length >= 2);
    assert.ok(p.unknowns.length >= 2);
    for (const forbidden of ['routeIds', 'eligibility', 'openingDetails', 'defaultVisible', 'institution', 'raPositions', 'employmentEligibility']) assert.equal(forbidden in p, false, `${p.advisorId}:${forbidden}`);
    for (const fact of factsOf(p)) {
      assert.ok(fact.textZh || fact.summaryZh);
      assert.ok(fact.sources?.length);
      for (const source of fact.sources) {
        assert.equal(new URL(source.url).protocol, 'https:', p.advisorId);
        assert.ok(safeUrl(source.url));
        assert.match(source.checkedDate, /^20\d\d-\d\d-\d\d$/);
      }
    }
    const html = renderProfile(p) + renderProfileReferences(p);
    assert.equal(html.includes('undefined'), false, p.advisorId);
    assert.equal(html.includes('[object Object]'), false, p.advisorId);
    assert.equal(html.includes('名额已确认'), false, p.advisorId);
    for (const anchor of html.match(/<a\b[^>]*>/g) || []) {
      assert.match(anchor, /target="_blank"/);
      assert.match(anchor, /rel="noopener noreferrer"/);
    }
  }
});
