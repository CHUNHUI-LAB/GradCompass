"""Read-only advisor completeness audit; missing evidence never becomes an opening.

Run: python3 scripts/audit_advisors.py --date 2026-10-09 [--probe]
The optional HTTP probe records access only, not content verification.
"""
import argparse
import collections
import concurrent.futures
import datetime
import hashlib
import json
import re
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORE_FIELDS = ('id', 'name', 'institution', 'department', 'position', 'topics',
               'summary', 'profileUrl', 'opening', 'openingSummary',
               'openingDetails', 'sources', 'checkedDate')


def source_urls(value):
    """Current nested citations, excluding historical sourceRecord projections."""
    result = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'sourceRecord':
                continue
            if key in ('url', 'profileUrl') and isinstance(item, str):
                if item.startswith(('https://', 'http://')):
                    result.add(item)
            else:
                result.update(source_urls(item))
    elif isinstance(value, list):
        for item in value:
            result.update(source_urls(item))
    return result


def duplicates(records, key):
    groups = collections.defaultdict(list)
    for record in records:
        if record.get(key):
            groups[record[key]].append(record['id'])
    return [{'value': value, 'advisorIds': ids}
            for value, ids in sorted(groups.items()) if len(ids) > 1]


def inspect_advisor(advisor, profile, route_map, shared_urls):
    issues = []
    def flag(code, priority, note):
        issues.append({'code': code, 'priority': priority, 'noteZh': note})
    for field in CORE_FIELDS:
        if not advisor.get(field):
            flag('missing_core_' + field, 1, '基础字段缺失：' + field)
    if profile is None:
        flag('missing_profile', 1, '没有详情简介')
    if not advisor.get('nameZh'):
        flag('missing_chinese_name', 3, '中文姓名待一手来源核对；不按拼音猜写')
    if not advisor.get('caveats'):
        flag('missing_caveats', 3, '目录缺少独立 caveats；其他招生字段仍可能已有边界说明')
    unique_sources = {s['url'] for s in advisor.get('sources', []) if s.get('url')}
    if len(unique_sources) < 2:
        flag('single_unique_catalog_source', 1, '顶层引用不足两个独立 URL；重复标签不算交叉证据')
    if advisor.get('profileUrl') in shared_urls:
        flag('shared_profile_url', 2, '主页指向共用名录/入口；应进一步寻找个人页')
    if re.search(r'待核|未核实', advisor.get('position', '')):
        flag('position_unverified', 1, '职称仍待核；专项拟招生名单不证明职称')
    associations = advisor.get('routeAssociations', [])
    phd_associations = [x for x in associations if x.get('degree') == 'PhD']
    active_phd = [x for x in phd_associations if x.get('routeId') in advisor.get('routeIds', [])]
    if not active_phd:
        flag('no_active_phd_route', 1, '没有已挂接的博士项目；不自动从研究方向补关联')
    for route_id in advisor.get('routeIds', []):
        if route_id not in route_map:
            flag('dangling_route_id', 1, '找不到项目：' + route_id)
    unlinked = [x.get('routeId') for x in associations
                if x.get('routeId') not in advisor.get('routeIds', [])]
    if unlinked:
        flag('nonactive_associations', 2, '保留的关联不在当前 routeIds 中；按状态/限制核验，不盲目挂接')
    opening_rows = advisor.get('openingDetails', [])
    phd_rows = [x for x in opening_rows if x.get('degree') == 'PhD']
    if not phd_rows:
        flag('no_phd_recruitment_row', 1, '招生原文未分出 PhD 行；Graduate 不自动改为博士')
    if any(x.get('cycle2028FallVerified') for x in opening_rows):
        if not any(x.get('degree') == 'PhD' and x.get('sources')
                   and x.get('cycle2028FallVerified') for x in opening_rows):
            flag('2028_degree_evidence_needs_review', 1, '2028 周期已核实但缺博士学位/来源对应证据')
    theme_works = bool(profile and any(
        '公开研究主题' in w.get('title', '') or '公开研究范围' in w.get('title', '')
        for w in profile.get('representativeWorks', [])))
    if theme_works:
        flag('research_themes_in_works', 1, '代表成果为研究主题摘要；尚未收集可核对的具体论文/项目')
    if profile and re.search(r'未.*核实|未.*披露|未提供',
                             profile.get('labSnapshot', {}).get('structure', {}).get('textZh', '')):
        flag('lab_structure_unverified', 2, '团队规模、成员或指导分工尚未核实')
    if profile and any(re.search(r'未.*提供|未.*核实|未.*披露', x.get('textZh', ''))
                       for x in profile.get('labSnapshot', {}).get('resources', [])):
        flag('lab_resources_unverified', 2, '设备、算力或学生可用资源尚未核实')
    return {
        'advisorId': advisor['id'], 'name': advisor['name'],
        'nameZh': advisor.get('nameZh'), 'institution': advisor['institution'],
        'department': advisor.get('department'), 'profileUrl': advisor.get('profileUrl'),
        'catalogCheckedDate': advisor.get('checkedDate'),
        'profileCheckedDate': profile.get('checkedDate') if profile else None,
        'profileDepth': 'catalog_summary' if theme_works else 'requires_individual_read_review',
        'catalogSourceCount': len(advisor.get('sources', [])),
        'uniqueCatalogSourceCount': len(unique_sources),
        'currentCitationUrls': sorted(source_urls(advisor) | source_urls(profile)),
        'activePhdRouteIds': [x['routeId'] for x in active_phd],
        'phdAssociationStatuses': [x.get('status') for x in active_phd],
        'phdOpeningStatuses': [x.get('status') for x in phd_rows],
        'phd2028FallVerified': any(x.get('cycle2028FallVerified') is True for x in phd_rows),
        'remainingHeadcountVerified': any(x.get('remainingHeadcountVerified') is True for x in phd_rows),
        'nonactiveAssociationIds': unlinked,
        'issues': issues,
    }


def build_audit(catalog, profiles, date, commit, hashes):
    advisors = catalog['advisors']
    profile_map = {p['advisorId']: p for p in profiles['profiles']}
    route_map = {r['id']: r for r in catalog['routes']}
    shared = {x['value'] for x in duplicates(advisors, 'profileUrl')}
    records = [inspect_advisor(a, profile_map.get(a['id']), route_map, shared) for a in advisors]
    counts = collections.Counter(i['code'] for r in records for i in r['issues'])
    schools = []
    for institution in sorted({a['institution'] for a in advisors}):
        rows = [r for r in records if r['institution'] == institution]
        schools.append({'institution': institution, 'advisors': len(rows),
                        'catalogSummaryProfiles': sum(r['profileDepth'] == 'catalog_summary' for r in rows),
                        'withoutActivePhdRoute': sum(not r['activePhdRouteIds'] for r in rows),
                        'withExplicitPhdSignal': sum('explicit' in r['phdOpeningStatuses'] for r in rows),
                        'phd2028FallVerified': sum(r['phd2028FallVerified'] for r in rows)})
    return {'schemaVersion': 1, 'checkedDate': date, 'baseCommit': commit,
            'inputSha256': hashes,
            'scopeZh': '全部现有导师的字段、来源引用、博士关联与简介深度检查；HTTP访问另记。未逐页重读全部外部来源。',
            'boundariesZh': [
                '有简介、有引用、HTTP成功均不等于事实充分或当期可招生。',
                'eligibility 是早期本科申请便利筛选字段，不是个人博士导师资格认证。',
                '研究主题不计为具体代表论文；268份目录摘要不视为独立深读。',
                '无博士项目关联不等于导师无博士资格；待核/受限关联不自动激活。',
                '个人2028博士招生只按对应PhD招生行判断；未找到不表示不招生。',
                '未核实的余位、团队信息和资源不从网页缺省或职称推断。'],
            'summary': {'advisors': len(advisors), 'profiles': len(profiles['profiles']),
                        'institutions': len(schools), 'routes': len(catalog['routes']),
                        'catalogSummaryProfiles': sum(r['profileDepth'] == 'catalog_summary' for r in records),
                        'issueCounts': dict(sorted(counts.items())),
                        'phdOpeningStatuses': dict(collections.Counter(x for r in records for x in r['phdOpeningStatuses'])),
                        'phd2028FallVerified': sum(r['phd2028FallVerified'] for r in records),
                        'remainingHeadcountVerified': sum(r['remainingHeadcountVerified'] for r in records)},
            'duplicateGroups': {key: duplicates(advisors, key) for key in ('id', 'name', 'nameZh', 'profileUrl')},
            'institutions': schools, 'advisors': records}


def probe_urls(urls, date):
    # Small response prefix detects common access barriers; never called content verification.
    locks = {urllib.parse.urlsplit(u).hostname: threading.Semaphore(3) for u in urls}
    def probe(url):
        start = time.monotonic()
        row = {'url': url, 'checkedDate': date, 'method': 'GET', 'statusCode': None}
        with locks[urllib.parse.urlsplit(url).hostname]:
            try:
                request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; GradCompass source-access audit)', 'Range': 'bytes=0-8191'})
                with urllib.request.urlopen(request, timeout=12) as response:
                    body = response.read(8192).decode('utf-8', errors='replace')
                    row.update(statusCode=response.status, finalUrl=response.url,
                               contentType=response.headers.get('Content-Type', ''))
                    barrier = re.search(r'<title>[^<]*(?:captcha|403|404|access denied|just a moment|not found)|checking your browser|访问过于频繁|安全验证', body, re.I)
                    row['result'] = 'access_barrier' if barrier else 'http_success_content_unverified'
            except urllib.error.HTTPError as error:
                row.update(statusCode=error.code, finalUrl=error.url, result='http_error')
            except Exception as error:
                row.update(result='transport_error', errorType=type(error).__name__, error=str(error)[:200])
        row['elapsedSeconds'] = round(time.monotonic() - start, 2)
        return row
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(probe, url) for url in sorted(urls)]
        for future in concurrent.futures.as_completed(futures):
            rows.append(future.result())
            if len(rows) % 100 == 0:
                print(f'HTTP access probes: {len(rows)}/{len(urls)}', flush=True)
    return {'schemaVersion': 1, 'checkedDate': date, 'startedAtUtc': started,
            'completedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'scopeZh': '全部导师当前嵌套引用及简介链接的去重URL；不含sourceRecord历史镜像。不含仅项目引用。GET读取至多8192字节；没有验证页面正文事实。',
            'limitationsZh': ['超时/403/验证页可能是网络或防爬限制，不据此宣布来源失效。',
                              '成功状态不排除软404、过期正文、错误跳转或页面内容变更，仍须人工核读。'],
            'summary': dict(collections.Counter(r['result'] for r in rows)),
            'results': sorted(rows, key=lambda r: r['url'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', required=True)
    parser.add_argument('--probe', action='store_true')
    args = parser.parse_args()
    datetime.date.fromisoformat(args.date)
    paths = ['data/catalog.json', 'data/advisor-profiles.json']
    raw = {p: (ROOT / p).read_bytes() for p in paths}
    audit = build_audit(json.loads(raw[paths[0]]), json.loads(raw[paths[1]]), args.date,
                        subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                        {p: hashlib.sha256(b).hexdigest() for p, b in raw.items()})
    folder = ROOT / 'audits'
    folder.mkdir(exist_ok=True)
    def save(name, value):
        (folder / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    compact_date = args.date.replace('-', '')
    save('advisor-completeness-' + compact_date + '.json', audit)
    print(json.dumps(audit['summary'], ensure_ascii=False), flush=True)
    if args.probe:
        urls = {u for r in audit['advisors'] for u in r['currentCitationUrls']}
        access = probe_urls(urls, args.date)
        save('source-access-' + compact_date + '.json', access)
        print(json.dumps(access['summary']), flush=True)


if __name__ == '__main__':
    main()
