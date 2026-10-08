// Semantic evidence receipts are independent of historical byte snapshots.
// Formatting changes are allowed; a fact change needs its own reviewed receipt.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {publishedBytes,publishedPaths,publishedCommit} from './published-history-fs.mjs';
import {evidenceReviews} from './evidence-reviews.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function reviewedPublicData(read){
 const expected=Object.fromEntries(publishedPaths.filter(p=>p.startsWith('data/')&&p.endsWith('.json')).map(p=>[p,JSON.parse(publishedBytes(p))]));
 for(const receipt of evidenceReviews){
  const raw=read(receipt.path);assert.equal(hash(raw),receipt.sha256,'unreviewed evidence receipt');
  const review=JSON.parse(raw);assert.equal(review.schemaVersion,1);assert.equal(review.baseCommit,publishedCommit);assert.match(review.reviewDate,/^\d{4}-\d{2}-\d{2}$/);
  assert(review.scope&&review.officialEvidence.length&&review.operations.length);
  for(const source of review.officialEvidence){assert.equal(new URL(source.url).protocol,'https:');assert(source.title&&source.section,'source must identify title and read scope');}
  for(const op of review.operations){
   assert(/^data\/[a-z0-9-]+\.json$/.test(op.file),'bounded public-data path');assert(['add','replace','remove'].includes(op.operation));
   assert(op.path.startsWith('/'));const keys=op.path.slice(1).split('/').map(k=>k.replaceAll('~1','/').replaceAll('~0','~'));
   assert(keys.every(k=>!['__proto__','constructor','prototype'].includes(k)),'safe evidence path');
   let owner=expected[op.file];assert(owner,'known public dataset');for(const key of keys.slice(0,-1)){assert(Object.hasOwn(owner,key),'existing review parent');owner=owner[key];}
   const key=keys.at(-1);
   if(op.operation==='add'){assert(!Object.hasOwn(owner,key),'addition cannot overwrite a known fact');if(Array.isArray(owner))assert.equal(Number(key),owner.length,'append-only reviewed record addition');owner[key]=structuredClone(op.value);}
   else{assert(Object.hasOwn(owner,key));assert.deepEqual(owner[key],op.old,'review before value must match history');if(op.operation==='remove'){if(Array.isArray(owner))owner.splice(Number(key),1);else delete owner[key];}else owner[key]=structuredClone(op.value);}
  }
 }
 return expected;
}
export function assertReviewedPublicData(actual,read){
 const expected=reviewedPublicData(read);assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),'every public dataset must be reviewed');
 for(const name of Object.keys(expected))assert.deepEqual(actual[name],expected[name],name+' differs from independently reviewed public facts');
 return expected;
}
