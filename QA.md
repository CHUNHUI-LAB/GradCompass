# 2026-10-02 programme-introduction expansion preparation QA

Base: `c3a2fe200fe03ea0d32eb6d6d1e581d0a44bf8b5`. All 44 repository blobs matched the fresh GitHub tree before editing. The base has a successful [Pages run](https://github.com/CHUNHUI-LAB/GradCompass/actions/runs/36958920364); that is baseline evidence only. The checks below describe preparation before publication and do not imply deployed acceptance.

## Bounded changes

- Nine additional introductions join existing verified/default routes by exact route ID, institution and degree
- Total: 17 introductions, all 17 verified routes in the five requested Hong Kong schools, 35 unique official sources; total project count stays 27
- Eight existing introduction objects and all 19 existing source objects are preserved exactly; six reused source IDs are deduplicated and 16 new sources are appended
- Catalogue, official eligibility, raw source records, deadlines, materials, funding, advisor links, 16 experiences, RA data, profiles and renderer/normalizer remain byte-identical to the base
- Runtime edits are restricted to content-hash cache references in `assets/app.js` and `index.html`; there is no redesign or new navigation behavior
- New and existing count tests, browser coverage list, release manifest and documentation are updated intentionally

## Source review and degree boundaries

All 45 added claim groups have references to official pages. HKUST catalogue information is supported by the full official text; no search-only snippet is used to promote a cycle or eligibility claim.

- HKUST ECE: at least 15 approved coursework credits, at least nine ECE credits, two-year full-time MPhil, relevant degree/high-honours conditions, and 1 June 2027 non-local full-time Fall deadline. Spring 2026/27 and HKPFS dates stay separate
- HKU ECE, ME and DASE: honours-bachelor MPhil entry, coursework/research/defence requirements and the university-level 2027/28 main round are supported. ME's 2023/24 brochure heading is disclosed; DASE's PhD-labelled courses are not asserted as MPhil requirements
- CUHK Robotics: the 2026/27 curriculum is labelled explicitly. The Graduate School URL returned blank versus 31 March 2027 deadline fields through different full-page retrievals; the inconsistency remains pending rather than being promoted to verified
- PolyU AAE: MPhil second-class-honours bachelor entry versus four-year PhD first-class-honours bachelor entry stays distinct. Supervisor naming is correctly described as a departmental recommendation. The existing institutional semester-table source supports its AAE row even though its retained locator also names ISE; that source object is not rewritten. January/May 2027 intake dates do not establish a September 2027 AAE intake
- PolyU Intelligent Robotics Engineering: course and dissertation alternatives remain taught MSc; conditional funding remains explicitly conditional
- CityU DS: first-class-honours bachelor PhD entry and no-MPhil policy are explicit. Research methodology/ethics is at least two credits. The linked 2026/27 curriculum is not represented as the final 2027/28 curriculum; ordinary-round deadline conflict and original `city_steps.retrievalConflict` are untouched

Minimum-credit wording, supervisor-recommendation wording and visible curriculum-year qualifiers are retained. No personal admission assessment, funding promise or supervisor opening was added.

## Passed checks

- Full `npm test`: 148 passed, zero failed, zero skipped
- Existing 137 checks retained, with intentional coverage-count updates; eleven new expansion checks cover exact old-object/source preservation, protected byte hashes, all scoped routes, per-claim rendering, each degree/cycle boundary, and research search under school/degree gates
- All 17 summaries render before external official links through the existing normalizer and renderer
- Missing/malformed/partial/stalled/late-loading optional data, repeated open/close, material/experience/advisor sections and independent filters remain covered
- The normalizer does not transfer eligibility, funding or recruitment fields from introductions
- `python scripts/freeze.py` regenerates the exact allowlist and dependency hashes; repeated freeze is byte-idempotent, and patch application to the verified base reproduces the final candidate

## Browser status

All three local suites were attempted against the candidate static server: `tests/project-summaries-browser.mjs`, `tests/experiences-browser.mjs`, and `tests/browser-smoke.mjs`. Each stopped before the first page assertion with Chromium `socket() failed: Operation not permitted`. No new desktop, mobile, screenshot or visual acceptance is claimed.

The focused project suite now enumerates all 17 introductions, alongside filters, Back/Forward, 390/320px and failed optional fetch recovery. Its added coverage remains unexecuted until a supported browser run is available.

## Reproducibility

Run `npm test` and `python scripts/freeze.py` to check the public files and regenerate their hashes. Test results and deployment results are separate. Historical records below describe their named versions.

---

## Retained prior QA records

# 2026-10-02 project-introduction candidate QA

Base: `4ba63ecdccad8d8eb09e9761644b2888c64efe35`. All 39 repository blobs were checked against a fresh GitHub tree before this isolated candidate was edited. Publication has not been performed.

## Scope and evidence

- Eight introductions across five existing Hong Kong schools, joining only verified route IDs with exact institution and degree matches
- Nineteen official introduction sources, with per-claim references, source reading dates and preserved publisher-update dates where observed
- In-site research/training/bachelor-entry/cycle summary precedes source links; unsupported projects retain the basic summary and explicit coverage limits
- Project search includes the new introduction text while preserving existing institution, degree and eligibility gates
- MPhil, PhD, taught MSc and RA employment remain separate; no new advisor, recruitment, funding or personal-eligibility conclusions
- Original 16 experiences, advisor profiles, RA data, core eligibility module and protected render tests remain byte-identical
- CityU correction is limited to two ME route cycle fields, one ordinary calendar item and the deadline/scope fields of two material groups. Original checked dates, sourceRecord and previous values are retained. Reversing the narrow review fields reproduces original catalog and material digests exactly

## CityU source conflict

The English and zh-hk ordinary procedure URLs returned an old 2026-entry / 1-Dec-2025 noon table through full-text retrieval. The official indexed zh-hk page returned a newer 2027/28 / 1-Dec-2026 23:59 table. Live verification stopped at an unsolved CAPTCHA. The EE department independently publishes a Dec-2026 ordinary round, but does not establish ME-specific scope. These observations are kept as a retrieval-version conflict; the candidate does not claim that Dec-2026 dates are exclusive to HKPFS or that the earlier verified snapshot was fabricated.

Ordinary ME 2027 deadline and ordinary timing in the two CityU material groups are conservatively pending resolution. The separately read CityU and RGC HKPFS 2027/28 pages establish that scheme's RGC initial-registration deadline (2026-12-01 12:00 Hong Kong time) and CityU full-application deadline (same day 23:59). They are not used to determine ordinary MPhil/non-HKPFS PhD dates.

## Passed checks

- Full `npm test`: 137 passed, zero failed, zero skipped
- Per-claim source resolution; exact school/degree joins; orphan, malformed, duplicate and unsupported record rejection; escaped content and safe source links
- Coverage counts and searchable Chinese research descriptions; exact institution/degree filters and original eligibility restrictions
- Optional project-summary data loads after first render. Missing files, rejection, malformed JSON structures, partially invalid records, never-settling fetch/JSON and late arrival after newer navigation all have regressions
- Repeated dialog open/close, existing internal project/material/date links, original experience navigation, independent filters, profiles, opportunity counts and material coverage remain in the full suite
- Content versions track modified catalog, material, project-summary, module and app bytes; unrelated dataset versions stay unchanged

## Browser status

The focused `tests/project-summaries-browser.mjs` was attempted against a local static server. Chromium aborted before the first page assertion with `socket() failed: Operation not permitted`. No desktop, mobile, screenshot or visual acceptance is claimed. The existing full smoke and experience browser suites were not newly run in this candidate; their earlier blocked attempts are historical records below. The additional focused browser script includes all eight project dialogs, filter persistence, Back/Forward, 390/320px checks and failed optional fetch recovery for a future supported run.

## Known limits

The CityU source conflict remains unresolved. The optional-loader hang was fixed and regression-tested. Passing software tests does not establish the disputed ordinary deadline.

---

## Retained historical release-preparation records

# 2026-10-02 experience expansion preparation QA

Base: `b61dacd67ed480620fa2c88f7a94bf059cda8df9`, re-read from remote main on 2026-10-02. Every one of its 38 Git blobs was matched before editing. Preparation used an isolated snapshot, before publication. Deployment evidence must be checked against the exact commit separately.

## Preparation checks

- 16 accounts across 12 source sites or collections; all eleven previously published record objects retain their fixed digest, and the original four digest remains checked
- Five new individual summaries and provenance records; all sixteen IDs are linked from the synthesis before the card list
- Full Node / DOM-contract suite: 118 tests passed, zero failed or skipped after content-hash freezing
- All previous advisor, opportunity, material, eligibility, loading-failure, independent-filter, navigation and resource-version regressions remain included
- Official catalog, advisor profiles, RA positions, material datasets, protected render test and their applicable assets remain byte-identical to base
- Candidate manifest has an explicit allowlist and SHA-256 hashes; only release files are included

## Source review and editorial decisions

Each of the five proposed original sources was independently reread, not accepted from search snippets. The CUHK 2023/2024 account was cross-checked against its duplicate thread: the original author account matches the dated 2024-06-13 outcome reply. The duplicate is one case. The 2018 CUHK post separates a submitted first-author paper from two accepted non-first-author papers; no exact grades are republished. The 2015 HKUST migration page's 1970/2020 metadata is not treated as a publication date, and its PhD recruitment invitation is not a degree offer.

The HKUST 2023 experience is explicitly an undergraduate summer research internship, with HPCA submission only and a future UPC RA plan. The 2025 cryptography account is a same-cycle adjustment with mixed formal/stable-verbal offer statuses; its page also displays an update date of 2025-09-18. It is not a Hong Kong admission or next-year reapplication case.

The CUHK RA author's paid application services are disclosed. The CUHK 2018 author's own Live promotion is disclosed without assuming a price from an unvisited payment page. No contacts, raw posts, precise grades, decision identifiers or identifiable PI allegations are included. All outcomes remain self-reports; no employment contracts, admission letters, funding or enrollment were independently verified. The conflicting-year HKU medical RA-to-PhD narrative remains excluded. Recent Hong Kong engineering MPhil and full-time RA employment-detail gaps remain open.

## Browser boundary at preparation

The updated sixteen-case browser suite and the unchanged full browser smoke suite were attempted against the candidate. Chromium aborts before launching with `socket() failed: Operation not permitted`; neither suite reaches a page assertion. No new browser, mobile, screenshot or visual acceptance is claimed. The prior release's desktop spot-checks below are not acceptance of the new five cases.

## Version scope

These test results describe the sixteen-case preparation snapshot. The older results below describe the eleven-case version. Deployment results must be matched to the exact commit.

---

## Retained eleven-case baseline documentation

# GradCompass experience expansion QA

## Current release status (2026-10-01)

The eleven-case expansion is published. [Content commit de9aa856](https://github.com/CHUNHUI-LAB/GradCompass/commit/de9aa856743520bc762ae6b29aacf31a82f9df02) is on main, and its [Pages build and deployment run](https://github.com/CHUNHUI-LAB/GradCompass/actions/runs/36903393867) completed successfully on 2026-10-01. The dataset contains eleven accounts across nine source sites or collections, with individual summaries and an eleven-case synthesis.

Post-publication manual desktop spot-checks covered ordinary refresh, experience reading and return to the list, and browser Back/Forward. This is limited manual coverage: the full automated browser suites, mobile visual QA and user acceptance remain unverified. The documentation reconciliation reran all 111 Node / DOM-contract tests successfully; it did not perform new UI testing.

The candidate-era record below is retained as historical evidence. In `release-manifest.json`, candidate status and browser-blocker fields describe that preparation stage; the allowlisted file hashes describe the current snapshot.

## Pre-publication QA snapshot (2026-10-01, before deployment)

Base: `f90ec1e7d47b0b88df25be81f5fc26ec8e63092b`. Remote main rechecked on 2026-10-01; all 37 base blobs match the local source snapshot. This is an isolated candidate, not published.

### Passed

- All 111 Node / DOM-contract tests pass, with no skipped tests
- Eleven records across nine source sites or collections; the original four record objects are unchanged and checked by a fixed digest
- Each of the seven new cases retains summary, context, actions, outcome, exclusions, reading scope, date and commercial disclosure
- Every case is mapped within the eleven-case synthesis, not just the card list
- A twelfth unsynthesized case leaves the eleven-case overview visible and explicitly pending; missing synthesized cases produce an incomplete notice
- One CTA per card, full in-site reading, original post after summary and restrictions; direct URL, return, history and invalid-link contracts preserved
- RA-to-PhD cases, ambiguous MPhil/PhD notation, missing replies, inconsistent dates, stale waiting paragraphs and unfinished RA/MPhil intent are explicitly bounded
- New source links contain no signed query parameters; no personal contacts, exact grades, offer identifiers or screenshots are copied
- Source provenance matches all eleven IDs and URLs; no experience record joins official advisor/project/job eligibility
- Content-hash chain covers experience JSON and experience module, then app, then HTML; unchanged modules, styles and official data keep their bytes/versions
- Resource existence and content checks resolve URL pathname, so query strings cannot conceal missing files
- Entire prior eligibility, advisor counts, materials, summaries, independent-filter and restoration regression suite passes
- Protected `tests/render.test.mjs` remains byte-identical to the published base

### Source review

Six new text-first sources have complete main-text reading evidence. The Xiaohongshu case covers the full post, cover and 20 loaded comments/replies; remaining comments in the displayed total of 53 were not expanded. Its cover's MPhil claim does not override the unfinished contract/visa state in the body. Personal outcomes are self-report, not independently verified decisions.

### Browser status at candidate preparation

The published f90ec baseline was actually checked on desktop: four cards to full reading, Back/Forward, list return, and advisor RA filter restoration across the material page. Text and source links were readable. Mobile was not checked and user acceptance was not established.

The new eleven-case candidate has expanded browser regression coverage, including each new reading page. Local Chromium launch remains blocked by socket creation (`Operation not permitted`); no new browser, screenshot, visual or mobile acceptance is claimed. The full browser smoke suite is likewise not accepted. Existing desktop baseline success is not reported as new candidate acceptance.

### Reproducibility

The version can be checked with `npm test` and its content hashes regenerated with `python scripts/freeze.py`. Browser test results and deployment status are separate from the Node results above.

## 2026-10-03 申请经验整页候选（尚未发布）

基于 main `ca1095c41420717c518bc139b318f183b7a688d7`，原始快照257项检查通过。整页候选267项 Node/DOM-contract 检查全部通过，未跳过；新增覆盖搜索正文/作者/方法、大小写/空白、背景与搜索交集、无结果恢复、输入焦点与综合内容保持稳定、独立页面筛选、快捷键防误触、多历史条目独立条件恢复。

19篇经验及全部 data 文件与基线逐字节一致。原完整综合归纳和对应案例未删减，挂载位置移入页首摘要之后；旧测试的组合渲染断言按新容器更新。移除历史运行时快照测试中已被本次有意修改的 experience renderer 哈希锁，新增源数据字节锁与交互行为测试；其他数据和模块快照锁保留。

`python scripts/freeze.py` 更新依赖版本和严格发布白名单。没有新增运行时依赖、追踪脚本、账户、外部字体或存储服务。没有启动本地 Chromium 或尝试绕过此前权限限制；本次浏览器自动化、桌面/窄屏视觉与实际触控仍未运行，需在获准发布的准确提交上继续核验。独立代码审查已完成：逐字节核对全部9份数据、19份完整阅读页输出及综合归纳正文；发现未筛选历史条目可能继承后续搜索的问题，已修复并加入回归。审查者独立复跑266项通过，新增该回归后最终267项全部通过。另将3处旧的「卡片之前」断言改为直接检查综合依据，避免列表链接造成误通过。浏览器和辅助技术的实际表现仍需另验。


## 2026-10-03 已批准暖白铜色视觉候选

基于 freshly verified main `5e1fdf855ab113631f12e31ba918faa2766d01d2`。实现暖白、铜色与墨绿的 editorial 首页、直接搜索、实际学校/研究方向/申请类型筛选、可展开的额外筛选、三条站内导览，以及手机导航开合。保持19篇经验、32位导师、48条机会、27个项目与全站/逐篇摘要；全部 data 文件逐字节不变。校园图为明确标注的 AI 意境装饰，不对应真实院校，不是学校照片。

`python scripts/freeze.py` 后完整 `npm test` 273项通过，无失败、跳过。新增菜单重复开合、导航关闭与焦点、Escape返回焦点、搜索/导览定位结果且不污染history、数据字节一致及首页顺序检查。三个旧断言只更新有意改变的导航属性、搜索先于综合的位置及准确基线SHA；其余行为与来源断言保留。独立审查发现并修复移动端搜索flex继承、首页导师导览无跳转、Reset视觉/键盘顺序不一致。

使用非浏览器 WeasyPrint 对实际模块生成的摘要/列表与HTML做1440/390宽静态排版观察；仅在审查产物中解析viewport媒体条件并替换静态表单标签。它不支持全部浏览器CSS、交互或SVG，因此不是实际浏览器或辅助技术验收。候选未启动被禁止的本地Chromium，也未使用新托管绕过权限。准确发布提交的Pages部署和真实桌面/手机宽度、200%缩放、筛选/摘要/返回/菜单仍须在发布后分别验证。未新增外部字体、追踪、账户、浏览器存储或运行时依赖。

### Published a703ea6 live-browser checks and positioning correction

Exact Pages run `37103877222` completed successfully for `a703ea6fe244bef75e0c5ee51461824d6e423144`; build, deploy and report-build-status checks all succeeded. Live cloud-browser checks at 1182px, 500px, 400 CSS px (native 125% zoom) and 200% zoom (591 CSS px) verified no horizontal overflow. Search→empty→reset, RA filter restoration across project navigation, complete project text before external sources, experience search/read/Back/Forward, mobile repeated menu toggling/Escape/navigation-close focus and narrow project dialog passed. These checks are not physical-device or screen-reader certification. A decorative compass/text overlap was observed; this correction separates their desktop placement and moves the mobile compass above the subtitle. Final corrected commit visual recheck is pending independently of the earlier checks.


## 2026-10-03 公开数据有界维护（独立于视觉更新）

以已实际验收的视觉提交 `8da0a9be4a5248d00343c18d42502c6b8558c465` 为基线。对应 Pages `37104504435` 已成功；视觉定位修正已在真实桌面与400 CSS像素窄屏重检。此次仅更改数据及其测试、依赖hash和说明，不改前端结构或样式。

CityU主域普通研究学位流程 Important Date 于2026-10-03直接核读为2027/28主轮2026-12-01 23:59（香港时间UTC+8），MNE院系页明确链接到该申请流程。更新机械工程两条路线、Data Science PhD的普通轮说明、一条日历、两组材料的日期要求和三篇项目的批次字段。旧2026-10-02冲突对象完整保存在当前review.history；当前可见review正确显示2026-10-03及已经核实的普通轮日期。招生实际提交状态保持unknown；不从未来截止推断开放或导师余位。

原始sourceRecord、旧checkedDate、所有非日期资格/材料、导师、RA岗位、19篇经验及完整研究/培养介绍均保留。新增的来源条目仅标记本次时间表核读；旧来源URL/版本冲突与核读日期未重写。新增历史重建助手只还原明确记录的前值，原全文件SHA检查继续证明其余字节未变；另有五项当前事实、当前渲染、材料边界及历史完整性检查。完整278项Node/DOM-contract检查通过，无失败或跳过。

范围逐项记录在 [2026-10-03维护记录](data/maintenance-2026-10-03.json)：HKU、HKUST CSE、CUHK MAE、PolyU IRE、HKBU现有日期与当前官方正文一致；HKUST(GZ)博士与MPhil、CUHK-Shenzhen SAI及西湖的批次边界分别核查。西湖已读完整2027第一批通知，2026-08-31 10:00北京时间的第一批仍为已截止，不能据此推定后续批次。两条PolyU RA岗位学历类别分开，不把RA变成学位。公开问答线索正文/评论可见范围单独记录，不为增加数量扩充经验。

不是所有高校、32位导师、社媒评论或申请系统的穷尽复核；不宣称自动维护首轮全覆盖成功。英语有效期口径分歧、实际名额/资助、个人资格与未核到的院系材料继续保持边界。数据提交的精确Pages与线上摘要验收在发布后另核。


## 2026-10-03 两条经验内容补充

以已发布 `4840df6a9718ec38e472f8fd7496047248029e71` 为基线，新增华工手册红鸟 2022—2023 年条件录取与毕业补件记录，以及 Benjamin 2026 年本科科研/实习入口的相关经历。原 19 条记录及来源对象逐项保留，共 21 条公开自述、16 个来源平台；并非 21 条学位录取。Benjamin 不标为全职 RA 雇佣或学位录取，红鸟疫情期语言安排不作当前政策。两条均有独立摘要、可借鉴步骤、不能照搬部分及核读范围，已加入逐项综合依据。

官方项目、导师、岗位、材料和 CityU 普通轮日期数据保持本次基线字节一致；32 位导师、48 条机会、27 个项目不变。不发布原始抓取正文、私人信息或待核候选。283 项 Node 测试覆盖原 19 条对象与来源的完整哈希、新增案例边界、21 条综合范围及来源链接顺序；测试不替代正式 Pages 发布后的在线核验。


## 2026-10-03 导师关联文案整理

以 01e9b41019971e7c5b5a21eca4ca773966ec6664 为基线，仅在展示层将三种含 routeAssociations 的说明改为读者可理解的中文，保留名额、指导资格及授课型硕士限制。项目卡片、项目摘要、导师详情和比较共用此转换，原始数据与布局不变。新增三项 Node/DOM 回归，286 项通过；既有测试断言原样保留，仅更新有意变更模块及追加测试的精确哈希。此记录不代表真实浏览器、部署或用户审美验收。


## Approved F2 interface candidate · 2026-10-03

Baseline: remote `main` at `e1fee31499ece3e06ab19bde1021d6be231cdf4d`. All 65 repository blobs were checked against that authorized remote tree before implementation. All 10 JSON data files remain byte-identical; a dedicated test locks those Git blob hashes.

The complete recommended design's GradCompass reference pages 20–32 were inspected as original image pixels. The implementation uses the reference's white/copper editorial structure, six primary sections, sidebar filtering, row separators, source-aware reading rails, timeline groups, and semantic comparison table. It does not turn fictional mockup institutions, photos, accounts, dates, totals or qualifications into site data.

### Reference evaluation

| PDF page | Template | Candidate implementation | Intentional evidence-preserving adaptation |
| --- | --- | --- | --- |
| 20 | Advisor discovery | Copper active navigation, large title/search, left filters, structured rows and actions | Decorative initials replace unlicensed fictional robot photos; all 48 opportunities stay visible/filterable |
| 21 | Projects | Research introduction, training, qualifications and per-project selection | Only the 27 verified academic routes can enter project comparison; RA stays separate |
| 22 | Deadlines | Source-date-aware groups, date column, status and internal detail action | Counts and dates are computed from actual records; no example deadlines copied |
| 23 | Materials | Readable requirement rows, school/degree filters and internal reading | Existing 14 source-backed groups preserved instead of inventing generic mandatory lists |
| 24 | Experiences | Synthesis, search/background filters, summary/method/boundary rows | Original source remains after internal reading, with self-report caveats intact |
| 25 | Sources | Three evidence levels, existing verification rules, update state and source entries | No fabricated update log or account controls |
| 26 | Advisor detail | Full-width reading surface and application/source rail | Professional profiles, exact titles, source conflicts and recruitment qualifications preserved |
| 27 | RA detail | RA-specific heading and rail with employment caveat and source links | Employment requirements, contract/date/work-permit limits preserved; no implied degree offer |
| 28 | Project detail | Main reading column, key project/source rail and related materials/date links | Full original introduction, qualifications, cycle, association limits and sources retained |
| 29 | Date detail | Exact date/time/timezone and source rail | Unknown times stay unknown; independent registration/recommendation deadlines are not invented |
| 30 | Material detail | Structured requirement reading and preparation/source rail | Conditions, scope, unknowns and official sources remain intact |
| 31 | Experience detail | Summary-first reading, contents controls, background/method/boundary/source sections | In-page contents do not overwrite hash routing or reading history |
| 32 | Comparison | 2–3 project columns, remove, difference-only, detail/source links and accessible horizontal scroll | Full source-backed qualification/cycle limits retained; unknown funding is explicit |

### Design and accessibility checks

- System sans fonts only; no font downloads or third-party asset requests
- 18px main text on desktop, 16px on narrow screens; metadata at least 14px, controls at least 16px with 44px targets
- 8px controls, 12px panels, shared neutral/copper colors, restrained borders
- Text contrast ratios: main 17.93:1, body 10.49:1, secondary 5.54:1, copper 5.95:1, caution 5.79:1 on their respective backgrounds
- 160ms color transitions, 220ms reader entry, reduced-motion opt-out
- Keyboard-visible focus, native menu and filters, screen-reader status counts, empty/loading states
- Existing filtering, source text, qualification and history regression checks retained; obsolete illustrated-landing assertions intentionally migrated to F2 contracts
- Existing data/runtime integrity assertions remain; superseded CSS-prefix and test-file byte snapshots are replaced by explicit F2 behavior/type/layout contracts plus exact source-data hashes

### Verification boundaries

Node tests and DOM-contract tests validate state transitions, markup, source preservation and declared responsive CSS. HTML parsing found no duplicate IDs, unclosed tags or mismatched tags. These checks do not establish browser layout or pixel parity.

Candidate browser screenshots and real narrow-viewport acceptance have not run. Local preview routes are unavailable in the current review workflow, and no alternate route was used to bypass that restriction. Pixel comparison must be performed on an authorized deployed candidate before final visual acceptance. No claim of deployment or user aesthetic acceptance is made here.

Final local validation after integration fixes: `npm test` passed 326/326 (0 failed). This includes 16 new pure comparison tests, 18 independent comparison-navigation contracts and 6 F2 design/data-boundary tests. Syntax checks passed for the changed application, experience and comparison modules; `git diff --check` passed. Browser visual acceptance remains unverified as noted above.


Independent-review fixes: comparison controls now have stable focus identities. Removing a column focuses the next surviving removal control; optional-data rerenders restore the current toggle, source or detail control without moving dialog scroll or stealing focus from the persistent Close control. Invalid replayed project/advisor/date/material URLs replace prior content with an explicit recoverable missing-record reader. Regression tests cover current-node focus (not detached nodes) and valid → invalid → Back → Forward navigation. The independent reproduction script now reports no detached focus and no stale detail content.

The keyboard-focus regression also models the tabindex table region and third-column source/detail controls. Optional-data rerenders preserve the current focus node identity, dialog scrollTop and table scrollLeft; 326 aggregate contracts pass.


### Deployed browser checks and narrow reader correction

The F2 tree was merged via PR #1 at `f01bdcee38b52537fb34e292fa698cbe7079897c`; its Pages run `37135987182` succeeded. Live entry script and stylesheet hashes matched the reviewed release. The cloud browser was tested at 1167px desktop and 388px narrow widths, with actual native window resizing and ordinary browser zoom. All six section roots stayed within their viewports. Live checks covered RA filtering and employment boundaries, two/three-project comparison, keyboard removal and difference toggle, related project detail and Back, date/time/timezone display, materials, experience contents and restored list focus, plus opening the official HKUST source. Comparison overflow stayed inside its keyboard-accessible table region, and horizontal offset remained through toggling.

At 323px, the reader header's short metadata label could shrink into a one-character vertical column. The follow-up sets its flex basis to auto and prevents word wrapping, allowing action controls onto a separate row. A regression contract covers this rule. This section records actual browser checks; full user aesthetic acceptance is not claimed.


## 2026-10-04 Five experience additions: candidate integration

Preparation base: GitHub main `c61dc2c38c7f0c73a5720985a00dd83e97b9e2e6`. All 69 baseline files were materialized from existing bytes and checked against a fresh recursive GitHub tree's Git blob IDs before editing. GitHub main was rechecked at 03:36 UTC and was unchanged. There have been no remote writes in this preparation step.

The independent source review of all five original bodies completed at 2026-10-04T03:25:54Z. Its required Westlake correction was applied to both the research JSON and Markdown and to the integrated public record: “考虑到推免资格不确定和个人时间安排，未参加后续组内实习”. Original-source first-read and reread UTC times are preserved separately from local integration checks. No new comment bodies, videos, private correspondence, decision letters, scholarship documents or RA contracts were verified. The five cases are historical self-reports with case-specific limits, not five confirmed robotics admissions.

The new highest-degree-unknown CUHK-Shenzhen PhD account is shown with other cross-background process references; its unresolved outcome is bounded to the 2026-05-31 post. Delft is explicitly labelled an overseas reference and does not create a default degree offering. The challenge-camp account reports participation only, the MSDS interview material is historical and taught-degree-specific, and the Westlake account reports camp entry without excellent-camper status rather than a Westlake admission.

Preservation checks retain all 21 prior case and provenance objects and original source dates. A narrow inverse restores the exact complete pre-batch JSON, including its historical metadata, and composes with the earlier maintenance inverse without changing any historical expected hashes. Fixed independent hashes protect every official dataset, the approved F2 stylesheet, unrelated runtime modules and visual assets. App and HTML changes are limited to content-version strings. Synthesis text and corresponding case links now cover 26 records; missing or pending cases still produce explicit incomplete/pending scope.

Validation: the unchanged baseline passed 327/327 Node / DOM-contract tests. The candidate passed 344/344, with 17 additional tests and no failures, cancellations or skips. New coverage includes all five rendered details and searches, original-link order, exact Westlake phrasing, date/outcome/degree boundaries, source timestamps, privacy, missing/pending synthesis and mutation-based negative controls for record, provenance, date, official-data and F2-UI preservation. A regenerated release manifest has a strict 72-file allowlist plus the manifest itself; raw research drafts and source bodies are not published.

A local Chromium launch probe stopped before UI assertions because the runtime denied its process socket (Operation not permitted). This is not a browser pass. The approved stylesheet and layout remain unchanged; fresh browser checks, independent integration review and any later remote publication must be recorded separately. The existing live-browser checks above describe the previous F2 release only.

## 2026-10-04 Three advisor additions: post-cloud integration

Integration base: GitHub `main` at `df65efdbebb3d07af770ca69fbbd92846671be0b`, which includes the five independently reviewed historical experiences above. The cloud experience records, provenance, synthesis, source timestamps and release allowlist are retained before applying the local advisor overlay.

Three new public professional profiles were added to the existing catalogue and profile data:

- **Peng Lu（鲁鹏）／HKU Mechanical Engineering／Adaptive Robotic Controls Lab** — HKU's [faculty page](https://mech.hku.hk/academic-staff/lu-p/), ArcLab [research](https://arclab.hku.hk/Research.html) and [open-positions](https://arclab.hku.hk/OpenPositions.html) pages, plus the MARG and aerial-continuum-manipulator papers, support the listed autonomous UAV, legged-robot, SLAM, learning-control and aerial-manipulation themes.
- **Hengshuang Zhao（赵恒爽）／HKU Computing and Data Science／SAIL** — the [HKU faculty page](https://ai.hku.hk/people/academic-staff/hszhao), [personal/application page](https://i.cs.hku.hk/~hszhao/) and [SAIL lab page](https://sail.ai.hku.hk/) support the computer-vision, embodied-AI, spatial/multimodal-AI and robot-manipulation summary; VIP and Depth Anything V2 are retained as representative works.
- **Xiaoqiang Ji（冀晓强）／CUHK-Shenzhen SSE and SAI／Control and Decision Lab** — the [official Chinese faculty page](https://sai.cuhk.edu.cn/teacher/175), [General-Purpose Embodied Control group](https://sai.cuhk.edu.cn/en/page/209), [lab page](https://cnd-lab.github.io/) and SAI [MPhil-PhD admissions page](https://sai.cuhk.edu.cn/en/node/35) support the embodied-control, heterogeneous multi-robot and legged-robot themes.

All three profiles were checked on 2026-10-04 and include two representative works, source links and explicit unknowns. Their public recruitment pages do not establish a personal 2027 Fall quota, remaining places, funding package or final supervisor acceptance. Group-level target-applicant wording, scholarship links, public equipment lists and membership pages are retained as evidence of research context only; they are not converted into an admission, funding or vacancy promise. The catalogue now has 37 advisor records, 35 visible advisors and 35 complete profiles. The current opportunity build has 52 entries, including 50 degree opportunities and 2 independent RA positions; the two non-visible catalogue records remain outside the default advisor view pending their existing route/profile conditions.

The five experience additions remain bounded as historical self-reports and are not changed by this advisor overlay. The integrated tree passes `npm test` with 344/344 tests and no failures, cancellations or skips. `python scripts/freeze.py` regenerated the 72-file allowlist and content hashes for this exact tree. Browser status remains unverified because the local Chromium probe is subject to the same socket-permission limitation described above.

### 2028 Fall repository baseline

The post-merge repository map is recorded in `REPO-MAP.md`. The advisor catalogue currently has no first-party advisor recruitment record that explicitly names Fall 2028 or the 2028/29 intake. Existing `2027/28 Fall` wording remains a dated Fall 2027 reference and may inform the next review, but it must retain its original year and cannot be relabelled as Fall 2028. The Red Bird late-submission rule that rolls into 2028 Fall is a programme-cycle statement, not a named supervisor opening. Future additions must use an `openingDetails` row with `cycle: "2028 Fall"`, `cycle2028FallVerified: true`, a named degree, dated primary sources and separate vacancy/headcount booleans. Project dates, scholarship calendars and evergreen “welcome to apply” text do not satisfy this rule.

## 2026-10-04 Bounded admissions maintenance and HKU RIS reference

A fresh baseline at `d5f35e001811788d0722436c3c2dd9b73a52dd62` was materialized from GitHub after the earlier publication call was interrupted without a confirmed result. Every file matched the current recursive tree blob hashes, and this unchanged baseline passed 344 tests. The intervening Westlake six-advisor addition and all updated repository guidance are preserved. No commit, ref, branch or PR write had been called for the earlier candidate; this rebased candidate remains local-only.

The source-reviewed HKU RIS additions were replayed append-only into the current datasets: one project, one project summary, one bounded material group, four sources per applicable dataset, and two deadlines. There are now 28 projects and 15 materials groups while 41 visible advisors, 59 opportunities (57 degree and 2 RA), 43 advisor catalog records, 41 profiles and 26 experiences remain. The actual 2027/28 reference cycle and unknown opening state are preserved; no 2028 advisor recruitment is inferred. The exact-ID inverse and fresh-main hash tests protect all concurrent records. Runtime files remain unchanged except generated content-version URLs.

The original candidate passed 354 tests against its older base and independent source/integration review; those results are not represented as verification of this new base. The fresh-base test run, independent review and final patch hashes are recorded outside the historical release metadata. Cloud-browser localhost preview previously returned ERR_BLOCKED_BY_CLIENT, so no fresh candidate visual acceptance is claimed. No remote publication is performed in this rebase stage.

During the final pre-publication ref check, main advanced again to `91af79d313c3d0bd7f3bfd5a4e306a3af596ccaf`. Its SUSTech review JSON, two tests, README append and allowlist additions were preserved byte-for-byte; it does not change current catalog eligibility or opportunities. The candidate was refrozen and all existing and new tests rerun against this exact latest baseline before any commit/ref update. The SHA-only tree operation was not called against the obsolete d5f35e base.

### Post-publication bounded copy correction

Commit `1281ce4740272443563b4a98f421561bacc801f9` reached main with Pages run 37187213765 successful. A fresh live reload confirmed 28 projects, but exposed an older overview title hard-coded to “two MSc” and a loading fallback naming only the original pair. The follow-up changes exactly those two text fragments to a neutral MSc heading and count-only fallback; no rendering, interaction, CSS or structural logic changes. Two regression tests cover the now-three-programme title and loading/unavailable fallback. The original runtime hash remains protected by an exact inverse of those two literals. All concurrent advisor and SUSTech evidence stays untouched.

## 2026-10-04 来源纠错、全集浏览与并发博士参考候选

基线为 `5c27c78fbcb742e7f44e70145d2e91b7e98fde1f`；同日先后读取1ddbbfb及5c27c78，所有变更blob均逐项Git SHA-1匹配。此候选未推送、未部署。

- 原样基线：362项，300通过、62失败。失败包括旧批次数量/原字节断言直接读取了后来新增数据；没有删除旧用例或放宽旧哈希以刷绿
- 本候选第一次完整通过：457项，457通过、0失败、0跳过。包括67项可选加载、11项当前证据/范围、当前PhD参考筛选与阅读、严格历史分阶段逆变换及变异控制
- 历史恢复链为 current → 5c27c78 → 1ddbbfb → 74ca2c8 → b11a381 → 5e7cd36；冻结原字节与哈希保持独立。新增对象改值、未知字段、删字段、排序与局部阶段回退须使保护失败；不通过裁减当前数据恢复旧数
- 实际当前范围：58导师均可浏览、56简介、42项目均可读、57条已核实学位关联、2个独立RA；另有15条博士项目参考，在PhD筛选中显示但不算已核实关联
- 4处清华来源年份/渠道已按官方HTML标题纠正；15位朋友新增导师及所有原routeIds与真实研究内容保留，个人关联待核不是资格否定。IIIS2027 085400推免单独建项，无自动导师关联
- 材料/经验/导师简介/项目简介fetch或JSON永久pending不再阻塞基础目录；晚到材料会刷新仍打开的项目详情和比较，关闭或切换后的弹层不会重开
- 全模块依赖缓存版本、动态计数和严格allowlist由freeze生成；测试计数不硬编码进release manifest
- 未进行浏览器视觉、触摸或真实辅助技术验收；Node DOM-contract通过不能替代该验收。未进行远端写入、发布或部署核验

六模块没有因此被宣称完整：项目简介仍28份、材料15组、经验26篇；新985与海外项目、未完成当期材料与招生来源另批核验。

## 3f294并发增量最终候选（2026-10-04）

上节457项结果属于已冻结的5c27候选，未据此覆盖后续朋友修改。本次最新候选基线为 `3f294a8cc601e77183deb594de0836ec76cc8a9c`，其15个变更blob均Git SHA-1核对一致；原样基线363项、301通过、62失败。

- 新候选完整测试462项全部通过，0失败、0跳过、0取消；历史链显式加入3f294→5c27，旧三份fixture字节和旧457结果保持
- 第五处错标：a5f6博士完整目录的官方HTML h1为2026，不是2027；吴丹、赵慧婵、李曙光仅标2026历史目录列名已核。个人2027/2028接收、余位和资助仍待核
- 保留朋友的博士参考卡、筛选、详情ID和比较功能；比较明确项目参考/个人关联与余位待核，未混入57条已核实学位关联或2个RA统计
- 15个冗余派生sourceRecord字段按朋友的删除意图处理，原值与三方变更证据存入更正历史，顶层routeIds未删除
- IIIS旧081200为学术学位硕士、独立085400为专业学位硕士。前端显示原生学位标签，MSc仅保留兼容筛选值，不能把085400称为理学硕士
- 导师58、简介56、全项目42、已核实学位关联57、RA2、博士参考15、项目简介28、材料15、经验26，均未伪造当前名额
- UI样式/布局和筛选控件结构未改；这仍是本地Node/DOM-contract候选，未进行浏览器视觉验收、远端写入或部署

发布前仍须重新读取main，按具体路径三方合并并重验；这个冻结候选不授权覆盖未来并发改动。


## 2026-10-04 Reader detail polish after source correction release

Base: `dd654eaaf9e7f6143b1c99a54c3e3e97fc86f142`, the merged source-correction release with successful [Pages deployment](https://github.com/CHUNHUI-LAB/GradCompass/actions/runs/37208644849). Live cloud Chrome checks found two non-blocking issues: identical MSc/PhD association explanation fields repeated in Dan Wu's detail, and a long project title partly hidden by the sticky toolbar on initial opening at 396×253 CSS pixels (300% browser zoom). This narrow check was not mobile-device emulation.

This patch deduplicates only exactly equal rendered explanation fields. Distinct conditions, source records and all eligibility data stay unchanged. Detail opening focuses the heading with `preventScroll` before resetting the dialog to the top; an older-browser fallback also resets after focus. Late optional-data refresh retains the existing close/navigation guards and restores the previously focused surviving toolbar or matching body control and scroll position. Repeated source links retain their original main/rail region, named section and occurrence rather than moving focus to the first matching URL; missing-record return and related-advisor buttons retain their identity. No CSS/layout or comparison structure is changed.

Nineteen focused DOM regressions cover duplicate/distinct explanation fields, focus-induced scrolling, missing/project/advisor detail entry, unsupported focus options, late data, preserved focus/scroll, and closed/newer navigation. The initial reproduction failed seven of its first eight checks; all nineteen final focused checks pass. Navigation, loading, comparison and reader-focused suites together passed 109 checks before final manifest freezing. These DOM contracts simulate native focus scrolling and do not establish post-patch browser acceptance.

Historical tests use a separately hash-gated small text delta for the changed app and index version, retaining all five older fixtures and their original hashes. Unknown edits, partial rollback, whitespace changes, fragment-only input, and non-UI data remain detectable. Full-suite results and post-publication checks must be reported against the final content hash and deployed commit, independently of this preparation record.

## 2026-10-04 JHU / BU data-only candidate

Base: 7a8b2d63da2eab07b315a099bcd51c561a0c8c6f; its tree d925daddc43a5ca8ef20897520f872630c1ace1b is identical to PR8 merge 67d98a99f41bbd8be1e85a90cb57db76c14b63c4. GitHub compare returned files=[] on 2026-10-04 15:16 UTC, so the original byte-verified baseline and patch replay remain exact. Two programme records, two introductions, two material groups, six intake-specific deadlines. No advisor, RA, experience, stylesheet or application-logic changes. assets/app.js and index.html changes are generated content-version strings only.

Independent official-source review confirms the six dated deadlines and the ET-versus-unspecified-timezone distinction. Review identified that BU “GRE not required” must not be represented as “optional”; this text is now an explicit bounded scope note, avoiding new frontend labels or an unsupported assumption that scores can be submitted/reviewed. Deferred domestic/CMU/UMD candidates remain outside the publication allowlist.

The complete pre-final suite passed 491/491 checks; four new checks cover current normalization/counts, preservation of all earlier arrays and people, six date/time/intake records, and exact hash-gated historical round trips with negative mutation controls. Final full-suite output, independent checks, manifest hashes and any later browser/publication result must be reported separately; no browser or remote-CI success is claimed here.

Final pre-rebase-metadata and independent complete suites both passed 491/491, with zero failures or skips. The main-commit advance changes ancestry but no source bytes; current base metadata is updated, and final verification must use the resulting manifest. No remote write was performed.

## 2026-10-05 · 03b16 regression preservation repair

- Baseline: `03b16d35f50905ecfa9b800f34058aaf357104d5` (including multilingual evidence search). An exact Git-blob-verified copy ran 504 Node tests: 425 passed, 79 failed; no skips. Pages deployment success is not a Node test result.
- Scope: test-only, whole-file hash-gated reversible history stage; restore release metadata preservation and missing explicit test/helper/fixture allowlist entries. Keep the prior immutable historical fixtures and independent Git blob expectations. Unknown changes, reordered arrays and partial reversions must pass through unchanged rather than being silently accepted.
- All production assets, dataset bytes and the HTML entry are preserved from this baseline, including 91 advisors, 55 projects, 57 verified degree associations, 2 RA positions and the multilingual search additions. These record counts do not establish current recruitment or remaining capacity.
- Freeze must preserve caller-owned metadata and browser evidence verbatim, refresh only derived counts and file hashes, validate the source manifest before application writes, and remain byte-idempotent. Source tests and deployed artifact checks are recorded separately from browser acceptance.
