import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {normalizeProjectSummaries,renderRecordSummary} from '../assets/record-summaries.js';
import {assertReviewedPublicData} from './reviewed-public-data.mjs';
import {reverseBoundedRecruitmentReview} from './evidence-reviews.mjs';
import {buildOpportunities} from '../assets/core.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
const catalog=json('data/catalog.json'),raw=json('data/material-summaries.json'),projects=json('data/project-summaries.json');
const receipt=json('tests/fixtures/evidence/hku-ris-materials-20261011.json');
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const baselineHashes={"data/catalog.json":"4ee1ebc798beefcfe0a68934bdd2e7ffc4b96d99cf3bd873f4c46cc11dd566a5","data/project-summaries.json":"77b000d870b5ad85df276fbc23f71f4ee1b458a439252e2060a20b157a15d46e","data/material-summaries.json":"5df80564b3228d5393e256c3bcc183212bcc6468eb0be4293321d36d14f71d6e"};
const route=catalog.routes.find(r=>r.id==='hku-ris-msc');
const material=normalizeMaterialSupplement(raw,catalog).find(r=>r.id==='hku-ris-msc-materials');
const summary=normalizeProjectSummaries(projects,catalog).get('hku-ris-msc');

test('HKU RIS review is exactly reversible to the independently fetched October 11 baseline',()=>{
 // Remove only the independent MRL review; earlier homepage/appointment facts
 // belong to this baseline and must remain intact. Keep all original hashes.
 const files=reverseBoundedRecruitmentReview(Object.fromEntries([...Object.keys(baselineHashes),'data/advisor-profiles.json'].map(p=>[p,json(p)])),read);
 assert.equal(crypto.createHash('sha256').update(read('tests/fixtures/evidence/hku-ris-materials-20261011.json')).digest('hex'),'363d5714471f91fcc43bbbf4b0749c1ab048efb78da178164eecf66530dd7af1');
 assert.equal(files['data/catalog.json'].routes[33].id,'hku-ris-msc');
 assert.equal(files['data/project-summaries.json'].records[27].routeId,'hku-ris-msc');
 assert.equal(files['data/material-summaries.json'].records[12].id,'hku-ris-msc-materials');
 for(const op of [...receipt.operations].reverse()){
  const keys=op.path.slice(1).split('/').map(k=>k.replaceAll('~1','/').replaceAll('~0','~'));
  let owner=files[op.file];for(const key of keys.slice(0,-1))owner=owner[key];const key=keys.at(-1);
  assert.deepEqual(owner[key],op.value,'exact reviewed new value');
  if(op.operation==='replace')owner[key]=op.old;
  else {assert.equal(op.operation,'add');assert(Array.isArray(owner));assert.equal(+key,owner.length-1);owner.pop();}
 }
 for(const [p,hash]of Object.entries(baselineHashes))assert.equal(sha(files[p]),hash,p+' exact baseline semantic hash');
 const all=Object.fromEntries(fs.readdirSync(new URL('../data/',import.meta.url)).filter(p=>p.endsWith('.json')).map(p=>['data/'+p,json('data/'+p)]));
 assertReviewedPublicData(all,read);
});

test('RIS CV and PS are required, recommendation exemption remains distinct from optional submission',()=>{
 assert(material&&summary);assert.equal(normalizeMaterialSupplement(raw,catalog).length,17);assert.equal(normalizeProjectSummaries(projects,catalog).size,32);
 const cv=material.requirements.find(x=>x.kind==='cvPersonalStatement');assert.equal(cv.requirementStatus,'required');assert(cv.sourceIds.includes('hku_ris_portal_20261011'));
 assert.match(cv.text,/个人陈述、成绩单和CV/);assert(material.scopeNotes.some(x=>/不要求推荐信/.test(x)&&/不等于已证实可选提交/.test(x)));
 assert(!material.requirements.some(x=>x.kind==='references'&&x.requirementStatus==='optional'));
 assert(material.unknowns.some(x=>/研究计划/.test(x)));assert(material.unknowns.some(x=>/未标年份/.test(x)));
 const html=renderRecordSummary('material',material,catalog).html;assert(html.includes('不要求推荐信'));assert(html.includes('未标年份'));assert(html.includes('实际申请入口和所有必填字段未验证'));assert(!/undefined|\[object Object\]/.test(html));
});

test('current RIS sources bind R394 to the 2027 taught programme without changing degrees or actual-open status',()=>{
 const source=raw.sources.find(s=>s.id==='hku_ris_portal_20261011'),pdf=raw.sources.find(s=>s.id==='hku_ris_support_20261011');assert(source.url.includes('robotics-and-intelligent-systems'));assert(source.section.includes('R394'));assert(source.section.includes('2027 September'));
 assert(pdf.url.includes('pREF_CODE=R394'));assert(pdf.url.includes('pDOCUMENT_TYPE=SUPPORTDOCUMENT'));assert.match(pdf.sourceVersion,/PDF本身未标年份/);assert.equal(pdf.sha256,'05ed83e1479ae38ef71304ee9564adcc2ff5cdd620c44e6bcd1f71dd92c2f646');
 assert.equal(route.degree,'MSc');assert.equal(route.applicationStatus,'unknown');assert.equal(route.checkedDate,'2026-10-04');assert.equal(material.checkedDate,'2026-10-04');assert(route.notes[0].includes('未登录或测试实际提交'));
 for(const d of catalog.deadlines.filter(d=>d.routeIds?.includes(route.id))){assert.equal(d.status,'unknown');assert.equal(d.deadlineTime,'12:00');assert.equal(d.timezone,'Asia/Hong_Kong');assert.equal(d.checkedDate,'2026-10-04');assert(d.note.includes('官方仍写预计'));assert(!d.sources.some(s=>s.checkedDate==='2026-10-11')); }
 assert(!receipt.operations.some(op=>op.file==='data/catalog.json'&&op.path.startsWith('/deadlines/')));
 assert.equal(catalog.advisors.length,334);assert.equal(catalog.routes.length,65);assert.equal(catalog.deadlines.length,31);
 const ops=buildOpportunities({...catalog,raPositions:json('data/ra-positions.json').raPositions});assert.equal(ops.filter(o=>o.kind==='degree').length,57);assert.equal(ops.filter(o=>o.kind==='employment').length,2);
});
