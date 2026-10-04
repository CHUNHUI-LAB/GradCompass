"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parent.parent
# Version only the changed dependency chain; unchanged modules retain their URLs.
def version(name):return hashlib.sha256((root/name).read_bytes()).hexdigest()[:12]
app=root/'assets/app.js'
app_text=app.read_text()
for name in ['catalog.json','material-summaries.json','project-summaries.json','advisor-profiles.json','sustech-advisor-review-20261004.json','tsinghua-advisor-review-20261004.json']:
    app_text,count=re.subn(r"(?<=[/'])"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?(?=')",name+'?v='+version('data/'+name),app_text)
    if count!=1:raise SystemExit('Expected exactly one changed dataset URL: '+name)
app_text,count=re.subn(r"new URL\('\.\./data/application-experiences\.json(?:\?v=[0-9a-f]+)?'", "new URL('../data/application-experiences.json?v="+version('data/application-experiences.json')+"'",app_text)
if count!=1:raise SystemExit('Expected exactly one versioned experience dataset URL')
for name in ['core.js','experiences.js','record-summaries.js','page-overviews.js','project-comparison.js']:
    app_text,count=re.subn(r"from '\./"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?'", "from './"+name+"?v="+version('assets/'+name)+"'", app_text)
    if count!=1:raise SystemExit('Expected exactly one versioned import: '+name)
app.write_text(app_text)
# Keep every browser module on the same content-versioned core dependency.
for owner in ['record-summaries.js','page-overviews.js','material-supplement.js','project-comparison.js','app.js']:
    path=root/'assets'/owner
    text=path.read_text()
    text,count=re.subn(r"from '([^']*/?)core\.js(?:\?v=[0-9a-f]+)?'", "from './core.js?v="+version('assets/core.js')+"'", text)
    if count < 1: raise SystemExit('Expected core import: '+owner)
    path.write_text(text)
index=root/'index.html'
html=index.read_text()
for attr,name in [('src','app.js'),('href','style.css')]:
    html,count=re.subn(attr+r'="\./assets/'+re.escape(name)+r'(?:\?v=[0-9a-f]+)?"', attr+'="./assets/'+name+'?v='+version('assets/'+name)+'"', html)
    if count!=1:raise SystemExit('Expected exactly one versioned entry: '+name)
index.write_text(html)
files=['data/sustech-advisor-review-20261004.json','data/tsinghua-advisor-review-20261004.json','tests/sustech-review.test.mjs','tests/tsinghua-review.test.mjs','REPO-MAP.md','data/maintenance-2026-10-04.json','tests/hku-ris-baseline.mjs','tests/hku-ris.test.mjs','tests/advisor-additions-baseline.mjs','tests/experience-batch-20261004-baseline.mjs','tests/experience-batch-20261004.test.mjs','assets/project-comparison.js','tests/project-comparison.test.mjs','tests/f2-design.test.mjs','tests/f2-comparison-navigation.test.mjs','tests/reader-association-copy.test.mjs','tests/experience-october.test.mjs','tests/maintenance-baseline.mjs','tests/cityu-current-cycle.test.mjs','data/maintenance-2026-10-03.json','assets/campus-art.webp','tests/editorial-design.test.mjs','tests/experience-workspace.test.mjs','tests/active-filters.test.mjs','tests/recruitment-update.test.mjs','tests/recruitment-baseline.mjs','tests/profiles-final5.test.mjs','tests/profiles-batch5.test.mjs','tests/experience-recent.test.mjs','tests/cycle-refresh.test.mjs','tests/project-final10.test.mjs','assets/page-overviews.js','tests/page-overviews.test.mjs','tests/page-overview-navigation.test.mjs','tests/page-overviews-browser.mjs','.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py','assets/experiences.js','data/application-experiences.json','data/application-experience-provenance.json','tests/experiences.test.mjs','tests/experiences-browser.mjs','tests/experience-navigation.test.mjs','assets/record-summaries.js','assets/material-supplement.js','data/material-summaries.json','tests/record-summaries.test.mjs','tests/summary-navigation.test.mjs','tests/material-supplement.test.mjs','tests/material-loading.test.mjs','tests/resource-versions.test.mjs','tests/experience-expansion.test.mjs','tests/experience-batch2.test.mjs','data/project-summaries.json','tests/project-summaries.test.mjs','tests/project-loading.test.mjs','tests/cityu-cycle-review.test.mjs','tests/project-summaries-browser.mjs','tests/project-expansion.test.mjs']
profile_sources=set()
def collect_sources(value):
    if isinstance(value,list):
        for item in value:collect_sources(item)
    elif isinstance(value,dict):
        for key,item in value.items():
            if key=='sources':
                profile_sources.update(s['url'] for s in item)
            else:collect_sources(item)
collect_sources(json.loads((root/'data/advisor-profiles.json').read_text())['profiles'][30:])
manifest={'project':'GradCompass','revision':'tsinghua-advisors-20261004','baseSourceCommit':'91af79d313c3d0bd7f3bfd5a4e306a3af596ccaf','baseDeployedCommit':'4840df6a9718ec38e472f8fd7496047248029e71','snapshotDate':'2026-10-04','status':'content snapshot; automated test counters do not establish deployment or browser acceptance','dailyChecksEnabled':True,'firstRunVerified':False,'browserVisualQA':'Not yet browser-verified.','profilePilotCount':56,'visibleAdvisorCount':56,'opportunityCount':74,'raPositionCount':2,'newAdvisorProfiles':26,'preservedAdvisorProfiles':30,'newProfileCitedSourceCount':len(profile_sources),'experienceRecords':26,'defaultExperienceRecords':26,'experienceSourceSites':19,'preservedPublishedRecords':21,'newExperienceRecords':5,'materialRecords':15,'materialSupplementRecords':13,'materialSupplementSources':43,'projectSummaryRecords':28,'projectSummarySchools':9,'projectSummarySources':66,'preservedProjectSummaryRecords':17,'newProjectSummaryRecords':10,'pageOverviews':5,'allowedFiles':[]}
manifest['qaMetadataScope']='Hashes identify this content snapshot. Automated test counters do not establish deployment or browser acceptance.'
manifest['publishedBaseline']={'commit':'4840df6a9718ec38e472f8fd7496047248029e71','contentCommit':'4840df6a9718ec38e472f8fd7496047248029e71','experienceRecords':19}
manifest['displayCopyMaintenance']={'date':'2026-10-03','baseCommit':'01e9b41019971e7c5b5a21eca4ca773966ec6664','scope':'Render three supervisor-association phrases in plain Chinese; original data and qualification evidence unchanged','validation':'Local Node and DOM checks; deployment and browser acceptance require separate verification'}
manifest['approvedDesign']={'baseCommit':'e1fee31499ece3e06ab19bde1021d6be231cdf4d','referencePages':'20-32','templates':13,'dataChanged':False,'verification':'Local data, DOM and design-contract checks. Browser visual verification remains separate.'}
manifest['experienceBatch20261004']={'baseCommit':'c61dc2c38c7f0c73a5720985a00dd83e97b9e2e6','preservedRecords':21,'addedRecords':5,'sourceReviewAtUtc':'2026-10-04T03:25:54Z','scope':'Historical first-person process accounts; comments and decision documents not verified. All 26 cases cited in synthesis. Delft is overseas reference only; highest-degree-unknown PhD account is cross-background.','officialDatasetsChanged':False,'approvedF2LayoutChanged':False,'validation':'Candidate checks and independent integration review are separate from remote publication and browser acceptance.'}
manifest['maintenance20261004']={'baseCommit':'91af79d313c3d0bd7f3bfd5a4e306a3af596ccaf','scope':'One HKU taught MSc route, summary, bounded materials and two deadlines; existing advisor, RA and experience data retained','currentOpeningVerified':False,'previousProjectCount':27,'addedProjects':1,'previousMaterialCount':14,'addedMaterialGroups':1,'validation':'Use dated QA and actual run output; this snapshot does not establish publication'}
manifest['overviewCopyCorrection']={'baseCommit':'1281ce4740272443563b4a98f421561bacc801f9','scope':'Two inaccurate MSc overview text fragments only; no structure, style or interaction changes'}
for name in sorted(files):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
