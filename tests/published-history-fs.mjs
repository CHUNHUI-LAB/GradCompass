// Historical inputs come from one published commit, never from mutable live data.
// This reader is test-only. Production/current-source tests retain node:fs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
export const publishedCommit='4653bbd56a237a618a58c6f599e32e071ddf7094';
export const publishedTree='140c6dc4d69cefadb4bb89836261bdc158bb19a2';
export const publishedArchiveSha256='a97bb5479abfc737a6059928e70d8401c3d16668e9eeff8e5483c7aaa6c571ef';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const root=fileURLToPath(new URL('../',import.meta.url));
export function decodePublishedArchive(compressed){
 assert.equal(sha(compressed),publishedArchiveSha256,'immutable published input archive');
 const snapshot=JSON.parse(gunzipSync(compressed));
 assert.equal(snapshot.schemaVersion,1);assert.equal(snapshot.commit,publishedCommit);assert.equal(snapshot.tree,publishedTree);
 for(const [name,row]of Object.entries(snapshot.files)){
  assert(!path.isAbsolute(name)&&!name.split('/').includes('..'),'safe historical path');
  const bytes=Buffer.from(row.base64,'base64');assert.equal(bytes.length,row.bytes,name+' historical length');assert.equal(sha(bytes),row.sha256,name+' historical SHA-256');
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),row.gitBlob,name+' published Git blob');
 }
 return snapshot;
}
const archive=decodePublishedArchive(fs.readFileSync(new URL('./fixtures/history/published-inputs-4653bbd.json.gz',import.meta.url)));
export const publishedIdentities=Object.freeze(structuredClone(archive.identities));
export const publishedPaths=Object.freeze(Object.keys(archive.files));
// The original archive did not embed this test input. Its supplemental bytes
// come from the same published commit and must match that archive's identities.
// Keep the original 51 archived paths and compressed archive unchanged.
export const supplementalPublishedPaths=Object.freeze(['tests/render.test.mjs']);
export function decodePublishedSupplement(name,raw){
 assert.equal(name,'tests/render.test.mjs','outside the single published supplement');
 const identity=archive.identities[name],bytes=Buffer.from(raw);
 assert.equal(bytes.length,identity.bytes,name+' supplemental historical length');
 assert.equal(sha(bytes),identity.sha256,name+' supplemental historical SHA-256');
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),identity.gitBlob,name+' supplemental published Git blob');
 return bytes;
}
const publishedSupplement=decodePublishedSupplement('tests/render.test.mjs',fs.readFileSync(new URL('./fixtures/history/published-render-4653bbd.mjs',import.meta.url)));
export function supplementalPublishedBytes(name){
 assert.equal(name,'tests/render.test.mjs','outside the single published supplement');
 return Buffer.from(publishedSupplement);
}

export function publishedBytes(name){assert(Object.hasOwn(archive.files,name),'unarchived historical input: '+name);return Buffer.from(archive.files[name].base64,'base64');}
export function publishedFileMetadata(name){assert(Object.hasOwn(archive.files,name));const {base64,...metadata}=archive.files[name];return {...metadata};}
export function runPublishedCounts(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gradcompass-published-counts-'));
 try{
  for(const name of publishedPaths.filter(p=>p.startsWith('assets/')||p.startsWith('data/')||p==='scripts/public-counts.mjs'||p==='package.json')){const target=path.join(dir,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,publishedBytes(name));}
  return JSON.parse(execFileSync(process.execPath,['scripts/public-counts.mjs'],{cwd:dir,encoding:'utf8'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
export default {...fs,readFileSync(file,options){
 const filename=file instanceof URL?fileURLToPath(file):typeof file==='string'?file:null;
 if(filename===null)return fs.readFileSync(file,options);
 const relative=path.relative(root,filename).split(path.sep).join('/');
 if(!Object.hasOwn(archive.files,relative)&&relative!=='tests/render.test.mjs')return fs.readFileSync(file,options);
 const bytes=relative==='tests/render.test.mjs'?supplementalPublishedBytes(relative):publishedBytes(relative),encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}};
