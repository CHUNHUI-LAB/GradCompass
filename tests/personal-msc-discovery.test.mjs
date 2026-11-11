import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hasPersonalMSc2028,intakeMatches,recruitmentPriority} from '../assets/recruitment-priorities.js';
import {browseAdvisors,filterAdvisors,buildOpportunities,filterOpportunities,browseRoutes} from '../assets/core.js';
const asOf='2026-11-11';
const source={url:'https://example.org/personal-admissions',checkedDate:'2026-11-05'};
const row=(delta={})=>({degree:'MSc',status:'explicit',sourceStatus:'personal_recruitment_statement',individualRecruitmentVerified:true,cycle2028FallVerified:true,cycle2028IntakeVerified:true,sources:[source],...delta});
const person=(delta={})=>({id:'synthetic-person',name:'Synthetic Person',institution:'BNU',routeIds:[],routeAssociations:[],openingDetails:[row(delta)]});
const data=a=>({advisors:[a],routes:[],raPositions:[]});

test('explicit named MSc 2028 evidence supports discovery, not formal opportunities or associations',()=>{
 const a=person(); const d=data(a);const before=JSON.stringify(d);
 assert(hasPersonalMSc2028(a,asOf));
 for(const sourceStatus of ['individual_profile','personal_recruitment_reference'])assert(hasPersonalMSc2028(person({sourceStatus}),asOf));
 for(const delta of [{cycle2028FallVerified:false},{cycle2028IntakeVerified:false}])assert(hasPersonalMSc2028(person(delta),asOf));
 for(const key of ['degree','opportunityType']){
  assert.equal(browseAdvisors(d,{[key]:'MSc'}).length,1);
  assert.equal(browseAdvisors(d,{[key]:'MSc',intake:'known2028'}).length,1);
  for(const intake of ['fall2028_phd','year2028_phd','graduate2028'])assert.equal(browseAdvisors(d,{[key]:'MSc',intake}).length,0);
 }
 assert.equal(browseAdvisors(d,{degree:'MSc',institution:'CAU'}).length,0);
 assert.equal(browseAdvisors(d,{degree:'MSc',query:'no match'}).length,0);
 assert.deepEqual(browseRoutes(d,{degree:'MSc'}),[]);
 assert.deepEqual(filterAdvisors(d,{degree:'MSc'}),[]);
 assert.deepEqual(buildOpportunities(d),[]);
 assert.deepEqual(filterOpportunities(d,{degree:'MSc',intake:'known2028'}),[]);
 assert.equal(JSON.stringify(d),before);
});

test('generic, other-degree, undated, programme, unverified and non-boolean claims cannot create MSc discovery',()=>{
 const invalid=[{degree:'Graduate'},{degree:'PhD'},{degree:'MPhil'},{degree:'硕士'},{status:'unknown'},{status:'closed'},{individualRecruitmentVerified:false},{individualRecruitmentVerified:'true'},{sourceStatus:'program_reference_only'},{sourceStatus:'programme'},{sources:[]},{sources:[{...source,checkedDate:'2026-02-30'}]},{sources:[{...source,checkedDate:'2999-01-01'}]},{sources:[{url:source.url}]},{sources:[{...source,url:'http://example.org'}]},{cycle2028FallVerified:false,cycle2028IntakeVerified:false},{cycle2028FallVerified:'true',cycle2028IntakeVerified:'true'},{cycle2028FallVerified:false,cycle2028IntakeVerified:false,cycle2028FallReference:true,cycle:'2028 Fall'}];
 for(const delta of invalid){
  const a=person(delta);assert.equal(hasPersonalMSc2028(a,asOf),false,JSON.stringify(delta));
  assert.equal(intakeMatches(a,{intake:'known2028',degree:'MSc'}),false,JSON.stringify(delta));
  assert.equal(browseAdvisors(data(a),{degree:'MSc'}).length,0,JSON.stringify(delta));
 }
 assert.equal(hasPersonalMSc2028(person(),'invalid'),false);
 assert.equal(hasPersonalMSc2028(person(),'2026-11-04'),false);
 assert.equal(hasPersonalMSc2028({openingDetails:null},asOf),false);
 for(const item of [null,undefined,false,1,'MSc'])assert.equal(hasPersonalMSc2028({openingDetails:[item]},asOf),false);
});

test('simultaneous named MSc and PhD plans remain degree-specific and do not create verified opportunities',()=>{
 const a=person();a.openingDetails=[{...row(),summary:'计划招收硕士2名，不等于剩余名额',confirmedVacancy:false},{...row({degree:'PhD'}),summary:'计划招收博士1名，不等于剩余名额',confirmedVacancy:false}];
 assert.equal(recruitmentPriority(a,asOf),'fall2028_phd');
 assert(hasPersonalMSc2028(a,asOf));
 assert(intakeMatches(a,{intake:'known2028',degree:'MSc'}));
 assert(intakeMatches(a,{intake:'known2028',degree:'PhD'}));
 assert(!intakeMatches(a,{intake:'fall2028_phd',degree:'MSc'}));
 const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
 catalog.raPositions=JSON.parse(fs.readFileSync(new URL('../data/ra-positions.json',import.meta.url))).raPositions;
 const before=buildOpportunities(catalog).length;
 assert.equal(before,59);
 assert.equal(buildOpportunities({...catalog,advisors:[...catalog.advisors,a]}).length,before);
 assert.equal(a.openingDetails[0].degree,'MSc');assert.equal(a.openingDetails[1].degree,'PhD');
 assert(a.openingDetails.every(r=>r.confirmedVacancy===false));
});
