import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {themesFor,browseAdvisors,buildOpportunities} from '../assets/core.js';
const raw=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),read=p=>JSON.parse(raw(p));
const c=read('data/catalog.json'),p=read('data/advisor-profiles.json'),receipt=read('tests/fixtures/evidence/bnu-card-themes-correction-20261111.json');
const ids=['bnu-lu-yu','bnu-yu-shengquan'];
test('card correction is exactly four source-backed fields with every other published fact and prior receipt retained',()=>{
 const before=reviewedPublicData(raw,{throughReceipt:'tests/fixtures/evidence/985-bnu-20261111.json'});
 assert.equal(receipt.operations.length,4);assert(receipt.operations.every(o=>o.operation==='replace'));
 const expected=structuredClone(before);
 for(const op of receipt.operations){const [array,index,key]=op.path.slice(1).split('/');assert(['summary','cardSummaryZh'].includes(key));assert(ids.includes(expected[op.file][array][index].id||expected[op.file][array][index].advisorId));assert.equal(expected[op.file][array][index][key],op.old);expected[op.file][array][index][key]=op.value;}
 assert.deepEqual(c,expected['data/catalog.json']);assert.deepEqual(p,expected['data/advisor-profiles.json']);
 assert.equal(crypto.createHash('sha256').update(raw('tests/fixtures/evidence/985-bnu-20261111.json')).digest('hex'),'9c38dabbf06d0a41f16363788e615f2cd017a3e9a3ace88ea2b7b0489e64eb91');
 assert.equal(receipt.officialEvidence.length,2);assert(receipt.officialEvidence.every(s=>s.url.startsWith('https://aic-fe.bnu.edu.cn/')));
});
test('education robotics coauthors are not positively classified from negative control or navigation caveats',()=>{
 for(const id of ids){const a=c.advisors.find(a=>a.id===id),profile=p.profiles.find(p=>p.advisorId===id);for(const tag of ['安全规划与控制','全身控制','具身导航'])assert(!themesFor(a).includes(tag),id+':'+tag);assert.equal(a.summary,profile.cardSummaryZh);assert.match(a.summary,/教育.*机器人/);assert.match(profile.overview.textZh,/不是|不把/);assert.match(a.caveats.join(' '),/不把.*控制实验室负责人/);assert.equal(profile.confirmedVacancy,false);assert.equal(a.eligibility,'pending');}
 assert.equal(c.advisors.length,745);assert.equal(p.profiles.length,745);assert.equal(c.routes.length,98);assert.equal(browseAdvisors(c,{institution:'BNU'}).length,11);assert.equal(browseAdvisors(c,{institution:'BNU',intake:'fall2028_phd'}).length,1);assert.equal(buildOpportunities({...c,raPositions:read('data/ra-positions.json').raPositions}).length,59);
});
