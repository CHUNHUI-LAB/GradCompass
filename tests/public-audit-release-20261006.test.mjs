import {profileCoverageBytes} from './profile-coverage-baseline.mjs';
import {cuhkDeadlineBytes} from './cuhk-deadline-20261007-baseline.mjs';
import {detailReturnBytes} from './detail-return-focus-baseline.mjs';
import test from 'node:test';
import {raDeadlineBytes} from './ra-deadline-20261007-baseline.mjs';
import {dateSummaryBytes} from './date-summary-20261006-baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {publicAuditReleaseFixture as f,publicAuditReleaseBytes,assertCurrentPublicAuditAsset,previousPublicAuditRelease as previous,previousPublicAuditReleaseSha256} from './public-audit-release-20261006-baseline.mjs';
import {snapshotHash as hash} from './strict-history-transform.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
const manifest=JSON.parse(read('release-manifest.json'));
const addedFiles=['data/maintenance-2026-10-06.json','tests/public-audit-20261006.test.mjs','tests/public-audit-20261006-baseline.mjs','tests/public-audit-20261006-history-fs.mjs','tests/fixtures/history/reviewed-public-audit-20261006.json','tests/public-audit-release-20261006-baseline.mjs','tests/public-audit-release-20261006.test.mjs','tests/fixtures/history/reviewed-public-audit-release-20261006.json','tests/fixtures/history/reviewed-pre-public-audit-release-079eaea.json'];
addedFiles.push('tests/date-summary-20261006-baseline.mjs','tests/date-summary-20261006.test.mjs','tests/fixtures/history/reviewed-date-summary-20261006.json');
addedFiles.push('tests/ra-deadline-provenance.test.mjs','tests/ra-deadline-20261007-baseline.mjs','tests/ra-deadline-20261007-history.test.mjs','tests/fixtures/history/reviewed-ra-deadline-20261007.json');
addedFiles.push('tests/detail-return-focus.test.mjs','tests/detail-return-focus-baseline.mjs','tests/detail-return-focus-history.test.mjs','tests/fixtures/history/detail-return-focus-20261007.json');
addedFiles.push("tests/cuhk-deadline-20261007-baseline.mjs","tests/cuhk-deadline-20261007.test.mjs","tests/fixtures/history/reviewed-cuhk-deadline-20261007.json");
// The current derived profile-source count is checked against raw data in profile-coverage-history.test.mjs.
addedFiles.push('tests/full-profile-coverage.test.mjs','tests/nju-tongji-ustc-profiles.test.mjs','tests/pku-profiles.test.mjs','tests/profile-coverage-baseline.mjs','tests/profile-coverage-history-fs.mjs','tests/profile-coverage-history.test.mjs','tests/fixtures/history/reviewed-profile-coverage-20261008.json');
addedFiles.push('tests/fixtures/history/public-audit-20261006-app.js','tests/fixtures/history/public-audit-20261006-index.html');
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');

test('public audit asset stage is exact, reversible and limited to three content-version fragments',()=>{
 assert.equal(f.baseCommit,'079eaea16e636f2e91ab2cb0e6ffa309f589440e');assert.deepEqual(Object.keys(f.files),['assets/app.js','index.html']);
 const prefixes={'assets/app.js':['catalog.json?v=','application-experiences.json?v='],'index.html':['./assets/app.js?v=']};
 for(const [path,e] of Object.entries(f.files)){
  assert.equal(e.kind,'text_fragments');assert.equal(e.operations.length,prefixes[path].length);
  e.operations.forEach((op,i)=>{for(const side of ['before','after']){assert(op[side].startsWith(prefixes[path][i]));assert.match(op[side].slice(prefixes[path][i].length),/^[0-9a-f]{12}$/);}assert.notEqual(op.before,op.after);});
  const current=dateSummaryBytes(path,raDeadlineBytes(path,detailReturnBytes(path,cuhkDeadlineBytes(path,profileCoverageBytes(path,read(path)))))),old=publicAuditReleaseBytes(path,current);assertCurrentPublicAuditAsset(path,current);
  assert.equal(hash(old),e.beforeSha256);assert.equal(git(old),e.beforeGitBlob);assert.equal(git(current),e.afterGitBlob);
  assert.deepEqual(publicAuditReleaseBytes(path,old,'forward'),current);assert.deepEqual(publicAuditReleaseBytes(path,old),old);
  // Independent old manifest hashes, not generated from this working tree.
  assert.equal(hash(old),previous.allowedFiles.find(x=>x.path===path).sha256);
 }
});

test('asset inverse never hides logic edits, unrelated fields, whitespace or partial version rollback',()=>{
 for(const [path,e] of Object.entries(f.files)){
  const raw=dateSummaryBytes(path,raDeadlineBytes(path,detailReturnBytes(path,cuhkDeadlineBytes(path,profileCoverageBytes(path,read(path))))));const mutants=[Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(String(raw).replace('\n','\n// unreviewed change\n')),...e.operations.map(op=>Buffer.from(String(raw).replace(op.after,()=>op.before)))];
  for(const altered of mutants){assert.throws(()=>assertCurrentPublicAuditAsset(path,altered),/unreviewed current asset/);assert.strictEqual(publicAuditReleaseBytes(path,altered),altered);}
 }
});

test('current release pointers and every computed counter describe actual data while dated history stays immutable',()=>{
 assert.equal(manifest.revision,'public-audit-20261006');assert.equal(manifest.baseSourceCommit,f.baseCommit);assert.equal(manifest.candidateBaseCommit,f.baseCommit);assert.equal(manifest.snapshotDate,'2026-10-06');
 const counts=JSON.parse(execFileSync(process.execPath,['scripts/public-counts.mjs'],{cwd:fileURLToPath(root),encoding:'utf8'}));
 for(const [key,value]of Object.entries(counts))assert.equal(manifest[key],value,'raw current count: '+key);
 assert.equal(manifest.experienceRecords,27);assert.equal(manifest.defaultExperienceRecords,27);assert.equal(manifest.experienceSourceSites,20);assert.equal(manifest.preservedPublishedRecords,26);assert.equal(manifest.newExperienceRecords,1);
 const audit=manifest.publicAudit20261006;assert.equal(audit.baseCommit,f.baseCommit);assert.equal(audit.previousReleaseSnapshot,'tests/fixtures/history/reviewed-pre-public-audit-release-079eaea.json');assert.equal(audit.previousReleaseSha256,previousPublicAuditReleaseSha256);assert.deepEqual(audit.newExperienceIds,['grad-heu-sunbohan-research-selection-2026']);assert.equal(audit.preservedExperienceRecords,26);assert.equal(audit.synthesizedExperienceRecords,26);assert.equal(audit.pendingSynthesisRecords,1);
 const mutable=new Set(['revision','baseSourceCommit','candidateBaseCommit','snapshotDate','preservedPublishedRecords','newExperienceRecords','allowedFiles','newProfileCitedSourceCount',...Object.keys(counts)]);
 for(const [key,value]of Object.entries(previous))if(!mutable.has(key))assert.deepEqual(manifest[key],value,'preserved historical/reviewer metadata: '+key);
 assert.deepEqual(Object.keys(manifest).filter(k=>!Object.hasOwn(previous,k)),['publicAudit20261006']);
 assert.equal(manifest.browserVisualQA,'Not yet browser-verified.');assert.match(manifest.status,/do not establish deployment/);for(const key of ['nodeTestsTotal','nodeTestsPassed','nodeTestsFailed'])assert(!Object.hasOwn(manifest,key));assert(!JSON.stringify(manifest).includes('socket'));assert(!JSON.stringify(manifest).includes('Chromium'));
 assert.equal(hash(read(audit.previousReleaseSnapshot)),previousPublicAuditReleaseSha256);
});

test('current allowlist preserves every legacy file and includes the complete strict replay dependency graph',()=>{
 const expected=[...previous.allowedFiles.map(x=>x.path),...addedFiles].sort();assert.equal(new Set(expected).size,expected.length);
 assert.deepEqual(manifest.allowedFiles.map(x=>x.path),expected);assert(!expected.includes('release-manifest.json'),'avoid a self-referential manifest hash');
 for(const row of manifest.allowedFiles){const bytes=read(row.path);assert.equal(bytes.length,row.bytes,row.path);assert.equal(hash(bytes),row.sha256,row.path);}
 for(const path of previous.allowedFiles.filter(x=>x.path.startsWith('tests/fixtures/history/'))){assert.equal(hash(read(path.path)),path.sha256,'immutable old fixture: '+path.path);}
 // Keeping the independent prior manifest allowlisted is safe: it is a fixed
 // past snapshot and contains no hash of this new fixture or current manifest.
 assert(!previous.allowedFiles.some(x=>addedFiles.includes(x.path)));
});

test('README separates recomputed current candidate counts from preserved 26-case 19-platform history',()=>{
 const readme=String(read('README.md'));
 const scope=readme.split('## 当前本地候选（2026-10-06，尚未发布）\n')[1]?.split('\n## ')[0];assert(scope);
 const counts=JSON.parse(execFileSync(process.execPath,['scripts/public-counts.mjs'],{cwd:fileURLToPath(root),encoding:'utf8'}));
 assert(scope.includes(`当前共 ${counts.experienceRecords} 篇申请经验、${counts.experienceSourceSites} 个来源站点或合集`));
 for(const text of [`${counts.advisorCatalogCount} 位导师`,`${counts.projectCatalogCount} 个项目`,`${counts.verifiedDegreeAssociationCount} 条已核实个人学位关联`,`${counts.raPositionCount} 个独立 RA 岗位`,`${counts.profilePilotCount} 份导师简介`,`${counts.projectSummaryRecords} 份项目简介`,`${counts.materialRecords} 组材料摘要`])assert(scope.includes(text),text);
 assert(scope.includes('原 26 篇经验及其来源对象保持不变'));assert(scope.includes('1 篇尚待综合'));assert(scope.includes('尚未发布'));assert(scope.includes('不代表 GitHub Pages 已部署'));assert(scope.includes('不代表真实浏览器验收完成'));
 assert(readme.includes('前版历史条目（本批之前的快照，原文保留）：当前30份项目简介、17组材料摘要、26篇经验'));
 assert(readme.includes('前版历史记录（本批之前的快照，原文保留）：本仓库包含 26 篇有来源的申请经验与覆盖全部案例的综合归纳。'));
 assert(readme.includes('**申请经验**（前版历史条目，原数字保留；当前为 27 篇、20 个来源，1 篇待综合）：26 篇、19 个来源站点或合集'));
});
