import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
test('freeze preserves reviewed metadata, refreshes real counts, and is byte-idempotent',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grad-freeze-'));
 try {
  const original=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
  const names=['release-manifest.json',...original.allowedFiles.map(row=>row.path)];
  for(const name of names){const target=path.join(dir,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,name),target);}
  const before=new Map(names.filter(name=>name!=='release-manifest.json').map(name=>[name,fs.readFileSync(path.join(dir,name))]));
  const injected=structuredClone(original);
  injected.futureContributorMetadata={source:'preserve this exact object',nested:{value:17}};
  injected.browserVisualQA='A future reviewer recorded an exact run here.';
  injected.overseasProjects20261004.futureEvidence={review:'preserve nested metadata'};
  const counts=JSON.parse(execFileSync('node',['scripts/public-counts.mjs'],{cwd:dir,encoding:'utf8'}));
  for(const key of Object.keys(counts))injected[key]=-1;
  fs.writeFileSync(path.join(dir,'release-manifest.json'),JSON.stringify(injected,null,2)+'\n');
  execFileSync('python',['scripts/freeze.py'],{cwd:dir});
  const first=fs.readFileSync(path.join(dir,'release-manifest.json'));
  const result=JSON.parse(first);
  assert.deepEqual(result,{...injected,...counts});
  for(const [name,bytes] of before)assert.deepEqual(fs.readFileSync(path.join(dir,name)),bytes,name);
  execFileSync('python',['scripts/freeze.py'],{cwd:dir});
  assert.deepEqual(fs.readFileSync(path.join(dir,'release-manifest.json')),first);
  for(const [name,bytes] of before)assert.deepEqual(fs.readFileSync(path.join(dir,name)),bytes,name);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('freeze rejects missing or invalid source manifests before touching application files',()=>{
 for(const contents of [null,'{invalid',JSON.stringify({project:'another-project'})]){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grad-freeze-invalid-'));
  try {
   fs.mkdirSync(path.join(dir,'scripts'));
   fs.copyFileSync(path.join(root,'scripts/freeze.py'),path.join(dir,'scripts/freeze.py'));
   fs.mkdirSync(path.join(dir,'assets'));
   fs.writeFileSync(path.join(dir,'assets/app.js'),'untouched sentinel');
   if(contents!==null)fs.writeFileSync(path.join(dir,'release-manifest.json'),contents);
   assert.throws(()=>execFileSync('python',['scripts/freeze.py'],{cwd:dir,stdio:'pipe'}));
   assert.equal(fs.readFileSync(path.join(dir,'assets/app.js'),'utf8'),'untouched sentinel');
   assert.equal(fs.existsSync(path.join(dir,'index.html')),false);
   if(contents!==null)assert.equal(fs.readFileSync(path.join(dir,'release-manifest.json'),'utf8'),contents);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
 }
});
