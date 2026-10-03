// Reconstruct the exact pre-2026-10-03 ordinary-date snapshot from retained history.
// The full baseline hashes in existing tests continue to lock all unrelated content.
export function maintenanceBaseline(data){
 const copy=structuredClone(data);
 for(const key of ['routes','deadlines','records'])for(const r of copy[key]||[]){
  const review=r.cycleReview;if(review?.reviewId!=='cityu-ordinary-cycle-20261003')continue;
  for(const field of review.addedFields||[])delete r[field];
  Object.assign(r,review.previous);
  if(review.history?.length)r.cycleReview=review.history[0];else delete r.cycleReview;
 }
 if(copy.sources)copy.sources=copy.sources.filter(s=>!['city_review_steps_20261003','city_steps_20261003'].includes(s.id));
 return copy;
}
