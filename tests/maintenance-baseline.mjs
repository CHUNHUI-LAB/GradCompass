import {experienceBatchBaseline} from './experience-batch-20261004-baseline.mjs';
// Reconstruct the exact pre-2026-10-03 ordinary-date snapshot from retained history.
// The full baseline hashes in existing tests continue to lock all unrelated content.
export function maintenanceBaseline(data){
 const copy=experienceBatchBaseline(data);
 // Remove only the two reviewed 2026-10-03 additions for historical snapshot assertions.
 const additions=['grad-scut-fengyt-redbird-2023','grad-benjamin-hkustgz-research-2026'];
 if(copy.records?.some(r=>additions.includes(r.id))){
  copy.records=copy.records.filter(r=>!additions.includes(r.id));
  if(copy.checkedAt)copy.checkedAt='2026-10-02';
  if(copy.latestBatchBaseCommit){copy.latestBatchBaseCommit='1765e09516a7ea541454b069e7a579adb5226b03';copy.latestBatchReviewDate='2026-10-02';}
 }
 for(const key of ['routes','deadlines','records'])for(const r of copy[key]||[]){
  const review=r.cycleReview;if(review?.reviewId!=='cityu-ordinary-cycle-20261003')continue;
  for(const field of review.addedFields||[])delete r[field];
  Object.assign(r,review.previous);
  if(review.history?.length)r.cycleReview=review.history[0];else delete r.cycleReview;
 }
 if(copy.sources)copy.sources=copy.sources.filter(s=>!['city_review_steps_20261003','city_steps_20261003'].includes(s.id));
 return copy;
}
