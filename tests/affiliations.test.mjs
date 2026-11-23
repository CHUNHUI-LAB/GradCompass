import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {people,groupsFor,organization} from '../assets/affiliation-records.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const hash=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const byId=id=>people.find(p=>p.id===id);
const names=(mode,key)=>groupsFor(mode).find(b=>b.key===key).people.map(p=>p.name);

test('four-school evidence scope, consistent organization types and safe source links',()=>{
 assert.equal(people.length,23);
 assert.deepEqual(groupsFor('school').map(g=>[g.key,g.people.length]),[['hnu',6],['tongji',5],['whu',6],['xmu',6]]);
 assert.equal(new Set(people.map(p=>p.id)).size,people.length);
 for(const p of people){
  assert.equal(organization[p.school].kind,'school');
  for(const key of ['college','team'])if(p[key]){
   assert.equal(organization[p[key]].kind,key); assert.equal(organization[p[key]].school,p.school);
  }
  for(const [label,url] of p.sources){assert(label);assert.equal(new URL(url).protocol,'https:');}
  assert(p.sources.length>=2);
 }
});

test('same-campus, same-college and same-team are independent, including cross-unit advisers',()=>{
 assert.deepEqual(names('college','hnu-ai'),['杨恺伦','尹欢']);
 assert.notEqual(byId('hnu-yangkailun').team,byId('hnu-yinhuan').team);
 assert.deepEqual(names('college','tongji-survey'),['张德栋','刘春','吴杭彬','徐聿升']);
 assert.deepEqual(names('team','tongji-traffic-perception'),['刘春','吴杭彬']);
 assert.equal(byId('tongji-fan-rui').team,'tongji-traffic-computing');
 assert.equal(byId('tongji-zhang-dedong').team,null);
 assert.deepEqual(names('college','whu-robotics'),['李明','郭迟']);
 assert.equal(byId('whu-li-you').team,'whu-resnav');
 assert.notEqual(byId('whu-li-you').team,byId('whu-yang-bisheng').team);
 assert(!groupsFor('college').some(g=>/人工智能研究院|全国重点实验室/.test(g.label)));
 assert(!groupsFor('team').some(g=>/滑铁卢|合作项目/.test(g.label)));
});

test('team membership does not resolve conflicting college sources or promote secondary affiliations',()=>{
 assert.deepEqual(names('college','xmu-informatics'),['沈思淇','王程','温程璐','臧彧']);
 assert.deepEqual(names('team','xmu-asc'),['沈思淇','王程','温程璐','程明','臧彧','敖晟']);
 for(const key of ['xmu-chengming','xmu-aosheng'])assert.equal(byId(key).college,null);
 assert(byId('xmu-shen-siqi').other.some(([k,v])=>k==='双聘'&&v==='厦门大学人工智能研究院'));
 const wang=byId('xmu-wangcheng'), wen=byId('xmu-wenchenglu');
 assert.deepEqual(wang.other.filter(([k,v])=>k==='双聘'),[['双聘','厦门大学人工智能研究院 · 双聘 PI']]);
 assert(wang.sources.some(([,url])=>url==='https://scsc.xmu.edu.cn/info/1047/1490.htm'));
 assert.deepEqual(wen.other.filter(([k,v])=>k==='双聘'),[['双聘','厦门大学人工智能研究院 · 双聘教授']]);
 assert(wen.sources.some(([,url])=>url==='https://asc.xmu.edu.cn/m/t/wenchengluChengluWen'));
});

test('schools filter all dimensions and every unknown remains its own result',()=>{
 for(const mode of ['school','college','team'])for(const school of ['hnu','tongji','whu','xmu']){
  const groups=groupsFor(mode,school), rows=groups.flatMap(g=>g.people);
  assert.deepEqual(new Set(rows.map(p=>p.id)),new Set(people.filter(p=>p.school===school).map(p=>p.id)));
  for(const g of groups)if(g.unknown){assert.equal(g.people.length,1);assert.equal(g.key,'unknown:'+g.people[0].id);}
 }
 assert.equal(groupsFor('college','whu').filter(g=>g.unknown).length,3);
 assert.deepEqual(groupsFor('team','xmu').map(g=>g.key),['xmu-asc']);
 assert.deepEqual(groupsFor('school','unknown'),[]);
 assert.deepEqual(groupsFor('bad'),[]);
});

test('masters, historical admission and team recruitment do not become individual 2028 evidence',()=>{
 assert.deepEqual(names('team','hnu-hive'),['胡满江','谢国涛','边有钢','秦晓辉']);
 for(const key of ['hnu-xie-guotao','hnu-qin-xiaohui','xmu-aosheng','whu-huaijianzhu'])assert.match(byId(key).role,/仅核到硕/);
 assert.match(byId('hnu-hu-manjiang').admissions,/2023.*历史记录.*未确认 2028/);
 assert.match(byId('tongji-wu-hangbin').admissions,/2019.*未确认 2028/);
 assert.match(byId('whu-guochi').admissions,/2024.*未确认 2028/);
 assert.match(byId('xmu-shen-siqi').admissions,/团队.*2027.*不等于.*个人指标、2028/);
 assert.match(byId('xmu-chengming').admissions,/既有审计.*2027.*本轮未重读.*不是 2028/);
 const linked=people.filter(p=>p.catalogId), c=JSON.parse(read('data/catalog.json'));
 assert.equal(linked.length,13);
 for(const p of linked){
  const a=c.advisors.find(a=>a.id===p.catalogId);assert(a);assert.equal(a.nameZh||a.name,p.name);
 }
});

test('isolated page is linked, versioned and allowlisted with the existing catalog unchanged',()=>{
 assert.match(read('index.html').toString(),/href="\.\/affiliations\.html">导师归属核验试点/);
 const page=read('affiliations.html').toString(), app=read('assets/affiliations.js').toString();
 const paths=['affiliations.html','assets/affiliations.js','assets/affiliations.css','assets/affiliation-records.js','audits/advisor-affiliations-20261123.md'];
 for(const path of paths.slice(1,3))assert(page.includes(path+'?v='+hash(path).slice(0,12)));
 assert(app.includes('./affiliation-records.js?v='+hash(paths[3]).slice(0,12)));
 const m=JSON.parse(read('release-manifest.json'));
 for(const path of paths)assert.equal(m.allowedFiles.find(f=>f.path===path)?.sha256,hash(path));
});
