import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/detail-return-focus-20261007.json',import.meta.url));
assert.equal(snapshotHash(raw),'fd89f026d1306d33044999be5cfb8b97e46e861f359abdb1a4453aa849a94a9d','immutable local detail-return-focus stage');
export const detailReturnFixture=JSON.parse(raw);
// Unknown, partial and mutated assets pass through untouched to strict prior gates.
export function detailReturnBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 return transformSnapshotBytes(detailReturnFixture,path,bytes,direction);
}
export function assertCurrentDetailReturnAsset(path,bytes){
 const entry=detailReturnFixture.files[snapshotPath(path)];assert(entry,'file outside detail-return-focus allowlist');
 assert.equal(snapshotHash(bytes),entry.afterSha256,'unreviewed current detail-return-focus bytes');
}
