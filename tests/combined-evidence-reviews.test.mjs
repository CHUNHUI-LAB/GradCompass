// Compose independent MRL and HKU reviews without changing historical baselines.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {publishedBytes,publishedPaths,publishedCommit} from './published-history-fs.mjs';
import {evidenceReviews,reverseBoundedRecruitmentReview} from './evidence-reviews.mjs';
import {assertReviewedPublicData} from './reviewed-public-data.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const actual=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(p=>p.endsWith('.json')).map(p=>['data/'+p,JSON.parse(read('data/'+p))]));
const earlier=[
 {path:'tests/fixtures/evidence/maintenance-20261008.json',sha256:'d6fd6d89e68c82328f168301f2c7425c070645c3f8c1e9101101833268ed3f07'},
 {path:'tests/fixtures/evidence/homepages-20261010.json',sha256:'357e92c32d5d194eef4c0a953f2635f4e31749e3ec7dedf88b8734a8372be53a'},
 {path:'tests/fixtures/evidence/appointments-20261010.json',sha256:'49d0b3ced5962b4686c0e368998f471bc20a8922e5e4ce2155aab9156a8e99c3'}
];
const mrl={path:'tests/fixtures/evidence/maintenance-20261009.json',sha256:'fe81a90659e8e80ef3378baab52f95226806179dcc22e5e27f59c810e01062d4',date:'2026-10-09',operations:[["data/catalog.json","/advisors/9/opening","replace"],["data/catalog.json","/advisors/9/openingSummary","replace"],["data/catalog.json","/advisors/9/openings/phd","replace"],["data/catalog.json","/advisors/9/openings/cycle2027","replace"],["data/catalog.json","/advisors/9/openingDetails/2","replace"],["data/catalog.json","/advisors/9/recruitmentReview","replace"],["data/advisor-profiles.json","/profiles/11/recruitment","replace"],["data/advisor-profiles.json","/profiles/11/unknowns/0","replace"]]};
const hku={path:'tests/fixtures/evidence/hku-ris-materials-20261011.json',sha256:'363d5714471f91fcc43bbbf4b0749c1ab048efb78da178164eecf66530dd7af1',date:'2026-10-11',operations:[["data/catalog.json","/routes/33/sources/4","add"],["data/catalog.json","/routes/33/sources/5","add"],["data/catalog.json","/routes/33/notes/0","replace"],["data/project-summaries.json","/sources/76","add"],["data/project-summaries.json","/sources/77","add"],["data/project-summaries.json","/sources/78","add"],["data/project-summaries.json","/records/27/cycle/text","replace"],["data/project-summaries.json","/records/27/cycle/sourceIds/2","add"],["data/project-summaries.json","/records/27/cycle/sourceIds/3","add"],["data/project-summaries.json","/records/27/cautions/1/text","replace"],["data/project-summaries.json","/records/27/cautions/1/sourceIds/2","add"],["data/project-summaries.json","/records/27/cautions/1/sourceIds/3","add"],["data/material-summaries.json","/sources/53","add"],["data/material-summaries.json","/sources/54","add"],["data/material-summaries.json","/sources/55","add"],["data/material-summaries.json","/records/12/summary","replace"],["data/material-summaries.json","/records/12/unknowns/0","replace"],["data/material-summaries.json","/records/12/scopeNotes/2","add"],["data/material-summaries.json","/records/12/scopeNotes/3","add"],["data/material-summaries.json","/records/12/requirements/3/text","replace"],["data/material-summaries.json","/records/12/requirements/3/requirementStatus","replace"],["data/material-summaries.json","/records/12/requirements/3/sourceIds/1","add"],["data/material-summaries.json","/records/12/requirements/4/text","replace"],["data/material-summaries.json","/records/12/requirements/4/sourceIds/2","add"],["data/material-summaries.json","/records/12/requirements/4/sourceIds/3","add"],["data/material-summaries.json","/records/12/sourceIds/4","add"],["data/material-summaries.json","/records/12/sourceIds/5","add"],["data/material-summaries.json","/records/12/sourceIds/6","add"]]};
const baselineHashes={
 'data/catalog.json':'4ee1ebc798beefcfe0a68934bdd2e7ffc4b96d99cf3bd873f4c46cc11dd566a5',
 'data/project-summaries.json':'77b000d870b5ad85df276fbc23f71f4ee1b458a439252e2060a20b157a15d46e',
 'data/material-summaries.json':'5df80564b3228d5393e256c3bcc183212bcc6468eb0be4293321d36d14f71d6e'
};
function receipt(spec,reader=read){
 const raw=reader(spec.path);assert.equal(sha(raw),spec.sha256,'pinned receipt bytes');
 const review=JSON.parse(raw);assert.equal(review.schemaVersion,1);assert.equal(review.baseCommit,publishedCommit);
 if(spec.date)assert.equal(review.reviewDate,spec.date);
 if(spec.operations)assert.deepEqual(review.operations.map(op=>[op.file,op.path,op.operation]),spec.operations,'exact ordered integration paths');
 return review;
}
function identities(data,spec){
 if(spec===mrl){
  assert.equal(data['data/catalog.json']?.advisors?.[9]?.id,'hkust-yajing-shen','MRL advisor identity');
  assert.equal(data['data/advisor-profiles.json']?.profiles?.[11]?.advisorId,'hkust-yajing-shen','MRL profile identity');
 }
 if(spec===hku){
  assert.equal(data['data/catalog.json']?.routes?.[33]?.id,'hku-ris-msc','HKU route identity');
  assert.equal(data['data/project-summaries.json']?.records?.[27]?.routeId,'hku-ris-msc','HKU project route identity');
  assert.equal(data['data/material-summaries.json']?.records?.[12]?.id,'hku-ris-msc-materials','HKU material identity');
 }
}
function applyReview(data,spec,{reverse=false,reader=read}={}){
 const result=structuredClone(data),review=receipt(spec,reader);identities(result,spec);
 for(const op of reverse?[...review.operations].reverse():review.operations){
  assert(['replace','add'].includes(op.operation));
  const keys=op.path.slice(1).split('/').map(k=>k.replaceAll('~1','/').replaceAll('~0','~'));
  assert(keys.every(k=>!['__proto__','constructor','prototype'].includes(k)));
  let owner=result[op.file];assert(owner,'known dataset');
  for(const key of keys.slice(0,-1)){assert(Object.hasOwn(owner,key),'existing parent');owner=owner[key];}
  const key=keys.at(-1);
  if(reverse||op.operation==='replace'){
   assert(Object.hasOwn(owner,key),'existing reviewed value');
   assert.deepEqual(owner[key],reverse?op.value:op.old,'exact reviewed '+(reverse?'after':'before')+' value');
  }else{
   assert(!Object.hasOwn(owner,key),'addition cannot overwrite');
   if(Array.isArray(owner))assert.equal(Number(key),owner.length,'append only');
  }
  if(reverse&&op.operation==='add'){
   if(Array.isArray(owner)){assert.equal(Number(key),owner.length-1,'exact tail');owner.pop();}else delete owner[key];
  }else owner[key]=structuredClone(reverse?op.old:op.value);
 }
 return result;
}
// Build B independently from the immutable publication and earlier receipts only.
let baseline=Object.fromEntries(publishedPaths.filter(p=>p.startsWith('data/')&&p.endsWith('.json')).map(p=>[p,JSON.parse(publishedBytes(p))]));
for(const spec of earlier)baseline=applyReview(baseline,spec);
const mOnly=applyReview(baseline,mrl),hOnly=applyReview(baseline,hku);
function assertBaseline(data){
 assert.deepEqual(data,baseline,'all independently reconstructed baseline datasets');
 for(const [p,hash]of Object.entries(baselineHashes))assert.equal(sha(JSON.stringify(data[p])),hash,p+' original baseline hash');
}

test('eight MRL and 28 HKU operations commute forward and exactly match every current public dataset',()=>{
 assert.equal(mrl.operations.length,8);assert.equal(hku.operations.length,28);
 assert.deepEqual(evidenceReviews,[...earlier,...[mrl,hku].map(({path,sha256})=>({path,sha256}))]);
 const mThenH=applyReview(mOnly,hku),hThenM=applyReview(hOnly,mrl);
 assert.deepEqual(mThenH,hThenM);assert.deepEqual(mThenH,actual);
 assertReviewedPublicData(actual,read);assertBaseline(baseline);
});

test('both inverse orders restore the unchanged baseline, including advisor profiles',()=>{
 const mThenH=applyReview(reverseBoundedRecruitmentReview(actual,read),hku,{reverse:true});
 const hThenM=reverseBoundedRecruitmentReview(applyReview(actual,hku,{reverse:true}),read);
 assert.deepEqual(mThenH,hThenM);assertBaseline(mThenH);
});

test('selective inverses preserve the other review and all appointments and homepage additions',()=>{
 const before=structuredClone(actual),withoutM=reverseBoundedRecruitmentReview(actual,read),withoutH=applyReview(actual,hku,{reverse:true});
 assert.deepEqual(withoutM,hOnly);assert.deepEqual(withoutH,mOnly);assert.deepEqual(actual,before,'caller data is untouched');
 const profiles=d=>d['data/advisor-profiles.json'].profiles;
 assert.equal(profiles(withoutM).filter(p=>p.appointmentReview).length,334);
 for(let i=0;i<334;i++)for(const key of ['appointmentReview','homepageReview','links'])assert.deepEqual(profiles(withoutM)[i][key],profiles(actual)[i][key],key+' retained at '+i);
});

test('raw corruption and missing, extra, reordered or altered receipt operations cannot pass either integration guard',()=>{
 for(const spec of [mrl,hku]){
  const raw=read(spec.path);
  const mutations=[r=>r.operations.pop(),r=>r.operations.push(structuredClone(r.operations[0])),r=>r.operations.reverse(),r=>{r.operations[0].path+='/unreviewed';},r=>{r.operations[0].old='forged';},r=>{r.operations[0].value='forged';},r=>{r.baseCommit='0'.repeat(40);},r=>{r.reviewDate='2099-01-01';},r=>{r.schemaVersion=2;}];
  const bads=[Buffer.concat([raw,Buffer.from(' ')])];
  for(const mutate of mutations){const r=JSON.parse(raw);mutate(r);bads.push(Buffer.from(JSON.stringify(r)));}
  for(const bad of bads){
   const reader=p=>p===spec.path?bad:read(p);
   assert.throws(()=>applyReview(baseline,spec,{reader}),/pinned receipt bytes/);
   assert.throws(()=>assertReviewedPublicData(actual,reader),/unreviewed evidence receipt/);
   if(spec===mrl)assert.throws(()=>reverseBoundedRecruitmentReview(actual,reader),/unreviewed bounded receipt/);
  }
 }
});

test('before and after mismatches, missing parents and altered previousReview fail closed',()=>{
 for(const [spec,mutate]of [
  [mrl,d=>{d['data/catalog.json'].advisors[9].opening='forged';}],
  [mrl,d=>{delete d['data/catalog.json'].advisors[9].openings;}],
  [mrl,d=>{d['data/catalog.json'].advisors[9].recruitmentReview.previousReview={forged:true};}],
  [mrl,d=>{delete d['data/advisor-profiles.json'].profiles[11].recruitment;}],
  [hku,d=>{d['data/catalog.json'].routes[33].notes[0]='forged';}],
  [hku,d=>{d['data/material-summaries.json'].records[12].requirements[3].text='forged';}]
 ]){
  const old=structuredClone(baseline);mutate(old);assert.throws(()=>applyReview(old,spec));
  const current=structuredClone(actual);mutate(current);assert.throws(()=>applyReview(current,spec,{reverse:true}));
  if(spec===mrl)assert.throws(()=>reverseBoundedRecruitmentReview(current,read));
 }
});

test('outer identity/index mismatches fail selective MRL inversion and HKU composition',()=>{
 for(const mutate of [
  d=>{d['data/catalog.json'].advisors[9].id='other-advisor';},
  d=>{d['data/advisor-profiles.json'].profiles[11].advisorId='other-advisor';},
  d=>{[d['data/catalog.json'].advisors[9],d['data/catalog.json'].advisors[10]]=[d['data/catalog.json'].advisors[10],d['data/catalog.json'].advisors[9]];},
  d=>{[d['data/advisor-profiles.json'].profiles[11],d['data/advisor-profiles.json'].profiles[12]]=[d['data/advisor-profiles.json'].profiles[12],d['data/advisor-profiles.json'].profiles[11]];}
 ]){const d=structuredClone(actual);mutate(d);assert.throws(()=>reverseBoundedRecruitmentReview(d,read),/recruitment .* identity/);}
 for(const mutate of [
  d=>{d['data/catalog.json'].routes[33].id='other-route';},
  d=>{d['data/project-summaries.json'].records[27].routeId='other-route';},
  d=>{d['data/material-summaries.json'].records[12].id='other-material';}
 ]){const d=structuredClone(actual);mutate(d);assert.throws(()=>applyReview(d,hku,{reverse:true}),/identity/);}
});

test('combined public-data comparison rejects unrelated edits, HKU source/status/unknown changes and historical deadline edits',()=>{
 for(const mutate of [
  d=>{d['data/catalog.json'].unreviewed='extra';},
  d=>{d['data/catalog.json'].advisors[9].unreviewed='extra';},
  d=>{d['data/catalog.json'].routes[33].applicationStatus='open';},
  d=>{d['data/catalog.json'].routes[33].sources[4].url='https://example.org/forged';},
  d=>{d['data/project-summaries.json'].sources[76].url='https://example.org/forged';},
  d=>{d['data/material-summaries.json'].records[12].requirements[3].requirementStatus='optional';},
  d=>{d['data/material-summaries.json'].records[12].unknowns[0]='all verified';},
  d=>{d['data/catalog.json'].deadlines.find(x=>x.routeIds?.includes('hku-ris-msc')).date='2027-01-05';},
  d=>{d['data/catalog.json'].deadlines.find(x=>x.routeIds?.includes('hku-ris-msc')).sources=[];},
  d=>{d['data/catalog.json'].deadlines.find(x=>x.routeIds?.includes('hku-ris-msc')).note='open';},
  d=>{d['data/advisor-profiles.json'].profiles[11].appointmentReview.earliestDate='2026-10-12';}
 ]){const d=structuredClone(actual);mutate(d);assert.throws(()=>assertReviewedPublicData(d,read),/reviewed public facts/);}
});
