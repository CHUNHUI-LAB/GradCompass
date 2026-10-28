import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import historicalFs,{publishedBytes,publishedIdentities,decodeSummaryNavigationHistoricalTest,summaryNavigationHistoricalTestBytes} from './published-history-fs.mjs';
const name='tests/summary-navigation.test.mjs';
const url=new URL('../'+name,import.meta.url);
const archiveUrl=new URL('./fixtures/history/published-test-inputs-summary-navigation-20261028.json.gz',import.meta.url);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('summary navigation history retains exact published bytes independently of the current UI test',()=>{
 const expected=JSON.parse(publishedBytes('release-manifest.json')).allowedFiles.find(row=>row.path===name);
 const original=summaryNavigationHistoricalTestBytes(name);
 assert.equal(original.length,expected.bytes);assert.equal(sha(original),expected.sha256);
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${original.length}\0`),original])).digest('hex'),publishedIdentities[name].gitBlob);
 assert.deepEqual(historicalFs.readFileSync(url),original);
 assert.equal(historicalFs.readFileSync(url,'utf8'),original.toString('utf8'));
 assert.notDeepEqual(fs.readFileSync(url),original,'live navigation assertions remain independently editable');
 const copy=summaryNavigationHistoricalTestBytes(name);copy.fill(0);assert.deepEqual(summaryNavigationHistoricalTestBytes(name),original);
 assert.throws(()=>summaryNavigationHistoricalTestBytes('assets/app.js'),/unarchived summary navigation test/);
});

test('summary navigation archive rejects appended, truncated and corrupted bytes',()=>{
 const bytes=fs.readFileSync(archiveUrl);
 assert.deepEqual(Object.keys(decodeSummaryNavigationHistoricalTest(bytes).files),[name]);
 const changed=Buffer.from(bytes);changed[Math.floor(changed.length/2)]^=1;
 for(const corrupt of [Buffer.concat([bytes,Buffer.from(' ')]),bytes.subarray(0,-1),changed])assert.throws(()=>decodeSummaryNavigationHistoricalTest(corrupt),/immutable summary navigation historical test/);
});
