import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import historicalFs,{publishedBytes,publishedPaths,publishedTestBytes,publishedTestPaths,decodePublishedTestArchive} from './published-history-fs.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('additive historical test bytes match the original published manifest without shadowing runtime data',()=>{
 const manifest=JSON.parse(publishedBytes('release-manifest.json'));
 assert.equal(publishedTestPaths.length,11);
 for(const name of publishedTestPaths){
  assert(name.startsWith('tests/'));assert(!publishedPaths.includes(name));
  const original=publishedTestBytes(name),expected=manifest.allowedFiles.find(row=>row.path===name);
  assert.equal(original.length,expected.bytes,name);assert.equal(sha(original),expected.sha256,name);
  assert.deepEqual(historicalFs.readFileSync(new URL('../'+name,import.meta.url)),original);
 }
 const path=new URL('./active-filters.test.mjs',import.meta.url);
 assert.notDeepEqual(fs.readFileSync(path),historicalFs.readFileSync(path),'live behavior tests remain independently editable and executable');
 assert.throws(()=>publishedTestBytes('assets/app.js'),/unarchived historical test/);
});

test('additive test archive rejects corruption while all preexisting historical fixtures remain separate',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/history/published-test-inputs-2737399.json.gz',import.meta.url));
 assert.equal(Object.keys(decodePublishedTestArchive(bytes).files).length,11);
 assert.throws(()=>decodePublishedTestArchive(Buffer.concat([bytes,Buffer.from(' ')])),/immutable published test input archive/);
 const changed=Buffer.from(bytes);changed[Math.floor(changed.length/2)]^=1;
 assert.throws(()=>decodePublishedTestArchive(changed),/immutable published test input archive/);
});
