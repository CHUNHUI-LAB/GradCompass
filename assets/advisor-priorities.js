import {escapeHTML} from './core.js?v=c97baac0a033';
import {appointmentStatus,appointmentWindow} from './appointments.js?v=a8c3022d2fb3';
import {recruitmentPriority,intakeLabels} from './recruitment-priorities.js?v=1d0333d710b3';

export function priorityCounts(catalog){
 const counts={recent:0,fall2028_phd:0,year2028_phd:0,graduate2028:0,unknown:0};
 for(const advisor of catalog.advisors||[]){
  const profile=catalog.advisorProfiles?.get?.(advisor.id)||catalog.advisorProfiles?.[advisor.id];
  if(appointmentStatus(profile)==='recent')counts.recent++;
  counts[recruitmentPriority(advisor)]++;
 }
 return counts;
}
export function renderAdvisorPriorities(catalog,filters={},profileState='loading'){
 const counts=priorityCounts(catalog),e=escapeHTML;
 const options=[['appointment','recent','近五年入职','本校首次教研任职'],['intake','fall2028_phd','明确 2028 Fall 博士','学位与秋季均有个人招募证据'],['intake','year2028_phd','2028 年博士','已明确年份，入学季节待核'],['intake','graduate2028','2028 年研究生','入学年明确，硕博类型待核']];
 const profileCount=catalog.advisorProfiles instanceof Map?catalog.advisorProfiles.size:Object.keys(catalog.advisorProfiles||{}).length;
 const missing=profileState==='unavailable'||(profileState==='ready'&&profileCount===0);
 const unavailable=profileState!=='ready'||missing;
 return `<section class="advisor-priority-panel" aria-labelledby="priority-title"><div class="priority-heading"><h2 id="priority-title">重点关注</h2><p>全目录统计 · 可与学校、方向筛选叠加</p></div><div class="priority-options">${options.map(([key,value,title,note])=>`<button type="button" class="priority-option" data-priority-key="${key}" data-priority-value="${value}" aria-pressed="${filters[key]===value}"${key==='appointment'&&unavailable?' disabled':''}><span class="priority-count">${key==='appointment'&&unavailable?'—':counts[value]}</span><span class="priority-title">${e(title)}</span><span class="priority-description">${e(key==='appointment'&&unavailable?(missing?'任职资料未载入，请在下方重试':'任职资料载入中'):note)}</span></button>`).join('')}</div><p class="priority-note">近五年按 ${e(appointmentWindow.asOf)}（UTC）计算：${e(appointmentWindow.start)} 至 ${e(appointmentWindow.end)}；入职不等于年轻 PI。招生标识表示已核实的公开招募声明，不保证当前余位，年份不自动升级为 Fall。</p>${counts.fall2028_phd===0?'<p class="priority-empty-note">当前机器人主目录尚无已核实的明确 2028 Fall 博士招募；可先看“2028 年博士”线索。未核实不等于不招生。</p>':''}</section>`;
}
