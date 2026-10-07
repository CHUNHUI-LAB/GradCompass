import {cuhkDeadlineBytes} from './cuhk-deadline-20261007-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {detailReturnFixture as fixture,detailReturnBytes,assertCurrentDetailReturnAsset} from './detail-return-focus-baseline.mjs';
import {assertCurrentRaDeadlineAsset} from './ra-deadline-20261007-baseline.mjs';
import {snapshotHash as hash} from './strict-history-transform.mjs';
const read=path=>cuhkDeadlineBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url)));
const git=bytes=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
test('focus-return stage pins current raw assets and reverses exactly to the RA release',()=>{
 assert.equal(fixture.baseCommit,'c12ca28745146a6f937cff1ed49c65806eaab3f7');
 assert.deepEqual(Object.keys(fixture.files),['assets/app.js','index.html']);
 for(const [path,entry]of Object.entries(fixture.files)){
  const raw=read(path),old=detailReturnBytes(path,raw);assertCurrentDetailReturnAsset(path,raw);assertCurrentRaDeadlineAsset(path,old);
  assert.equal(hash(old),entry.beforeSha256);assert.equal(git(old),entry.beforeGitBlob);assert.equal(git(raw),entry.afterGitBlob);
  assert.deepEqual(detailReturnBytes(path,old,'forward'),raw);assert.strictEqual(detailReturnBytes(path,old),old);assert.strictEqual(detailReturnBytes(path,raw,'forward'),raw);
 }
});
test('focus-return gate rejects rollback, whitespace, unrelated edits and partial rollback',()=>{
 for(const [path,entry]of Object.entries(fixture.files)){
  const raw=read(path),old=detailReturnBytes(path,raw);assert.throws(()=>assertCurrentDetailReturnAsset(path,old),/unreviewed/);
  const mutants=[Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\n// unrelated\n'))];
  if(path==='assets/app.js')mutants.push(Buffer.from(String(raw).replace('restoreDetailOpener(route.view);','')),Buffer.from(String(raw).replace('gradDetailOpener:detailReturnFocus,','')));
  for(const changed of mutants){assert.throws(()=>assertCurrentDetailReturnAsset(path,changed),/unreviewed/);assert.strictEqual(detailReturnBytes(path,changed),changed);assert.throws(()=>assertCurrentRaDeadlineAsset(path,detailReturnBytes(path,changed)),/unreviewed/);}
  const changedOld=Buffer.concat([old,Buffer.from(' ')]);assert.strictEqual(detailReturnBytes(path,changedOld,'forward'),changedOld);
 }
 for(const path of ['data/catalog.json','data/ra-positions.json','assets/core.js']){const raw=read(path);assert.strictEqual(detailReturnBytes(path,raw),raw);assert.throws(()=>assertCurrentDetailReturnAsset(path,raw),/outside/);}
 assert.throws(()=>detailReturnBytes('assets/app.js',read('assets/app.js'),'unknown'));
});
