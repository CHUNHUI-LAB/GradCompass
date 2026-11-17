import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {escapeHTML,safeUrl,readerText} from '../assets/core.js';
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const fn=app.slice(app.indexOf('function openDetail('),app.indexOf('\nfunction employmentDetail'));
const linkFn=app.split('\n').find(l=>l.startsWith('function link('));
const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
function render(a){
 const nodes=new Map();const $=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:''});return nodes.get(s);};
 const blank=()=>'';const scope={catalog:{...catalog,advisors:[a]},$: $,e:escapeHTML,safeUrl,readerText,textValue:x=>String(x??''),buildOpportunities:()=>[],routesFor:()=>[],isBrowsableRoute:()=>false,degreeLabel:r=>r.degree,pushDetailRoute:blank,updateDetailBack:blank,presentDetail:blank,showMissingDetail:blank,aName:x=>escapeHTML(x.nameZh||x.name),displayInstitution:x=>x,recruitmentPriority:()=> 'unknown',appointmentBadge:blank,advisorProfiles:new Map(),profileSupplementState:'ready',publicTags:blank,sourceLinks:blank,renderHomepageRecruitment:blank,openingRows:blank,renderProfileReferences:blank,badge:blank};
 vm.createContext(scope);vm.runInContext(linkFn+'\n'+fn,scope);scope.openDetail(a.id);return $('#detail-content').innerHTML;
}
test('profile link change reverses to the exact prior detail function',()=>{
 const old=fn.replace("link(a.profileUrl,'主页 / 身份资料')","link(a.profileUrl,'学校 / 官方档案')");
 assert.equal(crypto.createHash('sha256').update(old).digest('hex'),'191b4fc4121ff0a4704115fffe9809210a4ffb3b71836d9b96b404c14096d99e');
 assert.equal((fn.match(/link\(a\.profileUrl,'主页 \/ 身份资料'\)/g)||[]).length,1);
});
test('actual official and personal profiles render neutral top labels with unchanged hrefs and evidence',()=>{
 const official=catalog.advisors.find(a=>a.profileUrl&&new URL(a.profileUrl).hostname.endsWith('.edu.cn'));
 const personal=catalog.advisors.find(a=>a.profileUrl&&new URL(a.profileUrl).hostname.endsWith('github.io'));
 assert(official);assert(personal);
 for(const a of [official,personal]){
  const before=JSON.stringify(a),html=render(a),href=escapeHTML(safeUrl(a.profileUrl));
  assert(html.includes(`href="${href}" target="_blank" rel="noopener noreferrer">主页 / 身份资料</a>`));
  assert(html.includes(`href="${href}" target="_blank" rel="noopener noreferrer">查看导师主页 ↗</a>`));
  assert(!html.includes('学校 / 官方档案'));assert.equal(JSON.stringify(a),before);
  if(a.labUrl&&safeUrl(a.labUrl))assert(html.includes(`href="${escapeHTML(safeUrl(a.labUrl))}" target="_blank" rel="noopener noreferrer">课题组 / 个人主页</a>`));
 }
});
