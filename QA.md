# GradCompass navigation and summary candidate QA

Base supplied for review: `331a04c26e9aabfffb1e2e7e118d640966751293`. Status: local candidate, not published. This source snapshot has no local git metadata; remote HEAD is not verified by this build.

## Passed

- All 92 Node / DOM-contract tests passed
- Syntax checks pass for affected application modules and browser scripts
- Five task-based navigation labels preserve existing hash URLs
- Projects, deadlines, materials and experiences open in-site summaries; source links follow their summaries
- Four experiences are visible without artificial category tabs; synthesis points link to supporting cards and preserve background differences
- Original 32 advisors, 10 profiles, 46 opportunities / 30 people and rank intersections remain intact
- Original catalog, RA, profiles, experience data and core eligibility logic remain byte-identical
- 12 supplementary material groups plus two original Westlake records render as 14 groups; the 25 non-Westlake verified routes are covered by the supplement
- 33 referenced official sources resolve; source IDs retain field evidence without duplicated research notes or fetching metadata
- Material statuses, unknowns, scope notes and source dates are preserved; RA is not relabeled as degree materials
- Optional supplement failure is explicitly disclosed and preserves original materials and other pages
- Repeated dialog opens, related-record changes and navigation dismissal are exercised by DOM contracts
- HTML/source safety and invalid-record fail-closed checks pass

## Updated legacy assertion

The single obsolete assertion in `tests/render.test.mjs:25` now verifies that the generic `本科任职条件已核实` badge is absent. All other bytes in that existing test file are preserved, including its checks for specific employment, deadline-time, work-permit and recruitment boundaries. The updated file's Git blob SHA is `902ef630163dcbd20539119c3d80abee161dd51f`.

No test was skipped and no hidden legacy wording was inserted. The full suite was rerun after this exact change: 92 passed, zero failed.

## Browser verification blocked

Chromium fails during launch because socket creation is denied (`Operation not permitted`). No browser assertion, screenshot, visual acceptance, keyboard-focus acceptance or complete accessibility pass is claimed. Browser regression scripts have been updated for desktop/mobile navigation, summary dialogs, original-source flow, Back/Forward, repeated actions and optional-data failures, but remain unexecuted in a permitted browser environment.

## Before publication

Run the full suite against any later edits, execute both browser suites in a permitted preview environment, inspect desktop and 320/390px views, verify remote HEAD against the expected base, and regenerate the exact release manifest. Do not publish research directories or material-research files wholesale.
