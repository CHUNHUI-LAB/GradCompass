import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {supervisorAssociationText,renderRecordSummary} from '../assets/record-summaries.js';
import {isVerifiedRoute} from '../assets/core.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
test('all published project summaries replace technical association labels without mutating source records',()=>{
 const original=JSON.stringify(catalog);let count=0;
 for(const route of catalog.routes.filter(isVerifiedRoute)){
  const text=supervisorAssociationText(route.supervisorAssociation);
  assert(!text.includes('routeAssociations'),route.id);
  const html=renderRecordSummary('project',route,catalog).html;
  assert(!html.includes('routeAssociations'),route.id);
  if(route.supervisorAssociation.includes('routeAssociations')){count++;assert(text.includes('导师详情'));}
  for(const caveat of ['授课型硕士不保证进组或论文指导','仍须核实目标轮次名额与指导资格'])if(route.supervisorAssociation.includes(caveat))assert(text.includes(caveat));
  if(route.supervisorAssociation.includes('项目资格不等于名额确认'))assert(text.includes('符合项目申请条件不代表已确认招生名额'));
 }
 assert(count>0);assert.equal(JSON.stringify(catalog),original);
});
test('display adapter leaves unfamiliar wording unchanged and renderer still escapes it',()=>{
 const source='<script>routeAssociations</script>';assert.equal(supervisorAssociationText(source),source);
 const route=catalog.routes.find(isVerifiedRoute);const html=renderRecordSummary('project',{...route,supervisorAssociation:source},catalog).html;
 assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));
});
