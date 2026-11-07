import {appointmentWindow} from './appointments.js?v=a8c3022d2fb3';

// Personal recruitment evidence only. Programme dates, generic invitations,
// reference flags and ambiguous degree labels cannot become Fall 2028 PhD.
export const intakeLabels=Object.freeze({known2028:'全部已核实 2028 招募线索',fall2028_phd:'明确 2028 Fall 博士招募',year2028_phd:'2028 年博士 · 季节待核',graduate2028:'2028 年研究生 · 学位待核',unknown:'2028 招募未核实'});
const personalSources=new Set(['individual_profile','personal_recruitment_statement','personal_recruitment_reference']);
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
function hasPersonalEvidence(row,asOf){
 return row?.status==='explicit'&&row.individualRecruitmentVerified===true&&personalSources.has(row.sourceStatus)&&Array.isArray(row.sources)&&row.sources.some(s=>{try{return new URL(s.url).protocol==='https:'&&validDate(s.checkedDate)&&s.checkedDate<=asOf;}catch{return false;}});
}
export function recruitmentPriority(advisor,asOf=appointmentWindow.asOf){
 if(!validDate(asOf))return 'unknown';
 const rows=(advisor?.openingDetails||[]).filter(row=>hasPersonalEvidence(row,asOf));
 if(rows.some(row=>row.degree==='PhD'&&row.cycle2028FallVerified===true))return 'fall2028_phd';
 if(rows.some(row=>row.degree==='PhD'&&row.cycle2028IntakeVerified===true))return 'year2028_phd';
 if(rows.some(row=>row.degree==='Graduate'&&(row.cycle2028FallReference===true||row.cycle2028IntakeVerified===true)))return 'graduate2028';
 return 'unknown';
}
export function intakeMatches(advisor,filters={}){
 if(!filters.intake)return true;
 if(!Object.hasOwn(intakeLabels,filters.intake))return false;
 const degree=filters.opportunityType||filters.degree;
 const priority=recruitmentPriority(advisor);
 if(filters.intake==='known2028')return priority!=='unknown'&&(!degree||(degree==='PhD'&&['fall2028_phd','year2028_phd'].includes(priority)));
 if(degree&&filters.intake!=='unknown'&&(degree!=='PhD'||filters.intake==='graduate2028'))return false;
 return priority===filters.intake;
}
