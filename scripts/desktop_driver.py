"""CI-only desktop evidence primitives, using only stdlib and preinstalled Chrome.
Adapted from reviewed IELTSOrbit PR13 e23a711 and GradCompass PR23 96c0fbef.
No browser download, application injection, external navigation or deployment.
"""

import argparse
import base64
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request

VIEWPORTS = [(1440, 900), (1920, 1080)]
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'

def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def wait_for(check, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = check()
        if value:
            return value
        time.sleep(.1)
    raise RuntimeError('Timed out waiting for browser assertion')



def contrast_ratio(first, second):
    def luminance(color):
        values = [c/255 for c in color]
        values = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in values]
        return sum(c*w for c,w in zip(values, [.2126,.7152,.0722]))
    require(len(first) == len(second) == 3, 'Unresolved focus colors')
    a,b = sorted([luminance(first),luminance(second)])
    return (b+.05)/(a+.05)


def check_focus(data):
    require(data['focusVisible'] and data['opaque'], 'Keyboard focus hidden')
    require(data['outlineStyle'] not in ['none','hidden'] and data['outlineWidth'] >= 2,
            'No measurable focus outline')
    require(contrast_ratio(data['outlineColor'],data['background']) >= 3, 'Focus outline lacks contrast')
    x,y,w,h = data['rect']
    padding = data['outlineWidth']+max(0,data['outlineOffset'])
    width,height = data['viewport']
    require(x-padding >= 0 and y-padding >= 0 and x+w+padding <= width and y+h+padding <= height,
            'Focus outline outside screenshot')



FOCUS = r"""
const a=document.activeElement,s=getComputedStyle(a),r=a.getBoundingClientRect();
function rgb(value){const m=/^rgba?\(([^)]+)\)$/.exec(value);if(!m)return [];const n=m[1].split(',').map(Number);return n.length===3||n[3]===1?n.slice(0,3):[];}
let background=[],opaque=true;
// Nonnegative outline offsets paint outside the control, over its ancestor surface.
// A selected button's dark fill must not be mistaken for that outside surface.
const outside=parseFloat(s.outlineOffset)>=0;
for(let n=a;n;n=n.parentElement){const c=getComputedStyle(n);if(!background.length&&(!outside||n!==a))background=rgb(c.backgroundColor);if(c.visibility!=='visible'||c.display==='none'||Number(c.opacity)!==1)opaque=false;}
return {focusVisible:a.matches(':focus-visible'),opaque,outlineStyle:s.outlineStyle,
outlineWidth:parseFloat(s.outlineWidth),outlineOffset:parseFloat(s.outlineOffset),
outlineColor:rgb(s.outlineColor),background:background.length?background:[255,255,255],
boxShadow:s.boxShadow,rect:[r.x,r.y,r.width,r.height],viewport:[innerWidth,innerHeight]};
"""


def check_click_target(data):
    x,y,w,h = data['rect']
    width,height = data['viewport']
    require(data['visible'] and data['hit'] and not data['disabled'], 'Native click target hidden or obscured')
    require(w > 0 and h > 0 and x >= 0 and y >= 0 and x+w <= width+1 and y+h <= height+1,
            'Native click target outside viewport after normal scrolling')


CLICK_PROOF = """
const a=arguments[0],r=a.getBoundingClientRect(),s=getComputedStyle(a);
const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
return {rect:[r.x,r.y,r.width,r.height],viewport:[innerWidth,innerHeight],
visible:s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)===1,
disabled:!!a.disabled,hit:hit===a||a.contains(hit),hitTag:hit?.tagName,hitId:hit?.id,
scroll:[scrollX,scrollY],url:location.href};
"""



class Driver:
    def __init__(self, port):
        self.url = f'http://127.0.0.1:{port}'
        self.session = None
        self.diagnostics = []
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(self, method, path, data=None):
        request = urllib.request.Request(self.url+path, method=method,
            data=None if data is None else json.dumps(data).encode(),
            headers={'Content-Type': 'application/json'})
        try:
            with self.opener.open(request, timeout=65) as response:
                value = json.load(response)['value']
        except urllib.error.HTTPError as error:
            # Local WebDriver response, not an external page body. Preserve its
            # protocol error and message so HTTP status alone cannot hide cause.
            body = error.read(65536).decode('utf-8', errors='replace')
            diagnostic = {'method':method,'path':path,'status':error.code,'body':body}
            self.diagnostics.append(diagnostic)
            raise RuntimeError('WebDriver HTTP '+str(error.code)+': '+body) from error
        if isinstance(value, dict) and value.get('error'):
            raise RuntimeError(str(value))
        return value

    def call(self, method, path, data=None):
        return self.request(method, '/session/'+self.session+path, data)

    def js(self, script, *args):
        return self.call('POST', '/execute/sync', {'script':script, 'args':list(args)})

    def selector(self, selector):
        return self.call('POST', '/element', {'using':'css selector', 'value':selector})

    def click(self, selector):
        element = self.selector(selector)
        # Scroll normally and retain the actual WebDriver pointer click.
        self.js("arguments[0].scrollIntoView({block:'center',inline:'nearest'});", element)
        self.settle()
        proof = self.js(CLICK_PROOF, element)
        self.diagnostics.append({'action':'click','selector':selector,'proof':proof})
        check_click_target(proof)
        self.call('POST', '/element/'+element[ELEMENT]+'/click', {})

    def key(self, value):
        self.call('POST', '/actions', {'actions':[{'type':'key','id':'keyboard','actions':[
            {'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
        self.call('DELETE', '/actions')

    def type_text(self, selector, text):
        self.click(selector)
        self.call('POST', '/actions', {'actions':[{'type':'key','id':'keyboard','actions':[
            {'type':'keyDown','value':'\ue009'}, {'type':'keyDown','value':'a'},
            {'type':'keyUp','value':'a'}, {'type':'keyUp','value':'\ue009'}]}]})
        self.call('DELETE', '/actions')
        self.key('\ue003')
        element = self.selector(selector)
        self.call('POST', '/element/'+element[ELEMENT]+'/value', {'text':text,'value':list(text)})
        require(self.js('return arguments[0].value', element) == text, 'Native typing mismatch')

    def tab_to(self, selector, limit=100):
        # Always use real sequential Tab. Never focus() an element from test code.
        for _ in range(limit):
            self.key('\ue004')
            if self.js('return document.activeElement.matches(arguments[0])', selector):
                return
        raise RuntimeError('Control unreachable by natural Tab: '+selector)

    def settle(self):
        self.call('POST', '/execute/async', {'script':
            'const done=arguments[arguments.length-1];document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))));', 'args':[]})
        # Wait for finite application animations to end naturally. Never finish,
        # pause, hide or override them merely to make a screenshot look ready.
        wait_for(lambda:self.js("return document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length===0"))
        # The application uses native smooth scrolling. Do not override its CSS.
        previous = None
        stable = 0
        for _ in range(60):
            current = self.js('return [scrollX,scrollY]')
            stable = stable+1 if current == previous else 0
            if stable >= 4:
                return
            previous = current
            time.sleep(.1)
        raise RuntimeError('Scrolling did not settle')


def free_port():
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', 0))
        return connection.getsockname()[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass



VIEWPORT_PROOF = """
const h=document.querySelector('.site-header'),r=h?.getBoundingClientRect();
return {viewport:[innerWidth,innerHeight],scroll:[scrollX,scrollY],documentWidth:document.documentElement.scrollWidth,
 header:r?{rect:[r.x,r.y,r.width,r.height],visible:getComputedStyle(h).visibility==='visible'&&getComputedStyle(h).display!=='none'}:null};
"""


def check_viewport(data, viewport, initial=False):
    require(data['viewport'] == list(viewport), 'Incorrect actual CSS viewport')
    require(data['documentWidth'] <= viewport[0], 'Horizontal document overflow')
    if initial:
        require(data['scroll'] == [0,0], 'Initial screenshot is not at page top')
        header = data['header'] or {}
        require(header.get('visible'), 'Initial header hidden')
        x,y,w,h = header['rect']
        require(x >= 0 and y >= 0 and w > 0 and h > 0 and x+w <= viewport[0]+1 and y+h <= viewport[1],
                'Initial header outside viewport')


class CatalogGate:
    """Delay only real local catalog bytes; never alter browser or app code."""
    def __init__(self):
        self.requested = threading.Event()
        self.released = threading.Event()
        self.completed = threading.Event()


class EvidenceHandler(QuietHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        gate = self.server.catalog_gate if self.path.split('?',1)[0] == '/data/catalog.json' else None
        if gate:
            gate.requested.set()
            if not gate.released.wait(45):
                self.send_error(504, 'Test catalog gate was not released')
                return
        try:
            super().do_GET()
        finally:
            if gate:
                gate.completed.set()


def source_hashes(root):
    tracked = subprocess.check_output(['git','ls-files','-z','--','index.html','release-manifest.json','assets','data','scripts',
                                      '.github/workflows/desktop-screenshots.yml',
                                      'tests/test_desktop_screenshots.py'], cwd=root).decode().split('\0')
    paths = [p for p in tracked if p]
    require('index.html' in paths and 'scripts/desktop_screenshots.py' in paths, 'Capture inputs not tracked')
    subprocess.run(['git','diff','--exit-code','HEAD','--',*paths], cwd=root, check=True,
                   stdout=subprocess.DEVNULL)
    return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}


def run(project, scenario):
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='desktop-screenshots')
    args = parser.parse_args()
    # This is deliberately before any output, subprocess, HTTP server or browser startup.
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'Browser capture is CI-only')
    root = Path(__file__).resolve().parents[1]
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {'status':'running','project':project,'viewports':VIEWPORTS,'scenes':[],'checks':[],
              'scope':'Only the named desktop scenarios; no mobile, IME or full-browser-suite claim',
              'visualApproval':'Human review is required; assertions do not approve appearance'}
    process = server = driver = None
    log = (output/'chromedriver.log').open('w')
    def save():
        (output/'receipt.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    def capture(name, viewport, initial=False):
        driver.settle()
        before = driver.js(VIEWPORT_PROOF)
        check_viewport(before, viewport, initial)
        data = base64.b64decode(driver.call('GET', '/screenshot'))
        require(data.startswith(b'\x89PNG\r\n\x1a\n'), 'Invalid PNG screenshot')
        after = driver.js(VIEWPORT_PROOF)
        check_viewport(after, viewport, initial)
        require(before == after, 'Viewport moved during screenshot')
        (output/(name+'.png')).write_bytes(data)
        report['scenes'].append({'file':name+'.png','sha256':hashlib.sha256(data).hexdigest(),
                                 'viewportProof':before})
        save()
    try:
        actual = subprocess.check_output(['git','rev-parse','HEAD'], cwd=root, text=True).strip()
        require(actual == os.environ.get('EXPECTED_HEAD'), 'Checkout is not the exact PR head')
        report['commit'] = actual
        report['sourceSha256'] = source_hashes(root)
        binary = shutil.which('google-chrome') or shutil.which('google-chrome-stable')
        executable = shutil.which('chromedriver')
        if not executable and os.environ.get('CHROMEWEBDRIVER'):
            candidate = Path(os.environ['CHROMEWEBDRIVER'])/'chromedriver'
            if candidate.is_file():
                executable = str(candidate)
        require(binary and executable, 'Preinstalled Chrome/ChromeDriver required; no download fallback')
        report['chromeVersion'] = subprocess.check_output([binary,'--version'], text=True).strip()
        report['driverVersion'] = subprocess.check_output([executable,'--version'], text=True).strip()
        report['chineseFonts'] = subprocess.check_output(['fc-list',':lang=zh','family'], text=True).splitlines()
        require(report['chineseFonts'], 'Chinese fonts required for reviewable screenshots')
        save()
        server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(EvidenceHandler,directory=str(root)))
        server.catalog_gate = None
        threading.Thread(target=server.serve_forever,daemon=True).start()
        port = free_port()
        process = subprocess.Popen([executable,f'--port={port}','--allowed-ips=127.0.0.1'],stdout=log,stderr=subprocess.STDOUT)
        driver = Driver(port)
        def ready():
            require(process.poll() is None, 'ChromeDriver exited')
            try:
                return driver.request('GET','/status').get('ready')
            except OSError:
                return False
        wait_for(ready)
        session = driver.request('POST','/session',{'capabilities':{'alwaysMatch':{
            'browserName':'chrome','pageLoadStrategy':'eager','goog:loggingPrefs':{'browser':'ALL'},
            'goog:chromeOptions':{'binary':binary,'args':['--headless=new']}}}})
        driver.session = session['sessionId']
        driver.call('POST','/timeouts',{'pageLoad':60000,'script':30000,'implicit':0})
        base = f'http://127.0.0.1:{server.server_port}/'
        for viewport in VIEWPORTS:
            width,height = viewport
            driver.call('POST','/goog/cdp/execute',{'cmd':'Emulation.setDeviceMetricsOverride',
                'params':{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False}})
            scenario(driver, base, viewport, report, capture, server)
            errors = [e for e in driver.call('POST','/log',{'type':'browser'})
                      if e['level'] == 'SEVERE' and base in e.get('message','')]
            require(not errors, 'Local candidate browser console errors: '+str(errors))
        report['status'] = 'captured_for_human_review'
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = type(error).__name__+': '+str(error)
        if driver and driver.session:
            try:
                (output/'failure.png').write_bytes(base64.b64decode(driver.call('GET','/screenshot')))
                report['failurePage'] = driver.js('return {url:location.href,active:document.activeElement.outerHTML,viewport:[innerWidth,innerHeight]}')
            except Exception as screenshot_error:
                report['failureScreenshotError'] = str(screenshot_error)
        raise
    finally:
        if server and server.catalog_gate:
            server.catalog_gate.released.set()
        if driver:
            report['webdriverDiagnostics'] = driver.diagnostics
        save()
        if driver and driver.session:
            try:
                driver.request('DELETE','/session/'+driver.session)
            except Exception:
                pass
        if process:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        if server:
            server.shutdown()
            server.server_close()
        log.close()
