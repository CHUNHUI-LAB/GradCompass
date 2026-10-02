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

The focused `tests/project-summaries-browser.mjs` was attempted against a local static server. Chromium aborted before the first page assertion with `socket() failed: Operation not permitted`. The dot cloud browser also rejected the localhost preview with `ERR_BLOCKED_BY_CLIENT`. No desktop, mobile, screenshot or visual acceptance is claimed. The existing full smoke and experience browser suites were not newly run in this candidate; their earlier blocked attempts are historical records below. The additional focused browser script includes all eight project dialogs, filter persistence, Back/Forward, 390/320px checks and failed optional fetch recovery for a future supported run.

## Review and release gate

An independent review found the CityU source conflict and optional-loader hang; the candidate was revised and regression-tested. Root review is still required. Before any separately authorized publication: review exact changed-file allowlist, recheck remote main, reapply and rerun all checks against that base, freeze, and verify exact deployment commit and online behavior. The candidate does not establish the unresolved CityU ordinary deadline.

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
- Candidate manifest has an explicit allowlist and SHA-256 hashes; research inputs, logs and raw source content are outside it

## Source review and editorial decisions

Each of the five proposed original sources was independently reread, not accepted from search snippets. The CUHK 2023/2024 account was cross-checked against its duplicate thread: the original author account matches the dated 2024-06-13 outcome reply. The duplicate is one case. The 2018 CUHK post separates a submitted first-author paper from two accepted non-first-author papers; no exact grades are republished. The 2015 HKUST migration page's 1970/2020 metadata is not treated as a publication date, and its PhD recruitment invitation is not a degree offer.

The HKUST 2023 experience is explicitly an undergraduate summer research internship, with HPCA submission only and a future UPC RA plan. The 2025 cryptography account is a same-cycle adjustment with mixed formal/stable-verbal offer statuses; its page also displays an update date of 2025-09-18. It is not a Hong Kong admission or next-year reapplication case.

The CUHK RA author's paid application services are disclosed. The CUHK 2018 author's own Live promotion is disclosed without assuming a price from an unvisited payment page. No contacts, raw posts, precise grades, decision identifiers or identifiable PI allegations are included. All outcomes remain self-reports; no employment contracts, admission letters, funding or enrollment were independently verified. The conflicting-year HKU medical RA-to-PhD narrative remains excluded. Recent Hong Kong engineering MPhil and full-time RA employment-detail gaps remain open.

## Browser boundary at preparation

The updated sixteen-case browser suite and the unchanged full browser smoke suite were attempted against the candidate. Chromium aborts before launching with `socket() failed: Operation not permitted`; neither suite reaches a page assertion. No new browser, mobile, screenshot or visual acceptance is claimed. The prior release's desktop spot-checks below are not acceptance of the new five cases.

## Release gate

Publication requires separate authorization. Recheck remote main, review the exact changed-file manifest and source boundaries, rerun freeze and all Node tests after any edits, then verify the exact CI/Pages commit and online reading flows. Do not upload the surrounding research directory. Current manifest metadata records this preparation snapshot; the older manifest discussion in the retained record below concerns the earlier release snapshot.

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

Six new text-first sources have complete main-text reading evidence. The Xiaohongshu case was reviewed in the cloud browser: full post, cover and 20 currently loaded comments/replies; remaining comments in the displayed total of 53 were not expanded. Its cover's MPhil claim does not override the unfinished contract/visa state in the body. Personal outcomes are self-report, not independently verified decisions.

### Browser status at candidate preparation

The published f90ec baseline was actually checked on desktop: four cards to full reading, Back/Forward, list return, and advisor RA filter restoration across the material page. Text and source links were readable. Mobile was not checked and user acceptance was not established.

The new eleven-case candidate has expanded browser regression coverage, including each new reading page. Local Chromium launch remains blocked by socket creation (`Operation not permitted`); no new browser, screenshot, visual or mobile acceptance is claimed. The full browser smoke suite is likewise not accepted. Existing desktop baseline success is not reported as new candidate acceptance.

### Release gate at candidate preparation

Rerun tests and freeze after edits. Review the exact changed-file allowlist and public source excerpts, approve publication separately, recheck main to preserve concurrency, then verify exact CI/Pages commit and actual online reading flows. Do not upload research work directories wholesale.
