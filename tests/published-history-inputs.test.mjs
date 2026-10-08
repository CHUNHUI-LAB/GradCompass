import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import historicalFs,{publishedBytes,publishedPaths,publishedFileMetadata,publishedIdentities,decodePublishedArchive,publishedCommit,publishedTree,runPublishedCounts} from './published-history-fs.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('historical reader is pinned to the published commit and checks each archived Git blob',()=>{
 assert.equal(publishedCommit,'4653bbd56a237a618a58c6f599e32e071ddf7094');assert.equal(publishedTree,'140c6dc4d69cefadb4bb89836261bdc158bb19a2');assert.equal(publishedPaths.length,51);
 for(const p of publishedPaths){const b=publishedBytes(p),identity=publishedFileMetadata(p);assert.equal(hash(b),identity.sha256);assert.deepEqual(identity,publishedIdentities[p]);assert.deepEqual(historicalFs.readFileSync(new URL(p,root)),b);}
 const counts=runPublishedCounts(),manifest=JSON.parse(publishedBytes('release-manifest.json'));for(const [key,value]of Object.entries(counts))assert.equal(manifest[key],value,key+' independently recomputed historical count');
});
test('all pre-existing immutable fixtures and baseline algorithms retain their published bytes',()=>{
 for(const [p,row]of Object.entries(publishedIdentities).filter(([p])=>p.startsWith('tests/fixtures/history/')||/^tests\/.*baseline\.mjs$/.test(p)||p==='tests/strict-history-transform.mjs')){assert.equal(hash(read(p)),row.sha256,p+' historical evidence must not be rewritten');assert.equal(read(p).length,row.bytes);}
});
test('corrupted archive, mutated returned buffers, unknown paths and production imports cannot weaken history',()=>{
 const raw=read('tests/fixtures/history/published-inputs-4653bbd.json.gz');for(const bad of [Buffer.concat([raw,Buffer.from(' ')]),Buffer.from(raw.subarray(0,-1))])assert.throws(()=>decodePublishedArchive(bad),/immutable published input archive/);
 const copy=publishedBytes('data/catalog.json');copy.fill(0);assert.notDeepEqual(publishedBytes('data/catalog.json'),copy,'readers cannot mutate the internal archive');assert.throws(()=>publishedBytes('../data/catalog.json'),/unarchived/);
 for(const p of ['assets/app.js','assets/core.js','scripts/public-counts.mjs'])assert(!String(read(p)).includes('published-history-fs'),'test reader must not enter production');
});
