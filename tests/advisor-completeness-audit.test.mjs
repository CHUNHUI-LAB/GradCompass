import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(new URL(`../${path}`, import.meta.url)));
const catalog = readJson('data/catalog.json');
const profiles = readJson('data/advisor-profiles.json');
const audit = readJson('audits/advisor-completeness-20261009.json');
const access = readJson('audits/source-access-20261009.json');

test('advisor completeness audit is aligned with the current catalog and is explicit about evidence limits', () => {
  assert.equal(audit.checkedDate, '2026-10-09');
  assert.equal(audit.summary.advisors, catalog.advisors.length);
  assert.equal(audit.summary.profiles, profiles.profiles.length);
  assert.equal(audit.summary.routes, catalog.routes.length);
  assert.equal(audit.advisors.length, catalog.advisors.length);
  assert.equal(new Set(audit.advisors.map(row => row.advisorId)).size, catalog.advisors.length);
  assert.equal(audit.summary.phd2028FallVerified, 0);
  assert.equal(audit.summary.remainingHeadcountVerified, 0);
  assert.match(audit.scopeZh, /未逐页重读/);
  assert(audit.boundariesZh.some(text => text.includes('研究主题不计为具体代表论文')));
});

test('source access audit is a bounded network check, not a content verification claim', () => {
  assert.equal(access.checkedDate, '2026-10-09');
  assert.equal(access.results.length, 729);
  assert.equal(access.summary.http_success_content_unverified, 650);
  assert.equal(access.summary.access_barrier, 4);
  assert.equal(access.summary.http_error, 63);
  assert.equal(access.summary.transport_error, 12);
  assert(access.limitationsZh.some(text => text.includes('仍须人工核读')));
});
