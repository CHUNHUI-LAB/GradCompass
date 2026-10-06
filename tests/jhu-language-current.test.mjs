import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './public-audit-20261006-history-fs.mjs';
import crypto from 'node:crypto';
import {jhuLanguageBytes,jhuLanguageFixture as f} from './jhu-language-baseline.mjs';
import {snapshotHash as hash} from './strict-history-transform.mjs';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {fourSchoolsExpansionBytes} from './four-schools-expansion-baseline.mjs';
const read=p=>fourSchoolsExpansionBytes(p,fs.readFileSync(new URL('../'+p,import.meta.url)));
test('JHU policy delta round trips the complete exact baseline and rejects unknown mutations',()=>{
 assert.equal(f.baseCommit,'b626e93');
 assert.deepEqual(Object.keys(f.files).sort(),['assets/app.js','data/material-summaries.json','index.html']);
 for(const [path,e]of Object.entries(f.files)){
  const raw=read(path),prior=jhuLanguageBytes(path,raw);
  assert.equal(hash(raw),e.afterSha256);assert.equal(hash(prior),e.beforeSha256);
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${prior.length}\0`),prior])).digest('hex'),e.beforeGitBlob);
  assert.deepEqual(jhuLanguageBytes(path,prior,'forward'),raw);
  for(const x of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))])assert.deepEqual(jhuLanguageBytes(path,x),x);
 }
 const p='data/material-summaries.json',raw=read(p),value=JSON.parse(raw);
 for(const v of [Object.assign(structuredClone(value),{unknown:true}),{...value,records:[...value.records].reverse()}]){const b=Buffer.from(JSON.stringify(v,null,2)+'\n');assert.deepEqual(jhuLanguageBytes(p,b),b);}
});
test('current JHU language data is bounded to one record and preserves all other content',()=>{
 const p='data/material-summaries.json',now=JSON.parse(read(p)),before=JSON.parse(jhuLanguageBytes(p,read(p)));
 assert.equal(now.records.length,before.records.length);assert.equal(now.sources.length,before.sources.length+2);
 assert.deepEqual(now.sources.slice(0,before.sources.length),before.sources);
 for(let i=0;i<now.records.length;i++)if(now.records[i].id!=='jhu-robotics-mse-materials')assert.deepEqual(now.records[i],before.records[i]);
 const a=now.records.find(r=>r.id==='jhu-robotics-mse-materials'),b=before.records.find(r=>r.id===a.id),lang=a.requirements.find(r=>r.kind==='language');
 assert.equal(lang.requirementStatus,'conditional');
 for(const term of ['推荐','不是统一硬性最低','项目另有规定','本科或硕士','不得据此视为自动获批','DET','待核','2027'])assert(lang.text.includes(term),term);
 assert.deepEqual(a.requirements.filter(r=>r.kind!=='language'),b.requirements.filter(r=>r.kind!=='language'));
 const c=JSON.parse(read('data/catalog.json'));assert.equal(c.advisors.length,207);assert.equal(c.routes.length,61);assert(normalizeMaterialSupplement(now,c).some(r=>r.id===a.id));
});
