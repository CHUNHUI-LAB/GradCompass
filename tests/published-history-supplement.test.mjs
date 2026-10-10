import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import historicalFs,{publishedPaths,publishedIdentities,supplementalPublishedPaths,supplementalPublishedBytes,decodePublishedSupplement} from './published-history-fs.mjs';
const root=new URL('../',import.meta.url),name='tests/render.test.mjs',read=p=>fs.readFileSync(new URL(p,root));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('one supplemental test input retains the original published byte and Git identities without replacing the 51-item archive',()=>{
 assert.equal(publishedPaths.length,51);assert(!publishedPaths.includes(name));assert.deepEqual(supplementalPublishedPaths,[name]);
 const raw=read('tests/fixtures/history/published-render-4653bbd.mjs'),identity=publishedIdentities[name];
 assert.equal(raw.length,26303);assert.equal(raw.length,identity.bytes);assert.equal(hash(raw),identity.sha256);
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),identity.gitBlob);
 assert.deepEqual(supplementalPublishedBytes(name),raw);assert.deepEqual(historicalFs.readFileSync(new URL(name,root)),raw);
 assert.equal(historicalFs.readFileSync(new URL(name,root),'utf8'),raw.toString('utf8'));
});
test('the supplemental reader rejects corruption and every other path, and callers cannot mutate its stored history',()=>{
 const raw=supplementalPublishedBytes(name),changed=Buffer.from(raw);changed[0]^=1;
 for(const bad of [changed,Buffer.concat([raw,Buffer.from(' ')]),raw.subarray(0,-1)])assert.throws(()=>decodePublishedSupplement(name,bad),/supplemental historical/);
 for(const unknown of ['data/catalog.json','tests/render.test.mjs/../other','../tests/render.test.mjs','tests/live-data-maintenance.test.mjs']){
  assert.throws(()=>decodePublishedSupplement(unknown,raw),/outside the single/);assert.throws(()=>supplementalPublishedBytes(unknown),/outside the single/);
 }
 const copy=supplementalPublishedBytes(name);copy.fill(0);assert.deepEqual(supplementalPublishedBytes(name),raw);
});
test('current render tests and unarchived current inputs still read live bytes while historical manifest reads pinned test bytes',()=>{
 const current=read(name),historical=supplementalPublishedBytes(name),text=current.toString('utf8');
 assert.notDeepEqual(current,historical);assert(text.includes("import fs from 'node:fs'"));assert(text.includes("['hkust-yajing-shen','2026-10-09']"));
 const manifest=JSON.parse(read('release-manifest.json')),row=manifest.allowedFiles.find(r=>r.path===name);assert.equal(current.length,row.bytes);assert.equal(hash(current),row.sha256);
 for(const path of ['tests/evidence-reviews.mjs','tests/live-data-maintenance.test.mjs'])assert.deepEqual(historicalFs.readFileSync(new URL(path,root)),read(path));
});
