import {maintenanceBaseline} from './maintenance-baseline.mjs';
// Reconstruct only the explicitly superseded fields for historical release assertions.
// A frozen whole-catalog hash verifies this inverse and every unaffected record.
export function recruitmentBaseline(catalog){
 const result=maintenanceBaseline(catalog);
 const additions=new Set(['hkustgz-fangqiang-ding','hkustgz-yan-li']);
 result.advisors=result.advisors.filter(a=>!additions.has(a.id));
 for(const id of ['westlake-donglin-wang','cuhksz-tinlun-lam']){
  const advisor=result.advisors.find(a=>a.id===id);
  Object.assign(advisor,advisor.recruitmentReview.previous);
  delete advisor.recruitmentReview;
 }
 return result;
}
export const recruitmentBaselineText=catalog=>JSON.stringify(recruitmentBaseline(catalog),null,2)+'\n';
