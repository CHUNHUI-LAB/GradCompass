import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {browseAdvisors,buildOpportunities,themesFor} from '../assets/core.js';
import {appointmentStatus,createAppointmentWindow} from '../assets/appointments.js';
import {renderProfile} from '../assets/profiles.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const pre=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-lzu-20261119.json'});
const post=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/sdu-robotics-supplement-20261127.json'});
const a=pre['data/catalog.json'],b=post['data/catalog.json'],p=pre['data/advisor-profiles.json'],q=post['data/advisor-profiles.json'];
const ids=['sdu-zhoufengyu','sdu-songyong'];
test('retain every existing public item and add exactly two SDU profiles',()=>{
 assert.equal(a.advisors.length,1548);assert.equal(b.advisors.length,1550);assert.equal(q.profiles.length,1550);
 assert.deepEqual(b,{...a,advisors:[...a.advisors,...b.advisors.slice(-2)]});
 assert.deepEqual(q,{...p,profiles:[...p.profiles,...q.profiles.slice(-2)]});
 assert.deepEqual(b.advisors.slice(-2).map(x=>x.id),ids);
 assert.deepEqual(q.profiles.slice(-2).map(x=>x.advisorId),ids);
});
test('lookup two distinct advisors, department and independently sourced team names',()=>{
 const win=createAppointmentWindow('2026-11-27');
 for(const [i,name,team,college,url] of [[0,'周风余','云基智能机器人实验室','控制科学与工程学院','cirobot.org/about/'],[1,'宋勇','低空智能控制与通信团队','低空科学与工程学院','ie.wh.sdu.edu.cn/szll.htm']]){
  const [advisor]=browseAdvisors(b,{query:'山东大学 '+name});
  assert.equal(advisor.id,ids[i]);assert(advisor.department.includes(college));
  const profile=q.profiles.find(x=>x.advisorId===advisor.id);
  assert.equal(profile.labSnapshot.name,team);assert(profile.labSnapshot.affiliation.sources.some(x=>x.url.includes(url)));
  assert.match(renderProfile(profile),new RegExp(team));assert.equal(appointmentStatus(profile,win),'earlier');
  assert(!themesFor(advisor).includes('恶劣环境感知'));
 }
});
test('doctoral supervisory reference does not change verified opportunities or 2028',()=>{
 const rail=post['data/ra-positions.json'].raPositions;
 for(const intake of ['known2028','fall2028_phd']) assert.deepEqual(browseAdvisors(b,{intake}),browseAdvisors(a,{intake}));
 assert.deepEqual(buildOpportunities({...b,raPositions:rail}),buildOpportunities({...a,raPositions:rail}));
 for(const x of b.advisors.slice(-2)){
  assert.equal(x.opening,'unknown'); assert.equal(x.eligibility,'pending'); assert.equal(x.fall2028OpeningVerified,false); assert.deepEqual(x.openingDetails,[]);
  assert.equal(x.routeAssociations[0].degree,'PhD'); assert.equal(x.routeAssociations[0].status,'reference');
  assert.equal(x.routeAssociations[0].individualRecruitmentVerified,false); assert.equal(x.routeAssociations[0].projectCycleVerified,false);
 }
});
