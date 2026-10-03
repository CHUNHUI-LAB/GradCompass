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
