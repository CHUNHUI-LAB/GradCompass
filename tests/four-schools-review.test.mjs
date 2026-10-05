import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browseAdvisors,filterOpportunities,buildOpportunities} from '../assets/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('data/catalog.json'),audit=read('data/four-schools-exploration-20261006.json');
const advisor=id=>catalog.advisors.find(a=>a.id===id);
test('four-school evidence audit matches catalog, source projections and public PhD filters',()=>{
 assert.deepEqual(audit.schoolCounts,{Fudan:38,USTC:32,Tongji:28,SEU:47});assert.equal(audit.addedAdvisorCount,127);assert.equal(audit.claims.length,145);
 for(const [inst,prefix] of [['Fudan','fudan'],['USTC','ustc'],['Tongji','tongji'],['SEU','seu']]){
  const review=read('data/'+prefix+'-advisor-review-20261005.json'),people=catalog.advisors.filter(a=>a.institution===inst);
  assert.deepEqual(review.advisors.map(a=>a.id),people.map(a=>a.id));assert.equal(browseAdvisors(catalog,{institution:inst}).length,audit.schoolCounts[inst]);
  assert.equal(filterOpportunities(catalog,{institution:inst,opportunityType:'PhD'}).length,people.length+(inst==='USTC'?1:0));
  const input=catalog.metadata.sourceInputs.find(s=>s.file===prefix+'-advisor-review-20261005.json');assert.equal(input.sha256,crypto.createHash('sha256').update(fs.readFileSync(new URL('../data/'+input.file,import.meta.url))).digest('hex'));
  for(const a of people){const r=review.advisors.find(r=>r.id===a.id),claim=audit.claims.find(r=>r.advisorId===a.id);assert(claim);assert.equal(r.position,a.position);assert.equal(r.profileUrl,a.profileUrl);assert.deepEqual(r.referencePhdRouteIds,a.routeIds);assert.deepEqual(r.routeAssociations,a.routeAssociations);assert.deepEqual(r.openingDetails,a.openingDetails);assert.equal(a.checkedDate,'2026-10-06');assert.equal(a.cycle2028FallVerified,false);assert.equal(a.fall2028OpeningVerified,false);
   for(const x of a.routeAssociations){assert.equal(x.status,'reference');assert.equal(x.verificationStatus,'pending');assert.equal(x.individualRecruitmentVerified,false);}
   for(const x of a.openingDetails){assert.equal(x.confirmedVacancy,false);assert.equal(x.remainingHeadcountVerified,false);assert.equal(x.cycle2028FallVerified,false);assert.equal(x.individualRecruitmentVerified,Boolean(claim.personalDoctoralRecruitment));if(x.status==='explicit')assert(claim.personalDoctoralRecruitment&&x.sources.some(s=>s.url===claim.personalDoctoralRecruitment.url));}
  }
 }
 assert.equal(buildOpportunities(catalog).length,57); // Catalog alone omits the separately loaded RA dataset.
});
test('department-specific doctoral references cannot reuse unrelated faculty programme sources',()=>{
 for(const id of ['fudan-huang-xuanjing','fudan-ding-henghui','fudan-chen-xi','fudan-cheng-yuan']){const a=advisor(id);assert.deepEqual(a.routeIds,['fudan-computing-phd-reference-2026']);assert(a.sources.some(s=>s.url==='https://ai.fudan.edu.cn/82/47/c24277a754247/page.htm'));assert(!a.sources.some(s=>s.url.includes('fit.fudan.edu.cn')));}
 assert.deepEqual(advisor('fudan-shan-hongming').routeIds,['fudan-brain-phd-reference-2026']);
 for(const id of ['tongji-tang-qirong','tongji-li-guoxin','tongji-wu-guangyu'])assert.deepEqual(advisor(id).routeIds,['tongji-mechanical-phd-directory-reference-2026']);
 const route=catalog.routes.find(r=>r.id==='tongji-mechanical-phd-directory-reference-2026');assert(route.notes.some(n=>n.includes('第2页')&&n.includes('专业博士')&&n.includes('兼职')));
});
test('2027 plans and undated personal invitations retain their actual modes and count scope',()=>{
 const palm=audit.claims.filter(c=>c.referenceRouteIds.includes('seu-palm-phd-reference-2027'));assert.equal(palm.length,26);
 for(const id of ['seu-geng-xin','seu-liang-jianqing','ustc-xu-tong','ustc-lv-linyuan']){const a=advisor(id);assert.equal(a.opening,'unknown');assert.equal(a.cycle2027FallReference,true);assert.equal(a.cycle2027FallVerified,false);}
 assert.equal(advisor('ustc-liu-wu').openingDetails[0].admissionMode,'master_to_phd');assert.match(advisor('ustc-xiao-junbin').openings.phd,/直博或校内硕博/);
 for(const id of ['seu-chang-zhiyong','seu-wang-qianqian'])assert.match(advisor(id).openings.phd,/合计/);
 assert.match(advisor('fudan-xu-zenglin').openings.phd,/未给出明确日历年份/);assert.match(advisor('seu-zhang-jun').openings.phd,/2026.*历史/);
 assert.match(advisor('tongji-yin-zhen').position,/上海创智/);assert(advisor('tongji-yin-zhen').caveats.some(x=>x.includes('学籍/招生渠道')));
});
test('audit records successful active evidence, failed historical links, exclusions and coverage gaps',()=>{
 for(const claim of audit.claims)for(const s of claim.sources){const snapshot=audit.sourceSnapshots.find(x=>x.url===s.url&&x.status===200);assert(snapshot,s.url);assert.match(snapshot.sha256,/^[0-9a-f]{64}$/);assert.equal(snapshot.checkedDate,audit.checkedDate);}
 assert(audit.sourceIssues.some(x=>x.status===404));assert(audit.sourceIssues.some(x=>x.contentStatus==='invalid_article_parameter'));assert.equal(advisor('fudan-qi-lizhe').opening,'unknown');assert(audit.coverage.every(c=>c.excluded.length&&c.gapsZh));assert(audit.coverage.find(c=>c.institution==='SEU').excluded.some(x=>x.names.includes('赵雨辰')));
});
