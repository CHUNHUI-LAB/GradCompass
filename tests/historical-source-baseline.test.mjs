import {latestSourceBytes} from './latest-3f294-baseline.mjs';
import {concurrentReferenceBytes} from './concurrent-reference-baseline.mjs';
import {currentCorrectionBytes} from './current-correction-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {historicalSourceFixture as fixture,historicalSourceBaseline,historicalSourceBytes,reverseReviewedOperations,sha256,serialize} from './historical-source-baseline.mjs';
const baselineByteCache=new Map();
const read=path=>{if(!baselineByteCache.has(path))baselineByteCache.set(path,concurrentReferenceBytes(path,currentCorrectionBytes(path,latestSourceBytes(path,fs.readFileSync(new URL('../'+path,import.meta.url))))));return Buffer.from(baselineByteCache.get(path));};
// These four-commit assertions use the exact current→3f294→5c27→1dd inverses, never raw current counts.
const sourceHashes={
 'assets/app.js':['5c5560b5550965d1f0c3a9fa9ac94690385d7fd0081deaee41946aed7d7aaeaa','f187a531056bf109dd59ae4eb13963d44e42f4875d815a37f98a25c2533d6f0c','413d54e181d04693fffa43896285d7cb8a367c6a3af52208efcd67838ccf2e39','540112b80a5164bcc506a14ee0c5604bb03febfc1ccaf21f3926eda793d7088d'],
 'assets/core.js':['cad4681d907cdf380dad2b1ab4c9b42ee33829e11fafeb73b9ad0b072975a927','2f21f34288beadd37af135e7995bf9fd3d4aedd5ddaf4ecf2f4aa56fb0ec19ae','c5028d5ec3205ebb7f18b82b1fe575b5f0a151623da711c8edb57903ec003efb','c5028d5ec3205ebb7f18b82b1fe575b5f0a151623da711c8edb57903ec003efb'],
 'data/catalog.json':['3423ba646e7ed2f7857f8ece4c884edaaf568319049f78b18000ba9fe59e3875','52bb93a5eeddd1200d9fcd642a82b184efe2d74a915ee8c72ef2168bd811f39f','4e27e2b083f15faf04921216ac9ec5ef02519814d8f3fff905d856ceed9ec577','169959415111158f4d617d4790ad4e5ff9f267ab72342f3e716883edf6541128'],
 'data/advisor-profiles.json':['1550cecabe989c7f857fb65347486e5f7abe85fa140a92514892f1d2de42a2a8','831f560e5d4ad4784ac0c43de33f4ef4a9cecde464951ad4850df37007a5d39a','63908ddf9edc1fe3fd49befe3d59eec15bc4038207ea24ff388da5955d9866e9','63908ddf9edc1fe3fd49befe3d59eec15bc4038207ea24ff388da5955d9866e9'],
 'data/sustech-advisor-review-20261004.json':['ec5204975321dc31f04e808dd37be88d510ac747bb62790af811ee209bbd14b9','ec5204975321dc31f04e808dd37be88d510ac747bb62790af811ee209bbd14b9','ec5204975321dc31f04e808dd37be88d510ac747bb62790af811ee209bbd14b9','6af177a0b5acad4445d88dc80ca39734982e69087caf31479277fe1234022ac0'],
 'index.html':['02238e39b3a81f5f53f26ff46e8700467733c8b725b9c427c2fbd134cecac0ac','02602fe3c0ca6a15541787e866ac7d86f64f27c0ea44db8a33bf81e610ac14fc','1d1380ea9c93fef6756f829272977c67a80b374831fae53176fdfa2ea7cbbf82','8119f50f4040bb38efa175db07cbf87739b64f5ec43acf76f5cf294c6fcdb8dc'],
};
const additions=Object.entries(fixture.files).flatMap(([path,entry])=>entry.kind==='json'?entry.stages.flatMap(stage=>stage.operations.filter(op=>op.beforeMissing&&op.path.length===2&&['routes','advisors','profiles'].includes(op.path[0])).map(op=>({path,op}))):[]);
const getAt=(value,path)=>path.reduce((node,key)=>node?.[key],value);
function detects(path,value,label){
 const bytes=Buffer.from(serialize(value)),before=serialize(value);
 let restored;
 try{restored=historicalSourceBaseline(value,path);}catch(error){assert.match(error.message,/reviewed historical delta mismatch:/,label);}
 assert.equal(serialize(value),before,label+' input is unchanged');
 if(restored)assert.notEqual(sha256(serialize(restored)),sourceHashes[path][0],label+' changed object cannot equal history');
 assert.notEqual(sha256(historicalSourceBytes(path,bytes)),sourceHashes[path][0],label+' changed bytes cannot equal history');
}

test('reviewed history pins the exact four source commits and independent original hashes',()=>{
 assert.deepEqual(fixture.sourceCommits,['5e7cd36ee6c3d184a2766ca6306ad1a88ebf4e30','b11a381650242597552327832587f27a57138481','74ca2c8ed9bc3d41a36d8a929b6c1c40c0914a3d','1ddbbfbcc989096406cc47ed0b2ec5f9d1ab455f']);
 assert.equal(fixture.historicalCommit,fixture.sourceCommits[0]);assert.equal(fixture.currentBaseCommit,fixture.sourceCommits.at(-1));
 assert.deepEqual(Object.keys(fixture.files).sort(),Object.keys(sourceHashes).sort());
 for(const [path,hashes]of Object.entries(sourceHashes))assert.deepEqual(Object.values(fixture.files[path].sourceHashes),hashes,path);
 assert(!JSON.stringify(fixture).includes('applicationScopeOperations'),'cancelled scope policy is not a history stage');
});

test('each successive source inverse reconstructs exact historical bytes without reordering or reformatting',()=>{
 const before=serialize(fixture);
 for(const [path,entry]of Object.entries(fixture.files)){
  let bytes=read(path);assert.equal(sha256(bytes),sourceHashes[path].at(-1),path+' exact 1ddbbfb input');
  for(const stage of [...entry.stages].reverse()){
   assert.equal(sha256(bytes),stage.afterSha256,path+' current stage');
   bytes=entry.kind==='json'?Buffer.from(serialize(reverseReviewedOperations(JSON.parse(bytes),stage.operations))):Buffer.from(stage.operations.reduce((text,op)=>{assert.equal(text,op.after);return op.before;},String(bytes)));
   assert.equal(sha256(bytes),stage.beforeSha256,path+' exact preceding source');
  }
  assert.equal(sha256(bytes),sourceHashes[path][0],path+' oldest source');
  assert.deepEqual(historicalSourceBytes(path,read(path)),bytes,path+' complete inverse');
  assert.deepEqual(historicalSourceBytes(path,bytes),bytes,path+' idempotence');
 }
 assert.equal(serialize(fixture),before,'reviewed fixture is never mutated');
});

test('all 15 added advisors, 15 profiles and seven routes remain protected by exact source history',()=>{
 assert.equal(additions.filter(x=>x.op.path[0]==='advisors').length,15);
 assert.equal(additions.filter(x=>x.op.path[0]==='profiles').length,15);
 assert.equal(additions.filter(x=>x.op.path[0]==='routes').length,7);
 for(const {path,op}of additions){
  for(const mode of ['change','add','remove']){
   const value=JSON.parse(read(path)),row=getAt(value,op.path),field=op.path[0]==='advisors'?'name':op.path[0]==='profiles'?'cardSummaryZh':'program';
   assert.equal(typeof row[field],'string');
   if(mode==='change')row[field]+=' UNREVIEWED';
   if(mode==='add')row.unreviewedProbe={keep:true};
   if(mode==='remove')delete row[field];
   detects(path,value,op.path.join('/')+' '+mode);
  }
 }
});

test('later field regressions cannot disappear when earlier stages delete whole added records',()=>{
 let checked=0;
 for(const [path,entry]of Object.entries(fixture.files))if(entry.kind==='json')for(const stage of entry.stages)for(const op of stage.operations){
  if(op.path.length<3||!['routes','advisors','profiles'].includes(op.path[0]))continue;
  const value=JSON.parse(read(path)),parent=getAt(value,op.path.slice(0,-1)),key=op.path.at(-1);
  if(!parent||typeof parent!=='object')continue;
  if(op.beforeMissing)delete parent[key];else parent[key]=structuredClone(op.before);
  detects(path,value,op.path.join('/')+' partial rollback');checked++;
 }
 assert(checked>=100,'reviewed nested source and association changes are protected');
});

test('unreviewed originals, root fields, tails and record order never normalize to an accepted historical hash',()=>{
 for(const [path,key,field]of [['data/catalog.json','advisors','name'],['data/catalog.json','routes','program'],['data/advisor-profiles.json','profiles','cardSummaryZh']]){
  let value=JSON.parse(read(path));value[key][0][field]+=' UNREVIEWED';detects(path,value,key+' existing record');
  value=JSON.parse(read(path));value.unreviewedProbe={retained:true};detects(path,value,key+' root addition');
  value=JSON.parse(read(path));value[key].push({id:'future-unreviewed-record'});detects(path,value,key+' future tail');
  for(const pair of [[0,1],[JSON.parse(read(path))[key].length-2,JSON.parse(read(path))[key].length-1]]){
   value=JSON.parse(read(path));const [a,b]=pair;[value[key][a],value[key][b]]=[value[key][b],value[key][a]];detects(path,value,key+' reordered '+pair);
  }
 }
});

test('text inverses retain unreviewed UI or whitespace mutations and preserve noncanonical source JSON bytes',()=>{
 for(const [path,entry]of Object.entries(fixture.files))if(entry.kind==='text'){
  const original=read(path);
  for(const value of [Buffer.concat([original,Buffer.from('\nUNREVIEWED')]),Buffer.from(String(original).replace(/\n/,'\nUNREVIEWED\n'))])assert.notEqual(sha256(historicalSourceBytes(path,value)),sourceHashes[path][0],path);
 }
 const path='data/sustech-advisor-review-20261004.json',bytes=historicalSourceBytes(path,read(path));
 assert.notEqual(sha256(serialize(JSON.parse(bytes))),sha256(bytes),'historical inline JSON is deliberately not reformatted');
 assert.equal(sha256(bytes),sourceHashes[path][0]);
});

test('strict operations are read-only and unknown, malformed and unrelated inputs keep their content',()=>{
 const ops=[{path:['old'],before:'before',after:'after'},{path:['added'],beforeMissing:true,after:{id:'new'}}];
 assert.deepEqual(reverseReviewedOperations({old:'after',added:{id:'new'}},ops),{old:'before'});
 assert.throws(()=>reverseReviewedOperations({old:'after',added:{id:'new',unreviewed:true}},ops),/reviewed historical delta mismatch:/);
 const input={old:'unknown',added:{id:'new',extra:true}};assert.deepEqual(reverseReviewedOperations(input,ops),input);
 for(const path of ['data/catalog.json','data/unknown.json']){const malformed=Buffer.from('{unfinished:');assert.deepEqual(historicalSourceBytes(path,malformed),malformed);}
 const unknown=Buffer.from('{"extra":true}');assert.deepEqual(historicalSourceBytes('data/unknown.json',unknown),unknown);
 const value={custom:[{id:'record'}]};assert.deepEqual(historicalSourceBaseline(value),value);assert.notEqual(historicalSourceBaseline(value),value);
});

test('historical eligible-only denominators remain explicit beside the wider browse-fixture inventory',async()=>{
 const {filterAdvisors,filterRoutes,buildOpportunities}=await import('../assets/core.js');
 const catalog=historicalSourceBaseline(JSON.parse(read('data/catalog.json')),'data/catalog.json');
 const ra=JSON.parse(read('data/ra-positions.json'));
 assert.equal(catalog.advisors.length,43,'5e7cd36 recorded people');
 assert.equal(catalog.routes.length,34,'5e7cd36 recorded projects');
 assert.equal(filterAdvisors(catalog).length,41,'historical eligible-only people');
 assert.equal(filterRoutes(catalog).length,28,'historical eligible-only projects');
 const opportunities=buildOpportunities({...catalog,raPositions:ra.raPositions});
 assert.equal(opportunities.length,59,'historical precise association/job total');
 assert.equal(opportunities.filter(o=>o.type!=='RA').length,57,'historical degree associations');
 assert.equal(opportunities.filter(o=>o.type==='RA').length,2,'historical independent RA jobs');
});
