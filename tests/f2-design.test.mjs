// Historical 5e7cd36 source-byte assertion is preserved; live UI contracts follow the editorial redesign.
import {experienceBatchBaseline} from './experience-batch-20261004-baseline.mjs';
import {advisorAdditionsBaselineBytes} from './advisor-additions-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from './historical-source-fs.mjs';
import crypto from 'node:crypto';
import rawFs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rawRead=p=>rawFs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=rawRead('index.html'),css=rawRead('assets/style.css'),app=rawRead('assets/app.js'),experiences=rawRead('assets/experiences.js');
const compactCss=css.replace(/\s+/g,'').toLowerCase();
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
test('editorial visual system uses local system type, warm white, ink and copper',()=>{
 assert(/font-family:\s*-apple-system|font:\s*16px\/1\.7\s+-apple-system/.test(css),'Root uses local system typography');assert(!css.includes('@import'));assert(!/url\(/i.test(css));
 for(const token of ['--ink:#191919','--quiet:#666660','--background:#faf9f6','--surface:#ffffff','--line:#e4e2dc','--accent:#8b5e3c','--radius:12px'])assert(compactCss.includes(token),token);
 for(const size of [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)])assert(Number(size[1])>=14,`Text below 14px: ${size[0]}`);
 assert(compactCss.includes('min-height:44px'));assert(/line-height:1\.7|font:16px\/1\.7/.test(compactCss));
 const mainRule=compactCss.match(/\bmain\{[^}]+\}/)[0];assert(mainRule.includes('max-width:1320px')||(mainRule.includes('max-width:1400px')&&/padding:[^;]*40px/.test(mainRule)),'Main content has a 1320px maximum inside its gutters');
 assert(html.includes('class="hero-compass"'));assert(html.includes('aria-hidden="true"'));
});
test('responsive layout keeps reader rails and comparison scrolling inside their containers',()=>{
 for(const marker of ['[data-current-view="advisors"]','.site-header[data-menu-open] nav','.reading-layout','.reading-rail','.experience-reading','.source-principles','.material-list-card','.project-row','.project-comparison-scroll'])assert(css.includes(marker),marker);
 assert.match(compactCss,/\.project-comparison-scroll\{[^}]*overflow-x:auto/);
 assert.match(compactCss,/\.project-comparison-scroll\{[^}]*max-width:100%/);
 assert(compactCss.includes('@media(max-width:1023px)'));assert(compactCss.includes('@media(max-width:767px)'));
 assert(html.includes('aria-controls="primary-nav"'));assert(html.includes('aria-expanded="false"'));assert(html.includes('class="skip-link"'));
});
test('mobile filters have a named modal, draft status and explicit apply or cancel actions',()=>{
 assert.match(html,/<button[^>]*id="mobile-filter-toggle"[^>]*aria-controls="filter-dialog"[^>]*aria-haspopup="dialog"/);
 assert.match(html,/<dialog[^>]*id="filter-dialog"[^>]*aria-labelledby="filter-dialog-title"/);
 for(const id of ['mobile-filter-count','filter-dialog-title','filter-apply','filter-cancel','filter-draft-count'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/<[^>]*id="filter-draft-count"[^>]*role="status"[^>]*aria-live="polite"/);
 assert(html.includes('class="filter-sheet-body"'));
});
test('focus, restrained panel motion and reduced-motion handling are explicit',()=>{
 assert(/:focus-visible\{outline:[23]pxsolidvar\(--accent\)/.test(compactCss));assert(compactCss.includes('--ease:cubic-bezier(.22,1,.36,1)'));
 assert(compactCss.includes('--motion-fast:160ms'));assert(compactCss.includes('--motion-panel:260ms'));
 assert(css.includes('.intro.is-intro-play'));assert(compactCss.includes('@media(prefers-reduced-motion:reduce)'));
 assert(compactCss.includes('animation:none!important'));assert(compactCss.includes('transition:none!important'));
 assert.match(html,/<dialog[^>]*id="detail-dialog"[^>]*aria-labelledby="detail-title"/);
 assert(app.includes('preventScroll:true'));assert(app.includes('data-reading-section'));assert(experiences.includes('id="experience-section-0" tabindex="-1"'));
});
test('all internal detail types keep their source chain and distinguish employment',()=>{
 for(const type of ['project','deadline','material'])assert(app.includes(type));assert(app.includes('data-reading-kind="${job?\'ra\':\'advisor\'}"'));
 assert(app.includes('RA 是受雇科研岗位，不授予学位录取资格'));assert(app.includes('完整依据、来源日期及适用限制保留在正文'));assert(app.includes('sourceLinks(record.sources,3)'));
 assert(experiences.includes('data-reading-experience'));assert(experiences.indexOf('不能照搬的部分')<experiences.indexOf('查看原帖'));
 assert(!html.includes('登录'));assert(!html.includes('校园意境'));assert(!app.includes('localStorage'));assert(!app.includes('sessionStorage'));
});

test('narrow reader metadata keeps its words together instead of a vertical character column',()=>{
 assert.match(compactCss,/\.dialog-top\.eyebrow\{[^}]*white-space:nowrap/);
});
