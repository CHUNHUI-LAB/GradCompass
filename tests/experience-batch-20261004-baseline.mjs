import {historicalSourceBytes} from './historical-source-baseline.mjs';
// Fixed c61dc2 public baseline. Never derive expected hashes from the working tree or release manifest.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {advisorAdditionsBaseline} from './advisor-additions-baseline.mjs';
export const batchIds=Object.freeze(["grad-zuoyihang-redbird-camp-2022", "grad-1p3-c98sd-cuhksz-phd-2026", "grad-sustech-luanwd-cuhksz-msds-2021", "grad-sustech-dengrb-robotics-2021", "grad-zuoduan-westlake-ai4sci-2024"]);
export const originalIds=Object.freeze(["grad-robotics-eth-xiang-2022", "grad-europe-tinsir-2025", "grad-bjut-mty-2026", "grad-sustech-yunzx-2023", "grad-ptt-tum-rci-2022", "grad-dcard-ece-ra-phd-2025", "grad-dcard-bme-ece-2026", "grad-reddit-cs-interviews-2025", "grad-ngaizean-hkustgz-2026", "grad-szu-mingkangchen-2025", "grad-xhs-xiga-ra-mphil-2025", "grad-gter-chuyeyue-ra-phd-2024", "grad-gter-sscomebady-mphil-2018", "grad-gter-imhigh-hkust-mphil-2015", "grad-drishti-akash-hkust-intern-2023", "grad-wangbard-cryptography-phd-2025", "grad-sustech-lisr-hkust-2025", "grad-ruakoyo-hku-interview-2024", "grad-shufly-w-hongkong-2024", "grad-scut-fengyt-redbird-2023", "grad-benjamin-hkustgz-research-2026"]);
export const previousBatchMetadata=Object.freeze({latestBatchBaseCommit:'4840df6a9718ec38e472f8fd7496047248029e71',latestBatchReviewDate:'2026-10-03'});
export const protectedFileHashes=Object.freeze({
  "data/catalog.json": "e27dd63873e62dc1d782a0ecb4830443eeb670a841e7c751419bb75c95e5caa3",
  "data/advisor-profiles.json": "204c974d088880c3302a81efe9748e776a8414dac2f0ff1190c03119da00ae2c",
  "data/material-summaries.json": "d18a6017fad6c3d0a072c0a0fc4aa2bb4cfc339623afc8a570bf516a40a86fe9",
  "data/project-summaries.json": "a41975a878a610be8e19dd7ac416c433677b88c4d7d2237a6d9f90cc949c3a94",
  "data/ra-positions.json": "b5354ece6ee48d205665af699e008e74d51c41ca23000c7fc653eccfc906816e",
  "data/update-status.json": "b96e217f713537808ee7874c3638ed0e2add57d514b2a23232085dd73d35cad5",
  "data/maintenance-2026-10-03.json": "93464a3d9862428a640df899a490cc1e041adbf239eff3d5a5cbbd1568bf198f",
  "data/catalog-test-manifest.json": "d7824ea7a17eef0af78577dd57daae941befb9af02e68adf9ce7abe9d54fa9a7",
  "assets/style.css": "8bdf5b250a9e88e4aaf8f311f6c79520cd2b81b1702a702333ce931ee651f98a",
  "assets/project-comparison.js": "007137a737d75065c7a574727c776a4069db2ef8b860f95cfac933fc78c80a3c",
  "assets/core.js": "cad4681d907cdf380dad2b1ab4c9b42ee33829e11fafeb73b9ad0b072975a927",
  "assets/profiles.js": "6b6ce55c9e97edb8060976e5f82a631ed47275d6304d72bba4c0caf649606e88",
  "assets/record-summaries.js": "5597dac07f8a420aef7d477c1a36cdd2611f74a2e3fef68e3e2a8b6ebcede5d9",
  "assets/material-supplement.js": "44c8f5821e4c828503b6efefc6cd6a75f560c2de0067f855531337c025511d03",
  "assets/campus-art.webp": "20df89a1bba44680d783dbd3a921993136cdc6d1bd55444f857f1dea3b27a766",
  "assets/favicon.svg": "f2e69aa0eeaf1a41932734621ec1c55d662ef6cf322fae62fa94b0429eef0d5c"
});
export const versionOnlyFileHashes=Object.freeze({
  // Restored from the exact 5e7cd36 test/source tree, not from current bytes.
  "assets/app.js": "eb03556b888f694449e1f988707c8242c57cf30fcabc82926db0a790869f19dc",
  "index.html": "0e0374a9b3443830050a829dbad43feb5b9ef9467fc00e2d194456e261977667"
});
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const objectHash=value=>sha256(JSON.stringify(value));
const baselineFileHashes=Object.freeze({'application-experiences.json':'030838a887111dacaf2b0fe9d001c52c3da4ea4da2369cdfdb08c2e8f55411c7','application-experience-provenance.json':'5b89f9758c2a364412f19ce2ac8d75f7ccf735ecfab3a014119c70c4ce8ac82b'});

// Undo only this declared batch. Do not repair unknown metadata or discard other records.
// The old October 3 inverse runs AFTER this helper in maintenance-baseline.mjs.
export function experienceBatchBaseline(data){
 const copy=structuredClone(data);
 if(!copy.records?.some(r=>batchIds.includes(r.id)))return copy;
 for(const id of batchIds)assert.equal(copy.records.filter(r=>r.id===id).length,1,'batch membership: '+id);
 copy.records=copy.records.filter(r=>!batchIds.includes(r.id));
 if(Object.hasOwn(copy,'checkedAt')){
  assert.equal(copy.checkedAt,'2026-10-04','unexpected current experience date');
  copy.checkedAt='2026-10-03';
 }
 if(Object.hasOwn(copy,'latestBatchBaseCommit')){
  assert.equal(copy.latestBatchBaseCommit,'c61dc2c38c7f0c73a5720985a00dd83e97b9e2e6','unexpected batch base');
  assert.equal(copy.latestBatchReviewDate,'2026-10-04','unexpected current provenance date');
  assert.deepEqual(copy.batch20261004?.previousBatchMetadata,previousBatchMetadata,'unexpected prior metadata');
  Object.assign(copy,previousBatchMetadata);
  delete copy.batch20261004;
 }
 return copy;
}

export function assertExperienceBatchPreserved({experiences,provenance,files}){
 for(const [name,data,recordsHash] of [
  ['application-experiences.json',experiences,'05ec2be9cb9d29ed00645269286aeebb1b1aa8efbffa602b9e5a1a66f6a587be'],
  ['application-experience-provenance.json',provenance,'8e8bfedb5bb066fb8b21b3dd0f5eff61fec8d449cf6a4b5456618512d9c004c0']
 ]){
  assert.deepEqual(data.records.map(r=>r.id),[...originalIds,...batchIds],name+' exact append-only IDs');
  assert.equal(objectHash(data.records.slice(0,21)),recordsHash,name+' original 21 objects');
  assert.equal(sha256(JSON.stringify(experienceBatchBaseline(data),null,2)+'\n'),baselineFileHashes[name],name+' full restored baseline');
 }
 for(const [name,hash] of Object.entries(protectedFileHashes)){
  assert(files[name]!==undefined,'missing protected bytes: '+name);
  let bytes=historicalSourceBytes(name,files[name]);
  if(['data/catalog.json','data/advisor-profiles.json','data/material-summaries.json','data/project-summaries.json'].includes(name)){
   try{bytes=Buffer.from(JSON.stringify(advisorAdditionsBaseline(JSON.parse(bytes)),null,2)+'\n');}catch{}
  }
  assert.equal(sha256(bytes),hash,'protected bytes changed: '+name);
 }
 for(const [name,hash] of Object.entries(versionOnlyFileHashes)){
  assert(files[name]!==undefined,'missing version-only bytes: '+name);
  // Exact inverse of the bounded review-count display fix; preserve the prior runtime hash guard.
  const currentCount='`0 条机会 · 核查导师当前匹配 ${(sustechReview?.advisors||[]).filter(sustechReviewMatches).length} 位 / 队列共 ${(sustechReview?.advisors||[]).length} 位`';
  const previousCount='`0 条机会 · ${(sustechReview?.advisors||[]).length} 位核查导师`';
  const baselineUI=String(historicalSourceBytes(name,files[name])).replace(currentCount,previousCount);
  assert.equal(sha256(baselineUI.replace(/\?v=[0-9a-f]+/g,'?v=CONTENT')),hash,'non-version UI change: '+name);
 }
}
