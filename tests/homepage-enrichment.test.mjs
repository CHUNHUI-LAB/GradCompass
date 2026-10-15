import {reverseBoundedMaintenanceReviews} from './evidence-reviews.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publishedBytes} from './published-history-fs.mjs';
import {renderProfile,renderProfileLinks,renderHomepageRecruitment} from '../assets/profiles.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const current=read('data/advisor-profiles.json'),old=JSON.parse(publishedBytes('data/advisor-profiles.json'));
const audit=read('audits/homepage-enrichment-20261010.json');
const profiles=new Map(current.profiles.map(p=>[p.advisorId,p]));
test('homepage batch preserves original profile facts, links, identities, order and catalog decisions',()=>{
 assert.equal(current.profiles.length,334);assert.equal(audit.count,53);assert.equal(audit.addedLinkCount,54);
 const restored=reverseBoundedMaintenanceReviews({'data/catalog.json':read('data/catalog.json'),'data/advisor-profiles.json':current},p=>fs.readFileSync(new URL('../'+p,import.meta.url)));
 assert.deepEqual(restored['data/catalog.json'].advisors,JSON.parse(publishedBytes('data/catalog.json')).advisors);
 assert.deepEqual(restored['data/advisor-profiles.json'],old);
 assert.deepEqual(current.profiles.filter(p=>p.homepageReview).map(p=>p.advisorId).sort(),audit.advisors.map(r=>r.advisorId).sort());
});
test('every added homepage has named identity evidence, bounded read scope and content receipt',()=>{
 const receipt=read('tests/fixtures/evidence/homepages-20261010.json');
 const known=new Set(receipt.officialEvidence.map(s=>s.url));
 let additions=0;
 for(const row of audit.advisors){
  const p=profiles.get(row.advisorId);assert.equal(p.homepageReview.checkedDate,'2026-10-10');assert(p.homepageReview.textZh);
  assert(known.has(row.identitySourceUrl));
  assert.deepEqual(p.homepageReview.links.map(l=>l.url),row.urls);
  const prior=old.profiles.find(p=>p.advisorId===row.advisorId);
  assert.deepEqual(p.links.slice(prior.links.length),p.homepageReview.links);
  for(const u of row.urls){assert.equal(new URL(u).protocol,'https:');assert(known.has(u));assert(!prior.links.some(l=>l.url===u));additions++;}
  for(const page of row.pages){assert.equal(page.status,200);assert.match(page.contentSha256,/^[a-f0-9]{64}$/);}
  for(const s of p.homepageReview.sources)assert.equal(s.checkedDate,'2026-10-10');
 }
 assert.equal(additions,54);
});
test('detail displays pre-existing links and new homepages with safe labels and deduplication',()=>{
 for(const p of current.profiles){
  const html=renderProfile(p);assert.match(html,/个人主页、实验室与相关链接/);
  for(const l of p.links)assert(html.includes(l.url.replaceAll('&','&amp;')),p.advisorId+' '+l.url);
  assert(!/undefined|\[object Object\]/.test(html));
 }
 const html=renderProfileLinks({links:[null,{url:'javascript:alert(1)',label:'unsafe'},{url:'https://example.org/',label:'<script>alert(1)</script>'},{url:'https://example.org/',label:'duplicate'}],homepageReview:{links:[{url:'https://example.net/',label:'lab'}],textZh:'<img onerror=bad>'}});
 assert(!html.includes('javascript:'));assert(!html.includes('<script>'));assert(!html.includes('<img'));
 assert(html.includes('&lt;script&gt;'));assert.equal((html.match(/href="https:\/\/example.org\/"/g)||[]).length,1);assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,2);
 assert.equal(renderProfileLinks({links:{url:'https://example.org/'}}),'');
});
test('shared teams and dynamic sites retain their verification limits',()=>{
 for(const aid of ['sustech-chenglong-fu','sustech-chengzhi-hu','sustech-pan-yang','sustech-zhenzhong-jia'])assert.match(profiles.get(aid).homepageReview.textZh,/共享团队/);
 assert.match(profiles.get('fudan-tan-weimin').homepageReview.textZh,/共享实验室/);
 assert.match(profiles.get('fudan-ye-guangnan').homepageReview.textZh,/动态正文尚未完整核读/);
 assert(!profiles.get('ustc-xu-tong').homepageReview);
});
test('personal recruitment supplement retains PhD mode and year boundaries and appears in admissions section',()=>{
 const zhong=profiles.get('sjtu-zhong-zhihang'),html=renderHomepageRecruitment(zhong);
 assert.match(html,/28 级/);assert.match(html,/未明确 2028 Fall 博士剩余名额/);assert.match(html,/27 级/);assert.match(html,/至少提前半年/);
 assert.match(renderHomepageRecruitment(profiles.get('nju-shi-jieqi')),/普博/);
 assert.match(renderHomepageRecruitment(profiles.get('seu-sun-mingxuan')),/2027 Fall/);
 assert.match(renderHomepageRecruitment(profiles.get('nju-zhang-zhenyu')),/2027 Fall/);
 assert.equal(renderHomepageRecruitment(profiles.get('tsinghua-rui-chen')),'');
 assert.equal(renderHomepageRecruitment(null),'');
 const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
 assert(app.includes('<h3>招生与招聘 · 按申请类型分开</h3>${renderHomepageRecruitment(advisorProfiles.get(a.id))}'));
 const catalog=read('data/catalog.json');assert.deepEqual(catalog.advisors.find(a=>a.id===zhong.advisorId),JSON.parse(publishedBytes('data/catalog.json')).advisors.find(a=>a.id===zhong.advisorId));
});
