import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {evidenceReviews} from './evidence-reviews.mjs';
import {isReviewedEvidenceUrl} from './reviewed-public-data.mjs';
const root = new URL('../',import.meta.url);
const raw = path => readFileSync(new URL(path,root));
const json = path => JSON.parse(raw(path));
const catalog = json('data/catalog.json');
const profiles = json('data/advisor-profiles.json');
const fixture = 'tests/fixtures/evidence/mainland-slam-advisors-20261124.json';
const ids = ['zju-li-liang','tongji-zhang-dedong','buaa-lin-jiarong','seu-qian-kun'];
const find = id => catalog.advisors.find(a=>a.id===id);

test('four exact public profiles join once; evidence receipt independently pins the appended values',()=>{
 const receipt = json(fixture);
 assert.equal(receipt.integrationBaseCommit,'60829a2cfdec349ae4ec74dc755060852e871353');
 assert.equal(evidenceReviews.find(r=>r.path===fixture).sha256,createHash('sha256').update(raw(fixture)).digest('hex'));
 assert.equal(receipt.operations.length,8);
 assert.deepEqual(receipt.operations.filter(o=>o.file==='data/catalog.json').map(o=>o.value.id),ids);
 for(const o of receipt.operations){
  const [key,index] = o.path.slice(1).split('/');
  assert.equal(o.operation,'add');
  assert.deepEqual(json(o.file)[key][index],o.value);
 }
 for (const id of ids) {
  assert.equal(catalog.advisors.filter(a=>a.id===id).length,1);
  assert.equal(profiles.profiles.filter(p=>p.advisorId===id).length,1);
 }
});

test('named official directories, institute rules and standing recruitment do not create verified 28Fall, offers or slots',()=>{
 for(const id of ids){const a=find(id);const p=profiles.profiles.find(p=>p.advisorId===id);
  assert.equal(a.defaultVisible,true);
  assert.equal(a.opening,'unknown');
  for(const k of ['fall2027OpeningVerified','fall2028OpeningVerified','intake2027OpeningVerified','intake2028OpeningVerified'])assert.equal(a[k],false);
  assert.equal(p.confirmedVacancy,false);
  assert.deepEqual(a.openingDetails,[]);
  assert.equal(a.routeAssociations.length,1);
  const link=a.routeAssociations[0],r=catalog.routes.find(r=>r.id===link.routeId);
  assert.equal(r.status,'reference');assert.equal(r.degree,'PhD');assert.equal(r.institution,a.institution);
  assert.equal(link.individualRecruitmentVerified,false);assert.equal(link.projectCycleVerified,false);
 }
 assert.match(find(ids[0]).openings.phd,/选研究所.*不在网报时选导师/);
 assert.match(find(ids[1]).openings.phd,/081600.*085704.*140400.*并非仅直博/);
 assert.match(find(ids[2]).openings.phd,/名额表均未见本人/);
 assert.match(find(ids[3]).openings.phd,/不分届.*不是个人当届确认/);
});

test('appointment evidence does not manufacture precise dates or infer starting a lab',()=>{
 const reviews=ids.map(id=>profiles.profiles.find(p=>p.advisorId===id).appointmentReview);
 assert.equal(reviews[0].status,'pending');assert.equal(reviews[0].earliestDate,null);
 assert.equal(reviews[1].precision,'year');
 assert.equal(reviews[2].earliestDate,'2025-05-29');
 assert.equal(reviews[3].earliestDate,'2010-01-01');
 for(const id of ids)assert.equal(find(id).newPi.verified,false);
});

 test('ZJU legacy public HTTP citations are limited to exact audited institutional URLs',()=>{
 const sources=json(fixture).officialEvidence.filter(s=>s.url.startsWith('http:'));
 assert.equal(sources.length,4);
 for(const source of sources){assert(isReviewedEvidenceUrl(source.url));assert(!isReviewedEvidenceUrl(new URL('/not-reviewed.htm',source.url).href));}
 });
