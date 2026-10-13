"""Pure evidence contracts. Importing these modules never starts a browser."""
import ast
import io
from pathlib import Path
import re
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import desktop_driver as d
import desktop_screenshots as s


class DesktopEvidenceContracts(unittest.TestCase):
    def test_ci_only_before_any_subprocess_or_output(self):
        with patch.dict(d.os.environ,{'GITHUB_ACTIONS':'false'}), patch.object(d.subprocess,'Popen') as launch:
            with patch.object(sys,'argv',['desktop_screenshots.py']):
                with self.assertRaisesRegex(RuntimeError,'CI-only'):
                    d.run('test',lambda *args:None)
            launch.assert_not_called()

    def test_viewport_requires_real_initial_top_header_and_no_overflow(self):
        good={'viewport':[1440,900],'scroll':[0,0],'documentWidth':1440,
              'header':{'visible':True,'rect':[0,0,1440,80]}}
        d.check_viewport(good,(1440,900),True)
        for key,value in [('viewport',[1920,1080]),('scroll',[0,20]),('documentWidth',1441),
                          ('header',None),('header',{'visible':True,'rect':[0,-1,1440,80]})]:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                d.check_viewport(dict(good,**{key:value}),(1440,900),True)

    def test_focus_rejects_body_style_invisible_low_contrast_or_clipping(self):
        good={'focusVisible':True,'opaque':True,'outlineStyle':'solid','outlineWidth':3,
              'outlineOffset':4,'outlineColor':[55,120,187],'background':[255,255,255],
              'rect':[100,100,300,44],'viewport':[1440,900]}
        d.check_focus(good)
        for key,value in [('outlineStyle','none'),('outlineWidth',0),('outlineColor',[255,255,255]),
                          ('focusVisible',False),('opaque',False),('rect',[0,0,300,44])]:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                d.check_focus(dict(good,**{key:value}))

    def test_offset_outline_uses_outside_surface_not_selected_fill(self):
        selected={'focusVisible':True,'opaque':True,'outlineStyle':'solid','outlineWidth':3,
                  'outlineOffset':4,'outlineColor':[55,120,187],'background':[255,255,255],
                  'rect':[100,100,200,48],'viewport':[1440,900]}
        # Selected fill #185a4c is not the backdrop of its positive-offset outline.
        d.check_focus(selected)
        self.assertIn('(!outside||n!==a)',d.FOCUS)
        self.assertLess(d.contrast_ratio([55,120,187],[24,90,76]),3)
        self.assertGreater(d.contrast_ratio([55,120,187],[255,255,255]),3)

    def test_native_click_scrolls_settles_checks_and_uses_protocol(self):
        driver=d.Driver(1234)
        events=[]
        good={'rect':[20,20,100,44],'viewport':[1440,900],'visible':True,'hit':True,'disabled':False}
        driver.selector=lambda selector:{d.ELEMENT:'target'}
        driver.js=lambda script,*args:events.append('proof' if script==d.CLICK_PROOF else 'scroll') or good
        driver.settle=lambda:events.append('settle')
        driver.call=lambda method,path,data:events.append(path)
        driver.click('#target')
        self.assertEqual(events,['scroll','settle','proof','/element/target/click'])
        for key,value in [('hit',False),('disabled',True),('visible',False),('rect',[0,-80,100,44])]:
            with self.assertRaises(RuntimeError):
                d.check_click_target(dict(good,**{key:value}))

    def test_key_and_typing_are_native_protocol_actions(self):
        driver=d.Driver(1234)
        calls=[]
        driver.call=lambda *args:calls.append(args)
        driver.click=lambda selector:None
        driver.selector=lambda selector:{d.ELEMENT:'input'}
        driver.js=lambda *args:'ＩＥＬＴＳ'
        driver.type_text('#search','ＩＥＬＴＳ')
        self.assertEqual(calls[-1],('POST','/element/input/value',{'text':'ＩＥＬＴＳ','value':list('ＩＥＬＴＳ')}))
        self.assertEqual(calls[0][1],'/actions')
        self.assertEqual(calls[2][2]['actions'][0]['actions'][0]['value'],'\ue003')
        self.assertEqual(calls[3],('DELETE','/actions'))

    def test_tab_to_never_programmatically_focuses(self):
        driver=d.Driver(1234)
        events=[]
        driver.key=lambda key:events.append(key)
        driver.js=lambda *args:len(events)==3
        driver.tab_to('#target')
        self.assertEqual(events,['\ue004']*3)
        driver.js=lambda *args:False
        with self.assertRaises(RuntimeError):
            driver.tab_to('#target',2)

    def test_webdriver_http_error_keeps_useful_diagnostics(self):
        driver=d.Driver(1234)
        body=b'{"value":{"error":"element not interactable","message":"specific evidence"}}'
        error=d.urllib.error.HTTPError('http://127.0.0.1:1234',400,'Bad Request',{},io.BytesIO(body))
        with patch.object(driver.opener,'open',side_effect=error):
            with self.assertRaisesRegex(RuntimeError,'specific evidence'):
                driver.request('POST','/session/s/element/e/click',{})
        self.assertEqual(driver.diagnostics[0]['body'],body.decode())

    def test_gate_has_independent_request_release_and_completion(self):
        gate=d.CatalogGate()
        self.assertFalse(gate.requested.is_set())
        self.assertFalse(gate.released.is_set())
        self.assertFalse(gate.completed.is_set())
        gate.requested.set()
        self.assertFalse(gate.released.is_set())
        gate.released.set()
        self.assertFalse(gate.completed.is_set())

    def test_artifact_only_locked_official_actions(self):
        workflow=(ROOT/'.github/workflows/desktop-screenshots.yml').read_text()
        pins=re.findall(r'uses:\s*([^\s]+)',workflow)
        self.assertEqual(pins,[
            'actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09',
            'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02'])
        for forbidden in ['pull_request_target','workflow_dispatch','pages: write','id-token: write',
                          'deploy-pages','npm install','npm ci','pip install','--no-sandbox','secrets.']:
            self.assertNotIn(forbidden,workflow)
        self.assertIn('contents: read',workflow)
        self.assertIn('persist-credentials: false',workflow)
        self.assertIn('github.event.pull_request.head.sha',workflow)
        self.assertIn('head.repo.full_name == github.repository',workflow)
        self.assertIn("7d64b985f6fe128c99eae5610d5c047338e572bdcfb2bb09736be01b824a7f6c",workflow)

    def test_stdlib_only_and_no_browser_security_bypass_or_app_event_injection(self):
        allowed={'argparse','base64','functools','hashlib','http','json','os','pathlib','shutil','socket',
                 'subprocess','threading','time','urllib','desktop_driver'}
        for path in [ROOT/'scripts/desktop_driver.py',ROOT/'scripts/desktop_screenshots.py']:
            source=path.read_text()
            tree=ast.parse(source)
            imports={alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node,ast.Import) for alias in node.names}
            imports|={node.module.split('.')[0] for node in ast.walk(tree) if isinstance(node,ast.ImportFrom)}
            self.assertTrue(imports<=allowed,imports-allowed)
            for forbidden in ['--no-sandbox','--disable-web-security','dispatchEvent(','.focus(',".click()",'https://chunhui-lab.github.io']:
                # Comments may describe prohibited actions; inspect executable string constants.
                for node in ast.walk(tree):
                    if isinstance(node,ast.Constant) and isinstance(node.value,str):
                        self.assertNotIn(forbidden,node.value)

    def test_material_results_require_real_regression_target(self):
        s.check_material_results(['hku-mphil-materials'])
        for bad in [[],['unrelated'],['hku-mphil-materials']*2]:
            with self.assertRaises(RuntimeError):
                s.check_material_results(bad)

    def test_project_label_keeps_identity_pressed_and_visible_state(self):
        rows=[{'id':'first','label':'移出比较：School Project A','pressed':'true','text':'已选项目','title':'Project A'},
              {'id':'second','label':'加入比较：School Project B','pressed':'false','text':'＋ 加入对比','title':'Project B'}]
        s.check_project_labels(rows,{'first'})
        for key,value in [('label','加入比较：School Project A'),('label','移出比较：Wrong title'),('pressed','false'),('text','＋ 加入对比')]:
            bad=[dict(rows[0],**{key:value}),rows[1]]
            with self.assertRaises(RuntimeError):
                s.check_project_labels(bad,{'first'})


if __name__ == '__main__':
    unittest.main()
