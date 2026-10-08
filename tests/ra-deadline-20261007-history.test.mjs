import {cuhkDeadlineBytes} from './cuhk-deadline-20261007-baseline.mjs';
import {detailReturnBytes} from './detail-return-focus-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './profile-coverage-history-fs.mjs';
import crypto from 'node:crypto';
import {raDeadlineFixture as fixture,raDeadlineBytes,assertCurrentRaDeadlineAsset} from './ra-deadline-20261007-baseline.mjs';
import {dateSummaryFixture,dateSummaryBytes,assertCurrentDateSummaryAsset} from './date-summary-20261006-baseline.mjs';
import historicalFs from './public-audit-20261006-history-fs.mjs';
import {publicAuditReleaseBytes} from './public-audit-release-20261006-baseline.mjs';
import {publicAuditBytes} from './public-audit-20261006-baseline.mjs';
import {snapshotHash as hash} from './strict-history-transform.mjs';
const read=path=>detailReturnBytes(path,cuhkDeadlineBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url))));
const git=bytes=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
const baselineGitBlobs={
  "assets/app.js": "31758169f5f81111df24dbdc947368f8eee4c752",
  "assets/core.js": "68e599f5f4ae3024a1e7bf61f038e976cdd4a7e7",
  "assets/experiences.js": "16d0fe002f6ba94ba2a3466ef48c79fbc8f0ad4a",
  "assets/material-supplement.js": "58e2bbb980f6030bf08e1e733d2ee74ba4ec6e72",
  "assets/page-overviews.js": "121da6439c3ceafe0b668aae01f69a3c1e0bf23c",
  "assets/profiles.js": "d164e6a781ee3d0fc31b2c5f1675ee033c8a1449",
  "assets/project-comparison.js": "cbfa03fbb68794a2e7dc387c98bb8acfcec1eeb8",
  "assets/record-summaries.js": "96242fb2cb2705569fa81e45b4b62935a7b0fe25",
  "index.html": "1c1fe4a4a37fb0fa1ef083f184da0519a44c810e"
};

test('RA provenance layer pins the exact source commit and every raw current changed asset',()=>{
 assert.equal(fixture.baseCommit,'11604f91474a4c1a7740bb5c2fd7eb6cd73056bc');
 assert.equal(fixture.baseTree,'b555143721d7e8313e8d6f89ffe5f40f337396c2');
 assert.deepEqual(Object.keys(fixture.files),Object.keys(baselineGitBlobs));
 for(const [path,entry] of Object.entries(fixture.files)){
  const current=read(path),old=raDeadlineBytes(path,current);
  assertCurrentRaDeadlineAsset(path,current);
  assert.equal(git(old),baselineGitBlobs[path]);
  assert.equal(hash(old),entry.beforeSha256);
  assert.equal(git(current),entry.afterGitBlob);
  assert.deepEqual(raDeadlineBytes(path,old,'forward'),current);
  assert.strictEqual(raDeadlineBytes(path,old),old);
  assert.strictEqual(raDeadlineBytes(path,current,'forward'),current);
  assert.equal(entry.kind,'text_fragments');
  if(path==='assets/core.js'){
   assert.deepEqual(entry.operations,[{
    before:'routeIds:[],jobId:j.id,date:j.currentRecruitment.deadline||null',
    after:"routeIds:[],jobId:j.id,checkedDate:j.currentRecruitment.checkedDate||j.checkedDate||'未记录',date:j.currentRecruitment.deadline||null",
   }]);
  }else for(const operation of entry.operations){
   assert.match(operation.before,/^\.\/(?:assets\/)?[a-z-]+\.js\?v=[0-9a-f]{12}$/);
   assert.equal(operation.before.split('?')[0],operation.after.split('?')[0]);
   assert.match(operation.after,/^\.\/(?:assets\/)?[a-z-]+\.js\?v=[0-9a-f]{12}$/);
  }
 }
});

test('RA inverse reconstructs the previous date-summary and public-audit stages without updating old fixtures',()=>{
 for(const path of Object.keys(fixture.files)){
  const current=read(path),old=raDeadlineBytes(path,current);
  if(dateSummaryFixture.files[path]){
   assertCurrentDateSummaryAsset(path,old);
   const prior=dateSummaryBytes(path,old);
   assert.equal(hash(prior),dateSummaryFixture.files[path].beforeSha256);
   assert.deepEqual(dateSummaryBytes(path,prior,'forward'),old);
  }
  const expected=publicAuditBytes(path,publicAuditReleaseBytes(path,dateSummaryBytes(path,old)));
  assert.deepEqual(historicalFs.readFileSync(new URL('../'+path,import.meta.url)),expected);
 }
});

test('RA current gate rejects full rollback, whitespace, unrelated logic, and partial dependency rollback',()=>{
 for(const [path,entry] of Object.entries(fixture.files)){
  const raw=read(path),old=raDeadlineBytes(path,raw);
  assert.throws(()=>assertCurrentRaDeadlineAsset(path,old),/unreviewed current RA-deadline/);
  assert.strictEqual(raDeadlineBytes(path,old),old);
  const mutants=[Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\n// unrelated change\n'))];
  if(entry.operations.length>1)for(const operation of entry.operations)mutants.push(Buffer.from(String(raw).replace(operation.after,()=>operation.before)));
  if(path==='assets/core.js'){
   mutants.push(Buffer.from(String(raw).replace("||'未记录'","||'2026-10-07'")));
   mutants.push(Buffer.from(String(raw).replace("kind:'employment'","kind:'degree'")));
  }
  for(const mutant of mutants){
   assert.notEqual(hash(mutant),entry.afterSha256);
   assert.throws(()=>assertCurrentRaDeadlineAsset(path,mutant),/unreviewed current RA-deadline/);
   assert.strictEqual(raDeadlineBytes(path,mutant),mutant,'unknown change cannot be silently reversed');
   assert.strictEqual(dateSummaryBytes(path,raDeadlineBytes(path,mutant)),mutant,'unknown changes reach prior stage unchanged');
  }
  const alteredBaseline=Buffer.concat([old,Buffer.from(' ')]);
  assert.strictEqual(raDeadlineBytes(path,alteredBaseline,'forward'),alteredBaseline);
 }
});

test('RA provenance inverse leaves raw data, unknown paths, and invalid fragments untouched',()=>{
 for(const path of ['data/catalog.json','data/ra-positions.json','assets/style.css']){
  const raw=read(path);
  for(const direction of ['reverse','forward'])assert.strictEqual(raDeadlineBytes(path,raw,direction),raw);
  assert.throws(()=>assertCurrentRaDeadlineAsset(path,raw),/outside reviewed/);
 }
 for(const path of Object.keys(fixture.files)){
  const fragment=Buffer.from(fixture.files[path].operations[0].after);
  assert.strictEqual(raDeadlineBytes(path,fragment),fragment);
  assert.throws(()=>assertCurrentRaDeadlineAsset(path,fragment),/unreviewed current RA-deadline/);
 }
 assert.throws(()=>raDeadlineBytes('assets/core.js',read('assets/core.js'),'unknown'));
});
