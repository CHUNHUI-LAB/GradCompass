import {avatarInitialsBytes} from './avatar-initials-baseline.mjs';
import {currentMainBytes,currentMainObject} from './current-main-baseline.mjs';
import {sevenBytes,sevenObject} from './seven-schools-baseline.mjs';
import {pkuBytes,pkuObject} from './pku-baseline.mjs';
import {overseasBytes,overseasObject} from './overseas-baseline.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {detailUiBytes} from './detail-ui-baseline.mjs';
import {currentCorrectionFixture as previousCandidateFixture} from './current-correction-baseline.mjs';
import {snapshotHash,transformSnapshotBytes,transformSnapshotObject,identifySnapshot} from './strict-history-transform.mjs';
const concurrentRaw=fs.readFileSync(new URL('./fixtures/history/reviewed-concurrent-3f294.json',import.meta.url));
assert.equal(snapshotHash(concurrentRaw),'cee2c0ec1d48f68ce52fea5650e1ae43c05312b7fa7849a5c7c0b589fce10228','immutable concurrent 3f294 source fixture');
export const concurrent3fFixture=JSON.parse(concurrentRaw);
const currentRaw=fs.readFileSync(new URL('./fixtures/history/reviewed-current-3f294-corrections.json',import.meta.url));
assert.equal(snapshotHash(currentRaw),'b4670b43babaf03884a7c511fa1582cbc178a2aaa879b36320e4d65bcd1c6adb','immutable reviewed 3f294 evidence correction fixture');
export const latestCorrectionFixture=JSON.parse(currentRaw);
export const latestCorrectionBytes=(path,bytes)=>transformSnapshotBytes(latestCorrectionFixture,path,bytes);
export const concurrent3fBytes=(path,bytes)=>transformSnapshotBytes(concurrent3fFixture,path,bytes);
export const latestSourceBytes=(path,bytes)=>concurrent3fBytes(path,latestCorrectionBytes(path,detailUiBytes(path,overseasBytes(path,pkuBytes(path,sevenBytes(path,currentMainBytes(path,avatarInitialsBytes(path,bytes))))))));
export function latestSourceBaseline(data,path=identifySnapshot(data)){
 return transformSnapshotObject(concurrent3fFixture,path,transformSnapshotObject(latestCorrectionFixture,path,overseasObject(path,pkuObject(path,sevenObject(path,currentMainObject(path,data))))));
}
// Frozen historical candidate input for its unchanged source hashes and negative
// controls. This is an exact forward reconstruction from 5c27, never an assertion
// that old corrected content is still the latest public source.
export function previousCandidateBytes(path,bytes){
 return transformSnapshotBytes(previousCandidateFixture,path,latestSourceBytes(path,bytes),'forward');
}
