import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const c=read('data/catalog.json'),p=read('data/advisor-profiles.json'),audit=read('audits/ruc-census-followup-20261103.json');
test('RUC follow-up adds five sourced records without manufacturing 2028 opportunities',()=>{
 assert.equal(audit.addedAdvisorIds.length,5);
 for(const id of audit.addedAdvisorIds){const a=c.advisors.find(v=>v.id===id);assert.ok(a);assert.equal(a.fall2028OpeningVerified,false);assert.equal(a.opening,'unknown');assert.equal(a.checkedDate,'2026-11-03');assert.ok(a.sources.every(s=>s.url.startsWith('https://')));assert.equal(p.profiles.find(v=>v.advisorId===id).confirmedVacancy,false);}
 assert.equal(c.routes.filter(r=>r.id==='ruc-doctoral-faculty-reference-20261103').length,1);
});
test('RUC incomplete doctoral evidence cannot become a doctoral association',()=>{
 const a=c.advisors.find(a=>a.nameZh==='张静'&&a.institution==='RUC');assert.ok(a);assert.equal(a.position,'教授');assert.deepEqual(a.routeIds,[]);assert.deepEqual(a.routeAssociations,[]);
 for(const id of audit.addedAdvisorIds.filter(id=>id!==a.id)){const b=c.advisors.find(v=>v.id===id);assert.equal(b.routeAssociations.length,1);assert.equal(b.routeAssociations[0].individualRecruitmentVerified,false);}
});
test('RUC census preserves denominator limits and no raw faculty excerpts',()=>{
 assert.equal(audit.gaoling.faculty.length,30);assert.equal(audit.information.faculty.length,90);assert.equal(audit.notExhaustive,true);
 assert.ok(audit.information.faculty.every(v=>!('summary'in v)));assert.match(audit.cycleReview,/历史|不得/);assert.ok(audit.pendingCandidates.length>0);assert.ok(audit.collaborationCandidates.length>0);
});
