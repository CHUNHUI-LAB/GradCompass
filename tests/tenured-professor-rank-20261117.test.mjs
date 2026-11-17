import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankOf} from '../assets/core.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
const changed=["bit-chen-xuechao", "bit-li-changsheng-cs", "bit-yue-yu-feng", "hit-jiangjunjun", "hit-xmliu", "hit-zhangshengping", "neu-fangzheng", "neu-haolina", "neu-liangzhongchao", "ruc-lu-zhiwu", "ruc-song-ruihua", "sdu-bailu", "sjtu-chen-weidong", "sjtu-xia-zeyang", "tongji-tianye"];
function previousRankOf(advisor){
 const raw=typeof advisor.position==='string'?advisor.position.trim():'';
 if(!raw||/未纳入|未核实|待核|unknown|unverified/i.test(raw))return 'unknown';
 const parts=raw.split(/[;；/]/).map(x=>x.trim());
 const primary=parts[0];
 if(parts.slice(1).some(x=>/^(?:Research )?(?:Assistant |Associate )?Professor$/i.test(x)))return 'unknown';
 if(/^(?:Research (?:Assistant |Associate )?Professor|研究(?:助理|副)?教授)$/i.test(primary))return 'research';
 if(/^(?:Assistant Professor|助理教授)$/i.test(primary))return 'assistant';
 if(/^(?:Associate Professor|副教授)$/i.test(primary))return 'associate';
 // This named professorship is explicitly present in the reviewed catalog.
 // Do not generalize arbitrary Chair/Director/PI titles into professor rank.
 if(/^(?:Professor|Tenured Professor|Choh-Ming Li Professor|教授)$/i.test(primary))return 'professor';
 return 'other';
}

test('exact Chinese tenured professor title joins the existing professor category',()=>{
 for(const position of ['长聘教授',' 长聘教授 ','长聘教授；博士生导师','Professor','Tenured Professor','Choh-Ming Li Professor','教授'])assert.equal(rankOf({position}),'professor');
});
test('narrow title mapping preserves ambiguous, research, junior and administrative categories',()=>{
 for(const position of ['研究教授','研究助理教授','研究副教授','Research Professor'])assert.equal(rankOf({position}),'research');
 for(const position of ['助理教授','Assistant Professor'])assert.equal(rankOf({position}),'assistant');
 for(const position of ['副教授','Associate Professor'])assert.equal(rankOf({position}),'associate');
 for(const position of ['',undefined,'待核实','unknown','长聘教授 / Associate Professor'])assert.equal(rankOf({position}),'unknown');
 for(const position of ['长聘副教授','长聘助理教授','长聘研究教授','特聘教授','院长','PI','Chair Professor','长聘教授候选人','Visiting Professor'])assert.equal(rankOf({position}),'other');
});
test('only fifteen reviewed main-title records change, all other published and OUC records stay unchanged',()=>{
 const before=JSON.stringify(catalog),actual=[];
 for(const a of catalog.advisors){if(rankOf(a)!==previousRankOf(a))actual.push(a.id);}
 assert.deepEqual(actual.sort(),[...changed].sort());
 for(const id of changed){const a=catalog.advisors.find(a=>a.id===id);assert(a);assert.equal(a.position.split(/[;；/]/)[0].trim(),'长聘教授');assert.equal(previousRankOf(a),'other');assert.equal(rankOf(a),'professor');}
 assert.equal(catalog.advisors.filter(a=>!changed.includes(a.id)&&a.institution!=='OUC').length,1291);
 for(const a of catalog.advisors.filter(a=>a.institution==='OUC'))assert.equal(rankOf(a),previousRankOf(a));
 assert.equal(JSON.stringify(catalog),before);
});
