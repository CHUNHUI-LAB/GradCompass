import fs from 'node:fs';
import assert from 'node:assert/strict';
import {snapshotHash,snapshotPath} from './strict-history-transform.mjs';
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-public-audit-release-20261006.json',import.meta.url));
assert.equal(snapshotHash(raw),'8d398e18263df83254fd07764b1f21ea412999e1becc9e32e05498149b162255','immutable content-version-only public audit release fixture');
export const publicAuditReleaseFixture=JSON.parse(raw);
const prior=fs.readFileSync(new URL('./fixtures/history/reviewed-pre-public-audit-release-079eaea.json',import.meta.url));
export const previousPublicAuditReleaseSha256='1d718c097f1321e71c4982a94004a2626ea93a2910770876cf1353841b0bccaf';
assert.equal(snapshotHash(prior),previousPublicAuditReleaseSha256,'immutable previous release manifest');
export const previousPublicAuditRelease=JSON.parse(prior);
export function publicAuditReleaseBytes(path,bytes,direction='reverse'){
 assert(['reverse','forward'].includes(direction));
 const entry=publicAuditReleaseFixture.files[snapshotPath(path)],forward=direction==='forward';
 if(!entry||snapshotHash(bytes)!==entry[forward?'beforeSha256':'afterSha256'])return bytes;
 let value=String(bytes);
 for(const op of forward?entry.operations:[...entry.operations].reverse()){
  const from=op[forward?'before':'after'],to=op[forward?'after':'before'];
  assert.equal(value.split(from).length,2,'unique reviewed content-version fragment');value=value.replace(from,()=>to);
 }
 const result=Buffer.from(value);assert.equal(snapshotHash(result),entry[forward?'afterSha256':'beforeSha256'],'exact public audit release replay');return result;
}
export function assertCurrentPublicAuditAsset(path,bytes){
 const entry=publicAuditReleaseFixture.files[snapshotPath(path)];assert(entry,'file outside reviewed asset allowlist');
 assert.equal(snapshotHash(bytes),entry.afterSha256,'unreviewed current asset bytes');
}
