import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
// These files already belong to the reviewed repository history. They must also
// survive packaging, even when the input manifest predates the allowlist repair.
const historicalFiles=[
 'tests/fixtures/history/reviewed-pku-20261004.json',
 'tests/fixtures/history/reviewed-seven-schools-20261005.json',
 'tests/freeze-preservation.test.mjs',
 'tests/pku-baseline.mjs',
 'tests/pku-history.test.mjs',
 'tests/seven-schools-baseline.mjs',
 'tests/seven-schools-history.test.mjs',
 'tests/current-main-baseline.mjs',
 'tests/current-main-history.test.mjs',
 'tests/fixtures/history/reviewed-current-main-03b16.json'
];
const sourceManifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
const publicFiles=[...new Set([...sourceManifest.allowedFiles.map(row=>row.path),...historicalFiles])].sort();
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const freeze=dir=>execFileSync('python3',['scripts/freeze.py'],{cwd:dir,encoding:'utf8',stdio:'pipe'});
function fixture(prefix){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
 try {
  for(const name of ['release-manifest.json',...publicFiles]){
   const target=path.join(dir,name);
   fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.copyFileSync(path.join(root,name),target);
  }
  return dir;
 } catch(error){fs.rmSync(dir,{recursive:true,force:true});throw error;}
}
function snapshot(dir){return new Map(publicFiles.map(name=>[name,fs.readFileSync(path.join(dir,name))]));}
function assertUnchanged(dir,before){
 for(const [name,bytes] of before)assert.deepEqual(fs.readFileSync(path.join(dir,name)),bytes,name);
}
function profileSourceCount(dir){
 const sources=new Set();
 const collect=value=>{
  if(Array.isArray(value)){value.forEach(collect);return;}
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
   if(key==='sources')item.forEach(source=>sources.add(source.url));
   else collect(item);
  }
 };
 collect(JSON.parse(fs.readFileSync(path.join(dir,'data/advisor-profiles.json'),'utf8')).profiles.slice(30));
 return sources.size;
}

test('freeze preserves reviewed metadata, refreshes real counts and hashes, and is byte-idempotent',()=>{
 const dir=fixture('grad-freeze-');
 try {
  const before=snapshot(dir);
  const injected=structuredClone(sourceManifest);
  injected.futureContributorMetadata={source:'preserve this exact object',nested:{value:17,list:[null,false,'后续审核']}};
  injected.browserVisualQA='A future reviewer recorded an exact run here.';
  injected.overseasProjects20261004.futureEvidence={review:'preserve nested metadata'};
  const counts=JSON.parse(execFileSync('node',['scripts/public-counts.mjs'],{cwd:dir,encoding:'utf8'}));
  for(const key of Object.keys(counts))injected[key]=-1;
  injected.newProfileCitedSourceCount=-1;
  injected.allowedFiles=injected.allowedFiles.map(row=>({...row,bytes:-1,sha256:'0'.repeat(64)}));
  fs.writeFileSync(path.join(dir,'release-manifest.json'),JSON.stringify(injected,null,2)+'\n');
  const run=JSON.parse(freeze(dir));
  const first=fs.readFileSync(path.join(dir,'release-manifest.json'));
  const result=JSON.parse(first);
  const expectedFiles=publicFiles.map(name=>{
   const bytes=fs.readFileSync(path.join(dir,name));
   return {path:name,bytes:bytes.length,sha256:sha256(bytes)};
  });
  assert.deepEqual(result,{...injected,...counts,newProfileCitedSourceCount:profileSourceCount(dir),allowedFiles:expectedFiles});
  assert.equal(run.fileCount,expectedFiles.length);
  assert.equal(run.manifestSha256,sha256(first));
  for(const name of historicalFiles)assert(result.allowedFiles.some(row=>row.path===name),name);
  assertUnchanged(dir,before);
  freeze(dir);
  assert.deepEqual(fs.readFileSync(path.join(dir,'release-manifest.json')),first);
  assertUnchanged(dir,before);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('freeze rejects missing or invalid source manifests before touching complete application fixtures',()=>{
 const invalidManifests=[null,'{invalid','null','[]','42','{}',JSON.stringify({project:'another-project'})];
 for(const number of ['NaN','Infinity','-Infinity','1e999','-1e999']){
  invalidManifests.push('{"project":"GradCompass","futureContributorMetadata":{"number":'+number+'}}');
 }
 for(const contents of invalidManifests){
  const dir=fixture('grad-freeze-invalid-');
  try {
   const appPath=path.join(dir,'assets/app.js');
   const originalApp=fs.readFileSync(appPath,'utf8');
   const staleApp=originalApp.replace(/\?v=[0-9a-f]+/,'?v=000000000000');
   assert.notEqual(staleApp,originalApp,'fixture contains a deliberately stale asset URL');
   fs.writeFileSync(appPath,staleApp);
   const before=snapshot(dir);
   const manifestPath=path.join(dir,'release-manifest.json');
   if(contents===null)fs.unlinkSync(manifestPath);
   else fs.writeFileSync(manifestPath,contents);
   assert.throws(()=>freeze(dir),error=>{
    assert.match(String(error.stderr),/Expected an existing GradCompass release manifest/);
    return true;
   });
   assertUnchanged(dir,before);
   if(contents===null)assert.equal(fs.existsSync(manifestPath),false);
   else assert.equal(fs.readFileSync(manifestPath,'utf8'),contents);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
 }
});
