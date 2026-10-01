"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent.parent
files=['.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py','assets/experiences.js','data/application-experiences.json','data/application-experience-provenance.json','tests/experiences.test.mjs','tests/experiences-browser.mjs','tests/experience-navigation.test.mjs']
manifest={'project':'GradCompass','revision':'r2.6-source-expansion-candidate','baseDeployedCommit':'243344894469b5f445bf7a1974e68cd06332c082','snapshotDate':'2026-10-01','status':'local candidate; publication not performed by this build','dailyChecksEnabled':True,'firstRunVerified':False,'browserVisualQA':'blocked: Chromium socket denied; cloud browser localhost blocked. No visual acceptance claimed','profilePilotCount':10,'nodeTestsPassed':67,'experienceRecords':4,'defaultExperienceRecords':3,'allowedFiles':[]}
for name in sorted(files):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
