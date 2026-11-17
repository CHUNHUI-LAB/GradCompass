import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {escapeHTML,readerText} from '../assets/core.js';
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const fn=app.slice(app.indexOf('function openingRows('),app.indexOf('\nfunction detailRoute'));
const scope={catalog:{},buildOpportunities:()=>[],e:escapeHTML,readerText,textValue:x=>x==null?'':String(x),selectedRaStatement:job=>`selected ${job.jobReference}`};
vm.createContext(scope);vm.runInContext(fn,scope);
const render=(a,job)=>scope.openingRows(a,job);
test('openingRows changes exactly three headings, not recruitment interpretation',()=>{
 const old=fn.replace("['硕士（类型以声明为准）',","['MSc',").replace("['2027 招生声明',","['2027 Fall',").replace("['2028 招生声明',","['2028 Fall',");
 assert.equal(crypto.createHash('sha256').update(old).digest('hex'),'9c5a718c36f1a77be8033996f7d1fd9d112174af40502f99fd52d8bfd5004c30');
});
test('year-only and generic masters declarations retain exact statements and no inferred fall or MSc heading',()=>{
 const a={openings:{msc:'学术/专业型硕士1–2名',cycle2027:'普通博士2硕士4；另卓工博士1硕士2',cycle2028:'2028博士2、硕士4；季节未知；历史声明非实时余位'}};
 const before=JSON.stringify(a),html=render(a);
 for(const text of Object.values(a.openings))assert(html.includes(text));
 for(const title of ['硕士（类型以声明为准）','2027 招生声明','2028 招生声明'])assert(html.includes(`<dt>${title}</dt>`));
 assert(!/<dt>(?:MSc|2027 Fall|2028 Fall)<\/dt>/.test(html));assert.equal(JSON.stringify(a),before);
});
test('legacy fields and explicit fall/type wording remain unmodified, with safe escaping',()=>{
 const html=render({openings:{MSc:'MSc授课型',MPhil:'MPhil研究型',PhD:'博士',RA:'岗位', '2027_fall_specific':'2027 Fall 明确秋季','2028_fall_specific':'2028年9月 <申请>'}});
 for(const text of ['MSc授课型','MPhil研究型','2027 Fall 明确秋季','2028年9月 &lt;申请&gt;'])assert(html.includes(text));
 assert(render({}).includes('未找到可核实的公开声明'));
 assert(render({}, {jobReference:'ABC'}).includes('selected ABC'));
});
const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const actual=id=>{const a=catalog.advisors.find(a=>a.id===id);assert(a,`missing fixture ${id}`);return a;};
test('real Bai Lu and Tian Ye keep explicit autumn, degree distinctions and vacancy limits under neutral headings',()=>{
 for(const id of ['sdu-bailu','tongji-tianye']){
  const a=actual(id),before=JSON.stringify(a),html=render(a);
  for(const key of ['phd','msc','cycle2027','cycle2028'])assert(html.includes(escapeHTML(readerText(a.openings[key]))));
  assert(html.includes('<dt>PhD</dt>'));assert(html.includes('<dt>硕士（类型以声明为准）</dt>'));assert(html.includes('<dt>2028 招生声明</dt>'));
  const phd=a.openingDetails.find(d=>d.degree==='PhD');assert(phd);assert.equal(phd.cycle2028FallVerified,true);assert.equal(phd.confirmedVacancy,false);
  assert(!a.openingDetails.some(d=>d.degree==='MSc'));assert.equal(JSON.stringify(a),before);
 }
 const bai=render(actual('sdu-bailu'));assert(bai.includes('2028年9月'));assert(bai.includes('学术/专业型硕士'));assert(bai.includes('1–2名'));assert(bai.includes('已招满'));
 const tian=render(actual('tongji-tianye'));assert(tian.includes('2028秋'));assert(tian.includes('TOPS写2名'));assert(tian.includes('学院写2–3名'));assert(tian.includes('申请考核'));assert(tian.includes('当前余位'));
});
test('year-only and unknown records never gain a season or degree from display headings',()=>{
 const a={openings:{phd:'2028博士计划2名，季节未知；历史声明非实时余位',msc:'硕士类型与计划待核',cycle2028:'2028年度声明，入学季节未知'},openingDetails:[{degree:'PhD',cycle2028IntakeVerified:true,cycle2028FallVerified:false,confirmedVacancy:false}]};
 const before=JSON.stringify(a),html=render(a);assert(html.includes('季节未知'));assert(!/Fall|秋季|<dt>MSc/.test(html));assert.equal(JSON.stringify(a),before);
 const unknown=catalog.advisors.find(a=>a.intake2028OpeningVerified===false&&a.fall2028OpeningVerified===false&&a.openings?.cycle2028&&a.openingDetails?.length===0);assert(unknown);
 const saved=JSON.stringify(unknown);assert(render(unknown).includes(escapeHTML(readerText(unknown.openings.cycle2028))));assert.equal(JSON.stringify(unknown),saved);
});
test('two compared real profiles each retain a separate neutral masters row and their exact statement',()=>{
 const advisors=['sdu-bailu','tongji-tianye'].map(actual),html=advisors.map(a=>`<section>${render(a)}</section>`).join('');
 assert.equal((html.match(/<dt>硕士（类型以声明为准）<\/dt>/g)||[]).length,2);
 for(const a of advisors)assert(html.includes(escapeHTML(readerText(a.openings.msc))));
 assert.equal((html.match(/<dt>PhD<\/dt>/g)||[]).length,2);assert(!html.includes('<dt>MSc</dt>'));
});
