"""Freeze an exact public release allowlist; never recursively copy research folders."""
from pathlib import Path
import hashlib,json,re,subprocess
root=Path(__file__).resolve().parent.parent
# Read and validate before touching any application files. Reviewed metadata is
# authoritative; only computed counters and the explicit release allowlist change.
def reject_json_constant(value):
    raise ValueError('Invalid JSON constant: '+value)
try:
    manifest=json.loads((root/'release-manifest.json').read_text(),parse_constant=reject_json_constant)
    # Python otherwise accepts NaN/Infinity and can overflow numeric literals.
    json.dumps(manifest,allow_nan=False)
except (OSError,UnicodeError,ValueError) as error:
    raise SystemExit('Expected an existing GradCompass release manifest: '+str(error))
if not isinstance(manifest,dict) or manifest.get('project')!='GradCompass':
    raise SystemExit('Expected an existing GradCompass release manifest')
# Version only the changed dependency chain; unchanged modules retain their URLs.
def version(name):return hashlib.sha256((root/name).read_bytes()).hexdigest()[:12]
app=root/'assets/app.js'
app_text=app.read_text()
for name in ['catalog.json','material-summaries.json','project-summaries.json','advisor-profiles.json','sustech-advisor-review-20261004.json','tsinghua-advisor-review-20261004.json','pku-advisor-review-20261004.json','zju-advisor-review-20261005.json','fudan-advisor-review-20261005.json','sjtu-advisor-review-20261005.json','nju-advisor-review-20261005.json','ustc-advisor-review-20261005.json','tongji-advisor-review-20261005.json','seu-advisor-review-20261005.json','sjtu-robotics-advisor-review-20261005.json']:
    app_text,count=re.subn(r"(?<=[/'])"+re.escape(name)+r"(?:\?v=[0-9a-f]+)?(?=')",name+'?v='+version('data/'+name),app_text)
    if count!=1:raise SystemExit('Expected exactly one changed dataset URL: '+name)
app_text,count=re.subn(r"new URL\('\.\./data/application-experiences\.json(?:\?v=[0-9a-f]+)?'", "new URL('../data/application-experiences.json?v="+version('data/application-experiences.json')+"'",app_text)
if count!=1:raise SystemExit('Expected exactly one versioned experience dataset URL')
app.write_text(app_text)
# Content-version the complete local dependency graph, including changed leaves.
# The dependency walk is acyclic; no stale unversioned core import may survive.
visited=set()
def freeze_module(name,active=()):
    if name in visited:return
    if name in active:raise SystemExit('Cyclic module imports: '+name)
    p=root/name
    text=p.read_text()
    def replace_import(match):
        prefix,target=match.group(1),match.group(2)
        child=(Path(name).parent/target).as_posix()
        freeze_module(child,(*active,name))
        return prefix+'./'+target+'?v='+version(child)+"'"
    text=re.sub(r"(from\s+')\./([^'?]+\.js)(?:\?v=[0-9a-f]+)?'",replace_import,text)
    p.write_text(text)
    visited.add(name)
freeze_module('assets/app.js')
index=root/'index.html'
html=index.read_text()
for attr,name in [('src','app.js'),('href','style.css')]:
    html,count=re.subn(attr+r'="\./assets/'+re.escape(name)+r'(?:\?v=[0-9a-f]+)?"', attr+'="./assets/'+name+'?v='+version('assets/'+name)+'"', html)
    if count!=1:raise SystemExit('Expected exactly one versioned entry: '+name)
index.write_text(html)
files=['data/sjtu-robotics-advisor-review-20261005.json','data/zju-advisor-review-20261005.json','data/zju-robotics-advisor-review-20261005.json','data/fudan-advisor-review-20261005.json','data/sjtu-advisor-review-20261005.json','data/nju-advisor-review-20261005.json','data/nju-robotics-advisor-review-20261005.json','data/ustc-advisor-review-20261005.json','data/tongji-advisor-review-20261005.json','data/seu-advisor-review-20261005.json','tests/seven-schools-review.test.mjs','tests/zju-expansion.test.mjs','tests/nju-expansion.test.mjs','tests/sjtu-expansion.test.mjs','data/sustech-advisor-review-20261004.json','data/tsinghua-advisor-review-20261004.json','data/pku-advisor-review-20261004.json','tests/sustech-review.test.mjs','tests/tsinghua-review.test.mjs','tests/pku-review.test.mjs','REPO-MAP.md','data/maintenance-2026-10-04.json','tests/hku-ris-baseline.mjs','tests/hku-ris.test.mjs','tests/advisor-additions-baseline.mjs','tests/experience-batch-20261004-baseline.mjs','tests/experience-batch-20261004.test.mjs','assets/project-comparison.js','tests/project-comparison.test.mjs','tests/f2-design.test.mjs','tests/f2-comparison-navigation.test.mjs','tests/reader-association-copy.test.mjs','tests/experience-october.test.mjs','tests/maintenance-baseline.mjs','tests/cityu-current-cycle.test.mjs','data/maintenance-2026-10-03.json','assets/campus-art.webp','tests/editorial-design.test.mjs','tests/experience-workspace.test.mjs','tests/active-filters.test.mjs','tests/recruitment-update.test.mjs','tests/recruitment-baseline.mjs','tests/profiles-final5.test.mjs','tests/profiles-batch5.test.mjs','tests/experience-recent.test.mjs','tests/cycle-refresh.test.mjs','tests/project-final10.test.mjs','assets/page-overviews.js','tests/page-overviews.test.mjs','tests/page-overview-navigation.test.mjs','tests/page-overviews-browser.mjs','.nojekyll','index.html','assets/app.js','assets/core.js','assets/profiles.js','assets/style.css','assets/favicon.svg','data/catalog.json','data/advisor-profiles.json','data/catalog-test-manifest.json','data/ra-positions.json','data/update-status.json','README.md','QA.md','package.json','tests/core.test.mjs','tests/profiles.test.mjs','tests/ranks.test.mjs','tests/opportunities.test.mjs','tests/render.test.mjs','tests/browser-smoke.mjs','scripts/freeze.py','assets/experiences.js','data/application-experiences.json','data/application-experience-provenance.json','tests/experiences.test.mjs','tests/experiences-browser.mjs','tests/experience-navigation.test.mjs','assets/record-summaries.js','assets/material-supplement.js','data/material-summaries.json','tests/record-summaries.test.mjs','tests/summary-navigation.test.mjs','tests/material-supplement.test.mjs','tests/material-loading.test.mjs','tests/resource-versions.test.mjs','tests/experience-expansion.test.mjs','tests/experience-batch2.test.mjs','data/project-summaries.json','tests/project-summaries.test.mjs','tests/project-loading.test.mjs','tests/cityu-cycle-review.test.mjs','tests/project-summaries-browser.mjs','tests/project-expansion.test.mjs']
files.extend(['tests/full-profile-coverage.test.mjs','tests/nju-tongji-ustc-profiles.test.mjs','tests/pku-profiles.test.mjs','tests/pku-baseline.mjs','tests/pku-history.test.mjs','tests/fixtures/history/reviewed-pku-20261004.json','tests/seven-schools-baseline.mjs','tests/seven-schools-history.test.mjs','tests/fixtures/history/reviewed-seven-schools-20261005.json'])
files.append('tests/freeze-preservation.test.mjs')
files.extend(['scripts/public-counts.mjs','tests/public-discovery.test.mjs','tests/optional-loading.test.mjs'])
files.extend(['tests/fixtures/history/reviewed-source-deltas.json', 'tests/historical-source-baseline.mjs', 'tests/historical-source-baseline.test.mjs', 'tests/historical-source-fs.mjs'])
files.extend(['tests/current-correction-baseline.mjs', 'tests/current-correction-baseline.test.mjs', 'tests/concurrent-reference-baseline.mjs', 'tests/concurrent-reference-baseline.test.mjs', 'tests/fixtures/history/reviewed-current-corrections.json', 'tests/fixtures/history/reviewed-concurrent-reference.json'])
files.extend(['tests/strict-history-transform.mjs', 'tests/latest-3f294-baseline.mjs', 'tests/latest-3f294-baseline.test.mjs', 'tests/fixtures/history/reviewed-concurrent-3f294.json', 'tests/fixtures/history/reviewed-current-3f294-corrections.json'])
files.extend(['tests/detail-ui-baseline.mjs', 'tests/detail-ui-baseline.test.mjs', 'tests/fixtures/history/reviewed-detail-ui-polish.json', 'tests/detail-reader-polish.test.mjs'])
files.extend(['tests/overseas-baseline.mjs','tests/overseas-additions.test.mjs','tests/fixtures/history/reviewed-overseas-20261004.json'])
files.extend(['tests/current-main-baseline.mjs','tests/current-main-history.test.mjs','tests/fixtures/history/reviewed-current-main-03b16.json'])
files.extend(['tests/robotics-expansion-baseline.mjs','tests/robotics-expansion-history.test.mjs','tests/fixtures/history/reviewed-robotics-expansion.json'])
files.extend(['tests/avatar-initials-baseline.mjs','tests/avatar-initials-history.test.mjs','tests/fixtures/history/reviewed-avatar-initials.json'])
files.extend(['tests/jhu-language-baseline.mjs','tests/jhu-language-history-fs.mjs','tests/jhu-language-current.test.mjs','tests/fixtures/history/reviewed-jhu-language-20261005.json'])
files.extend(['data/four-schools-exploration-20261006.json','tests/four-schools-review.test.mjs','tests/four-schools-expansion-baseline.mjs','tests/four-schools-expansion-history.test.mjs','tests/fixtures/history/reviewed-four-schools-expansion-20261006.json'])
files.extend(['tests/sjtu-expansion-baseline.mjs','tests/sjtu-expansion-history.test.mjs','tests/fixtures/history/reviewed-sjtu-expansion.json'])
files.extend(['data/maintenance-2026-10-06.json', 'tests/public-audit-20261006.test.mjs', 'tests/public-audit-20261006-baseline.mjs', 'tests/public-audit-20261006-history-fs.mjs', 'tests/fixtures/history/reviewed-public-audit-20261006.json', 'tests/public-audit-release-20261006-baseline.mjs', 'tests/public-audit-release-20261006.test.mjs', 'tests/fixtures/history/reviewed-public-audit-release-20261006.json', 'tests/fixtures/history/reviewed-pre-public-audit-release-079eaea.json', 'tests/fixtures/history/public-audit-20261006-app.js', 'tests/fixtures/history/public-audit-20261006-index.html'])
files.extend(['tests/date-summary-20261006-baseline.mjs', 'tests/date-summary-20261006.test.mjs', 'tests/fixtures/history/reviewed-date-summary-20261006.json'])
files.extend(['tests/ra-deadline-provenance.test.mjs', 'tests/ra-deadline-20261007-baseline.mjs', 'tests/ra-deadline-20261007-history.test.mjs', 'tests/fixtures/history/reviewed-ra-deadline-20261007.json'])
files.extend(['tests/detail-return-focus.test.mjs', 'tests/detail-return-focus-baseline.mjs', 'tests/detail-return-focus-history.test.mjs', 'tests/fixtures/history/detail-return-focus-20261007.json'])
files.extend(["tests/cuhk-deadline-20261007-baseline.mjs","tests/cuhk-deadline-20261007.test.mjs","tests/fixtures/history/reviewed-cuhk-deadline-20261007.json"])
files.extend(['tests/profile-coverage-baseline.mjs','tests/profile-coverage-history-fs.mjs','tests/profile-coverage-history.test.mjs','tests/fixtures/history/reviewed-profile-coverage-20261008.json'])
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
manifest['newProfileCitedSourceCount']=len(profile_sources)
manifest.update(json.loads(subprocess.check_output(['node','scripts/public-counts.mjs'],cwd=root,text=True)))
# The reviewed revision is caller-owned metadata, not a derived content counter.
manifest['allowedFiles']=[]
for name in sorted(set(files)):
    p=root/name
    if not p.is_file():raise SystemExit('Missing allowlisted file: '+name)
    content=p.read_bytes()
    manifest['allowedFiles'].append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fileCount':len(files),'manifestSha256':hashlib.sha256((root/'release-manifest.json').read_bytes()).hexdigest()}))
