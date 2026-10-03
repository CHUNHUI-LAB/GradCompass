import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {maintenanceBaseline} from './maintenance-baseline.mjs';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
import {normalizeProjectSummaries,renderRecordSummary} from '../assets/record-summaries.js';
import {filterRoutes,deadlineStatus} from '../assets/core.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../data/'+n,import.meta.url),'utf8')),c=read('catalog.json'),m=read('material-summaries.json'),p=read('project-summaries.json');
const url='https://www.cityu.edu.hk/pg/research-degree-programmes/steps-and-procedures';
test('CityU ordinary 2027/28 date is explicitly timed and independent of HKPFS or vacancy claims',()=>{
 const d=c.deadlines.find(x=>x.id==='cityu_me_rpg-main');assert.equal(d.date,'2026-12-01');assert(d.routeIds.includes('cityu_ds_phd'));assert(d.title.startsWith('CityUHK'));assert.equal(d.deadlineTime,'23:59（香港时间 UTC+8）');assert.equal(d.timezone,'Asia/Hong_Kong');assert.equal(d.status,'unknown');assert.equal(d.dateStatus,'upcoming');assert.equal(deadlineStatus(d,c.metadata.checkedDate),'unknown');assert.equal(d.checkedDate,'2026-10-01');
 assert.equal(d.cycleReview.checkedDate,'2026-10-03');assert.equal(d.cycleReview.observedAtUtc,'2026-10-03T06:24:13Z');assert.equal(d.cycleReview.sources[0].url,url);assert(!d.cycleReview.sourceConflict);assert.equal(d.cycleReview.history[0].sourceConflict.checkedDate,'2026-10-02');assert(d.cycleReview.reason.includes('未登录检查'));
 const html=renderRecordSummary('deadline',d,c).html;for(const t of ['2026-12-01','23:59','UTC+8','批次复核于 2026-10-03','主轮后','名额','实际提交'])assert(html.includes(t),t);assert(!html.includes('待复核（来源版本不一致）'));
});
test('CityU three current routes preserve eligibility and excluded MPhil remains excluded',()=>{
 for(const id of ['cityu_me_rpg-mphil','cityu_me_rpg-phd','cityu_ds_phd']){const r=c.routes.find(x=>x.id===id);assert.equal(r.cycle2027Verified,true);assert.equal(r.applicationStatus,'unknown');assert(r.admissionYear.includes('2026-12-01 23:59'));for(const k of ['bachelorEligible','noTuimianRequired','noMasterRequired'])assert.equal(r[k],true);assert.equal(r.checkedDate,'2026-10-01');assert.equal(r.sourceRecord.checked_at,'2026-10-01');}
 const excluded=c.routes.find(x=>x.id==='cityu_ds_mphil-excluded');assert.equal(excluded.status,'excluded');assert.equal(excluded.defaultVisible,false);assert.equal(filterRoutes(c).length,27);const dsHtml=renderRecordSummary('project',c.routes.find(x=>x.id==='cityu_ds_phd'),c).html;assert(dsHtml.includes('CityUHK 研究学位 2027/28 校级普通主轮截止'));assert(!dsHtml.includes('尚未收录该项目可核对的截止日期'));
});
test('current material date requirements render published school date with unchanged non-date documents',()=>{
 const old=maintenanceBaseline(m),rows=normalizeMaterialSupplement(m,c).filter(x=>x.institution==='CityUHK');assert.equal(rows.length,2);
 for(const r of rows){const original=old.records.find(x=>x.id===r.id),raw=m.records.find(x=>x.id===r.id);assert.deepEqual(raw.requirements.filter(x=>x.kind!=='deadline'),original.requirements.filter(x=>x.kind!=='deadline'));assert.deepEqual(raw.unknowns,original.unknowns);const d=r.requirements.find(x=>x.kind==='deadline');assert.equal(d.requirementStatus,'published_school_only');assert(d.text.includes('2026-12-01 23:59'));assert(d.sourceIds.includes('city_review_steps_20261003'));const html=renderRecordSummary('material',r,c).html;assert(html.includes('批次复核于 2026-10-03'));assert(!html.includes('截止及具体时刻待复核'));}
});
test('project cycles are current while complete introductions and old source-conflict evidence survive',()=>{
 const old=maintenanceBaseline(p),summaries=normalizeProjectSummaries(p,c);assert.equal(summaries.size,27);assert.equal(p.sources.length,62);assert.equal(m.sources.length,39);
 for(const id of ['cityu_me_rpg-mphil','cityu_me_rpg-phd','cityu_ds_phd']){const raw=p.records.find(x=>x.routeId===id),before=old.records.find(x=>x.routeId===id);for(const k of ['overview','training','bachelorEntry','cautions','checkedDate'])assert.deepEqual(raw[k],before[k]);const cycle=summaries.get(id).cycle;assert(cycle.text.includes('2026-10-03'));assert(cycle.text.includes('2026-12-01 23:59'));assert(cycle.sourceIds.includes('city_steps_20261003'));}
 assert.deepEqual(p.sources.slice(0,61),old.sources);assert.deepEqual(m.sources.slice(0,38),maintenanceBaseline(m).sources);
});
test('whole data snapshots reconstruct byte-for-byte and unrelated people/experiences/RA are untouched',()=>{
 const hashes={'catalog.json':'2b0a98994dc7ae639b06989889621be973fa4289','material-summaries.json':'58265c08b97c0d689cd6b910fbd2b4e822c169b4','project-summaries.json':'bbbd93fd3f6466b84ff45e22182b952754fb2f5e'};
 for(const [name,sha] of Object.entries(hashes)){const b=Buffer.from(JSON.stringify(maintenanceBaseline(read(name)),null,2)+'\n');assert.equal(crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
 assert.equal(c.metadata.checkedDate,'2026-10-01');assert.equal(read('update-status.json').firstRunVerified,false);assert.equal(read('update-status.json').lastSuccessfulCheck,null);
});
