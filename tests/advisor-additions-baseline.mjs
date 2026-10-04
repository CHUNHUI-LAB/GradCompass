import {hkuRisBaseline} from './hku-ris-baseline.mjs';
// Reconstruct the exact pre-2026-10-04 advisor/profile snapshot without
// weakening the newer application-experience inverse.
const additions=new Set(['hku-peng-lu','hku-hengshuang-zhao','cuhksz-xiaoqiang-ji','westlake-zexi-liang','westlake-wei-wang','westlake-chi-zhang','westlake-yaochu-jin','westlake-dixia-fan','westlake-shiyu-zhao']);
export function advisorAdditionsBaseline(data){
 const copy=hkuRisBaseline(data);
 if(Array.isArray(copy.advisors))copy.advisors=copy.advisors.filter(a=>!additions.has(a.id));
 if(Array.isArray(copy.profiles))copy.profiles=copy.profiles.filter(p=>!additions.has(p.advisorId));
 delete copy.batch8Review;
 return copy;
}
export const advisorAdditionsBaselineText=data=>JSON.stringify(advisorAdditionsBaseline(data),null,2)+'\n';
export function advisorAdditionsBaselineBytes(path,bytes){
 return ['catalog.json','advisor-profiles.json','material-summaries.json','project-summaries.json'].includes(path.split('/').at(-1))
  ?Buffer.from(advisorAdditionsBaselineText(JSON.parse(bytes))):bytes;
}
