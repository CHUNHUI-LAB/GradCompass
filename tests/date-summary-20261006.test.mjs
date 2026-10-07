import test from 'node:test';
import {raDeadlineBytes} from './ra-deadline-20261007-baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {dateSummaryFixture as f,dateSummaryBytes,assertCurrentDateSummaryAsset} from './date-summary-20261006-baseline.mjs';
import {publicAuditReleaseBytes,assertCurrentPublicAuditAsset} from './public-audit-release-20261006-baseline.mjs';
import {snapshotHash as hash} from './strict-history-transform.mjs';
import {renderRecordSummary} from '../assets/record-summaries.js';
const read=p=>raDeadlineBytes(p,fs.readFileSync(new URL('../'+p,import.meta.url)));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const baselineGitBlobs={
  "assets/record-summaries.js": "877973b520941a5174a94efb29079d1338f64da7",
  "assets/project-comparison.js": "ce65fd4ba117c090aa88a490dd1a240321f5d2bb",
  "assets/app.js": "e108fa3442b177148f9513ee3de0494a8ee4e907",
  "index.html": "437ed6b9bd3fd6aedd6f1846eb653e2a28667b8e"
};

test('date summary display stage pins raw current assets and exact previous Git blobs without changing historical fixtures',()=>{
 assert.equal(f.baseCommit,'17f7b33af47ea6f9baffccf10727a57ebda383d1');assert.equal(f.baseTree,'4d689b3bcfa19c00cae02f0bcde9ef64ba71b565');
 assert.deepEqual(Object.keys(f.files),Object.keys(baselineGitBlobs));
 for(const [path,e] of Object.entries(f.files)){
  const current=read(path),old=dateSummaryBytes(path,current);assertCurrentDateSummaryAsset(path,current);
  assert.equal(hash(old),e.beforeSha256);assert.equal(git(old),baselineGitBlobs[path]);assert.equal(git(current),e.afterGitBlob);
  assert.deepEqual(dateSummaryBytes(path,old,'forward'),current);assert.deepEqual(dateSummaryBytes(path,old),old);
  assert.deepEqual(dateSummaryBytes(path,current,'forward'),current);
  if(path==='assets/app.js'||path==='index.html'){assertCurrentPublicAuditAsset(path,old);assert.notDeepEqual(publicAuditReleaseBytes(path,old),old);}
 }
});

test('date summary gate rejects logic edits, added whitespace, partial fragments and unknown assets before historical replay',()=>{
 for(const [path,e] of Object.entries(f.files)){
  const raw=read(path),before=dateSummaryBytes(path,raw),mutants=[Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\n// unreviewed logic change\n'))];
  assert.notDeepEqual(before,raw);assert.throws(()=>assertCurrentDateSummaryAsset(path,before),/unreviewed current date-summary/);
  assert.strictEqual(dateSummaryBytes(path,before),before,'known historical bytes are preserved but never accepted as current');
  for(const op of e.operations)if(e.operations.length>1)mutants.push(Buffer.from(String(raw).replace(op.after,()=>op.before)));
  for(const mutant of mutants){assert.throws(()=>assertCurrentDateSummaryAsset(path,mutant),/unreviewed current date-summary/);assert.strictEqual(dateSummaryBytes(path,mutant),mutant);if(path==='assets/app.js'||path==='index.html'){assert.strictEqual(publicAuditReleaseBytes(path,dateSummaryBytes(path,mutant)),mutant);assert.throws(()=>assertCurrentPublicAuditAsset(path,mutant),/unreviewed current asset/);}}
 }
 const unknown=Buffer.from('unreviewed');assert.strictEqual(dateSummaryBytes('assets/unreviewed.js',unknown),unknown);assert.throws(()=>assertCurrentDateSummaryAsset('assets/unreviewed.js',unknown),/outside reviewed/);
});

test('all recorded academic deadlines preserve original date, timezone, year and source objects while displaying recorded times',()=>{
 const catalog=JSON.parse(read('data/catalog.json')),before=JSON.stringify(catalog);
 for(const d of catalog.deadlines){
  const html=renderRecordSummary('deadline',d,catalog).html;
  assert(!html.includes('截止时刻</dt><dd>未公布'));
  if(d.deadlineTime)assert(html.includes('截止时刻</dt><dd>'+d.deadlineTime));
  if(d.timezone)assert(html.includes('时区</dt><dd>'+d.timezone));
  assert(html.includes('截止日期</dt><dd>'+d.date));
 }
 for(const id of ['westlake-ai-phd-first-batch','westlake-ee-phd-first-batch']){
  const d=catalog.deadlines.find(x=>x.id===id),html=renderRecordSummary('deadline',d,catalog).html;
  assert(html.includes('截止时刻</dt><dd>10:00:00+08:00'));assert(html.includes('此轮已截止'));assert.equal(d.admissionYear,'2027第一批（9月批）');
 }
 assert.equal(JSON.stringify(catalog),before);
});
