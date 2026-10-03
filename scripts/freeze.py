"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parent.parent
# Version only the changed dependency chain; unchanged modules retain their URLs.
def version(name):return hashlib.sha256((root/name).read_bytes()).hexdigest()[:12]
app=root/'assets/app.js'
app_text=app.read_text()
for name in ['catalog.json','material-summaries.json','project-summaries.json','advisor-profiles.json']:
    app_text,count=re.subn(r"(?<=[/'])"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?(?=')",name+'?v='+version('data/'+name),app_text)
    if count!=1:raise SystemExit('Expected exactly one changed dataset URL: '+name)
app_text,count=re.subn(r"new URL\('\.\./data/application-experiences\.json(?:\?v=[0-9a-f]+)?'", "new URL('../data/application-experiences.json?v="+version('data/application-experiences.json')+"'",app_text)
if count!=1:raise SystemExit('Expected exactly one versioned experience dataset URL')
for name in ['experiences.js','record-summaries.js','page-overviews.js']:
    app_text,count=re.subn(r"from '\./"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?'", "from './"+name+"?v="+version('assets/'+name)+"'", app_text)
    if count!=1:raise SystemExit('Expected exactly one versioned import: '+name)
app.write_text(app_text)
index=root/'index.html'
html=index.read_text()
for attr,name in [('src','app.js'),('href','style.css')]:
    html,count=re.subn(attr+r'="\./assets/'+re.escape(name)+r'(?:\?v=[0-9a-f]+)?"', attr+'="./assets/'+name+'?v='+version('assets/'+name)+'"', html)
    if count!=1:raise SystemExit('Expected exactly one versioned entry: '+name)
index.write_text(html)
files=['tests/experience-october.test.mjs','tests/maintenance-baseline.mjs','tests/cityu-current-cycle.test.mjs','data/maintenance-2026-10-03.json','assets/campus-art.webp','tests/editorial-design.test.mjs','tests/experience-workspace.test.mjs','tests/active-filters.test.mjs','tests/recruitment-update.test.mjs','tests/recruitment-baseline.mjs','tests/profiles-final5.test.mjs','tests/profiles-batch5.test.mjs','tests/experience-recent.test.mjs','tests/cycle-refresh.test.mjs','tests/project-final10.test.mjs','assets/page-overviews.js','tests/page-overviews.test.mjs','tests/page-overview-navigation.test.mjs','tests/page-overviews-browser.mjs','.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py','assets/experiences.js','data/application-experiences.json','data/application-experience-provenance.json','tests/experiences.test.mjs','tests/experiences-browser.mjs','tests/experience-navigation.test.mjs','assets/record-summaries.js','assets/material-supplement.js','data/material-summaries.json','tests/record-summaries.test.mjs','tests/summary-navigation.test.mjs','tests/material-supplement.test.mjs','tests/material-loading.test.mjs','tests/resource-versions.test.mjs','tests/experience-expansion.test.mjs','tests/experience-batch2.test.mjs','data/project-summaries.json','tests/project-summaries.test.mjs','tests/project-loading.test.mjs','tests/cityu-cycle-review.test.mjs','tests/project-summaries-browser.mjs','tests/project-expansion.test.mjs']
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
manifest={'project':'GradCompass','revision':'r2.24-two-reviewed-experiences','baseSourceCommit':'4840df6a9718ec38e472f8fd7496047248029e71','baseDeployedCommit':'4840df6a9718ec38e472f8fd7496047248029e71','snapshotDate':'2026-10-03','status':'content snapshot; automated test counters do not establish deployment or browser acceptance','dailyChecksEnabled':True,'firstRunVerified':False,'browserVisualQA':'Not yet browser-verified.','profilePilotCount':32,'visibleAdvisorCount':32,'opportunityCount':48,'raPositionCount':2,'newAdvisorProfiles':2,'preservedAdvisorProfiles':30,'newProfileCitedSourceCount':len(profile_sources),'experienceRecords':21,'defaultExperienceRecords':21,'experienceSourceSites':16,'preservedPublishedRecords':19,'newExperienceRecords':2,'materialRecords':14,'materialSupplementRecords':12,'materialSupplementSources':39,'projectSummaryRecords':27,'projectSummarySchools':9,'projectSummarySources':62,'preservedProjectSummaryRecords':17,'newProjectSummaryRecords':10,'pageOverviews':5,'allowedFiles':[]}
manifest['qaMetadataScope']='Hashes identify this content snapshot. Automated test counters do not establish deployment or browser acceptance.'
manifest['publishedBaseline']={'commit':'4840df6a9718ec38e472f8fd7496047248029e71','contentCommit':'4840df6a9718ec38e472f8fd7496047248029e71','experienceRecords':19}
for name in sorted(files):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
