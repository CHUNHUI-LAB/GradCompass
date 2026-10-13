"""Bounded PR desktop evidence, using CI's preinstalled Chrome/ChromeDriver.

No browser/package download and no deployment. Captures need human review.
The runner browser version is recorded, not represented as pinned.
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
import urllib.request

VIEWPORTS = [(1440, 900), (1920, 1080)]
TARGETS = ['https://chunhui-lab.github.io/RoboPaperAtlas/',
           'https://chunhui-lab.github.io/IELTSOrbit/']
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def wait_for(check, seconds=30):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = check()
        if value:
            return value
        time.sleep(.1)
    raise TimeoutError('Bounded browser condition timed out')


def valid_footer(rows, width, height):
    require([r['href'] for r in rows] == ['#sources', *TARGETS], 'Footer link identity/order changed')
    for row in rows:
        x, y, w, h = row['rect']
        require(w > 0 and h > 0 and x >= 0 and y >= 0 and x + w <= width + 1 and y + h <= height + 1,
                'Footer link outside actual viewport')
        require(row['visible'] and not row['clipped'], 'Footer link hidden, covered or clipped')
    for row in rows[1:]:
        require(row['target'] == '_blank' and set(row['rel'].split()) == {'noopener', 'noreferrer'}
                and row['view'] is None, 'Cross-site target isolation changed')


class Driver:
    def __init__(self, port):
        self.url = f'http://127.0.0.1:{port}'
        self.session = None
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(self, method, path, data=None):
        request = urllib.request.Request(self.url + path, method=method,
            data=None if data is None else json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
        with self.opener.open(request, timeout=45) as response:
            value = json.load(response)['value']
        require(not isinstance(value, dict) or not value.get('error'), 'WebDriver command failed')
        return value

    def call(self, method, path, data=None):
        return self.request(method, '/session/' + self.session + path, data)

    def js(self, script, *args):
        return self.call('POST', '/execute/sync', {'script': script, 'args': list(args)})

    def cdp(self, command, params):
        return self.call('POST', '/goog/cdp/execute', {'cmd': command, 'params': params})

    def click(self, selector):
        element = self.call('POST', '/element', {'using': 'css selector', 'value': selector})
        self.call('POST', '/element/' + element[ELEMENT] + '/click', {})

    def key(self, value):
        self.call('POST', '/actions', {'actions': [{'type': 'key', 'id': 'keyboard', 'actions': [
            {'type': 'keyDown', 'value': value}, {'type': 'keyUp', 'value': value}]}]})
        self.call('DELETE', '/actions')

    def settle(self):
        self.call('POST', '/execute/async', {'script': 'const done=arguments[0];document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))));', 'args': []})


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='desktop-screenshots')
    args = parser.parse_args()
    # This task is CI-only; do not launch a local browser by running the script.
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'Browser capture is authorized only in GitHub Actions')
    root = Path(__file__).resolve().parent.parent
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    report = {'status': 'started', 'viewports': VIEWPORTS, 'captures': [], 'checks': [],
              'externalTargets': TARGETS, 'keyboardScope': 'Footer-internal Tab order after focusing the existing sources link; not a full-page Tab traversal',
              'visualApproval': 'human review required'}
    process = server = driver = None
    logs = (out / 'chromedriver.log').open('w')
    try:
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        require(head == os.environ.get('EXPECTED_HEAD'), 'Checkout is not the requested PR head')
        report['head'] = head
        binary = shutil.which('google-chrome') or shutil.which('chromium')
        executable = shutil.which('chromedriver')
        if not executable and os.environ.get('CHROMEWEBDRIVER'):
            candidate = Path(os.environ['CHROMEWEBDRIVER']) / 'chromedriver'
            if candidate.is_file():
                executable = str(candidate)
        require(binary and executable, 'Preinstalled Chrome and ChromeDriver required; no download fallback')
        report['chromeVersion'] = subprocess.check_output([binary, '--version'], text=True).strip()
        report['driverVersion'] = subprocess.check_output([executable, '--version'], text=True).strip()
        report['chineseFonts'] = subprocess.check_output(['fc-list', ':lang=zh', 'family'], text=True).splitlines()
        require(report['chineseFonts'], 'Installed Chinese font required')
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        process = subprocess.Popen([executable, f'--port={port}', '--allowed-ips=127.0.0.1'], stdout=logs, stderr=subprocess.STDOUT)
        driver = Driver(port)
        def ready():
            require(process.poll() is None, 'ChromeDriver exited')
            try:
                return driver.request('GET', '/status').get('ready')
            except OSError:
                return False
        wait_for(ready, 15)
        session = driver.request('POST', '/session', {'capabilities': {'alwaysMatch': {
            'browserName': 'chrome', 'goog:chromeOptions': {'binary': binary, 'args': ['--headless=new']},
            'goog:loggingPrefs': {'browser': 'ALL'}}}})
        driver.session = session['sessionId']
        driver.call('POST', '/timeouts', {'script': 30000, 'pageLoad': 30000, 'implicit': 0})
        base = f'http://127.0.0.1:{server.server_port}/'
        def capture(name):
            driver.settle()
            raw = base64.b64decode(driver.call('GET', '/screenshot'))
            (out / (name + '.png')).write_bytes(raw)
            report['captures'].append({'name': name, 'sha256': hashlib.sha256(raw).hexdigest()})
        for width, height in VIEWPORTS:
            prefix = f'{width}x{height}'
            driver.cdp('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': False})
            driver.call('POST', '/url', {'url': base + '#advisors'})
            wait_for(lambda: driver.js("return document.querySelectorAll('.advisor-card').length===57"))
            require(driver.js('return [innerWidth,innerHeight]') == [width, height], 'Actual CSS viewport differs')
            capture(prefix + '-initial')
            driver.js("document.querySelector('footer').scrollIntoView({block:'end'});document.querySelector('footer a').focus({preventScroll:true});")
            driver.settle()
            rows = driver.js("""return [...document.querySelectorAll('footer a')].map(a=>{
                const r=a.getBoundingClientRect(), s=getComputedStyle(a), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                return {href:a.getAttribute('href'),target:a.target,rel:a.rel,view:a.getAttribute('data-view'),
                    rect:[r.x,r.y,r.width,r.height],visible:s.visibility==='visible'&&s.display!=='none'&&Number(s.opacity)>0&&(hit===a||a.contains(hit)),
                    clipped:a.scrollWidth>a.clientWidth+1&&a.clientWidth>0};});""")
            valid_footer(rows, width, height)
            capture(prefix + '-footer')
            for i, target in enumerate(TARGETS):
                driver.key('\ue004')  # Footer-internal Tab sequence after the explicit initial focus above.
                proof = driver.js("const a=document.activeElement,s=getComputedStyle(a);return {href:a.href,focused:a.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)}")
                require(proof['href'] == target and proof['focused'] and proof['outline'] != 'none' and proof['width'] > 0,
                        'Keyboard focus missing or invisible')
                capture(prefix + f'-focus-{i + 1}')
                original = driver.call('GET', '/window')
                before = driver.js('return {url:location.href,scroll:scrollY,focus:document.activeElement.href}')
                driver.key('\ue007')  # Enter opens the real linked target; no mock or URL rewrite.
                handles = wait_for(lambda: (h if len(h) == 2 else None) if (h := driver.call('GET', '/window/handles')) else None)
                driver.call('POST', '/window', {'handle': next(h for h in handles if h != original)})
                wait_for(lambda: driver.js('return document.readyState!=="loading" && location.href===arguments[0]', target))
                require(driver.js('return window.opener===null'), 'External tab retained an opener')
                require(driver.js('return document.title.includes(arguments[0])||document.body.innerText.includes(arguments[0])', target.split('/')[-2]),
                        'Live target identity not rendered')
                driver.call('DELETE', '/window')
                driver.call('POST', '/window', {'handle': original})
                require(driver.js('return {url:location.href,scroll:scrollY,focus:document.activeElement.href}') == before,
                        'Returning from external tab lost the original page state')
                report['checks'].append({'viewport': prefix, 'target': target, 'returned': True, 'focus': proof})
            capture(prefix + '-returned')
            driver.click('footer [data-view="sources"]')
            wait_for(lambda: driver.js("return document.querySelector('main').dataset.currentView==='sources'"))
            capture(prefix + '-sources')
            driver.call('POST', '/back', {})
            wait_for(lambda: driver.js("return document.querySelector('main').dataset.currentView==='advisors'&&document.querySelectorAll('.advisor-card').length===57"))
            capture(prefix + '-back')
            errors = [e for e in driver.call('POST', '/log', {'type': 'browser'}) if e['level'] == 'SEVERE' and base in e.get('message', '')]
            require(not errors, 'Local candidate browser console errors')
            report['checks'].append({'viewport': prefix, 'sourceNavigationAndBack': True, 'footer': rows})
        require(len(report['captures']) == len(VIEWPORTS) * 7, 'Incomplete desktop capture plan')
        report['status'] = 'captured_for_human_review'
    except Exception as error:
        report.update(status='failed', error=type(error).__name__ + ': ' + str(error)[:1000])
        if driver and driver.session:
            try:
                (out / 'failure.png').write_bytes(base64.b64decode(driver.call('GET', '/screenshot')))
            except Exception:
                pass
        raise
    finally:
        (out / 'receipt.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if driver and driver.session:
            try:
                driver.call('DELETE', '')
            except Exception:
                pass
        if process:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        if server:
            server.shutdown()
            server.server_close()
        logs.close()


if __name__ == '__main__':
    main()
