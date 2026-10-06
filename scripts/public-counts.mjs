import fs from 'node:fs';
import {browseAdvisors,browseRoutes,buildOpportunities} from '../assets/core.js';
import {normalizeProjectSummaries} from '../assets/record-summaries.js';
import {normalizeMaterialSupplement} from '../assets/material-supplement.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const c=read('data/catalog.json'),profiles=read('data/advisor-profiles.json'),materials=read('data/material-summaries.json'),projects=read('data/project-summaries.json'),experiences=read('data/application-experiences.json');
c.raPositions=read('data/ra-positions.json').raPositions;
const ops=buildOpportunities(c),summaries=normalizeProjectSummaries(projects,c),supplement=normalizeMaterialSupplement(materials,c);
console.log(JSON.stringify({advisorCatalogCount:c.advisors.length,profilePilotCount:profiles.profiles.length,visibleAdvisorCount:browseAdvisors(c).length,opportunityCount:ops.length,verifiedDegreeAssociationCount:ops.filter(o=>o.kind==='degree').length,raPositionCount:ops.filter(o=>o.kind==='employment').length,projectCatalogCount:c.routes.length,visibleProjectCount:browseRoutes(c).length,projectSummaryRecords:summaries.size,projectSummarySchools:new Set([...summaries.values()].map(r=>r.institution)).size,projectSummarySources:projects.sources.length,materialRecords:c.materials.length+supplement.length,materialSupplementRecords:supplement.length,materialSupplementSources:materials.sources.length,experienceRecords:experiences.records.length,defaultExperienceRecords:experiences.records.length,experienceSourceSites:new Set(experiences.records.map(r=>r.platform)).size}));
