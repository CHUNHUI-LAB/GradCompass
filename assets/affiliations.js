import {people,groupsFor,organization} from './affiliation-records.js?v=58da9ddfb5c5';

const mode=document.querySelector('#group-mode');
const school=document.querySelector('#school');
const status=document.querySelector('#status');
const results=document.querySelector('#groups');

function element(tag,text,klass){
 const node=document.createElement(tag);
 if(text)node.textContent=text;
 if(klass)node.className=klass;
 return node;
}
function anchor(label,url){
 const node=element('a',label);
 node.href=url;
 return node;
}
function makeCard(person){
 const card=element('article',null,'card');
 card.append(element('div',person.role,'pill'));
 card.append(element('h3',person.name),element('p',person.focus,'focus'));
 const info=element('dl');
 const lines=[
  ['学校',organization[person.school].label],
  ['主聘学院',person.college?organization[person.college].label:'未确认'],
  ['明确团队',person.team?organization[person.team].label:'未确认'],
  ...(person.annualTeam?[['年度招生团队',organization[person.annualTeam].label]]:[]),
  ...person.other,
  ['入职',person.appointment],
  ['报考证据',person.admissions]
 ];
 for(const [label,value] of lines)info.append(element('dt',label),element('dd',value));
 card.append(info);
 const sources=element('ul',null,'sources');
 for(const [label,url] of person.sources){
  const li=element('li'); li.append(anchor(label,url));sources.append(li);
 }
 if(person.catalogId){
  const li=element('li');li.append(anchor('现有导师档案','./index.html#advisors/summary/advisor/'+encodeURIComponent(person.catalogId)));sources.append(li);
 }
 card.append(sources);
 return card;
}
for(const key of new Set(people.map(person=>person.school))){
 const option=element('option',organization[key].label);
 option.value=key;
 school.append(option);
}
function render(){
 const groups=groupsFor(mode.value,school.value);
 const sections=groups.map(({label,people:members,unknown})=>{
  const section=element('section',null,'bucket');
  const headline=element('div',null,'bucket-head');
  headline.append(element('h2',label),element('p',unknown?'不与其他未确认者建立同组关系':members.length+' 位已核验记录'));
  const list=element('div',null,'cards');
  for(const person of members)list.append(makeCard(person));
  section.append(headline,list);
  return section;
 });
 const total=groups.reduce((n,g)=>n+g.people.length,0);
 status.textContent=total?'显示 '+total+' 位 · '+(mode.value==='annualTeam'?'仅限有年度具名证据的记录':'仅限试点范围'):'没有符合条件的核验记录。';
 results.replaceChildren(...sections);
}
mode.addEventListener('change',render);
school.addEventListener('change',render);
render();
