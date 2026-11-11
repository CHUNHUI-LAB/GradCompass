import test from 'node:test';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recruitmentPriority,intakeMatches} from '../assets/recruitment-priorities.js';
import {renderAdvisorPriorities,priorityCounts} from '../assets/advisor-priorities.js';
import {browseAdvisors,filterOpportunities} from '../assets/core.js';
// Preserve the November 7 evidence boundary; current additions have their own tests.
const catalog=reviewedPublicData(p=>fs.readFileSync(new URL('../'+p,import.meta.url)),{throughReceipt:'tests/fixtures/evidence/985-bit-20261105.json'})['data/catalog.json'];
const get=id=>catalog.advisors.find(a=>a.id===id);

test('all 2028 signal entry reveals existing records without converting year or degree uncertainty to Fall PhD',()=>{
 const before=JSON.stringify(catalog),counts=priorityCounts(catalog);
 const known=browseAdvisors(catalog,{intake:'known2028'});
 assert.deepEqual(known.map(a=>a.id).sort(),['sjtu-ma-jin','sjtu-xia-zeyang','tongji-fan-rui']);
 assert.equal(known.length,counts.fall2028_phd+counts.year2028_phd+counts.graduate2028);
 assert.equal(counts.fall2028_phd,0);
 assert.equal(recruitmentPriority(get('tongji-fan-rui')),'year2028_phd');
 assert.equal(recruitmentPriority(get('sjtu-xia-zeyang')),'year2028_phd');
 assert.equal(recruitmentPriority(get('sjtu-ma-jin')),'graduate2028');
 assert.deepEqual(browseAdvisors(catalog,{intake:'known2028',institution:'Tongji'}).map(a=>a.id),['tongji-fan-rui']);
 assert.deepEqual(browseAdvisors(catalog,{intake:'known2028',opportunityType:'PhD'}).map(a=>a.id).sort(),['sjtu-xia-zeyang','tongji-fan-rui']);
 for(const type of ['MSc','MPhil','RA'])assert.equal(browseAdvisors(catalog,{intake:'known2028',opportunityType:type}).length,0);
 assert.equal(intakeMatches({openingDetails:[]},{intake:'known2028'}),false);
 assert.equal(filterOpportunities(catalog,{intake:'known2028',opportunityType:'PhD'}).some(o=>o.advisorId==='sjtu-ma-jin'),false);
 assert.equal(JSON.stringify(catalog),before,'a discovery filter cannot change evidence or add vacancies');
});

test('summary explicitly separates all signals from precise Fall zero and provides reversible access',()=>{
 const html=renderAdvisorPriorities(catalog,{intake:'known2028'},'ready');
 assert.match(html,/已核实 2028 招募线索：3 位导师/);
 assert.match(html,/明确秋季博士 0 位/);
 assert.match(html,/年份明确、季节待核博士 2 位/);
 assert.match(html,/学位待核研究生 1 位/);
 assert.match(html,/精确秋季博士为 0，不表示全部 2028 线索为 0/);
 assert.match(html,/data-priority-value="known2028" aria-pressed="true"/);
 assert.match(html,/取消全部 2028 线索筛选/);
 assert.match(renderAdvisorPriorities(catalog,{},'unavailable'),/查看全部 2028 线索/);
 const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/<option value="known2028">全部已核实 2028 招募线索<\/option>/);
 // Future exact Fall evidence must not retain a hardcoded zero explanation.
 const synthetic={advisors:[{openingDetails:[{degree:'PhD',status:'explicit',individualRecruitmentVerified:true,sourceStatus:'personal_recruitment_statement',cycle2028FallVerified:true,sources:[{url:'https://example.org/admissions',checkedDate:'2026-11-07'}]}]}]};
 const future=renderAdvisorPriorities(synthetic,{},'ready');
 assert.match(future,/明确秋季博士 1 位/);assert.doesNotMatch(future,/精确秋季博士为 0/);
});
