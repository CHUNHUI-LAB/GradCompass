"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent.parent
files=['.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py','assets/experiences.js','data/application-experiences.json','data/application-experience-provenance.json','tests/experiences.test.mjs','tests/experiences-browser.mjs','tests/experience-navigation.test.mjs','assets/record-summaries.js','assets/material-supplement.js','data/material-summaries.json','tests/record-summaries.test.mjs','tests/summary-navigation.test.mjs','tests/material-supplement.test.mjs','tests/material-loading.test.mjs']
manifest={'project':'GradCompass','revision':'r2.7-navigation-summaries-materials-candidate','baseDeployedCommit':'331a04c26e9aabfffb1e2e7e118d640966751293','snapshotDate':'2026-10-01','status':'local candidate; Node tests passed; browser acceptance outstanding; publication not performed','dailyChecksEnabled':True,'firstRunVerified':False,'browserVisualQA':'blocked: Chromium socket denied; no browser or visual acceptance claimed','profilePilotCount':10,'nodeTestsTotal':92,'nodeTestsPassed':92,'nodeTestsFailed':0,'experienceRecords':4,'defaultExperienceRecords':4,'materialRecords':14,'materialSupplementRecords':12,'materialSupplementSources':33,'allowedFiles':[]}
for name in sorted(files):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
