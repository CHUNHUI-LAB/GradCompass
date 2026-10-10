// Appointment discovery uses a dated evidence window, independent of age, rank,
// admission eligibility, recruitment cycles and the historical 2026 newPi field.
export const appointmentWindow=Object.freeze({asOf:'2026-10-10',start:'2021-10-10',end:'2026-10-10'});
export const appointmentLabels=Object.freeze({recent:'近五年入职 · 已核验',early_career:'教研职业早期线索',previous_faculty:'此前已有教研任职',industry_transition:'此前有行业任职经历',earlier:'五年前入职',boundary:'五年边界待核实',unknown:'入职时间待核实'});
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
function hasSource(review){return Array.isArray(review?.sources)&&review.sources.some(s=>{try{return new URL(s.url).protocol==='https:'&&validDate(s.checkedDate)&&s.checkedDate<=appointmentWindow.asOf;}catch{return false;}});}
export function appointmentStatus(profile){
 const r=profile?.appointmentReview;
 if(r?.status!=='verified'||r.eventType!=='first_faculty_research_appointment_current_institution'||r.appointmentConfirmed!==true||!hasSource(r)||!validDate(r.earliestDate)||!validDate(r.latestDate)||r.earliestDate>r.latestDate||r.latestDate>appointmentWindow.end)return 'unknown';
 if(r.latestDate<appointmentWindow.start)return 'earlier';
 if(r.earliestDate<appointmentWindow.start)return 'boundary';
 return 'recent';
}
export function appointmentMatches(advisor,catalog,filters={}){
 if(!filters.appointment)return true;
 const p=catalog?.advisorProfiles?.get?.(advisor.id)||catalog?.advisorProfiles?.[advisor.id];const status=appointmentStatus(p);
 if(['early_career','previous_faculty','industry_transition'].includes(filters.appointment))return status==='recent'&&p.appointmentReview.careerContext===filters.appointment;
 return ['recent','earlier','boundary','unknown'].includes(filters.appointment)&&status===filters.appointment;
}
