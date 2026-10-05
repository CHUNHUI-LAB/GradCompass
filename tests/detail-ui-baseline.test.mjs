import {avatarInitialsBytes} from './avatar-initials-baseline.mjs';
import {roboticsExpansionBytes} from './robotics-expansion-baseline.mjs';
import {currentMainBytes} from './current-main-baseline.mjs';
import {sevenBytes} from './seven-schools-baseline.mjs';
import {pkuBytes} from './pku-baseline.mjs';
import {overseasBytes} from './overseas-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './jhu-language-history-fs.mjs';
import {detailUiFixture as fixture,detailUiBytes} from './detail-ui-baseline.mjs';
import {latestCorrectionFixture,latestSourceBytes} from './latest-3f294-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
const read=path=>overseasBytes(path,pkuBytes(path,sevenBytes(path,currentMainBytes(path,roboticsExpansionBytes(path,avatarInitialsBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url))))))));
const publishedHashes={
 'assets/app.js':'d90c1fa2e55244e6c0cd763ca66c40b1bb40fdcf2785f2b2afc2a18f6891e2e3',
 'index.html':'d7c81e4fc61b7e19d620f77e75dc80357b5ac6f016fb583f979c2be275f85f9a',
};

test('detail UI fragments pin exact reviewed bytes and preserve the immutable published source stage',()=>{
 assert.equal(fixture.baseCommit,'dd654eaaf9e7f6143b1c99a54c3e3e97fc86f142');
 assert.equal(fixture.baseTree,'a1f9bf979a6a3de7249a497eefbec75a53aa49d3');
 assert.deepEqual(Object.keys(fixture.files).sort(),Object.keys(publishedHashes).sort());
 assert(Buffer.byteLength(serialize(fixture))<12000,'UI fixture contains small fragments, never a whole application snapshot');
 const before=serialize(fixture);
 for(const [path,entry]of Object.entries(fixture.files)){
  assert.equal(entry.beforeSha256,publishedHashes[path],path+' independently pinned published baseline');
  assert.equal(entry.beforeSha256,latestCorrectionFixture.files[path].afterSha256,path+' unchanged older fixture');
  const current=read(path),original=Buffer.from(current);assert.equal(hash(current),entry.afterSha256,path+' exact current UI');
  const published=detailUiBytes(path,current);assert.equal(hash(published),publishedHashes[path],path+' exact published UI');
  assert.deepEqual(detailUiBytes(path,published),published,path+' reverse idempotence');
  assert.deepEqual(detailUiBytes(path,published,'forward'),current,path+' exact forward round trip');
  assert.deepEqual(detailUiBytes(path,current,'forward'),current,path+' forward idempotence');
  assert.deepEqual(current,original,path+' input buffer is read-only');
  assert.deepEqual(latestSourceBytes(path,current),latestSourceBytes(path,published),path+' prior strict chain consumes the explicit UI inverse');
 }
 assert.equal(serialize(fixture),before,'fragment fixture is read-only');
});

test('unreviewed UI edits, whitespace and fragment-only inputs cannot normalize into the published source',()=>{
 for(const [path,entry]of Object.entries(fixture.files)){
  const current=read(path),published=detailUiBytes(path,current);
  const samples=[
   Buffer.concat([current,Buffer.from('\nUNREVIEWED')]),
   Buffer.from(String(current).replace('\n','\nUNREVIEWED\n')),
   Buffer.from(String(current)+' '),
   Buffer.from(entry.operations.map(op=>op.after).join('\n')),
   Buffer.from(String(current).replace(entry.operations[0].after,()=>entry.operations[0].after+' UNREVIEWED')),
  ];
  if(entry.operations.length>1)for(const op of entry.operations)samples.push(Buffer.from(String(current).replace(op.after,()=>op.before)));
  for(const changed of samples){
   assert.notEqual(hash(changed),entry.afterSha256,path+' actual current mutation');
   assert.notEqual(hash(changed),entry.beforeSha256,path+' mutation is not a complete approved rollback');
   assert.deepEqual(detailUiBytes(path,changed),changed,path+' new inverse retains unknown bytes');
   assert.deepEqual(latestSourceBytes(path,changed),changed,path+' prior chain retains unknown bytes');
  }
  for(const changed of [Buffer.concat([published,Buffer.from('\nUNREVIEWED')]),Buffer.from(String(published)+' ')]){
   assert.deepEqual(detailUiBytes(path,changed,'forward'),changed,path+' forward transform retains unknown baseline edits');
   assert.notEqual(hash(changed),entry.afterSha256,path+' edited baseline cannot pass current hash');
  }
 }
});

test('detail UI layer never changes admissions data, unknown files or unrelated stylesheet bytes',()=>{
 assert.equal(hash(read('assets/style.css')),'8bdf5b250a9e88e4aaf8f311f6c79520cd2b81b1702a702333ce931ee651f98a','published stylesheet is unchanged');
 const paths=['assets/style.css','assets/core.js',...fs.readdirSync(new URL('../data/',import.meta.url)).map(name=>'data/'+name)];
 for(const path of paths){
  const bytes=read(path);
  for(const direction of ['reverse','forward'])assert.strictEqual(detailUiBytes(path,bytes,direction),bytes,path+' untouched '+direction+' bytes');
 }
 for(const path of ['data/catalog.json','data/unknown.json','assets/app.js','index.html']){
  const bytes=Buffer.from('{unfinished:');assert.strictEqual(detailUiBytes(path,bytes),bytes,path+' unknown input retained');
 }
});
