import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('desktop evidence workflow is PR-head scoped, read-only, artifact-only and dependency-free',()=>{
 const workflow=read('.github/workflows/desktop-screenshots.yml'),script=read('scripts/desktop_screenshots.py');
 assert.match(workflow,/contents: read/);assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);
 assert.match(workflow,/head.repo.full_name == github.repository/);
 assert.match(workflow,/actions\/upload-artifact@[a-f0-9]{40}/);
 assert(!/pull_request_target|pages: write|id-token: write|contents: write|deploy-pages|npm (?:install|ci)|pip install/.test(workflow));
 assert.match(script,/VIEWPORTS = \[\(1440, 900\), \(1920, 1080\)\]/);
 assert.match(script,/GITHUB_ACTIONS.*== 'true'/);assert(!/--no-sandbox|--ignore-certificate-errors|--disable-web-security/.test(script));
 assert.match(script,/captured_for_human_review/);assert.match(script,/chromeVersion/);
 assert(!JSON.parse(read('package.json')).devDependencies);
});
test('desktop footer geometry and target guards reject offscreen, hidden, clipped and unsafe samples without launching a browser',()=>{
 const result=execFileSync('python3',['-c',String.raw`
import runpy,copy
m=runpy.run_path('scripts/desktop_screenshots.py')
rows=[{'href':url,'rect':[100+i*200,800,150,20],'visible':True,'clipped':False,'target':'' if i==0 else '_blank','rel':'' if i==0 else 'noopener noreferrer','view':'sources' if i==0 else None} for i,url in enumerate(['#sources',*m['TARGETS']])]
m['valid_footer'](rows,1440,900)
for key,value in [('rect',[-1,800,150,20]),('rect',[100,899,150,20]),('visible',False),('clipped',True),('target','_self'),('rel','noopener'),('view','advisors'),('href','https://example.org/')]:
 bad=copy.deepcopy(rows);bad[1][key]=value
 try: m['valid_footer'](bad,1440,900)
 except RuntimeError: pass
 else: raise AssertionError(key)
print('eight mutation cases rejected; no browser started')
`],{cwd:root,encoding:'utf8'});
 assert.match(result,/eight mutation cases rejected/);
});
