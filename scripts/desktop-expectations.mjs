// Derive rendered card identities from the same public data rules as renderAdvisors.
// Cards are not degree-association counts: one person may have several cards,
// and people without verified opportunities retain a research-reference card.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {browseAdvisors,filterOpportunities} from '../assets/core.js';
export function expectedAdvisorCards(catalog){
 const people=browseAdvisors(catalog,{}),ids=new Set(people.map(a=>a.id));
 const records=filterOpportunities(catalog,{}).filter(o=>ids.has(o.advisorId));
 const references=people.filter(a=>!records.some(o=>o.advisorId===a.id));
 return [...records.map(o=>({advisorId:o.advisorId,opportunityId:o.id,reference:false})),
  ...references.map(a=>({advisorId:a.id,opportunityId:null,reference:true}))];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
 const catalog=read('data/catalog.json');catalog.raPositions=read('data/ra-positions.json').raPositions;
 console.log(JSON.stringify(expectedAdvisorCards(catalog)));
}
