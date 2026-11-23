import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {people,groupsFor,organization} from '../assets/affiliation-records.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const hash=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const byId=id=>people.find(p=>p.id===id);
const names=(mode,key)=>groupsFor(mode).find(b=>b.key===key).people.map(p=>p.name);

test('organizational references have matching kinds and schools, and official sources use HTTPS',()=>{
 assert.equal(people.length,7);
 assert.equal(new Set(people.map(p=>p.id)).size,people.length);
 for(const p of people){
  assert.equal(organization[p.school].kind,'school');
  for(const key of ['college','team'])if(p[key]){
   assert.equal(organization[p[key]].kind,key);assert.equal(organization[p[key]].school,p.school);
  }
  for(const [label,url] of p.sources){assert(label);assert.equal(new URL(url).protocol,'https:');}
  assert(p.sources.length>=2);
 }
});

test('school, home college and explicit membership are independent; secondary units and histories never become groups',()=>{
 const campus=names('school','xmu');
 assert.deepEqual(campus,['沈思淇','王程','温程璐']);
 assert.deepEqual(names('college','xmu-informatics'),campus);
 assert.deepEqual(names('team','xmu-asc'),campus);
 assert(byId('xmu-shen-siqi').other.some(([k,v])=>k==='双聘'&&v==='厦门大学人工智能研究院'));
 assert.equal(byId('xmu-wangcheng').other.some(([k])=>k==='双聘'),false);
 assert.equal(byId('whu-li-you').college,null);
 assert.equal(byId('whu-li-you').team,'whu-resnav');
 assert.equal(byId('tongji-zhang-dedong').team,null);
 assert(!groupsFor('college').some(g=>g.label.includes('人工智能研究院')||g.label.includes('全国重点实验室')));
 assert(!groupsFor('team').some(g=>g.label.includes('滑铁卢')));
});

test('unknowns remain separate; school filter applies after changing dimensions',()=>{
 assert.equal(groupsFor('team','tongji')[0].unknown,true);
 assert.deepEqual(groupsFor('college','whu').map(g=>[g.unknown,g.people.length]),[[true,1]]);
 assert.equal(groupsFor('team').filter(g=>g.unknown).length,1);
 assert.deepEqual(groupsFor('team','xmu').map(g=>g.key),['xmu-asc']);
 assert.deepEqual(groupsFor('school','unknown'),[]);
 assert.deepEqual(groupsFor('bad'),[]);
});

test('collaborator is not promoted to doctoral supervisor; historic and team calls do not become individual 2028 evidence',()=>{
 assert.deepEqual(names('team','hnu-hive'),['胡满江','谢国涛']);
 assert.match(byId('hnu-xie-guotao').role,/仅核到硕导/);
 assert.match(byId('hnu-hu-manjiang').admissions,/2023.*历史记录.*未确认 2028/);
 assert.match(byId('xmu-shen-siqi').admissions,/团队.*2027.*不等于.*个人指标、2028/);
 assert.equal(people.filter(p=>p.catalogId).length,2);
 const c=JSON.parse(read('data/catalog.json'));
 for(const p of people.filter(p=>p.catalogId))assert(c.advisors.some(a=>a.id===p.catalogId));
});

test('isolated page is linked, versioned and allowlisted without any catalog or profile change',()=>{
 assert.match(read('index.html').toString(),/href="\.\/affiliations\.html">导师归属核验试点/);
 const page=read('affiliations.html').toString(), app=read('assets/affiliations.js').toString();
 const paths=['affiliations.html','assets/affiliations.js','assets/affiliations.css','assets/affiliation-records.js','audits/advisor-affiliations-20261123.md'];
 for(const path of paths.slice(1,3))assert(page.includes(path+'?v='+hash(path).slice(0,12)));
 assert(app.includes('./affiliation-records.js?v='+hash(paths[3]).slice(0,12)));
 const m=JSON.parse(read('release-manifest.json'));
 for(const path of paths)assert.equal(m.allowedFiles.find(f=>f.path===path)?.sha256,hash(path));
});
