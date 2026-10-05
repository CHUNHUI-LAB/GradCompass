import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browseAdvisors,browseRoutes,isBrowsableRoute,hasVerifiedAssociation,buildOpportunities,routeEvidenceText,filterDeadlines} from '../assets/core.js';
import {renderRecordSummary,normalizeProjectSummaries} from '../assets/record-summaries.js';
import {selectProjectComparisonRoutes,renderProjectComparison} from '../assets/project-comparison.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const catalog=read('data/catalog.json');catalog.raPositions=read('data/ra-positions.json').raPositions;
const source={url:'https://example.edu/admission',label:'Synthetic official source'};
const route={id:'synthetic-phd',degree:'PhD',institution:'Example',status:'verified',bachelorEligible:false,noMasterRequired:false,noTuimianRequired:false,admissionMode:'recommendation_exemption',sources:[source],eligibilitySummary:'Requires specified prior qualification'};
const advisor={id:'synthetic-person',name:'Synthetic Person',institution:'Example',eligibility:'unknown',defaultVisible:false,routeIds:[route.id],routeAssociations:[{routeId:route.id,status:'verified',verificationStatus:'verified',sources:[source]}]};
const synthetic={metadata:{checkedDate:'2026-10-04'},advisors:[advisor],routes:[route],deadlines:[],materials:[]};

test('public discovery retains every recorded advisor and academic route without changing source data',()=>{
 const before=JSON.stringify(catalog);
 assert.equal(catalog.advisors.length,334);
 assert.deepEqual(new Set(browseAdvisors(catalog).map(a=>a.id)),new Set(catalog.advisors.map(a=>a.id)));
 assert.deepEqual(new Set(browseRoutes(catalog).map(r=>r.id)),new Set(catalog.routes.filter(isBrowsableRoute).map(r=>r.id)));
 for(const id of ['cuhk_zhongyu_li','xjtlu-yaran-chen'])assert(browseAdvisors(catalog).some(a=>a.id===id),id);
 assert.equal(JSON.stringify(catalog),before);
});
test('personal prior degree and recommendation conditions do not hide research records or independently verified associations',()=>{
 assert.equal(browseAdvisors(synthetic).length,1);assert.equal(browseRoutes(synthetic).length,1);
 assert.equal(browseAdvisors(synthetic,{opportunityType:'PhD'}).length,1);
 assert(hasVerifiedAssociation(advisor,route));assert.equal(buildOpportunities(synthetic).length,1);
 const h=renderRecordSummary('project',route,synthetic).html;
 for(const text of ['推荐免试','硕士前置','Requires specified prior qualification'])assert(h.includes(text),text);
 assert(!h.includes('普通申请流程未将内地推免列为条件'));
});
test('a verified programme cannot confer verification on missing, pending, source-free, or conflicting personal associations',()=>{
 for(const associations of [[],[{routeId:route.id,status:'unknown',sources:[source]}],[{routeId:route.id,status:'verified',verificationStatus:'pending',sources:[source]}],[{routeId:route.id,status:'verified',sources:[]}],[{routeId:route.id,status:'verified',scope:'program_reference_only',sources:[source]}]]){
  const a={...advisor,routeAssociations:associations};assert(!hasVerifiedAssociation(a,route));
  assert.equal(buildOpportunities({...synthetic,advisors:[a]}).length,0);assert.equal(browseAdvisors({...synthetic,advisors:[a]}).length,1);
 }
});
test('reference, excluded and pending records remain readable and comparable but never create confirmed associations',()=>{
 for(const status of ['reference','pending','unknown','excluded']){
  const r={...route,status,sourceCycle:2025,currentCycleVerificationStatus:'pending'};
  const c={...synthetic,routes:[r]};assert.equal(browseRoutes(c).length,1);assert.equal(buildOpportunities(c).length,0);
  const html=renderRecordSummary('project',r,c).html;assert(html.includes('来源周期：2025'));assert(html.includes('当期招生仍待核'));
  assert.equal(selectProjectComparisonRoutes(c,[r.id]).length,1);
 }
 const c={...synthetic,routes:[route,{...route,id:'reference',status:'reference',sourceCycle:2025}]};
 const h=renderProjectComparison(c,[route.id,'reference']);assert(h.includes('历史或项目参考'));assert(h.includes('来源周期：2025'));
});
test('public scope does not infer admission methods from names or copy a doctoral opening into a masters filter',()=>{
 const r={...route,program:'普通统考 MSc 名称仅是文本',admissionMode:undefined};assert(!routeEvidenceText(r).includes('统考'));
 const a={...advisor,opening:'explicit',openingDetails:[{degree:'PhD',status:'explicit'},{degree:'MPhil',status:'unknown'}],routeIds:[route.id,'m']};
 const c={...synthetic,advisors:[a],routes:[route,{...route,id:'m',degree:'MPhil',status:'reference'}]};
 assert.equal(browseAdvisors(c,{opportunityType:'MPhil',opening:'explicit'}).length,0);assert.equal(browseAdvisors(c,{opportunityType:'PhD',opening:'explicit'}).length,1);
});
test('reference project dates stay linked and RA/employment impostors cannot enter project browsing',()=>{
 const c={...synthetic,routes:[{...route,status:'reference'}],deadlines:[{id:'old',routeIds:[route.id],date:'2025-01-01',institution:'Example'}]};
 assert.equal(filterDeadlines(c).length,1);
 for(const r of [{...route,degree:'RA'},{...route,opportunityType:'RA'},{...route,kind:'employment'},{...route,jobId:'job'},{...route,jobIds:['job']}])assert(!isBrowsableRoute(r));
});
test('current application only generates exact sourced joins and does not mistake them for remaining places',()=>{
 const rows=buildOpportunities(catalog);
 for(const o of rows.filter(o=>o.kind==='degree')){
  const a=catalog.advisors.find(a=>a.id===o.advisorId),r=catalog.routes.find(r=>r.id===o.routeId);
  assert(hasVerifiedAssociation(a,r),o.id);assert.equal(o.confirmedVacancy,undefined);assert.equal(o.remainingHeadcountVerified,undefined);
 }
 assert.equal(rows.filter(o=>o.kind==='employment').length,2);
});
test('absent recruitment evidence is pending and sourced MRes associations use the same degree contract',()=>{
 assert.equal(browseAdvisors(synthetic,{opening:'unknown'}).length,1);
 const r={...route,degree:'MRes'},c={...synthetic,routes:[r]};assert(hasVerifiedAssociation(advisor,r));assert.equal(buildOpportunities(c)[0].type,'MRes');
});
test('five corrected official source identities retain old labels only as audit history',()=>{
 const identities=[['a5f6fe53','2026',null,'PhD'],['6eb54d2d','2025','national_exam','MSc'],['67cb3fbf','2025','recommendation_exemption','MSc'],['532cc','2022',null,'PhD'],['f1b3cfe9','2026',null,'PhD']];
 assert.equal(catalog.sourceCorrections.length>=5,true);
 for(const [fragment,cycle,mode,degree] of identities){
  const correction=catalog.sourceCorrections.find(x=>x.url?.includes(fragment));assert(correction,fragment);
  assert.equal(correction.corrected.sourceCycle,cycle);if(mode)assert.equal(correction.corrected.admissionMode,mode);assert.equal(correction.corrected.sourceDegree,degree);
  assert(correction.previousLabels.length>0);assert.match(correction.evidenceSha256,/^[a-f0-9]{64}$/);
 }
});
test('historical MSc cycles, IIIS programme identity and recommendation requirements cannot roll forward',()=>{
 for(const [id,year,mode] of [['tsinghua-me-msc-ordinary','2025','national_exam'],['tsinghua-iiis-msc-robotics','2025','recommendation_exemption'],['sustech-mee-msc-ordinary','2026','national_exam']]){
  const r=catalog.routes.find(r=>r.id===id);assert(r);assert.equal(r.status,'reference');assert.equal(r.sourceCycle,year);assert.equal(r.admissionMode,mode);assert.equal(r.currentCycleVerificationStatus,'pending');assert.equal(r.cycle2027Verified,false);
 }
 const old=catalog.routes.find(r=>r.id==='tsinghua-iiis-msc-robotics'),current=catalog.routes.find(r=>r.id==='tsinghua-iiis-msc-085400-tuimian-2027');
 assert(old.program.includes('081200'));assert(current.program.includes('085400'));assert.equal(current.sourceCycle,'2027');assert.equal(current.admissionMode,'recommendation_exemption');assert.equal(current.noTuimianRequired,false);assert.equal(old.noTuimianRequired,false);
 assert.equal(current.projectCycleVerified,true);assert.equal(current.individualRecruitmentVerified,false);assert(!catalog.advisors.some(a=>a.routeIds.includes(current.id)));
});
test('all fifteen concurrent research profiles and four doctoral references survive without manufactured personal openings',()=>{
 const added=catalog.advisors.filter(a=>['SUSTech','Tsinghua'].includes(a.institution));assert.equal(added.length,15);
 const profiles=read('data/advisor-profiles.json');for(const a of added){assert(profiles.profiles.some(p=>p.advisorId===a.id));assert.equal(a.routeIds.length,2);assert(a.routeIds.some(id=>id.includes('phd-reference')));assert(a.routeAssociations.every(x=>x.verificationStatus==='pending'));
  for(const o of a.openingDetails||[]){assert.notEqual(o.cycle2027FallVerified,true);assert.notEqual(o.cycle2028FallVerified,true);assert.notEqual(o.confirmedVacancy,true);assert.notEqual(o.remainingHeadcountVerified,true);}
 }
 assert.equal(catalog.routes.filter(r=>['SUSTech','Tsinghua'].includes(r.institution)&&r.degree==='PhD'&&r.status==='reference').length,4);
 assert.equal(buildOpportunities(catalog).length,59);assert.equal(browseAdvisors(catalog).length,334);assert.equal(browseRoutes(catalog).length,65);
});

test('native IIIS academic and professional degrees cannot be called science masters',()=>{
 for(const [id,code,label]of [['tsinghua-iiis-msc-robotics','081200','学术学位硕士'],['tsinghua-iiis-msc-085400-tuimian-2027','085400','专业学位硕士']]){
  const r=catalog.routes.find(r=>r.id===id);assert.equal(r.programCode,code);assert.equal(r.nativeDegreeLabel,label);const html=renderRecordSummary('project',r,catalog).html;assert(html.includes(label));assert(!html.includes('理学硕士'));
 }
 const named=catalog.advisors.filter(a=>a.routeAssociations.some(x=>x.historicalAssociationVerified===true));assert.deepEqual(new Set(named.map(a=>a.nameZh)),new Set(['吴丹','赵慧婵','李曙光']));
});
