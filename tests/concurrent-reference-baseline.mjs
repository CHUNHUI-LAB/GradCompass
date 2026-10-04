import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const raw=fs.readFileSync(new URL('./fixtures/history/reviewed-concurrent-reference.json',import.meta.url));
assert.equal(hash(raw),'7e23297db0a10d258e44c8323a65b414de304649ee0f208b7d702280e98d3692','immutable concurrent PhD-reference source fixture');
export const concurrentReferenceFixture=JSON.parse(raw);
export function concurrentReferenceBytes(path,bytes){
 const entry=concurrentReferenceFixture.files[path];if(!entry||hash(bytes)!==entry.afterSha256)return bytes;
 assert.equal(String(bytes),entry.after);const result=Buffer.from(entry.before);assert.equal(hash(result),entry.beforeSha256);return result;
}
