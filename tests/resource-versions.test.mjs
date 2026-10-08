import {previousPublicAuditRelease} from './public-audit-release-20261006-baseline.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);const appURL=new URL('assets/app.js',root);const app=fs.readFileSync(appURL,'utf8');const html=fs.readFileSync(new URL('index.html',root),'utf8');
function localPath(reference,owner=root){const url=new URL(reference,owner);assert.equal(url.protocol,'file:');return fileURLToPath(new URL(url.pathname,'file://'));}
const version=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex').slice(0,12);
const imports=[...app.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>new URL(m[1],appURL));
test('HTML entry and module resources exist when resolved by URL pathname',()=>{const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m=>m[1]);assert(refs.length>=3);for(const ref of refs)assert(fs.existsSync(localPath(ref)),ref);for(const url of imports)assert(fs.existsSync(localPath(url)),url.href);});
test('every local module dependency carries its actual content version including changed leaves',()=>{const seen=new Set();const visit=url=>{const p=localPath(url);if(seen.has(p))return;seen.add(p);const text=fs.readFileSync(p,'utf8');for(const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(!m[1].startsWith('./'))continue;const child=new URL(m[1],url);assert.equal(child.searchParams.get('v'),version(localPath(child)),child.pathname);visit(child);}};visit(appURL);assert(seen.size>=8);});
test('app and stylesheet entry versions match their final bytes after dependency versioning',()=>{for(const name of ['app.js','style.css']){const ref=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).find(value=>new URL(value,root).pathname.endsWith('/assets/'+name));assert(ref);const url=new URL(ref,root);assert.equal(url.searchParams.get('v'),version(localPath(url)));}});
test('changed experience data is versioned before the application entry',()=>{const ref=app.match(/new URL\('([^']*data\/application-experiences\.json[^']*)'/)?.[1];assert(ref);const url=new URL(ref,appURL);assert(fs.existsSync(localPath(url)));assert.equal(url.searchParams.get('v'),version(localPath(url)));for(const name of ['ra-positions.json','update-status.json'])assert(!app.includes(name+'?v='));});

test('project summaries and narrowly corrected official datasets have content versions',()=>{for(const name of ['catalog.json','material-summaries.json','project-summaries.json']){const ref=app.match(new RegExp(name.replaceAll('.','\\.')+'\\?v=([0-9a-f]+)'));assert(ref,name);assert.equal(ref[1],version(localPath('data/'+name)));}});


test('expanded advisor profiles use their actual content version before the application entry',()=>{
 const ref=app.match(/new URL\('([^']*data\/advisor-profiles\.json[^']*)'/)?.[1];assert(ref);
 const url=new URL(ref,appURL);assert.equal(url.searchParams.get('v'),version(localPath(url)));
});
test('release snapshot counts and allowlisted hashes describe the final content without claiming deployment',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('release-manifest.json',root),'utf8'));
 // Dated prior-release assertions retain their original values and wording.
 // The actual current manifest below still owns every allowlist/hash check.
 { const manifest=previousPublicAuditRelease;
 assert.equal(manifest.profilePilotCount,56);assert.equal(manifest.visibleAdvisorCount,334);assert.equal(manifest.advisorCatalogCount,334);assert.equal(manifest.raPositionCount,2);const catalog=JSON.parse(fs.readFileSync(new URL('data/catalog.json',root),'utf8'));assert.equal(manifest.projectCatalogCount,catalog.routes.length);assert.equal(manifest.visibleProjectCount,catalog.routes.length);assert.equal(manifest.opportunityCount,manifest.verifiedDegreeAssociationCount+manifest.raPositionCount);assert.equal(manifest.candidateBaseCommit,'7a8b2d63da2eab07b315a099bcd51c561a0c8c6f');
 assert.equal(manifest.newAdvisorProfiles,26);assert.equal(manifest.preservedAdvisorProfiles,30);assert.equal(manifest.newProfileCitedSourceCount,72);
 assert.equal(manifest.baseSourceCommit,'91af79d313c3d0bd7f3bfd5a4e306a3af596ccaf');assert.equal(manifest.baseDeployedCommit,'4840df6a9718ec38e472f8fd7496047248029e71');assert.equal(manifest.browserVisualQA,'Not yet browser-verified.');assert(!JSON.stringify(manifest).includes('socket'));assert(!JSON.stringify(manifest).includes('Chromium'));assert.match(manifest.status,/do not establish deployment/);
 for(const key of ['nodeTestsTotal','nodeTestsPassed','nodeTestsFailed'])assert(!(key in manifest),'test results belong to the actual test run, not hard-coded content counters');assert.equal(manifest.experienceRecords,26);assert.equal(manifest.defaultExperienceRecords,26);assert.equal(manifest.experienceSourceSites,19);assert.equal(manifest.preservedPublishedRecords,21);assert.equal(manifest.newExperienceRecords,5);
 }
 assert.equal(new Set(manifest.allowedFiles.map(f=>f.path)).size,manifest.allowedFiles.length);
 for(const f of manifest.allowedFiles){const bytes=fs.readFileSync(new URL(f.path,root));assert.equal(bytes.length,f.bytes,f.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);}
});

test('README version scope separates dated verification from deployment status',()=>{
 const readme=fs.readFileSync(new URL('README.md',root),'utf8');
 const scope=readme.split('## 版本范围与验证说明（2026-10-06）')[1]?.split('## ')[0];
 assert(scope);assert(scope.includes('GitHub Pages 部署记录'));assert(scope.includes('自动测试结果不代表已部署或已完成浏览器验收'));
 assert(!readme.includes('朋友'));assert(!scope.includes('未推送、未部署'));
});
test('README historical counts cite original commits and retain an explicit correction trail',()=>{
 const readme=fs.readFileSync(new URL('README.md',root),'utf8');
 const section=title=>readme.split('## '+title+'\n')[1]?.split('\n## ')[0];
 const advisors=section('2026-10-04 导师简介补充（三位）');
 assert(advisors.includes('4513fcefb5e0d478a64e42a89bdcc3268d5b7000'));assert(advisors.includes('37 条导师记录'));assert(advisors.includes('35 位可见'));assert(advisors.includes('52 条机会（50 条学位机会与 2 条独立 RA）'));
 const ris=section('2026-10-04 有界维护：新增收录 HKU RIS 项目');
 assert(ris.includes('91af79d313c3d0bd7f3bfd5a4e306a3af596ccaf'));assert(ris.includes('1281ce4740272443563b4a98f421561bacc801f9'));assert(ris.includes('41 位可见导师、59 条机会'));assert(ris.includes('项目由 27 个增至 28 个'));assert(ris.includes('材料摘要由 14 组增至 15 组'));
 const correction=section('2026-10-04 历史统计更正');assert(correction.includes('51 条原始导师／49 位可见／67 条机会'));assert(correction.includes('49 位可见／67 条机会／29 个项目／15 组材料'));assert(correction.includes('历史数字不代表当前可申请资格或个人名额'));
});

test('README programme-introduction history matches its dated QA count with an explicit correction trail',()=>{
 const readme=fs.readFileSync(new URL('README.md',root),'utf8');
 const qa=fs.readFileSync(new URL('QA.md',root),'utf8').split('## Retained prior QA records')[0];
 const section=readme.split('## 2026-10-02 项目简介补齐\n')[1]?.split('\n## ')[0];
 assert(section);
 assert(qa.includes('c3a2fe200fe03ea0d32eb6d6d1e581d0a44bf8b5'));
 const historicalCount=Number(qa.match(/Full `npm test`: (\d+) passed/)?.[1]);
 assert.equal(historicalCount,148,'dated QA retains its original 137 checks plus eleven additions');
 assert.equal(Number(section.match(/检查 (\d+) 项通过/)?.[1]),historicalCount);
 assert(section.includes('此前误写为 207 项'));
 assert(section.includes('QA.md'));
});

test('README public navigation overview matches current counts without implying complete coverage',()=>{
 const readme=fs.readFileSync(new URL('README.md',root),'utf8');
 const overview=readme.split('## 按要做的事浏览\n')[1]?.split('\n## ')[0];
 assert(overview.includes('334 位导师均可查阅'));assert(overview.includes('个人学位关联 57 条'));assert(overview.includes('RA 岗位 2 条'));assert(overview.includes('新增博士项目参考另行标注'));assert(overview.includes('65 个项目均可查阅'));assert(overview.includes('30 份培养与研究简介'));assert(overview.includes('17 组官方材料摘要'));assert(!overview.includes('背景资格仍是底层收录条件'));
 const materials=readme.split('## 材料补充与范围\n')[1]?.split('\n## ')[0];assert(materials.includes('15 组官方摘要、47 个实际引用来源'));assert(materials.includes('共 17 组'));
});
