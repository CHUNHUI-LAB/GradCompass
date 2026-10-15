import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import historicalFs,{publishedBytes,publishedPaths,publishedIdentities,publishedTestBytes,publishedTestPaths,decodePublishedTestArchive} from './published-history-fs.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('MRL render-date maintenance reuses the original published render input without another historical archive',()=>{
 const name='tests/render.test.mjs',bytes=publishedTestBytes(name),identity=publishedIdentities[name];
 assert.equal(bytes.length,26303);assert.equal(bytes.length,identity.bytes);
 assert.equal(sha(bytes),'7da4635af5cc1ae7e36cde9f3bb16c7345a133dd599e5bb13e40a02969091935');
 assert.equal(sha(bytes),identity.sha256);
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),identity.gitBlob);
 const current=fs.readFileSync(new URL('./render.test.mjs',import.meta.url),'utf8');
 assert(current.includes("import fs from 'node:fs'"));
 assert(current.includes("['hkust-yajing-shen','2026-10-09']"));
 assert.notDeepEqual(Buffer.from(current),bytes);
 assert.deepEqual(historicalFs.readFileSync(new URL('./render.test.mjs',import.meta.url)),bytes);
});

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
