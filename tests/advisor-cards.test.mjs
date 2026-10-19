import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {groupAdvisorResults,renderAdvisorCard,advisorResultCount} from '../assets/advisor-cards.js';
import {profileMap} from '../assets/profiles.js';
import {browseAdvisors,filterOpportunities,escapeHTML} from '../assets/core.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const catalog=read('catalog.json');
catalog.raPositions=read('ra-positions.json').raPositions;
const profiles=profileMap(read('advisor-profiles.json'),catalog.advisors);
catalog.advisorProfiles=profiles;
const render=(group,extra={})=>renderAdvisorCard(group,{catalog,profiles,profileState:'ready',compareIds:[],...extra});
const counts=groups=>({advisors:groups.length,...Object.fromEntries(['degree','employment','reference'].map(kind=>[kind,groups.flatMap(group=>group.opportunities).filter(row=>row.kind===kind).length]))});

test('default grouping preserves all 492 people and independent verified association and job counts',()=>{
  const groups=groupAdvisorResults(catalog);
  assert.deepEqual(counts(groups),{advisors:492,degree:57,employment:2,reference:0});
  assert.equal(new Set(groups.map(group=>group.advisor.id)).size,492);
  assert.equal(groups.filter(group=>!group.opportunities.length).length,451);
  assert.equal(advisorResultCount(groups),'492 位导师 · 57 条已核实学位关联 · 2 个 RA 岗位');
  const html=groups.map(group=>render(group)).join('');
  assert.equal((html.match(/<article class="advisor-card"/g)||[]).length,492);
});

test('two RA jobs remain independent rows under one advisor and keep their exact comparison identities',()=>{
  const groups=groupAdvisorResults(catalog,{opportunityType:'RA'});
  assert.deepEqual(counts(groups),{advisors:1,degree:0,employment:2,reference:0});
  const [group]=groups;
  assert.equal(group.advisor.id,'polyu_pai_zheng');
  const selected=group.opportunities[0].id,html=render(group,{compareIds:[selected]});
  for(const row of group.opportunities){
    assert(html.includes(`data-opportunity-id="${row.id}"`));
    assert(html.includes(`data-detail="${row.id}"`));
    assert(html.includes(`data-compare="${row.id}"`));
  }
  assert(html.includes('#260907004'));assert(html.includes('#260724022'));
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  assert.equal((html.match(/aria-pressed="false"/g)||[]).length,1);
  assert.equal(advisorResultCount(groups),'1 位导师 · 0 条已核实学位关联 · 2 个 RA 岗位');
});

test('PhD discovery distinguishes people, verified degree associations and project references',()=>{
  const groups=groupAdvisorResults(catalog,{opportunityType:'PhD'});
  assert.deepEqual(counts(groups),{advisors:470,degree:31,employment:0,reference:445});
  assert.equal(advisorResultCount(groups),'470 位导师 · 31 条已核实学位关联 · 0 个 RA 岗位 · 445 条博士项目参考');
  const reference=groups.find(group=>group.opportunities.every(row=>row.kind==='reference'));
  const html=render(reference);
  assert(html.includes('博士项目参考'));assert(html.includes('个人关联与余位待核'));
  assert(!html.includes('已核实学位关联'));
});

test('two PhD projects for one advisor use complete names and separate route and comparison ids',()=>{
  const group=groupAdvisorResults(catalog,{opportunityType:'PhD'}).find(group=>group.advisor.id==='hkustgz-changhao-chen');
  assert.equal(group.opportunities.length,2);
  assert.deepEqual(new Set(group.opportunities.map(row=>row.routeId)),new Set(['hkust-gz-intr-phd','hkust-gz-ai-phd']));
  const html=render(group);
  for(const name of ['PhD in Intelligent Transportation','PhD in Artificial Intelligence'])assert(html.includes(name));
  for(const row of group.opportunities)assert(html.includes(`data-compare="${row.id}"`));
  assert.equal((html.match(/<article /g)||[]).length,1);
});

test('combined filters preserve the existing advisor order and exact opportunity intersection',()=>{
  for(const filters of [{institution:'HKUST'},{query:'robot',opportunityType:'PhD',opening:'unknown'},{institution:'ZJU',rank:'professor',topic:'SLAM 与空间感知'},{appointment:'recent',opportunityType:'PhD'},{query:'nonexistent-zero-match'}]){
    const groups=groupAdvisorResults(catalog,filters),people=browseAdvisors(catalog,filters),ids=new Set(people.map(advisor=>advisor.id));
    assert.deepEqual(groups.map(group=>group.advisor.id),people.map(advisor=>advisor.id));
    assert.deepEqual(new Set(groups.flatMap(group=>group.opportunities.map(row=>row.id))),new Set(filterOpportunities(catalog,filters).filter(row=>ids.has(row.advisorId)).map(row=>row.id)));
  }
});

test('RA prefilter results belong to the current query and catalog, including late profile data',()=>{
  assert.deepEqual(browseAdvisors({routes:[]},{opportunityType:'RA'}),[]);
  const phrase='profile-only-unique-probe';
  const filters={opportunityType:'RA',query:phrase};
  assert.equal(groupAdvisorResults(catalog,filters).length,0);
  const updatedProfiles=new Map(profiles);
  updatedProfiles.set('polyu_pai_zheng',{...profiles.get('polyu_pai_zheng'),cardSummaryZh:phrase});
  const supplemented={...catalog,advisorProfiles:updatedProfiles};
  assert.equal(groupAdvisorResults(supplemented,filters).length,1);
  assert.equal(groupAdvisorResults(supplemented,{...filters,query:'a-different-missing-query'}).length,0);
  assert.equal(groupAdvisorResults(supplemented,filters).length,1);
  assert.equal(groupAdvisorResults({...supplemented,raPositions:[]},filters).length,0);
  assert.equal(groupAdvisorResults(catalog,filters).length,0);
});

test('a research-only card remains readable without manufacturing a compare action',()=>{
  const group=groupAdvisorResults(catalog).find(group=>!group.opportunities.length),html=render(group);
  assert(html.includes(`data-result-key="${group.advisor.id}"`));
  assert(html.includes(`data-detail="${group.advisor.id}"`));
  assert(html.includes('不表示导师不招生'));assert(!html.includes('data-compare='));
  assert(html.includes(escapeHTML(group.advisor.profileUrl)));
  assert(html.indexOf('advisor-primary-actions')<html.indexOf('advisor-opportunities'));
});

test('extra rows are disclosed after two rows without truncating records or losing identity',()=>{
  const group=groupAdvisorResults(catalog).find(group=>group.opportunities.length>2);
  assert(group,'current data has a multi-opportunity advisor');
  const html=render(group),before=html.split('<details class="opportunity-more"')[0];
  assert.equal((before.match(/class="opportunity-row"/g)||[]).length,2);
  assert.equal((html.match(/class="opportunity-row"/g)||[]).length,group.opportunities.length);
  assert(html.includes(`data-disclosure-key="${group.advisor.id}:opportunities"`));
  assert(!html.includes('<details class="opportunity-more" open'));
});

test('loading, failed and genuinely absent profiles use different text while retaining the catalog summary',()=>{
  const group=groupAdvisorResults(catalog)[0];
  const loading=render(group,{profiles:new Map,profileState:'loading'});
  const unavailable=render(group,{profiles:new Map,profileState:'unavailable'});
  const absent=render(group,{profiles:new Map,profileState:'ready'});
  assert(loading.includes('专业简介正在载入'));assert(!loading.includes('专业简介待补充'));
  assert(unavailable.includes('补充简介暂未载入'));assert(!unavailable.includes('专业简介待补充'));
  assert(absent.includes('专业简介待补充'));
  for(const html of [loading,unavailable,absent])assert(html.includes('<p class="summary">'+escapeHTML(group.advisor.summary)));
  const ready=render(group);assert(ready.includes(escapeHTML(profiles.get(group.advisor.id).cardSummaryZh)));
});

test('card content is escaped, unsafe source URLs are omitted and valid original URLs are kept',()=>{
  const advisor={id:'unsafe"<id>',name:'<img src=x onerror=alert(1)>',nameZh:'A & B',institution:'<school>',department:'"dept"',position:'unknown',summary:'<script>alert(1)</script>',profileUrl:'javascript:alert(1)',topics:['<tag>']};
  const group={advisor,opportunities:[]};
  const html=render(group,{profiles:new Map});
  assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(!html.includes('javascript:'));
  assert(html.includes('&lt;img'));assert(html.includes('&quot;&lt;id&gt;'));assert(html.includes('A &amp; B'));
  advisor.profileUrl='https://example.org/profile?x=1&y=2';
  const safe=render(group,{profiles:new Map});
  assert(safe.includes('href="https://example.org/profile?x=1&amp;y=2" target="_blank" rel="noopener noreferrer"'));
});
