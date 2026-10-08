import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { profileMap, renderProfile, renderProfileReferences } from '../assets/profiles.js';
import { buildOpportunities, safeUrl } from '../assets/core.js';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const supplement = JSON.parse(read('data/advisor-profiles.json'));
const catalog = JSON.parse(read('data/catalog.json'));
const data = { ...catalog, raPositions: JSON.parse(read('data/ra-positions.json')).raPositions };
const ids = ['nju-li-yufeng', 'nju-shen-furao', 'tongji-he-bin', 'tongji-xu-yang', 'ustc-ren-shaoqing'];
const added = ids.map((id) => supplement.profiles.find((p) => p.advisorId === id));
const factsOf = (p) => [p.overview, p.labSnapshot.affiliation, p.labSnapshot.structure, ...p.labSnapshot.resources, p.recruitment, ...p.representativeWorks];

test('NJU/Tongji/USTC batch appends five existing advisors without changing catalog authority', () => {
  assert.deepEqual(ids.map((id) => supplement.profiles.find((p) => p.advisorId === id)?.advisorId), ids);
  assert.ok(supplement.profiles.length >= 66);
  assert.match(supplement.batch, /(^|\+)10(\+|$)/);
  assert.deepEqual(supplement.batch10Review.newAdvisorIds, ids);
  assert.equal(supplement.batch10Review.preservedProfiles, 61);
  assert.equal(supplement.batch10Review.catalogMutation, false);
  assert.equal(profileMap({ profiles: added }, catalog.advisors).size, 5);
  assert.equal(buildOpportunities(data).length, 59);
  assert.equal(catalog.advisors.length, 334);
  assert.equal(catalog.routes.length, 65);
});

test('new mainland profiles contain dated HTTPS evidence and preserve admission boundaries', () => {
  for (const p of added) {
    assert.ok(p);
    assert.equal(p.checkedDate, '2026-10-08');
    assert.equal(p.confirmedVacancy, false);
    assert.equal(p.profileScope, 'public_professional_and_lab_overview');
    assert.ok(p.cardSummaryZh.length > 25);
    assert.ok(p.labSnapshot.themes.length >= 3);
    assert.ok(p.labSnapshot.resources.length >= 1);
    assert.ok(p.representativeWorks.length >= 2 && p.representativeWorks.length <= 3);
    assert.ok(p.unknowns.length >= 2);
    for (const forbidden of ['routeIds', 'eligibility', 'openingDetails', 'defaultVisible', 'institution', 'raPositions', 'employmentEligibility']) assert.equal(forbidden in p, false);
    for (const fact of factsOf(p)) {
      assert.ok(fact.textZh || fact.summaryZh);
      assert.ok(fact.sources?.length);
      for (const source of fact.sources) {
        assert.equal(source.checkedDate, '2026-10-08');
        assert.equal(new URL(source.url).protocol, 'https:');
        assert.ok(safeUrl(source.url));
      }
    }
    for (const work of p.representativeWorks) {
      assert.ok(Number.isInteger(work.year) && work.year <= 2026);
      assert.ok(work.venue);
      assert.ok(safeUrl(work.url));
    }
  }
});

test('new mainland profile details render complete sections without fabricated vacancy claims', () => {
  for (const p of added) {
    const html = renderProfile(p) + renderProfileReferences(p);
    for (const label of ['个人职业概况', '实验室与研究资源', '近期代表成果', '简介参考与待确认信息', '专业简介核验于 2026-10-08']) assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
