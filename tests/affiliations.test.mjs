import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {people,groupsFor,organization} from '../assets/affiliation-records.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const hash=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const byId=id=>people.find(p=>p.id===id);
const names=(mode,key)=>groupsFor(mode).find(b=>b.key===key).people.map(p=>p.name);

test('five-school evidence scope, consistent organization types and safe source links',()=>{
 assert.equal(people.length,58);
 assert.deepEqual(groupsFor('school').map(g=>[g.key,g.people.length]),[['hnu',9],['tongji',15],['whu',10],['xmu',8],['sdu',16]]);
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
 assert.deepEqual(names('college','hnu-ai'),['杨恺伦','尹欢','刘鑫琦','李根','余洪山']);
 assert.notEqual(byId('hnu-yangkailun').team,byId('hnu-yinhuan').team);
 assert.deepEqual(names('college','tongji-survey'),['张德栋','刘春','吴杭彬','徐聿升']);
 assert.deepEqual(names('team','tongji-traffic-perception'),['刘春','吴杭彬']);
 assert.equal(byId('tongji-fan-rui').team,'tongji-traffic-computing');
 assert.equal(byId('tongji-zhang-dedong').team,null);
 assert.deepEqual(names('college','whu-robotics'),['李明','郭迟','李淼']);
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
 for(const mode of ['school','college','team'])for(const school of ['hnu','tongji','whu','xmu','sdu']){
  const groups=groupsFor(mode,school), rows=groups.flatMap(g=>g.people);
  assert.deepEqual(new Set(rows.map(p=>p.id)),new Set(people.filter(p=>p.school===school).map(p=>p.id)));
  for(const g of groups)if(g.unknown){assert.equal(g.people.length,1);assert.equal(g.key,'unknown:'+g.people[0].id);}
 }
 assert.equal(groupsFor('college','whu').filter(g=>g.unknown).length,4);
 assert.deepEqual(groupsFor('team','xmu').map(g=>g.key),['xmu-asc','xmu-lan-team','unknown:xmu-zhongxunyu']);
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
 assert.equal(linked.length,45);
 for(const p of linked){
  const a=c.advisors.find(a=>a.id===p.catalogId);assert(a);assert.equal(a.nameZh||a.name,p.name);
 }
});

test('second batch keeps platforms and admission cycles separate from real team membership',()=>{
 assert.notEqual(byId('hnu-liuxinqi').team,byId('hnu-ligen').team);
 assert.equal(byId('hnu-yuhongshan').team,null);
 assert.match(byId('hnu-liuxinqi').role,/仅核到硕导/);
 assert.deepEqual(names('college','whu-remote'),['胡庆武','季顺平','姚剑']);
 assert.notEqual(byId('whu-jishunping').team,byId('whu-yaojian').team);
 assert.deepEqual(names('college','xmu-aero'),['兰维瑶','仲训昱']);
 assert.equal(byId('xmu-zhongxunyu').team,null);
 assert.match(byId('tongji-tianye').admissions,/2028 秋.*2 名.*2–3 名.*余名额/);
 assert.match(byId('tongji-fan-rui').admissions,/2028 级.*未标入学季节/);
 assert.match(byId('tongji-ren-yunfan').admissions,/2027 春／秋.*未核 2028/);
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

test('SDU official recruitment team, individual lab and collaboration stay distinct',()=>{
 assert.deepEqual(names('team','sdu-robotics-admissions'),['李贻斌','田新诚','宋锐','周乐来','王超群','荣学文','马昕','周风余']);
 assert.deepEqual(names('team','sdu-intelligent-control'),['宋勇','袁宪锋']);
 assert.deepEqual(names('college','sdu-low-altitude'),['宋勇','袁宪锋']);
 assert.equal(byId('sdu-chenteng').team,null);
 assert(byId('sdu-chenteng').other.some(([,v])=>v.includes('荣学文')));
 assert(byId('sdu-zhoufengyu').other.some(([,v])=>v.includes('云基智能机器人实验室')));
 assert.equal(byId('sdu-yuanxianfeng').catalogId,'sdu-yuanxianfeng');
 for (const id of ['sdu-songyong','sdu-yuanxianfeng']) assert.match(byId(id).admissions,/未确认 2028 秋季/);
});

test('2026 application team is based on named annual evidence and is not a current lab or 2028 intake',()=>{
 const members=names('annualTeam','sdu-robotics-2026');
 assert.deepEqual(new Set(members),new Set(['田国会','田新诚','宋锐','荣学文','马昕','周风余','周乐来','王超群','闵哲','吴疆','王元哲','刘国良']));
 assert.equal(members.length,12);
 for (const p of groupsFor('annualTeam','sdu')[0].people) {
  assert.equal(organization[p.annualTeam].cycle,2026);
  assert(p.sources.some(([,url])=>url.includes('wbfileid=16785581')));
  assert.match(p.admissions,/未确认 2028|未核 2028/);
 }
 assert.equal(byId('sdu-minzhe').team,null);
 assert.equal(byId('sdu-liyibin').annualTeam,undefined);
 assert.equal(byId('sdu-chenteng').annualTeam,undefined);
 assert.equal(byId('sdu-yuanxianfeng').annualTeam,undefined);
 assert.deepEqual(groupsFor('annualTeam','xmu'),[]);
});

test('Tongji roster facts keep concrete lab, broader platform and annual admissions separate',()=>{
 assert.deepEqual(names('team','tongji-sig'),['任云帆','祝澜耘','彭铎']);
 assert.deepEqual(names('team','tongji-robot-perception'),['何斌','王志鹏','刘普泽','蒋烁','郑栋梁','徐阳']);
 assert.equal(byId('tongji-xu-yang').catalogId,'tongji-xu-yang');
 assert.match(byId('tongji-xu-yang').appointment,/2026 年 3 月/);
 const liu=byId('tongji-liu-puze'), jiang=byId('tongji-jiang-shuo');
 assert.equal(liu.catalogId,undefined);
 assert.equal(liu.college,null);
 assert.notEqual(liu.team,byId('tongji-ren-yunfan').team);
 assert(jiang.other.some(([,v])=>v.includes('开物实验室')));
 assert.match(byId('tongji-zhu-lanyun').admissions,/2027.*普通博士.*2028.*未核/);
 assert.deepEqual(groupsFor('annualTeam','tongji'),[]);
});

test('WHU separates a verified research group from department and project collaboration',()=>{
 assert.deepEqual(names('team','whu-resnav'),['李由']);
 assert.deepEqual(names('team','whu-li-miao-robotics'),['李淼']);
 for(const id of ['whu-liming','whu-guochi','whu-xiaoxiaohui'])assert.equal(byId(id).team,null);
 assert(byId('whu-xiaoxiaohui').other.some(([,v])=>v.includes('共同指导')));
 assert.deepEqual(groupsFor('annualTeam','whu'),[]);
});
