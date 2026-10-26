import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browseAdvisors,browseRoutes,buildOpportunities} from '../assets/core.js';
import {appointmentStatus} from '../assets/appointments.js';
import {assertReviewedPublicData,reviewedPublicData} from './reviewed-public-data.mjs';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(raw(p));
const c=json('data/catalog.json'),p=json('data/advisor-profiles.json');
const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/rescreen-20261026.json'});
const prior=before['data/catalog.json'],priorP=before['data/advisor-profiles.json'];
const audit=json('audits/robotics-scope-correction-20261026.json'),receipt=json('tests/fixtures/evidence/robotics-scope-correction-20261026.json');
const ids=['pku-yang-ling','pku-he-guannan','polyu-li-xinfeng','seu-chen-duxin','ustc-zeng-jinzhe'];
const orphan='pku-doctoral-recruitment-reference-20261026';

test('only the five reviewed candidates and their orphan route leave the live corpus; every retained record and original order remains exact',()=>{
 assert.deepEqual(c,{...prior,advisors:prior.advisors.filter(a=>!ids.includes(a.id)),routes:prior.routes.filter(r=>r.id!==orphan)});
 assert.deepEqual(p,{...priorP,profiles:priorP.profiles.filter(p=>!ids.includes(p.advisorId))});
 assert.deepEqual(c.advisors.slice(492).map(a=>a.id),['sjtu-xia-zeyang']);
 const routes=new Set(c.routes.map(r=>r.id));for(const a of c.advisors)for(const id of a.routeIds)assert(routes.has(id));
 for(const id of ids){assert(!browseAdvisors(c).some(a=>a.id===id));assert(!browseAdvisors(c,{opportunityType:'PhD'}).some(a=>a.id===id));}
 assert(!browseRoutes(c).some(r=>r.id===orphan));
});

test('two cross-direction candidates and three out-of-scope records preserve their sources, recruitment and appointment evidence outside the robotics main directory',()=>{
 assert.equal(audit.candidates.length,5);assert.deepEqual(new Set(audit.candidates.map(a=>a.advisorId)),new Set(ids));
 assert.deepEqual(audit.candidates.filter(a=>a.classification==='cross_direction_candidate').map(a=>a.advisorId),['pku-yang-ling','polyu-li-xinfeng']);
 assert.equal(audit.candidates.filter(a=>a.classification==='outside_robotics_scope_on_current_evidence').length,3);
 for(const candidate of audit.candidates){assert.equal(candidate.listedInRoboticsMainDirectory,false);assert.equal(candidate.classificationIsEditorialInference,true);assert(candidate.reasonZh&&candidate.sources.length);assert.deepEqual(candidate.originalAdvisorRecord,prior.advisors.find(a=>a.id===candidate.advisorId));assert.deepEqual(candidate.originalProfileRecord,priorP.profiles.find(p=>p.advisorId===candidate.advisorId));}
 assert(audit.candidates.filter(a=>a.classification==='cross_direction_candidate').every(a=>a.originalAdvisorRecord.fall2028OpeningVerified));
 assert.match(audit.candidates.find(a=>a.advisorId==='pku-he-guannan').reasonZh,/学院.*机器人.*不作为/);
 assert.match(audit.candidates.find(a=>a.advisorId==='ustc-zeng-jinzhe').reasonZh,/计算化学智能体不直接等于/);
 assert.match(audit.scopeZh,/未对原492位.*全量/);assert.equal(audit.sourceLedger.length,6);
});

test('live counts exclude candidates without changing verified opportunities, recruitment cycles or retained appointment evidence',()=>{
 assert.equal(c.advisors.length,493);assert.equal(p.profiles.length,493);assert.equal(c.routes.length,93);assert.equal(browseAdvisors(c,{opportunityType:'PhD'}).length,490);
 const ops=buildOpportunities({...c,raPositions:json('data/ra-positions.json').raPositions});assert.equal(ops.filter(o=>o.kind==='degree').length,57);assert.equal(ops.filter(o=>o.kind==='employment').length,2);
 assert.deepEqual(c.advisors.filter(a=>a.intake2028OpeningVerified).map(a=>a.id),['tongji-fan-rui','sjtu-xia-zeyang']);assert(!c.advisors.some(a=>a.fall2028OpeningVerified));
 const counts={};for(const row of p.profiles){let k=appointmentStatus(row);counts[k]=(counts[k]||0)+1;}assert.deepEqual(counts,{earlier:132,recent:95,unknown:256,boundary:10});
});

test('each removal is independently pinned and reversible; unreviewed restoration or fabricated Fall labels still fail the full live-data guard',()=>{
 assert.equal(receipt.operations.length,11);assert(receipt.operations.every(o=>o.operation==='remove'));
 const restored={'data/catalog.json':structuredClone(c),'data/advisor-profiles.json':structuredClone(p)};
 for(const op of [...receipt.operations].reverse()){const [array,index]=op.path.slice(1).split('/');assert(+index<=restored[op.file][array].length);restored[op.file][array].splice(+index,0,structuredClone(op.old));}
 assert.deepEqual(restored['data/catalog.json'],prior);assert.deepEqual(restored['data/advisor-profiles.json'],priorP);
 const all=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(n=>n.endsWith('.json')).map(n=>['data/'+n,json('data/'+n)]));assertReviewedPublicData(all,raw);
 const changed=structuredClone(all);changed['data/catalog.json'].advisors.push(structuredClone(audit.candidates[0].originalAdvisorRecord));assert.throws(()=>assertReviewedPublicData(changed,raw));
 const fake=structuredClone(all);fake['data/catalog.json'].advisors.find(a=>a.id==='sjtu-xia-zeyang').fall2028OpeningVerified=true;assert.throws(()=>assertReviewedPublicData(fake,raw));
 assert.equal(crypto.createHash('sha256').update(raw('tests/fixtures/evidence/rescreen-20261026.json')).digest('hex'),'6b8c201aa8af1def60dc976ad8edbac7c670b5d9b44f7ebae30f6eabdb1da333');
});
