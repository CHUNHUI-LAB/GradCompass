import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './published-history-fs.mjs';
import crypto from 'node:crypto';
import historicalFs from './profile-coverage-history-fs.mjs';
import {profileCoverageFixture as fixture, profileCoverageBytes, assertCurrentProfileCoverageFile} from './profile-coverage-baseline.mjs';
import {snapshotHash as hash, snapshotText as serialize} from './strict-history-transform.mjs';
import {assertCurrentCuhkDeadlineFile, cuhkDeadlineBytes} from './cuhk-deadline-20261007-baseline.mjs';
import {buildOpportunities, browseAdvisors} from '../assets/core.js';
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root));
const git = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
const paths = ['data/advisor-profiles.json', 'assets/app.js', 'index.html'];
const profilesPath = paths[0];
const currentProfiles = JSON.parse(read(profilesPath));
const originalProfiles = JSON.parse(profileCoverageBytes(profilesPath, read(profilesPath)));
function sourceCount(supplement) {
  const cited = new Set();
  const collect = value => {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'sources') item.forEach(source => cited.add(source.url));
      else collect(item);
    }
  };
  collect(supplement.profiles.slice(30));
  return cited.size;
}

test('profile-coverage projection pins both published trees and exact reversible complete files', () => {
  assert.equal(fixture.beforeCommit, 'e3370790091ee7e611240e921f37c9fe5c860ce0');
  assert.equal(fixture.beforeTree, 'e4375c6d8f283e0f72d02a43006809371399f73c');
  assert.equal(fixture.afterCommit, '81c60e1c34ab7bff8388e5e7c70f3458a2edd420');
  assert.equal(fixture.afterTree, '5ce11ab90326f6f769ddc52e933ff3c854960039');
  assert.deepEqual(Object.keys(fixture.files), paths);
  for (const path of paths) {
    const raw = read(path), entry = fixture.files[path];
    assertCurrentProfileCoverageFile(path, raw);
    assert.equal(git(raw), entry.afterGitBlob);
    const old = profileCoverageBytes(path, raw);
    assert.equal(hash(old), entry.beforeSha256);
    assert.equal(git(old), entry.beforeGitBlob);
    assert.deepEqual(profileCoverageBytes(path, old, 'forward'), raw);
    assert.strictEqual(profileCoverageBytes(path, old), old);
    assert.strictEqual(profileCoverageBytes(path, raw, 'forward'), raw);
    assert.throws(() => assertCurrentProfileCoverageFile(path, old), /unreviewed/);
  }
});

test('profile expansion preserves the exact 56-profile prefix, then 5 + 5 + 268 append-only records', () => {
  assert.equal(originalProfiles.profiles.length, 56);
  assert.equal(currentProfiles.profiles.length, 334);
  assert.deepEqual(currentProfiles.profiles.slice(0, 56), originalProfiles.profiles);
  assert.deepEqual(fixture.profileCounts, {before: 56, after: 334});
  assert.deepEqual(fixture.files[profilesPath].operations.map(operation => operation.path), [
    ...Array.from({length: 278}, (_, i) => ['profiles', 56 + i]),
    ['batch'], ['batch9Review'], ['batch10Review'], ['batch11Review'],
  ]);
  for (const [key, start, end] of [['batch9Review', 56, 61], ['batch10Review', 61, 66], ['batch11Review', 66, 334]]) {
    assert.equal(currentProfiles[key].preservedProfiles, start);
    assert.deepEqual(currentProfiles[key].newAdvisorIds, currentProfiles.profiles.slice(start, end).map(profile => profile.advisorId));
    assert.equal(currentProfiles[key].catalogMutation, false);
  }
  for (const key of Object.keys(originalProfiles)) {
    if (!['profiles', 'batch'].includes(key)) assert.deepEqual(currentProfiles[key], originalProfiles[key], key);
  }
  assert.deepEqual(Object.keys(currentProfiles).filter(key => !Object.hasOwn(originalProfiles, key)), ['batch9Review', 'batch10Review', 'batch11Review']);
  for (const [path, prefix] of [['assets/app.js', 'advisor-profiles.json?v='], ['index.html', './assets/app.js?v=']]) {
    const entry = fixture.files[path];
    assert.equal(entry.kind, 'text_fragments');
    assert.equal(entry.operations.length, 1);
    for (const side of ['before', 'after']) {
      const fragment = entry.operations[0][side];
      assert(fragment.startsWith(prefix));
      assert.match(fragment.slice(prefix.length), /^[a-f0-9]{12}$/);
    }
    assertCurrentCuhkDeadlineFile(path, profileCoverageBytes(path, read(path)));
  }
});

test('all production bytes and every existing immutable history fixture and baseline function stay unchanged', () => {
  assert.equal(Object.keys(fixture.preservedProduction).length, 38);
  assert.equal(Object.keys(fixture.preservedHistory).length, 48);
  for (const entries of [fixture.preservedProduction, fixture.preservedHistory]) {
    for (const [path, expected] of Object.entries(entries)) {
      const raw = read(path);
      assert.equal(raw.length, expected.bytes, path);
      assert.equal(hash(raw), expected.sha256, path);
      assert.equal(git(raw), expected.gitBlob, path);
    }
  }
  for (const path of Object.keys(fixture.preservedProduction).filter(path => path.startsWith('assets/'))) {
    assert(!String(read(path)).includes('profile-coverage-baseline'), path + ' never imports test projections');
  }
});

test('published counts use archived 334-profile content while dated source counters use exact 56-profile history', () => {
  const manifest = JSON.parse(read('release-manifest.json'));
  const catalog = JSON.parse(read('data/catalog.json'));
  const data = {...catalog, raPositions: JSON.parse(read('data/ra-positions.json')).raPositions};
  assert.equal(manifest.profilePilotCount, 334);
  assert.equal(sourceCount(currentProfiles), 383);
  assert.equal(manifest.newProfileCitedSourceCount, sourceCount(currentProfiles));
  assert.equal(sourceCount(originalProfiles), 72);
  assert.equal(browseAdvisors(data).length, 334);
  assert.equal(buildOpportunities(data).length, 59);
  assert.equal(buildOpportunities(data).filter(row => row.type === 'RA').length, 2);
  for (const path of paths) {
    assert.deepEqual(historicalFs.readFileSync(new URL(path, root)), profileCoverageBytes(path, read(path)));
    assert.equal(historicalFs.readFileSync(new URL(path, root), 'utf8'), String(profileCoverageBytes(path, read(path))));
  }
});

test('profile-coverage gate retains corruption, future records, metadata, reordering, formatting and partial rollbacks', () => {
  const mutations = [
    data => {data.profiles[0].sentinel = 'changed original';},
    data => {data.profiles[55].checkedDate = '2099-01-01';},
    data => {data.profiles[56].sentinel = 'changed PKU addition';},
    data => {data.profiles[61].sentinel = 'changed mainland addition';},
    data => {data.profiles[66].sentinel = 'changed full-coverage addition';},
    data => {data.profiles.at(-1).sentinel = 'changed final addition';},
    data => {data.profiles.push({...data.profiles.at(-1), advisorId: 'future-advisor'});},
    data => {data.profiles.reverse();},
    data => {data.unknownRoot = true;},
    data => {data.batch11Review.catalogMutation = true;},
    data => {delete data.batch9Review;},
    data => {data.batch = originalProfiles.batch;},
  ];
  for (const mutate of mutations) {
    const data = structuredClone(currentProfiles); mutate(data);
    const bytes = Buffer.from(serialize(data));
    assert.throws(() => assertCurrentProfileCoverageFile(profilesPath, bytes), /unreviewed/);
    assert.strictEqual(profileCoverageBytes(profilesPath, bytes), bytes);
    assert.strictEqual(profileCoverageBytes(profilesPath, bytes, 'forward'), bytes);
  }
  for (const path of paths) {
    const raw = read(path), old = profileCoverageBytes(path, raw);
    for (const bytes of [Buffer.concat([raw, Buffer.from(' ')]), Buffer.concat([old, Buffer.from(' ')]), Buffer.from(String(raw).replace('\n', '\n\n'))]) {
      assert.throws(() => assertCurrentProfileCoverageFile(path, bytes), /unreviewed/);
      assert.strictEqual(profileCoverageBytes(path, bytes), bytes);
      assert.strictEqual(profileCoverageBytes(path, bytes, 'forward'), bytes);
    }
  }
  const logic = Buffer.from(String(read('assets/app.js')).replace('restoreDetailOpener(route.view);', ''));
  assert.throws(() => assertCurrentProfileCoverageFile('assets/app.js', logic), /unreviewed/);
  assert.strictEqual(profileCoverageBytes('assets/app.js', logic), logic);
  assert.strictEqual(cuhkDeadlineBytes('assets/app.js', profileCoverageBytes('assets/app.js', logic)), logic);
  for (const path of ['data/catalog.json', 'assets/core.js', 'assets/style.css', 'release-manifest.json']) {
    const raw = read(path);
    for (const direction of ['forward', 'reverse']) assert.strictEqual(profileCoverageBytes(path, raw, direction), raw);
    assert.throws(() => assertCurrentProfileCoverageFile(path, raw), /outside/);
  }
  const fragment = Buffer.from(fixture.files['assets/app.js'].operations[0].after);
  assert.strictEqual(profileCoverageBytes('assets/app.js', fragment), fragment);
  assert.throws(() => profileCoverageBytes(profilesPath, read(profilesPath), 'invalid'));
});
