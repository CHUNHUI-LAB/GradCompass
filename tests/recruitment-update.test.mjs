import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {buildOpportunities,filterOpportunities,isVerifiedRoute,rankOf,safeUrl} from '../assets/core.js';
import {profileMap,renderProfile,renderProfileReferences} from '../assets/profiles.js';
import {recruitmentBaseline,recruitmentBaselineText} from './recruitment-baseline.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),parse=p=>JSON.parse(read(p)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const catalog=parse('data/catalog.json'),profiles=parse('data/advisor-profiles.json'),data={...catalog,raPositions:parse('data/ra-positions.json').raPositions};
const ids=['hkustgz-fangqiang-ding','hkustgz-yan-li'],corrected=['westlake-donglin-wang','cuhksz-tinlun-lam'];
const advisor=id=>catalog.advisors.find(a=>a.id===id),profile=id=>profiles.profiles.find(p=>p.advisorId===id);
test('recruitment update preserves the entire old catalog outside two explicit corrections and two additions',()=>{
 assert.equal(hash(recruitmentBaselineText(catalog)),'045a3a5886d50a2cca8b294ee34936522d77590a0a76f0c4b3e94252654f9d1a');
 assert.deepEqual(catalog.advisors.slice(32).map(a=>a.id),ids);
 assert.equal(hash(JSON.stringify(catalog.advisors.slice(0,32).map(a=>a.sourceRecord??null))),'7e94314267698f5dffffaa0fabd219ea77f98fe5b7fada728d7ef5dac6ee8a9a');
 const base=recruitmentBaseline(catalog);assert.deepEqual(catalog.routes,base.routes);
 for(const id of corrected){const a=advisor(id),b=base.advisors.find(a=>a.id===id);for(const key of ['routeIds','routeAssociations','eligibility','defaultVisible','newPi','appointment','sourceRecord','checkedDate'])assert.deepEqual(a[key],b[key]);}
 assert.equal(hash(read('data/ra-positions.json')),'b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e');
});
test('new records produce exactly two PhD-only rows and complete rich coverage with no new RA or masters rows',()=>{
 const rows=buildOpportunities(data);assert.equal(rows.length,48);assert.equal(new Set(rows.map(o=>o.advisorId)).size,32);assert.equal(rows.filter(o=>o.type==='RA').length,2);assert.equal(catalog.routes.filter(isVerifiedRoute).length,27);
 assert.deepEqual(rows.filter(o=>ids.includes(o.advisorId)).map(o=>[o.advisorId,o.type]).sort(),ids.map(id=>[id,'PhD']).sort());
 assert.deepEqual([...profileMap(profiles,catalog.advisors).keys()].sort(),[...new Set(rows.map(o=>o.advisorId))].sort());
 for(const id of ids){const a=advisor(id);assert.equal(a.routeIds.length,1);assert.equal(a.routeAssociations[0].degree,'PhD');assert.equal(a.routeAssociations[0].status,'verified');const r=catalog.routes.find(r=>r.id===a.routeIds[0]);assert(isVerifiedRoute(r));assert.equal(rankOf(a),'assistant');for(const d of ['MPhil','MSc','RA'])assert(!filterOpportunities(data,{query:a.name,opportunityType:d}).some(o=>o.advisorId===id));}
});
test('two primary recruitment corrections remain term-specific announcements without headcount promises',()=>{
 for(const id of corrected){const a=advisor(id);assert.equal(a.opening,'explicit');assert.equal(a.fall2027OpeningVerified,false);assert.equal(a.recruitmentReview.confirmedVacancy,false);assert.equal(a.recruitmentReview.remainingHeadcountVerified,false);for(const degree of ['PhD','RA']){const d=a.openingDetails.find(d=>d.degree===degree);assert.equal(d.status,'explicit');assert.equal(d.cycle2027FallVerified,false);assert.equal(d.noticeDate,null);assert.equal(d.checkedDate,'2026-10-02');}}
 const w=advisor(corrected[0]),l=advisor(corrected[1]);assert.match(w.openingDetails.find(d=>d.degree==='PhD').summary,/2027.*Fall.*January 2021/);assert.match(l.openingDetails.find(d=>d.degree==='RA').summary,/学历|学位/);assert.match(l.caveats.join(' '),/旧SSE.*不改写.*SAI/);
 for(const id of ['hkust-yajing-shen','polyu_david_navarro','hku-chen-sun'])assert.deepEqual(advisor(id),recruitmentBaseline(catalog).advisors.find(a=>a.id===id));
});
test('new PhD cycle evidence never becomes a seat, funding, RA eligibility or cross-degree assurance',()=>{
 for(const id of ids){const a=advisor(id),phd=a.openingDetails.find(d=>d.degree==='PhD');assert.equal(a.fall2027OpeningVerified,true);assert.equal(phd.cycle,'Spring/Fall 2027');assert.equal(phd.cycle2027FallVerified,true);assert.equal(a.confirmedVacancy,false);assert.equal(a.remainingHeadcountVerified,false);assert.equal(phd.noticeDate,null);assert.equal(a.checkedDate,'2026-10-02');for(const d of a.openingDetails){assert.equal(d.checkedDate,'2026-10-02');assert(d.sources.length);assert.equal(d.remainingHeadcountVerified,false);for(const s of d.sources){assert.equal(s.checkedDate,'2026-10-02');assert(safeUrl(s.url));}if(d.degree!=='PhD')assert.equal(d.cycle2027FallVerified,false);}assert.match(a.eligibilityMeaning,/普通在线申请.*无统一硕士或推免/);}
 assert.equal(advisor(ids[0]).newPi.verified,true);assert.equal(advisor(ids[0]).newPi.dateMeaning,'joining_announcement_date');assert.equal(advisor(ids[1]).newPi.verified,false);assert.equal(advisor(ids[1]).newPi.date,null);assert.match(advisor(ids[1]).openings.mphil,/Fall 2026.*Fall 2027/);
});
test('each new rich profile has meaningful sourced biography, lab resources, two exact papers and rendered caveats',()=>{
 for(const id of ids){const p=profile(id);assert(p.cardSummaryZh.length>25);assert.equal(p.checkedDate,'2026-10-02');assert.equal(p.confirmedVacancy,false);assert.equal(p.representativeWorks.length,2);assert(p.labSnapshot.themes.length>=3);assert(p.labSnapshot.resources.length);assert(p.unknowns.length>=4);for(const f of [p.overview,p.labSnapshot.affiliation,p.labSnapshot.structure,...p.labSnapshot.resources,p.recruitment,...p.representativeWorks]){assert(f.textZh||f.summaryZh);assert(f.sources.length);for(const s of f.sources){assert.equal(s.checkedDate,'2026-10-02');assert(safeUrl(s.url));}}const html=renderProfile(p)+renderProfileReferences(p);for(const text of ['个人职业概况','实验室与研究资源','近期代表成果','资源分配保证','简介参考与待确认信息'])assert(html.includes(text));for(const text of ['undefined','[object Object]','专业简介待补充'])assert(!html.includes(text));assert.match(html,/余位|席位|名额/);}
 assert.equal(profile(ids[0]).representativeWorks[0].title,'RadarOcc: Robust 3D Occupancy Prediction with 4D Imaging Radar');assert.equal(profile(ids[1]).representativeWorks[0].venue,'ICCV 2025');assert.equal(profile(ids[1]).representativeWorks[1].venue,'ECCV 2024');assert.match(profile(ids[1]).unknowns.join(' '),/Yanyan Li.*Scholar ID/);
});
test('new review metadata describes current bytes while old review dates and hashes stay historical',()=>{
 const m=parse('data/catalog-test-manifest.json');assert.equal(m.currentRecruitmentReview.catalogSha256,hash(read('data/catalog.json')));assert.equal(m.currentIdentityReview.catalogSha256,hash(recruitmentBaselineText(catalog)));assert.equal(m.currentRecruitmentReview.baseCommit,'5fbd6408e9a777d6ea990c6eb161aa323820a28b');assert.deepEqual(profiles.profiles.slice(30).map(p=>p.advisorId),ids);assert.equal(profiles.batch7Review.preservedProfiles,30);assert.equal(profiles.batch7Review.integrationBaseCommit,'4324f8955e1d718288260aecff0c04ffb10f3be0');assert.equal(m.currentRecruitmentReview.integrationBaseCommit,'4324f8955e1d718288260aecff0c04ffb10f3be0');assert.equal(hash(JSON.stringify(profiles.profiles.slice(0,30))),'1e8619117cd037bcf91aca849f37ec6307eb8eeb7c1791baa216b9dd274906a2');
 assert.equal(parse('data/update-status.json').lastSuccessfulCheck,null);
});
