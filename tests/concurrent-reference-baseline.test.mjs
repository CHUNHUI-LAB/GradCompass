import {latestSourceBytes} from './latest-3f294-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './jhu-language-history-fs.mjs';
import {concurrentReferenceFixture as fixture,concurrentReferenceBytes} from './concurrent-reference-baseline.mjs';
import {currentCorrectionBytes} from './current-correction-baseline.mjs';
import {sha256,serialize} from './historical-source-baseline.mjs';
const sourceHashes={
 'assets/app.js':['540112b80a5164bcc506a14ee0c5604bb03febfc1ccaf21f3926eda793d7088d','49a959123784f0fba3c864e216d9d6652b1f9269f0124c420125c4b0eea697e7'],
 'assets/core.js':['c5028d5ec3205ebb7f18b82b1fe575b5f0a151623da711c8edb57903ec003efb','7f7dbaf4ef606dbb6b46e2b96dbcbfdeef36bb2b98a0f0ec71f2c3eafe4f8c41'],
 'index.html':['8119f50f4040bb38efa175db07cbf87739b64f5ec43acf76f5cf294c6fcdb8dc','38ca6276dc08f64665ae4eba96e182a031f7f052bc067cfd33a785ae01802908'],
};
test('concurrent 5c27c78 is a separately pinned source stage and reconstructs 1ddbbfb exactly',()=>{
 assert.equal(fixture.beforeCommit,'1ddbbfbcc989096406cc47ed0b2ec5f9d1ab455f');assert.equal(fixture.afterCommit,'5c27c78fbcb742e7f44e70145d2e91b7e98fde1f');
 assert.deepEqual(Object.keys(fixture.files).sort(),Object.keys(sourceHashes).sort());const before=serialize(fixture);
 for(const [path,[old,concurrent]]of Object.entries(sourceHashes)){
  const entry=fixture.files[path];assert.equal(entry.beforeSha256,old);assert.equal(entry.afterSha256,concurrent);
  const current=fs.readFileSync(new URL('../'+path,import.meta.url)),reviewed=currentCorrectionBytes(path,latestSourceBytes(path,current));
  assert.equal(sha256(reviewed),concurrent,path+' exact 5c27 stage');
  const restored=concurrentReferenceBytes(path,reviewed);assert.equal(sha256(restored),old,path+' exact 1dd stage');
  assert.deepEqual(concurrentReferenceBytes(path,restored),restored,path+' idempotence');
  for(const mutated of [Buffer.concat([reviewed,Buffer.from('\nUNREVIEWED')]),Buffer.from(String(reviewed).replace('\n','\nUNREVIEWED\n'))]){
   assert.deepEqual(concurrentReferenceBytes(path,mutated),mutated,path+' unknown mutation retained');assert.notEqual(sha256(mutated),old);
  }
 }
 assert.equal(serialize(fixture),before);
});
