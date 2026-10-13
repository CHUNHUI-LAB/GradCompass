"""Desktop regression evidence for current material search and comparison labels.
No legacy cross-site/footer feature is copied or exercised.
"""
from desktop_driver import run, require, wait_for

MATERIALS = """return [...document.querySelectorAll('#view-content [data-material-id]')].map(n=>n.dataset.materialId);"""
PROJECTS = """return [...document.querySelectorAll('#view-content [data-compare-project]')].map(n=>({
 id:n.dataset.compareProject,label:n.getAttribute('aria-label'),pressed:n.getAttribute('aria-pressed'),text:n.textContent,
 title:n.closest('[data-project-id]').querySelector('h3').textContent}));"""


def check_material_results(ids, minimum=True):
    require(len(ids) == len(set(ids)), 'Duplicate material results')
    if minimum:
        require('hku-mphil-materials' in ids, 'IELTS search lost the recorded HKU MPhil requirements')


def check_project_labels(rows, selected):
    require(len(rows) >= 2, 'Too few project controls')
    for row in rows:
        active = row['id'] in selected
        prefix = '移出比较：' if active else '加入比较：'
        require(row['label'].startswith(prefix) and row['title'] in row['label'],
                'Comparison accessible name lost action or project identity: '+row['id'])
        require(row['pressed'] == str(active).lower(), 'Comparison pressed state mismatch')
        require(row['text'] == ('已选项目' if active else '＋ 加入对比'), 'Comparison visible state mismatch')


def scenario(driver, base, viewport, report, capture, server):
    prefix = f'{viewport[0]}x{viewport[1]}'
    # Query forces a fresh document, avoiding same-document scroll/history leftovers.
    driver.call('POST','/url',{'url':base+'?desktop-evidence='+prefix+'#advisors'})
    wait_for(lambda:driver.js("return document.querySelectorAll('#view-content .advisor-card').length>0"))
    driver.js("window.scrollTo({left:0,top:0,behavior:'instant'});")
    capture(prefix+'-01-initial',viewport,True)

    driver.click('#primary-nav [data-view="materials"]')
    wait_for(lambda:driver.js("return document.querySelector('main').dataset.currentView==='materials'&&!!document.querySelector('[data-material-id=\"hku-mphil-materials\"]')&&!document.querySelector('.materials-intro').textContent.includes('正在载入')"))
    require(driver.js("return document.getElementById('supplement-status').hidden"), 'Material supplement failed or partial')
    results = {}
    for label,query in [('multiword','IELTS 6.5'),('reversed','6.5 IELTS'),
                        ('ascii','IELTS'),('fullwidth','ＩＥＬＴＳ'),
                        ('missing','IELTS zero-nonexistent-material-word')]:
        driver.type_text('#search',query)
        driver.key('\ue007')
        driver.settle()
        ids = driver.js(MATERIALS)
        check_material_results(ids,label!='missing')
        if label == 'missing':
            require(ids == [], 'Multiword search did not require every token')
        elif label == 'reversed':
            require(ids == results['multiword'], 'Reversed terms changed matches')
        elif label == 'fullwidth':
            require(ids == results['ascii'], 'Full-width IELTS is not normalized')
        results[label] = ids
        report['checks'].append({'viewport':list(viewport),'materialQuery':query,'resultIds':ids})
        if label in ('multiword','fullwidth','missing'):
            capture(prefix+'-02-material-'+label,viewport)

    driver.type_text('#search','IELTS 6.5')
    driver.key('\ue007')
    driver.settle()
    expected = driver.js(MATERIALS)
    require(expected == results['multiword'], 'Repeated material search is unstable')
    opener = '[data-material-id="hku-mphil-materials"] .detail-button'
    driver.click(opener)
    wait_for(lambda:driver.js("return document.getElementById('detail-dialog').open&&location.hash==='#materials/summary/material/hku-mphil-materials'"))
    capture(prefix+'-03-material-summary',viewport)
    driver.click('#detail-back')
    wait_for(lambda:driver.js("return !document.getElementById('detail-dialog').open&&location.hash==='#materials'"))
    driver.settle()
    require(driver.js(MATERIALS) == expected, 'Material return changed result identities')
    require(driver.js("return document.getElementById('search').value") == 'IELTS 6.5', 'Material return lost query')
    require(driver.js('return document.activeElement.matches(arguments[0])',opener), 'Material return lost opener focus')
    capture(prefix+'-04-material-return',viewport)
    report['checks'].append({'viewport':list(viewport),'materialReturn':{'query':'IELTS 6.5','resultIds':expected,'openerFocus':True}})

    driver.click('#primary-nav [data-view="routes"]')
    wait_for(lambda:driver.js("return document.querySelector('main').dataset.currentView==='routes'&&document.querySelectorAll('[data-compare-project]').length>1&&!document.querySelector('.projects-intro').textContent.includes('正在载入')"))
    require(driver.js("return document.getElementById('supplement-status').hidden"), 'Project supplement failed or partial')
    rows = driver.js(PROJECTS)
    check_project_labels(rows,set())
    first,second = [row['id'] for row in rows[:2]]
    selected = set()
    for item in [first,first,first,second]:
        driver.click('[data-compare-project="'+item+'"]')
        selected.symmetric_difference_update({item})
        check_project_labels(driver.js(PROJECTS),selected)
    require(not driver.js("return document.getElementById('compare-open').disabled"), 'Two selected projects cannot compare')
    capture(prefix+'-05-selected-projects',viewport)
    driver.click('#compare-open')
    wait_for(lambda:driver.js("return document.getElementById('compare-dialog').open"))
    capture(prefix+'-06-comparison',viewport)
    driver.click('[data-close="compare-dialog"]')
    wait_for(lambda:driver.js("return !document.getElementById('compare-dialog').open&&location.hash==='#routes'"))
    require(driver.js("return document.activeElement.id==='compare-open'"), 'Comparison close lost opener focus')
    check_project_labels(driver.js(PROJECTS),selected)
    capture(prefix+'-07-comparison-return',viewport)
    # Back/Forward replay must preserve selection and return to an enabled control.
    driver.call('POST','/forward',{})
    wait_for(lambda:driver.js("return document.getElementById('compare-dialog').open"))
    driver.call('POST','/back',{})
    wait_for(lambda:driver.js("return !document.getElementById('compare-dialog').open&&location.hash==='#routes'"))
    check_project_labels(driver.js(PROJECTS),selected)
    driver.click('#compare-open')
    wait_for(lambda:driver.js("return document.getElementById('compare-dialog').open"))
    driver.click('[data-remove-project="'+second+'"]')
    wait_for(lambda:driver.js("return !document.getElementById('compare-dialog').open&&location.hash==='#routes'"))
    selected.remove(second)
    check_project_labels(driver.js(PROJECTS),selected)
    require(driver.js("return document.activeElement.id==='compare-clear'"), 'Removing to one project lost fallback focus')
    driver.click('#compare-clear')
    check_project_labels(driver.js(PROJECTS),set())
    require(driver.js("return document.getElementById('compare-tray').hidden"), 'Clear left comparison tray visible')
    capture(prefix+'-08-cleared-projects',viewport)
    report['checks'].append({'viewport':list(viewport),'projectComparison':{'ids':[first,second],
        'repeatedToggle':True,'closeReturn':True,'historyReplay':True,'removeFallback':True,'clear':True}})


if __name__ == '__main__':
    run('GradCompass',scenario)
