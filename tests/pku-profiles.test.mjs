import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { profileMap, renderProfile, renderProfileReferences } from '../assets/profiles.js';
import { buildOpportunities, safeUrl } from '../assets/core.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const supplement = JSON.parse(read('data/advisor-profiles.json'));
const catalog = JSON.parse(read('data/catalog.json'));
const raPositions = JSON.parse(read('data/ra-positions.json')).raPositions;
const data = { ...catalog, raPositions };
const ids = ['pku-ying-xianghua', 'pku-zhaohuijing', 'pku-zhu-songchun', 'pku-luo-dingsheng', 'pku-liu-hangxin'];
const added = ids.map((id) => supplement.profiles.find((profile) => profile.advisorId === id));
const factsOf = (profile) => [
  profile.overview,
  profile.labSnapshot.affiliation,
  profile.labSnapshot.structure,
  ...profile.labSnapshot.resources,
  profile.recruitment,
  ...profile.representativeWorks
];

test('PKU batch appends exactly five existing advisor IDs and preserves catalog authority', () => {
  assert.deepEqual(ids.map((id) => supplement.profiles.find((profile) => profile.advisorId === id)?.advisorId), ids);
  assert.ok(supplement.profiles.length >= 61);
  assert.match(supplement.batch, /(^|\+)9(\+|$)/);
  assert.deepEqual(supplement.batch9Review.newAdvisorIds, ids);
  assert.equal(supplement.batch9Review.preservedProfiles, 56);
  assert.equal(supplement.batch9Review.catalogMutation, false);
  assert.equal(profileMap({ profiles: added }, catalog.advisors).size, 5);
  const opportunities = buildOpportunities(data);
  assert.equal(opportunities.length, 59);
  assert.equal(catalog.advisors.length, 334);
  assert.equal(catalog.routes.length, 65);
});

test('PKU profiles contain dated HTTPS evidence and no admission authority fields', () => {
  for (const profile of added) {
    assert.ok(profile);
    assert.equal(profile.checkedDate, '2026-10-07');
    assert.equal(profile.confirmedVacancy, false);
    assert.equal(profile.profileScope, 'public_professional_and_lab_overview');
    assert.ok(profile.cardSummaryZh.length > 25);
    assert.ok(profile.labSnapshot.themes.length >= 3);
    assert.ok(profile.labSnapshot.resources.length >= 1);
    assert.ok(profile.representativeWorks.length >= 2 && profile.representativeWorks.length <= 3);
    assert.ok(profile.unknowns.length >= 2);
    for (const forbidden of ['routeIds', 'eligibility', 'openingDetails', 'defaultVisible', 'institution', 'raPositions', 'employmentEligibility']) {
      assert.equal(forbidden in profile, false, `${profile.advisorId} leaked ${forbidden}`);
    }
    for (const fact of factsOf(profile)) {
      assert.ok(fact.textZh || fact.summaryZh);
      assert.ok(fact.sources?.length);
      for (const source of fact.sources) {
        assert.equal(source.checkedDate, '2026-10-07');
        assert.equal(new URL(source.url).protocol, 'https:');
        assert.ok(safeUrl(source.url));
      }
    }
    for (const work of profile.representativeWorks) {
      assert.ok(Number.isInteger(work.year) && work.year <= 2026);
      assert.ok(work.venue);
      assert.ok(safeUrl(work.url));
    }
  }
});

test('PKU profile details render all sections without undefined values or vacancy claims', () => {
  for (const profile of added) {
    const html = renderProfile(profile) + renderProfileReferences(profile);
    for (const label of ['个人职业概况', '实验室与研究资源', '近期代表成果', '简介参考与待确认信息', '专业简介核验于 2026-10-07']) {
      assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${profile.advisorId}: ${label}`);
    }
    assert.equal(html.includes('undefined'), false);
    assert.equal(html.includes('[object Object]'), false);
    assert.equal(html.includes('名额已确认'), false);
    assert.match(html, /余位|名额|招生/);
    for (const anchor of html.match(/<a\b[^>]*>/g) || []) {
      assert.match(anchor, /target="_blank"/);
      assert.match(anchor, /rel="noopener noreferrer"/);
    }
  }
});
