"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent.parent
files=['.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py']
manifest={'project':'GradCompass','revision':'r2.4-profile-batch2-candidate','baseDeployedCommit':'267e820b3f11a1d081380630da499e7cb84284da','snapshotDate':'2026-10-01','status':'local candidate; publication not performed by this build','dailyChecksEnabled':True,'firstRunVerified':False,'browserVisualQA':'not run for this ten-profile candidate; earlier release results do not validate this build','profilePilotCount':10,'nodeTestsPassed':59,'allowedFiles':[]}
for name in sorted(files):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
