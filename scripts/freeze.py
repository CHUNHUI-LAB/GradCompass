"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parent.parent
# Version only the changed dependency chain; unchanged modules retain their URLs.
def version(name):return hashlib.sha256((root/name).read_bytes()).hexdigest()[:12]
app=root/'assets/app.js'
app_text=app.read_text()
for name in ['catalog.json','material-summaries.json','project-summaries.json']:
    app_text,count=re.subn(r"(?<=[/'])"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?(?=')",name+'?v='+version('data/'+name),app_text)
    if count!=1:raise SystemExit('Expected exactly one changed dataset URL: '+name)
app_text,count=re.subn(r"new URL\('\.\./data/application-experiences\.json(?:\?v=[0-9a-f]+)?'", "new URL('../data/application-experiences.json?v="+version('data/application-experiences.json')+"'",app_text)
if count!=1:raise SystemExit('Expected exactly one versioned experience dataset URL')
for name in ['experiences.js','record-summaries.js']:
    app_text,count=re.subn(r"from '\./"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?'", "from './"+name+"?v="+version('assets/'+name)+"'", app_text)
    if count!=1:raise SystemExit('Expected exactly one versioned import: '+name)
app.write_text(app_text)
index=root/'index.html'
html=index.read_text()
for attr,name in [('src','app.js'),('href','style.css')]:
    html,count=re.subn(attr+r'="\./assets/'+re.escape(name)+r'(?:\?v=[0-9a-f]+)?"', attr+'="./assets/'+name+'?v='+version('assets/'+name)+'"', html)
    if count!=1:raise SystemExit('Expected exactly one versioned entry: '+name)
index.write_text(html)
files=['.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py','assets/experiences.js','data/application-experiences.json','data/application-experience-provenance.json','tests/experiences.test.mjs','tests/experiences-browser.mjs','tests/experience-navigation.test.mjs','assets/record-summaries.js','assets/material-supplement.js','data/material-summaries.json','tests/record-summaries.test.mjs','tests/summary-navigation.test.mjs','tests/material-supplement.test.mjs','tests/material-loading.test.mjs','tests/resource-versions.test.mjs','tests/experience-expansion.test.mjs','tests/experience-batch2.test.mjs','data/project-summaries.json','tests/project-summaries.test.mjs','tests/project-loading.test.mjs','tests/cityu-cycle-review.test.mjs','tests/project-summaries-browser.mjs','tests/project-expansion.test.mjs']
manifest={'project':'GradCompass','revision':'r2.12-project-introductions-expanded','baseDeployedCommit':'c3a2fe200fe03ea0d32eb6d6d1e581d0a44bf8b5','snapshotDate':'2026-10-02','status':'content snapshot; test results in QA.md; deployment status is separate','dailyChecksEnabled':True,'firstRunVerified':False,'browserVisualQA':'three Chromium suites stopped before assertions with a socket permission error; no new visual acceptance','profilePilotCount':10,'nodeTestsTotal':148,'nodeTestsPassed':148,'nodeTestsFailed':0,'experienceRecords':16,'defaultExperienceRecords':16,'experienceSourceSites':12,'preservedPublishedRecords':16,'newExperienceRecords':0,'materialRecords':14,'materialSupplementRecords':12,'materialSupplementSources':36,'projectSummaryRecords':17,'projectSummarySchools':5,'projectSummarySources':35,'preservedProjectSummaryRecords':8,'newProjectSummaryRecords':9,'allowedFiles':[]}
manifest['qaMetadataScope']='Hashes identify this content snapshot. Test results do not establish deployment status or validate every historical source. Historical version results are retained in QA.md.'
manifest['publishedBaseline']={'commit':'c3a2fe200fe03ea0d32eb6d6d1e581d0a44bf8b5','contentCommit':'c3a2fe200fe03ea0d32eb6d6d1e581d0a44bf8b5','experienceRecords':16,'pagesRun':'https://github.com/CHUNHUI-LAB/GradCompass/actions/runs/36958920364'}
for name in sorted(files):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
