import {safeUrl,isBrowsableRoute} from './core.js?v=02f70bc5cff4';
const statuses=new Set(['required','conditional','published','not_specified','unknown','optional','required_count_unknown','required_for_hkpfs','published_school_only']);
export function normalizeMaterialSupplement(data,catalog){
 if(data?.schemaVersion!==1||!Array.isArray(data.records)||!Array.isArray(data.sources))throw Error('Invalid material supplement');
 const sources=new Map();
 for(const source of data.sources){if(!source?.id||sources.has(source.id)||!source.label||!safeUrl(source.url)||!source.url.startsWith('https://')||!source.checkedDate)throw Error('Invalid material source');sources.set(source.id,source);}
 const ids=new Set((catalog.materials||[]).map(m=>m.id));
 return data.records.filter(record=>{
  if(!record?.id||ids.has(record.id)||record.status!=='verified'||record.opportunityType==='RA'||record.jobIds?.length||!Array.isArray(record.routeIds)||!record.routeIds.length||!record.routeIds.every(id=>{const r=catalog.routes.find(r=>r.id===id);return r&&isBrowsableRoute(r)&&r.institution===record.institution}))return false;
  if(!['title','institution','summary','checkedDate'].every(key=>typeof record[key]==='string'&&record[key].trim()))return false;
  if(!Array.isArray(record.sourceIds)||!record.sourceIds.length||!record.sourceIds.every(id=>sources.has(id))||!Array.isArray(record.requirements)||!record.requirements.length)return false;
  if(!record.requirements.every(r=>typeof r.text==='string'&&r.text.trim()&&statuses.has(r.requirementStatus)&&Array.isArray(r.sourceIds)&&r.sourceIds.length&&r.sourceIds.every(id=>sources.has(id))))return false;
  ids.add(record.id);return true;
 }).map(record=>({...record,sources:record.sourceIds.map(id=>sources.get(id)),requirements:record.requirements.map(r=>({...r,sources:r.sourceIds.map(id=>sources.get(id))}))}));
}
