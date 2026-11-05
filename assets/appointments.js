// Appointment discovery uses a dated evidence window, independent of age, rank,
// admission eligibility, recruitment cycles and the historical 2026 newPi field.
// Evaluate today's window once per page load. Evidence keeps its original dates;
// dated audits can explicitly supply their historical window without changing it.
export function createAppointmentWindow(asOf=new Date().toISOString().slice(0,10)){
 if(!validDate(asOf))throw new RangeError('Invalid appointment evaluation date');
 const [year,month,day]=asOf.split('-').map(Number),startYear=year-5;
 const lastDay=new Date(Date.UTC(startYear,month,0)).getUTCDate();
 const start=[String(startYear).padStart(4,'0'),String(month).padStart(2,'0'),String(Math.min(day,lastDay)).padStart(2,'0')].join('-');
 return Object.freeze({asOf,start,end:asOf});
}
export const appointmentWindow=createAppointmentWindow();
export const appointmentLabels=Object.freeze({recent:'近五年入职 · 已核验',early_career:'教研职业早期线索',previous_faculty:'此前已有教研任职',industry_transition:'此前有行业任职经历',earlier:'五年前入职',boundary:'五年边界待核实',unknown:'入职时间待核实'});
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
function sourceDates(review,window){return (Array.isArray(review?.sources)?review.sources:[]).filter(s=>{try{return new URL(s.url).protocol==='https:'&&validDate(s.checkedDate)&&s.checkedDate<=window.asOf;}catch{return false;}}).map(s=>s.checkedDate);}
function confirmedCoarseUpperBound(review,dates){
 // An already-confirmed arrival is no later than its dated observation. This
 // narrows only the evaluation interval, never the stored date or precision.
 const r=review,prefix=r.earliestDate.slice(0,7),[year,month]=prefix.split('-').map(Number);
 const monthEnd=prefix+'-'+String(new Date(Date.UTC(year,month,0)).getUTCDate()).padStart(2,'0');
 const yearRange=r.precision==='year'&&r.earliestDate===`${year}-01-01`&&r.latestDate===`${year}-12-31`;
 const monthRange=r.precision==='month'&&r.earliestDate===prefix+'-01'&&r.latestDate===monthEnd;
 if(!yearRange&&!monthRange)return null;
 return dates.filter(date=>date>=r.earliestDate).sort().at(-1)||null;
}
export function appointmentStatus(profile,window=appointmentWindow){
 const r=profile?.appointmentReview;
 if(!window||!validDate(window.asOf)||!validDate(window.start)||window.end!==window.asOf||window.start>window.end)return 'unknown';
 const dates=sourceDates(r,window);
 if(r?.status!=='verified'||r.eventType!=='first_faculty_research_appointment_current_institution'||r.appointmentConfirmed!==true||!dates.length||!validDate(r.earliestDate)||!validDate(r.latestDate)||r.earliestDate>r.latestDate)return 'unknown';
 const latest=r.latestDate>window.end?confirmedCoarseUpperBound(r,dates):r.latestDate;
 if(!latest||latest>window.end||r.earliestDate>latest)return 'unknown';
 if(latest<window.start)return 'earlier';
 if(r.earliestDate<window.start)return 'boundary';
 return 'recent';
}
export function appointmentMatches(advisor,catalog,filters={}){
 if(!filters.appointment)return true;
 const p=catalog?.advisorProfiles?.get?.(advisor.id)||catalog?.advisorProfiles?.[advisor.id];const status=appointmentStatus(p,catalog?.appointmentWindow||appointmentWindow);
 if(['early_career','previous_faculty','industry_transition'].includes(filters.appointment))return status==='recent'&&p.appointmentReview.careerContext===filters.appointment;
 return ['recent','earlier','boundary','unknown'].includes(filters.appointment)&&status===filters.appointment;
}
