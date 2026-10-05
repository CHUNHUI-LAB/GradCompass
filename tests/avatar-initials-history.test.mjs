import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {avatarInitialsBytes,avatarInitialsFixture as f} from './avatar-initials-baseline.mjs';
import {snapshotHash as hash} from './strict-history-transform.mjs';
import {latestSourceBytes} from './latest-3f294-baseline.mjs';
const publishedGitBlobs={"assets/app.js": "2ff6befebb180fe2c3b4e824e80ecfd15bcaac22", "assets/core.js": "ccee992a1af5410081bcc2622fe0991a6f7bfb27", "assets/experiences.js": "71052d284a2a40883a65f618ad5ae6951bec0f9d", "assets/material-supplement.js": "2be553319906d265df922b6c21baf06618251559", "assets/page-overviews.js": "deba17a9cafc7efd90c4957d88e966556e85900d", "assets/profiles.js": "a2915448ca7605d7d68343c7df169599fc30aed6", "assets/project-comparison.js": "ab0e7a7e4521018d6788af03e4ac13011ee97a43", "assets/record-summaries.js": "b22a74320e278f455ac95e2ffc181d3a42849868", "index.html": "6563fa591a8940afff02e74c1af76de5515e1405"};
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
test('avatar fix exactly reverses to published main and leaves all source data unchanged',()=>{
 assert.equal(f.beforeCommit,'5617d13a000c557a0d29fc9658ef3c36d0ebb281');
 assert.equal(f.beforeTree,'a2e0c2f98dcbb5de33fe6997e45bb16b3674e907');
 assert.deepEqual(Object.keys(f.files).sort(),Object.keys(publishedGitBlobs).sort());
 for(const [path,e]of Object.entries(f.files)){
  const raw=fs.readFileSync(new URL('../'+path,import.meta.url)),copy=Buffer.from(raw),old=avatarInitialsBytes(path,raw);
  assert.equal(hash(raw),e.afterSha256);assert.equal(hash(old),e.beforeSha256);
  assert.equal(git(old),publishedGitBlobs[path]);assert.equal(e.beforeGitBlob,publishedGitBlobs[path]);
  assert.deepEqual(avatarInitialsBytes(path,old,'forward'),raw);
  assert.deepEqual(avatarInitialsBytes(path,old),old);assert.deepEqual(avatarInitialsBytes(path,raw,'forward'),raw);
  assert.deepEqual(latestSourceBytes(path,raw),latestSourceBytes(path,old));assert.deepEqual(raw,copy);
  for(const changed of [Buffer.concat([raw,Buffer.from('\nUNREVIEWED')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))]){
   assert.deepEqual(avatarInitialsBytes(path,changed),changed);assert.deepEqual(latestSourceBytes(path,changed),changed);
  }
  for(const op of e.operations){const partial=Buffer.from(String(raw).replace(op.after,()=>op.before));if(hash(partial)!==e.beforeSha256)assert.deepEqual(avatarInitialsBytes(path,partial),partial);}
 }
 for(const path of ['data/catalog.json','data/advisor-profiles.json','data/ra-positions.json']){
  const raw=fs.readFileSync(new URL('../'+path,import.meta.url));assert.deepEqual(avatarInitialsBytes(path,raw),raw);
 }
});
