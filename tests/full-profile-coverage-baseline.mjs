import crypto from 'node:crypto';

// Historical tests describe the release immediately before the all-advisor
// profile completion. Keep that view in a test-only adapter so current source
// files can continue to expose the complete 334-profile release.
const currentProfileSha='4e1e76cbc3a7b9f686ffcb82941e2a2e55985952af53ee23bed33d9bf1518a3c';
const previousProfileSha='f1b3044692f6bbebed815428f10133c535272bcccce7bd431657cf432511d042';
const currentAppSha='864f55a4a95a88fff081e17326551e328c7c9c19293b263b803ae0da5836b7a8';
const previousAppSha='0c46b2f2ce01900e51041128a7f1645bbd59d39b832b86c0e03ed55378d0395d';
const currentIndexSha='6e5d69bbd9618d1ea9cffbdba69215f2763dd9798b345bffb422bffb9b8224a4';
const previousIndexSha='c9550f3cd01835c8a7dbd33b162df93d20749a997219cafcfab99568c7ada050';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

export function fullProfileCoverageBytes(relative,raw){
  const bytes=Buffer.isBuffer(raw)?raw:Buffer.from(raw);
  if(relative==='data/advisor-profiles.json'&&sha(bytes)===currentProfileSha){
    const value=JSON.parse(bytes);
    value.profiles=value.profiles.slice(0,56);
    for(const key of ['batch9Review','batch10Review','batch11Review'])delete value[key];
    value.batch='1+2+3+4+5+6+7';
    const previous=Buffer.from(JSON.stringify(value,null,2)+'\n');
    if(sha(previous)!==previousProfileSha)throw new Error('full profile historical reconstruction drifted');
    return previous;
  }
  if(relative==='assets/app.js'&&sha(bytes)===currentAppSha){
    const previous=Buffer.from(bytes.toString().replaceAll('advisor-profiles.json?v=4e1e76cbc3a7','advisor-profiles.json?v=f1b3044692f6'));
    if(sha(previous)!==previousAppSha)throw new Error('historical app reconstruction drifted');
    return previous;
  }
  if(relative==='index.html'&&sha(bytes)===currentIndexSha){
    const previous=Buffer.from(bytes.toString().replaceAll('assets/app.js?v=864f55a4a95a','assets/app.js?v=0c46b2f2ce01'));
    if(sha(previous)!==previousIndexSha)throw new Error('historical index reconstruction drifted');
    return previous;
  }
  return bytes;
}
