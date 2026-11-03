import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewedPublicData,assertReviewedPublicData} from './reviewed-public-data.mjs';
import {buildOpportunities,browseAdvisors} from '../assets/core.js';
import {renderProfile,renderProfileReferences} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(raw(p));
const c=json('data/catalog.json'),p=json('data/advisor-profiles.json'),receipt=json('tests/fixtures/evidence/advisor-followup-20261103.json');
const old=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/phd-application-dates-2027-20261026.json'});
test('bounded three-person follow-up retains all unrelated records and adds no verified openings',()=>{
 assert.equal(c.advisors.length,494);assert.equal(p.profiles.length,494);assert.equal(c.routes.length,93);assert.equal(receipt.operations.length,4);
 for(let i=0;i<493;i++)if(c.advisors[i].id!=='tongji-xu-yang'){assert.deepEqual(c.advisors[i],old['data/catalog.json'].advisors[i]);}
 for(let i=0;i<493;i++)if(p.profiles[i].advisorId!=='tongji-xu-yang')assert.deepEqual(p.profiles[i],old['data/advisor-profiles.json'].profiles[i]);
 assert.deepEqual(c.routes,old['data/catalog.json'].routes);assert.deepEqual(c.deadlines,old['data/catalog.json'].deadlines);
 assert.equal(buildOpportunities({...c,raPositions:json('data/ra-positions.json').raPositions}).length,59);
 const a=c.advisors.at(-1);assert.equal(a.id,'sjtu-chen-feifei');assert(!JSON.stringify(a).includes('xiazeyang'));assert.equal(a.opening,'unknown');assert.equal(a.fall2028OpeningVerified,false);assert.match(a.openings.phd,/2027.*已满/);assert.equal(a.newPi.verified,false);assert.match(a.summary,/2018.*2026.*晋升/);
 const html=renderProfile(p.profiles.at(-1))+renderProfileReferences(p.profiles.at(-1));assert.match(p.profiles.at(-1).recruitment.textZh,/2027.*已满/);assert(!/undefined|\[object Object\]/.test(html));
});
test('cross-direction candidate remains outside robotics main list and Xu Yang keeps both current sources',()=>{
 const au=json('audits/advisor-followup-20261103.json');assert.equal(au.candidates[0].listedInRoboticsMainDirectory,false);assert(!browseAdvisors(c).some(a=>a.id==='hnu-xu-jinfeng'));
 const a=c.advisors.find(a=>a.id==='tongji-xu-yang');assert.match(a.openingSummary,/仍明确.*2027/);assert.match(a.openingSummary,/长期普博/);assert.equal(a.fall2028OpeningVerified,false);assert.equal(a.openingDetails[0].sourceCycle,'2027');assert(a.sources.some(s=>s.url.includes('faculty.tongji')));assert(a.sources.some(s=>s.url.includes('robot.tongji')));
});
test('all live facts still require pinned evidence, including full/2028 confusion',()=>{
 const all=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(n=>n.endsWith('.json')).map(n=>['data/'+n,json('data/'+n)]));assertReviewedPublicData(all,raw);
 for(const mutate of [a=>a.fall2028OpeningVerified=true,a=>a.opening='explicit',a=>a.openings.phd='2028有名额']){let copy=structuredClone(all);mutate(copy['data/catalog.json'].advisors.at(-1));assert.throws(()=>assertReviewedPublicData(copy,raw));}
});
