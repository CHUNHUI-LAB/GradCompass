import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyReviewedOperations,reviewedPublicData,assertReviewedPublicData} from './reviewed-public-data.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const initial=()=>({'data/catalog.json':{institutions:[],advisors:[],routes:[]},'data/advisor-profiles.json':{profiles:[]}});
const addition=(file,path,value)=>({file,path,operation:'add',value});
const school=(id,n)=>[
 addition('data/catalog.json',`/institutions/${n}`,{id}),
 addition('data/catalog.json',`/advisors/${n}`,{id:`${id}-person`,institution:id,routeIds:[],opening:'unknown'}),
 addition('data/advisor-profiles.json',`/profiles/${n}`,{advisorId:`${id}-person`})
];
test('sequential school receipts append institutions, advisors and profiles without changing previous stages',()=>{
 const state=initial();applyReviewedOperations(state,school('first',0));const first=structuredClone(state);
 applyReviewedOperations(state,school('second',1));
 for(const [file,key]of [['data/catalog.json','institutions'],['data/catalog.json','advisors'],['data/advisor-profiles.json','profiles']]){
  assert.equal(state[file][key].length,2);assert.deepEqual(state[file][key].slice(0,1),first[file][key]);
 }
 assert.deepEqual(state['data/catalog.json'].routes,[]);
});
test('replay rejects overwritten additions, gaps, ambiguous indices, unsafe paths and mismatched old values',()=>{
 for(const path of ['/advisors/1','/advisors/01','/advisors/-1','/advisors/-','/advisors/length','/advisors/__proto__','/constructor/prototype','/advisors/~2']){
  assert.throws(()=>applyReviewedOperations(initial(),[addition('data/catalog.json',path,{id:'bad'})]),path);
 }
 const state=initial();applyReviewedOperations(state,school('first',0));
 assert.throws(()=>applyReviewedOperations(structuredClone(state),school('replacement',0)),/overwrite/);
 assert.throws(()=>applyReviewedOperations(structuredClone(state),[{file:'data/catalog.json',path:'/advisors/0',operation:'replace',old:{id:'wrong'},value:{id:'new'}}]),/before value/);
 assert.throws(()=>applyReviewedOperations(initial(),[addition('data/unknown.json','/advisors/0',{})]),/known public dataset/);
});
test('dated stage stays exact while every current public dataset and receipt remains independently pinned',()=>{
 const before=reviewedPublicData(read,{throughReceipt:'tests/fixtures/evidence/phd-application-dates-2027-20261026.json'});
 const after=reviewedPublicData(read,{throughReceipt:'tests/fixtures/evidence/advisor-followup-20261103.json'});
 assert.equal(before['data/catalog.json'].advisors.length,493);assert.equal(after['data/catalog.json'].advisors.length,494);
 assert.equal(after['data/catalog.json'].advisors.at(-1).id,'sjtu-chen-feifei');
 const actual=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(n=>n.endsWith('.json')).map(n=>['data/'+n,JSON.parse(read('data/'+n))]));
 assertReviewedPublicData(actual,read);
 for(const [file,key]of [['data/catalog.json','institutions'],['data/catalog.json','advisors'],['data/advisor-profiles.json','profiles']]){
  const changed=structuredClone(actual);(changed[file][key]??=[]).push({id:'unreviewed',advisorId:'unreviewed'});assert.throws(()=>assertReviewedPublicData(changed,read),/reviewed public facts/);
 }
 assert.throws(()=>reviewedPublicData(p=>p.endsWith('advisor-followup-20261103.json')?Buffer.concat([read(p),Buffer.from(' ')]):read(p)),/unreviewed evidence receipt/);
 assert.throws(()=>reviewedPublicData(read,{throughReceipt:'unregistered'}),/registered/);
});
