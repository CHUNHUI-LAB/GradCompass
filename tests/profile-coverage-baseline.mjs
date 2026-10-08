import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash, snapshotPath, transformSnapshotBytes} from './strict-history-transform.mjs';

const raw = fs.readFileSync(new URL('./fixtures/history/reviewed-profile-coverage-20261008.json', import.meta.url));
assert.equal(snapshotHash(raw), 'ab22bad0a1b6f71bbd242eaa42a39672269550945dfc940861a6b47815a91cb7', 'immutable published profile-coverage stage');
export const profileCoverageFixture = JSON.parse(raw);

// Test-only complete-file projection. Unknown edits, metadata, ordering,
// whitespace and partial rollbacks remain visible to the older strict gates.
// Production code and current-source tests continue to use raw node:fs.
export function profileCoverageBytes(path, bytes, direction = 'reverse') {
  assert(['reverse', 'forward'].includes(direction), 'known profile-coverage transform direction');
  const entry = profileCoverageFixture.files[snapshotPath(path)];
  const forward = direction === 'forward';
  if (!entry || snapshotHash(bytes) !== entry[forward ? 'beforeSha256' : 'afterSha256']) return bytes;
  if (entry.kind === 'json') return transformSnapshotBytes(profileCoverageFixture, path, bytes, direction);
  let value = String(bytes);
  for (const operation of forward ? entry.operations : [...entry.operations].reverse()) {
    const from = operation[forward ? 'before' : 'after'];
    const to = operation[forward ? 'after' : 'before'];
    assert.equal(value.split(from).length, 2, 'unique profile-coverage cache fragment');
    value = value.replace(from, () => to);
  }
  const result = Buffer.from(value);
  assert.equal(snapshotHash(result), entry[forward ? 'afterSha256' : 'beforeSha256'], 'exact profile-coverage replay');
  return result;
}

export function assertCurrentProfileCoverageFile(path, bytes) {
  const entry = profileCoverageFixture.files[snapshotPath(path)];
  assert(entry, 'file outside profile-coverage allowlist');
  assert.equal(snapshotHash(bytes), entry.afterSha256, 'unreviewed current profile-coverage bytes');
}
