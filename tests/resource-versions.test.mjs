import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);const appURL=new URL('assets/app.js',root);const app=fs.readFileSync(appURL,'utf8');const html=fs.readFileSync(new URL('index.html',root),'utf8');
function localPath(reference,owner=root){const url=new URL(reference,owner);assert.equal(url.protocol,'file:');return fileURLToPath(new URL(url.pathname,'file://'));}
const version=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex').slice(0,12);
const imports=[...app.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>new URL(m[1],appURL));
test('HTML entry and module resources exist when resolved by URL pathname',()=>{const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m=>m[1]);assert(refs.length>=3);for(const ref of refs)assert(fs.existsSync(localPath(ref)),ref);for(const url of imports)assert(fs.existsSync(localPath(url)),url.href);});
test('only changed dependencies receive their actual content versions',()=>{for(const name of ['experiences.js','record-summaries.js','page-overviews.js','project-comparison.js']){const url=imports.find(url=>url.pathname.endsWith('/'+name));assert(url);assert.equal(url.searchParams.get('v'),version(localPath(url)));}for(const name of ['core.js','profiles.js','material-supplement.js']){const url=imports.find(url=>url.pathname.endsWith('/'+name));assert(url);assert.equal(url.search,'');}});
test('app and stylesheet entry versions match their final bytes after dependency versioning',()=>{for(const name of ['app.js','style.css']){const ref=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).find(value=>new URL(value,root).pathname.endsWith('/assets/'+name));assert(ref);const url=new URL(ref,root);assert.equal(url.searchParams.get('v'),version(localPath(url)));}});
test('changed experience data is versioned before the application entry',()=>{const ref=app.match(/new URL\('([^']*data\/application-experiences\.json[^']*)'/)?.[1];assert(ref);const url=new URL(ref,appURL);assert(fs.existsSync(localPath(url)));assert.equal(url.searchParams.get('v'),version(localPath(url)));for(const name of ['ra-positions.json','update-status.json'])assert(!app.includes(name+'?v='));});

test('project summaries and narrowly corrected official datasets have content versions',()=>{for(const name of ['catalog.json','material-summaries.json','project-summaries.json']){const ref=app.match(new RegExp(name.replaceAll('.','\\.')+'\\?v=([0-9a-f]+)'));assert(ref,name);assert.equal(ref[1],version(localPath('data/'+name)));}});


test('expanded advisor profiles use their actual content version before the application entry',()=>{
 const ref=app.match(/new URL\('([^']*data\/advisor-profiles\.json[^']*)'/)?.[1];assert(ref);
 const url=new URL(ref,appURL);assert.equal(url.searchParams.get('v'),version(localPath(url)));
});
test('release snapshot counts and allowlisted hashes describe the final content without claiming deployment',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('release-manifest.json',root),'utf8'));
 assert.equal(manifest.profilePilotCount,41);assert.equal(manifest.visibleAdvisorCount,41);assert.equal(manifest.opportunityCount,59);assert.equal(manifest.raPositionCount,2);
 assert.equal(manifest.newAdvisorProfiles,11);assert.equal(manifest.preservedAdvisorProfiles,30);assert(manifest.newProfileCitedSourceCount>=15);
 const cited=new Set();const collect=value=>{if(Array.isArray(value))return value.forEach(collect);if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key==='sources')item.forEach(s=>cited.add(s.url));else collect(item);}};collect(JSON.parse(fs.readFileSync(new URL('data/advisor-profiles.json',root),'utf8')).profiles.slice(30));assert.equal(cited.size,manifest.newProfileCitedSourceCount);
 assert.equal(manifest.baseSourceCommit,'df65efdbebb3d07af770ca69fbbd92846671be0b');assert.equal(manifest.baseDeployedCommit,'4840df6a9718ec38e472f8fd7496047248029e71');assert.equal(manifest.browserVisualQA,'Not yet browser-verified.');assert(!JSON.stringify(manifest).includes('socket'));assert(!JSON.stringify(manifest).includes('Chromium'));assert.match(manifest.status,/do not establish deployment/);
 for(const key of ['nodeTestsTotal','nodeTestsPassed','nodeTestsFailed'])assert(!(key in manifest),'test results belong to the actual test run, not hard-coded content counters');assert.equal(manifest.experienceRecords,26);assert.equal(manifest.defaultExperienceRecords,26);assert.equal(manifest.experienceSourceSites,19);assert.equal(manifest.preservedPublishedRecords,21);assert.equal(manifest.newExperienceRecords,5);
 assert.equal(new Set(manifest.allowedFiles.map(f=>f.path)).size,manifest.allowedFiles.length);
 for(const f of manifest.allowedFiles){const bytes=fs.readFileSync(new URL(f.path,root));assert.equal(bytes.length,f.bytes,f.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);}
});
