// Undo only the four source IDs, one route, one summary/material and two dates
// introduced by the October 4 RIS batch. Unknown future rows remain detectable.
export const risRouteId='hku-ris-msc';
export const risSourceIds=Object.freeze(['programme','application','requirements','procedures'].map(k=>'hku_ris_20261004_'+k));
export function hkuRisBaseline(data){
 const copy=structuredClone(data);
 if(Array.isArray(copy.routes))copy.routes=copy.routes.filter(r=>r.id!==risRouteId);
 if(Array.isArray(copy.deadlines))copy.deadlines=copy.deadlines.filter(r=>!['hku-ris-msc-2027-main','hku-ris-msc-2027-clearing'].includes(r.id));
 if(Array.isArray(copy.records))copy.records=copy.records.filter(r=>r.routeId!==risRouteId&&r.id!=='hku-ris-msc-materials');
 if(Array.isArray(copy.sources))copy.sources=copy.sources.filter(s=>!risSourceIds.includes(s.id));
 return copy;
}
