import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import {fourSchoolsExpansionBytes,fourSchoolsExpansionObject,fourSchoolsExpansionFixture as f} from './four-schools-expansion-baseline.mjs';
import {snapshotHash as hash,snapshotText as serialize} from './strict-history-transform.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
test('four-school expansion reverses exact complete files to the previous published tree',()=>{
 assert.equal(f.baseCommit,'1c483a0');
 for(const [path,e] of Object.entries(f.files)){const raw=read(path),old=fourSchoolsExpansionBytes(path,raw);assert.equal(hash(raw),e.afterSha256);assert.equal(hash(old),e.beforeSha256);assert.equal(git(raw),e.afterGitBlob);assert.equal(git(old),e.beforeGitBlob);assert.deepEqual(fourSchoolsExpansionBytes(path,old,'forward'),raw);assert.deepEqual(fourSchoolsExpansionBytes(path,old),old);}
 assert.equal(serialize(f),fs.readFileSync(new URL('./fixtures/history/reviewed-four-schools-expansion-20261006.json',import.meta.url),'utf8'));
});
test('four-school expansion keeps evidence bounded and appends 127 reviewed advisors',()=>{
 const current=JSON.parse(read('data/catalog.json')),old=JSON.parse(fourSchoolsExpansionBytes('data/catalog.json',read('data/catalog.json')));
 assert.equal(current.advisors.length,334);assert.equal(old.advisors.length,207);assert.deepEqual(current.advisors.slice(0,207).map(a=>a.id),old.advisors.map(a=>a.id));for(const prior of old.advisors)if(!['Fudan','USTC','Tongji','SEU'].includes(prior.institution))assert.deepEqual(current.advisors.find(a=>a.id===prior.id),prior);
 for(const [inst,count] of [['Fudan',38],['USTC',32],['Tongji',28],['SEU',47]])assert.equal(current.advisors.filter(a=>a.institution===inst).length,count);
 for(const [path,added] of [['data/fudan-advisor-review-20261005.json',34],['data/ustc-advisor-review-20261005.json',29],['data/tongji-advisor-review-20261005.json',24],['data/seu-advisor-review-20261005.json',40]]){const now=JSON.parse(read(path)),prior=JSON.parse(fourSchoolsExpansionBytes(path,read(path)));assert.equal(now.advisors.length,prior.advisors.length+added);assert(prior.advisors.every((a,i)=>a.id===now.advisors[i].id));}
 assert.equal(current.advisors.at(-1).id,'ustc-lv-linyuan');assert.equal(current.advisors.filter(a=>a.cycle2028FallVerified===true).length,0);assert(current.advisors.slice(207).every(a=>['explicit','unknown'].includes(a.opening)&&a.cycle2028FallVerified===false));
});
test('four-school expansion rejects changed, partial and reordered snapshots',()=>{
 for(const [path,e] of Object.entries(f.files)){const raw=read(path);for(const changed of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\nUNREVIEWED\n'))])assert.strictEqual(fourSchoolsExpansionBytes(path,changed),changed);if(e.kind==='text_fragments')for(const op of e.operations){const partial=Buffer.from(String(raw).replace(op.after,()=>op.before));if(hash(partial)!==e.beforeSha256)assert.strictEqual(fourSchoolsExpansionBytes(path,partial),partial);}}
 const d=JSON.parse(read('data/catalog.json'));d.advisors.reverse();assert.deepEqual(fourSchoolsExpansionObject('data/catalog.json',d),d);
});
