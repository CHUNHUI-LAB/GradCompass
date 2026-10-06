import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath,transformSnapshotBytes,transformSnapshotObject} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-public-audit-20261006.json',import.meta.url));
assert.equal(snapshotHash(raw),'43e95863c0d8a62307fc0cf396c2af586747f944e21d3771214df73c48ec7d12','immutable public audit candidate fixture');
export const publicAuditFixture=JSON.parse(raw);
// Only exact complete snapshots transform. Unknown bytes remain visible to the
// original historical assertions; production and current checks use node:fs.
export function publicAuditBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 return transformSnapshotBytes(publicAuditFixture,path,bytes,direction);
}
export function publicAuditObject(path,data,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 return transformSnapshotObject(publicAuditFixture,path,data,direction);
}
export function assertCurrentPublicAudit(path,bytes){
 const name=snapshotPath(path),entry=publicAuditFixture.files[name]||publicAuditFixture.addedFiles[name];
 assert(entry,'file outside reviewed public audit allowlist: '+name);
 assert.equal(snapshotHash(bytes),entry.afterSha256,'unreviewed current public audit bytes: '+name);
}
