import {experienceBatchBaseline} from './experience-batch-20261004-baseline.mjs';
import {advisorAdditionsBaselineBytes} from './advisor-additions-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('assets/style.css'),app=read('assets/app.js'),experiences=read('assets/experiences.js');
test('approved F2 source bytes remain identical after reversing only the reviewed five-case append',()=>{
 const expected={
  'advisor-profiles.json':'910aa0b3db20e72ab4a2268ac910276a8e619cc2',
  'application-experience-provenance.json':'69bfd17ea67a64b9541718e334c8873099256ad6',
  'application-experiences.json':'89f9f1be086046511eba56fb5ccd4490530a8cbd',
  'catalog-test-manifest.json':'7233ef43812e69ea42eb42d4c5a79e94c11ce700',
  'catalog.json':'5d99d46a1224821b84f2bbe772525cd1b43e108e',
  'maintenance-2026-10-03.json':'74d7d57408496f1ba0fb2215ee5f0bad29bf46d7',
  'material-summaries.json':'ae0771cedee9883120e95897d71b0a96f02c167b',
  'project-summaries.json':'715f309f8ae18df776ac58909f7675b1dc357005',
  'ra-positions.json':'78f34dddd0ce8cc91e2a101c8c4da2270e86c13c',
  'update-status.json':'936a05b7d4c9c272c7a0c9c86c38833e0155e8c9'
 };
 for(const [name,sha] of Object.entries(expected)){const raw=advisorAdditionsBaselineBytes(name,fs.readFileSync(new URL('../data/'+name,import.meta.url)));const bytes=['application-experiences.json','application-experience-provenance.json'].includes(name)?Buffer.from(JSON.stringify(experienceBatchBaseline(JSON.parse(raw)),null,2)+'\n'):raw;assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha,name);}
});
test('six sections are first-class and source-backed navigation stays local',()=>{
 const nav=html.match(/<nav[\s\S]*?<\/nav>/)[0];
 for(const [route,title] of Object.entries({advisors:'找导师',routes:'申请项目',deadlines:'截止日期',materials:'申请材料',experiences:'申请经验',sources:'信息来源'})){assert(nav.includes(`href="#${route}" data-view="${route}"`));assert(nav.includes(`<span>${title}</span>`));}
 assert.equal((nav.match(/data-view=/g)||[]).length,6);assert(!nav.includes('target="_blank"'));assert(!html.includes('class="landing-guide"'));
});
test('one F2 visual system uses system sans, readable type, copper accents and restrained radii',()=>{
 assert(css.includes('font-family:-apple-system'));assert(!css.includes('@import'));assert(!css.includes('url('));assert(css.includes('--accent:#9a4f2d'));assert(css.includes('font-size:18px'));assert(css.includes('@media(max-width:720px){:root{font-size:16px}'));
 for(const size of [...css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)])assert(Number(size[1])>=14,`Text below 14px: ${size[0]}`);
 assert(css.includes('--radius:12px'));assert(css.includes('min-height:44px'));assert(css.includes('border-radius:8px'));assert(css.includes('line-height:1.65'));assert(!css.includes('line-clamp'));
});
test('responsive layout covers narrow navigation, reader rails and semantic comparison overflow',()=>{
 for(const marker of ['main[data-current-view="advisors"]','.site-header[data-menu-open] nav','.reading-layout','.reading-rail','.experience-reading','.source-principles','.material-list-card','.project-row','.project-comparison-scroll'])assert(css.includes(marker),marker);
 assert(css.includes('.project-comparison-scroll{overflow-x:auto;max-width:100%'));assert(css.includes('.reading-layout{display:block}'));assert(css.includes('.compare-tray>div{flex-basis:100%}'));
 assert(html.includes('aria-controls="primary-nav"'));assert(html.includes('aria-expanded="false"'));assert(html.includes('class="skip-link"'));
});
test('focus, hover, panel motion and reduced-motion handling are explicit',()=>{
 assert(css.includes(':focus-visible{outline:3px solid var(--accent)'));assert(css.includes('160ms ease'));assert(css.includes('reader-enter 220ms ease-out'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));assert(css.includes('animation:none!important;transition:none!important'));
 assert(app.includes("$('#detail-title')?.focus()"));assert(app.includes("data-reading-section"));assert(experiences.includes('id="experience-section-0" tabindex="-1"'));
});
test('all internal detail types keep their source chain and distinguish employment',()=>{
 for(const type of ['project','deadline','material'])assert(app.includes(type));assert(app.includes('data-reading-kind="${job?\'ra\':\'advisor\'}"'));
 assert(app.includes('RA 是受雇科研岗位，不授予学位录取资格'));assert(app.includes('完整依据、来源日期及适用限制保留在正文'));assert(app.includes('sourceLinks(record.sources,3)'));
 assert(experiences.includes('data-reading-experience'));assert(experiences.indexOf('不能照搬的部分')<experiences.indexOf('查看原帖'));
 assert(!html.includes('登录'));assert(!html.includes('校园意境'));assert(!app.includes('localStorage'));assert(!app.includes('sessionStorage'));
});

test('narrow reader metadata keeps its words together instead of a vertical character column',()=>{assert(css.includes('.dialog-top .eyebrow{font-size:14px;flex:1 0 auto;white-space:nowrap}'));});
