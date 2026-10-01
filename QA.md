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
