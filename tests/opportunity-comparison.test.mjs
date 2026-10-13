import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderOpportunityComparison} from '../assets/opportunity-comparison.js';
import {buildOpportunities,escapeHTML} from '../assets/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const catalog=read('catalog.json');catalog.raPositions=read('ra-positions.json').raPositions;
const opportunities=buildOpportunities(catalog,{includeReferencePhd:true});
const raIds=opportunities.filter(row=>row.kind==='employment').map(row=>row.id);
const phdIds=opportunities.filter(row=>row.advisorId==='hkustgz-changhao-chen'&&row.type==='PhD').map(row=>row.id);
const columnIds=html=>[...html.matchAll(/data-opportunity-column="([^"]+)"/g)].map(match=>match[1]);

test('two jobs of the same advisor produce independent aligned columns with full job titles and references',()=>{
  const html=renderOpportunityComparison(catalog,raIds);
  assert.deepEqual(columnIds(html),raIds);
  assert.equal((html.match(/<thead>/g)||[]).length,1);assert.equal((html.match(/<tbody>/g)||[]).length,1);
  for(const job of catalog.raPositions){assert(html.includes(escapeHTML(job.title)));assert(html.includes('#'+job.jobReference));}
  for(const id of raIds){assert(html.includes(`data-remove-opportunity="${id}"`));assert(html.includes(`data-opportunity-focus="remove:${id}"`));}
  for(const field of ['institution','research','association','conditions','recruitment','other-openings','sources'])assert(html.includes(`data-opportunity-row="${field}"`));
  assert(html.includes('RA 是受雇科研岗位，不授予学位录取资格'));assert(html.includes('截止时刻：未公布'));
  assert(html.includes('class="project-comparison-scroll"'));assert(html.includes('data-opportunity-focus="table"'));
});

test('different PhD projects retain distinct full titles and their original selected order',()=>{
  const selected=[...phdIds].reverse(),html=renderOpportunityComparison(catalog,selected);
  assert.deepEqual(columnIds(html),selected);
  assert(html.includes('PhD in Intelligent Transportation'));assert(html.includes('PhD in Artificial Intelligence'));
  assert(html.includes('已核实导师与项目的关联'));assert(html.includes('项目资格、个人条件'));
  assert.deepEqual(selected,[...phdIds].reverse());
});

test('reference and degree columns cannot imply equivalent association or current vacancy evidence',()=>{
  const reference=opportunities.find(row=>row.kind==='reference'),degree=opportunities.find(row=>row.kind==='degree');
  const html=renderOpportunityComparison(catalog,[reference.id,degree.id]);
  assert(html.includes('博士项目参考'));assert(html.includes('不能计作已核实学位关联'));
  assert(html.includes('已核实导师与项目的关联'));assert(html.includes('公开招募说明不等于当年仍有名额'));
});

test('difference mode removes equal facts while retaining every identity header, ID and differing condition',()=>{
  const complete=renderOpportunityComparison(catalog,phdIds),differences=renderOpportunityComparison(catalog,phdIds,{differencesOnly:true});
  assert.deepEqual(columnIds(differences),phdIds);
  assert(complete.includes('data-opportunity-row="institution"'));assert(!differences.includes('data-opportunity-row="institution"'));
  assert(!differences.includes('data-opportunity-row="research"'));assert(!differences.includes('data-opportunity-row="association"'));
  assert(differences.includes('data-opportunity-row="conditions"'));
  assert(differences.includes('data-opportunity-differences data-opportunity-focus="differences" aria-pressed="true"'));
  assert(complete.includes('aria-pressed="false"'));assert(differences.includes('相同描述不代表条件等同'));
  assert.equal(renderOpportunityComparison(catalog,phdIds),complete,'turning differences off restores the same complete content');
});

test('host detail renderers receive exact job and advisor records and their scoped HTML is preserved',()=>{
  const jobs=[],pairs=[];
  const html=renderOpportunityComparison(catalog,raIds,{
    renderEmployment:job=>{jobs.push(job);return `<p class="original-employment">${escapeHTML(job.employmentEligibility.interpretation)}</p>`;},
    renderOpenings:(advisor,job)=>{pairs.push([advisor,job]);return `<dt>岗位</dt><dd>${escapeHTML(job.jobReference)}</dd>`;}
  });
  assert.deepEqual(jobs,catalog.raPositions);assert.equal(pairs.length,2);
  assert(pairs.every(([advisor])=>advisor===catalog.advisors.find(record=>record.id==='polyu_pai_zheng')));
  assert.equal((html.match(/class="original-employment"/g)||[]).length,2);
  for(const job of jobs)assert(html.includes(escapeHTML(job.employmentEligibility.interpretation)));
});

test('all known advisor caveats and source dates remain available instead of truncating the first four',()=>{
  const advisorId=opportunities.find(row=>row.id===phdIds[0]).advisorId;
  const advisor=catalog.advisors.find(row=>row.id===advisorId);
  const augmented={...catalog,advisors:catalog.advisors.map(row=>row===advisor?{...row,caveats:[...(row.caveats||[]),'scope-one','scope-two','scope-three','scope-four','scope-five','scope-six']}:row)};
  const html=renderOpportunityComparison(augmented,phdIds);
  for(const scope of ['scope-one','scope-two','scope-three','scope-four','scope-five','scope-six'])assert(html.includes(scope));
  assert(html.includes('来源核验：'));assert(html.includes('rel="noopener noreferrer"'));
});

test('duplicate, missing and more-than-three selections fail safely without substituting an advisor for an opportunity',()=>{
  assert(renderOpportunityComparison(catalog,[raIds[0],raIds[0]]).includes('请选择 2–3 条具体机会'));
  assert(renderOpportunityComparison(catalog,['polyu_pai_zheng','missing-id']).includes('失效或未收录'));
  assert(renderOpportunityComparison(null,raIds).includes('请选择 2–3 条具体机会'));
  assert.deepEqual(columnIds(renderOpportunityComparison(catalog,['missing',...raIds,...phdIds])),[...raIds,phdIds[0]]);
});

test('source data is escaped and unsafe links are not rendered',()=>{
  const advisorId=opportunities.find(row=>row.id===phdIds[0]).advisorId;
  const augmented={...catalog,advisors:catalog.advisors.map(row=>row.id===advisorId?{...row,name:'<img src=x onerror=alert(1)>',summary:'<script>bad</script>',profileUrl:'javascript:alert(1)',sources:[{label:'<b>source</b>',url:'https://example.org/source?a=1&b=2',checkedDate:'2026-10-01'},{url:'javascript:alert(2)'}]}:row)};
  const html=renderOpportunityComparison(augmented,phdIds);
  assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(!html.includes('href="javascript:'));
  assert(html.includes('&lt;img'));assert(html.includes('&lt;script&gt;'));
  assert(html.includes('https://example.org/source?a=1&amp;b=2'));assert(html.includes('&lt;b&gt;source&lt;/b&gt;'));
});
