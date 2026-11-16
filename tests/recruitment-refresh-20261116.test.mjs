import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {reviewedPublicData} from './reviewed-public-data.mjs';
import {recruitmentPriority} from '../assets/recruitment-priorities.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const audit=JSON.parse(read('audits/recruitment-2028-refresh-20261116.json'));
const snapshot=reviewedPublicData(read,{throughReceipt:'tests/fixtures/evidence/985-tju-20261116.json'});
const catalog=snapshot['data/catalog.json'];
test('2028 refresh accounts for every existing advisor and separates 985 target from historical scope',()=>{
 assert.equal(audit.perAdvisor.length,890);
 assert.deepEqual(audit.perAdvisor.map(x=>x.advisorId).sort(),catalog.advisors.map(x=>x.id).sort());
 assert.equal(audit.perAdvisor.filter(x=>x.targetScope==='mainland_985').length,807);
 assert.equal(audit.perAdvisor.filter(x=>x.targetScope==='historical_outside_target').length,83);
 assert.equal(audit.counts.newTarget2028Signals,0);
 assert.equal(audit.dataChanges,false);
 for(const [path,hash] of Object.entries(audit.dataHashes))assert.match(hash,/^[0-9a-f]{64}$/);
 assert.equal(snapshot['data/advisor-profiles.json'].profiles.length,890);
 for(const [path,hash] of Object.entries(audit.reviewedDataHashes))assert.equal(crypto.createHash('sha256').update(JSON.stringify(snapshot[path])).digest('hex'),hash);
});
test('refresh leaves four differently qualified 2028 signals and does not promote Hong Kong discovery',()=>{
 const wanted={'bnu-huang-shisheng':'fall2028_phd','tongji-fan-rui':'year2028_phd','sjtu-xia-zeyang':'year2028_phd','sjtu-ma-jin':'graduate2028'};
 const actual=Object.fromEntries(catalog.advisors.map(a=>[a.id,recruitmentPriority(a)]).filter(([,s])=>Object.values(wanted).includes(s)));
 assert.deepEqual(actual,wanted);
 assert.notEqual(recruitmentPriority(catalog.advisors.find(a=>a.id==='cuhk_yunhui_liu')),'fall2028_phd');
});
test('public review preserves missing-source and search limitations without leaking local body caches',()=>{
 const raw=read('audits/recruitment-2028-refresh-20261116.json').toString();
 assert.doesNotMatch(raw,/\/workspace\/|"bodyFile"|"rawHtml"/);
 assert.equal(audit.partReports[0].coverage.nameSearchNoResultOrUnindexedCount,null);
 assert.equal(audit.partReports[0].coverage.profileUrlStatusCounts.body_read,243);
 assert.equal(audit.partReports[1].coverage.primaryBodyUnavailable,19);
 assert.equal(audit.partReports[2].coverage.advisorsWithoutBody,129);
 assert.match(raw,/未检出不等于没有招生/);
});
