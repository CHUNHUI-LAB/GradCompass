import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {jhuLanguageBytes} from './jhu-language-baseline.mjs';
import {fourSchoolsExpansionBytes} from './four-schools-expansion-baseline.mjs';
import crypto from 'node:crypto';
import {sjtuExpansionBytes,sjtuExpansionObject,sjtuExpansionFixture as f} from './sjtu-expansion-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
import {browseAdvisors,browseRoutes} from '../assets/core.js';
const read=p=>jhuLanguageBytes(p,fourSchoolsExpansionBytes(p,fs.readFileSync(new URL('../'+p,import.meta.url))));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
test('SJTU expansion reverses exact complete published files to origin/main',()=>{
 assert.equal(f.beforeCommit,'b76279f4613a69a1eb61f31677de0f722c28a343');
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),old=sjtuExpansionBytes(path,raw);
  assert.equal(hash(raw),e.afterSha256,path+' current hash');assert.equal(hash(old),e.beforeSha256,path+' origin hash');
  assert.equal(git(old),e.beforeGitBlob,path+' origin Git blob');assert.equal(git(raw),e.afterGitBlob,path+' current Git blob');
  assert.deepEqual(sjtuExpansionBytes(path,old,'forward'),raw);assert.deepEqual(sjtuExpansionBytes(path,old),old);assert.deepEqual(sjtuExpansionBytes(path,raw,'forward'),raw);
 }
 assert.equal(serialize(f),fs.readFileSync(new URL('./fixtures/history/reviewed-sjtu-expansion.json',import.meta.url),'utf8'));
});
test('SJTU expansion keeps all 207 advisors and the Ma Jin 2028 signal bounded',()=>{
 const current=JSON.parse(read('data/catalog.json'));const old=JSON.parse(sjtuExpansionBytes('data/catalog.json',read('data/catalog.json')));
 assert.equal(current.advisors.length,207);assert.equal(current.routes.length,61);assert.equal(old.advisors.length,148);assert.equal(old.routes.length,60);
 assert.deepEqual(current.advisors.slice(0,148),old.advisors);assert.deepEqual(current.routes.slice(0,60),old.routes);assert.equal(current.routes.at(-1).id,'sjtu-ai-phd-reference-2026');
 assert.equal(current.advisors.filter(a=>a.institution==='SJTU').length,62);assert.equal(current.advisors.at(-1).id,'sjtu-ma-jin');
 const ma=current.advisors.at(-1);assert.equal(ma.opening,'explicit');assert.equal(ma.cycle2028FallVerified,false);assert(ma.openingDetails.some(o=>o.degree==='Graduate'&&o.cycle2028FallReference===true));
 assert.equal(browseAdvisors(current).length,207);assert.equal(browseRoutes(current).length,61);
});
test('SJTU expansion rejects changed or partial snapshots',()=>{
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),old=sjtuExpansionBytes(path,raw);
  for(const changed of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))]){
   assert.strictEqual(sjtuExpansionBytes(path,changed),changed);assert.strictEqual(sjtuExpansionBytes(path,changed,'forward'),changed);
  }
  const changedOld=Buffer.concat([old,Buffer.from(' ')]);assert.strictEqual(sjtuExpansionBytes(path,changedOld,'forward'),changedOld);
  if(e.kind==='text_fragments')for(const op of e.operations){const partial=Buffer.from(String(raw).replace(op.after,()=>op.before));if(hash(partial)!==e.beforeSha256)assert.strictEqual(sjtuExpansionBytes(path,partial),partial);}
 }
 const d=JSON.parse(read('data/catalog.json'));d.advisors[148].name+=' UNREVIEWED';const bytes=Buffer.from(serialize(d));assert.strictEqual(sjtuExpansionBytes('data/catalog.json',bytes),bytes);assert.deepEqual(sjtuExpansionObject('data/catalog.json',d),d);
});
