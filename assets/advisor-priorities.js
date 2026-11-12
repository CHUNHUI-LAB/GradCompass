import {escapeHTML} from './core.js?v=db9a3d11c333';
import {appointmentStatus,appointmentWindow} from './appointments.js?v=a8c3022d2fb3';
import {recruitmentPriority,intakeLabels} from './recruitment-priorities.js?v=3a633ed4d07a';

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
 const knownCount=counts.fall2028_phd+counts.year2028_phd+counts.graduate2028;
 const recruitmentSummary=`<div class="priority-intake-summary"><div><strong>已核实 2028 招募线索：${knownCount} 位导师</strong><p>明确秋季博士 ${counts.fall2028_phd} 位 · 年份明确、季节待核博士 ${counts.year2028_phd} 位 · 学位待核研究生 ${counts.graduate2028} 位。${counts.fall2028_phd===0&&knownCount>0?'精确秋季博士为 0，不表示全部 2028 线索为 0。':'三类证据分别统计，不等于当前剩余名额。'}</p></div><button type="button" data-priority-key="intake" data-priority-value="known2028" aria-pressed="${filters.intake==='known2028'}">${filters.intake==='known2028'?'取消全部 2028 线索筛选':'查看全部 2028 线索'}</button></div>`;
 const profileCount=catalog.advisorProfiles instanceof Map?catalog.advisorProfiles.size:Object.keys(catalog.advisorProfiles||{}).length;
 const missing=profileState==='unavailable'||(profileState==='ready'&&profileCount===0);
 const unavailable=profileState!=='ready'||missing;
 return `<section class="advisor-priority-panel" aria-labelledby="priority-title"><div class="priority-heading"><h2 id="priority-title">重点关注</h2><p>全目录统计 · 可与学校、方向筛选叠加</p></div>${recruitmentSummary}<div class="priority-options">${options.map(([key,value,title,note])=>`<button type="button" class="priority-option" data-priority-key="${key}" data-priority-value="${value}" aria-pressed="${filters[key]===value}"${key==='appointment'&&unavailable?' disabled':''}><span class="priority-count">${key==='appointment'&&unavailable?'—':counts[value]}</span><span class="priority-title">${e(title)}</span><span class="priority-description">${e(key==='appointment'&&unavailable?(missing?'任职资料未载入，请在下方重试':'任职资料载入中'):note)}</span></button>`).join('')}</div><p class="priority-note">近五年按 ${e(appointmentWindow.asOf)}（UTC）计算：${e(appointmentWindow.start)} 至 ${e(appointmentWindow.end)}；入职不等于年轻 PI。招生标识表示已核实的公开招募声明，不保证当前余位，年份不自动升级为 Fall。</p>${counts.fall2028_phd===0?'<p class="priority-empty-note">当前机器人主目录尚无已核实的明确 2028 Fall 博士招募；可先看“2028 年博士”线索。未核实不等于不招生。</p>':''}</section>`;
}
