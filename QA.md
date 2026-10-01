# GradCompass navigation and summary candidate QA

Base supplied for review: `490487a53e9f6177a53b9bfcb0dc542dd4b1ad23`. Status: local candidate, not published. This source snapshot has no local git metadata; remote HEAD is not verified by this build.

## Passed

- All 101 Node / DOM-contract tests passed
- Syntax checks pass for affected application modules and browser scripts
- Changed experience/record-summary imports and app/style entry URLs use actual SHA-256 content prefixes; unchanged modules retain their URLs
- Local asset and module checks resolve URL pathname, so query strings do not hide missing files; version/content consistency is tested
- Five task-based navigation labels preserve existing hash URLs
- Projects, deadlines and materials open in-site summaries; experience links open a full reading route with direct-entry, list-return and history behavior
- Each page exposes only applicable filters and keeps separate choices; material/project/calendar views cannot inherit hidden advisor filters
- Material search/reset and repeated navigation preserve advisor school, rank, search, RA and recruitment selections
- Experience cards have one reading action; overview evidence links open the same reading route without an intermediate scroll-to-card action
- Exact repeated project-condition and material-scope text is removed without dropping extra conditions
- Four experiences have individual summaries and a bounded synthesis; evidence links open the supporting reading pages
- A fifth record keeps the four-case synthesis and explicitly shows that one record is not yet incorporated
- Original 32 advisors, 10 profiles, 46 opportunities / 30 people and rank intersections remain intact
- Original catalog, RA, profiles, experience data and core eligibility logic remain byte-identical
- 12 supplementary material groups plus two original Westlake records render as 14 groups; the 25 non-Westlake verified routes are covered by the supplement
- 33 referenced official sources resolve; source IDs retain field evidence without duplicated research notes or fetching metadata
- Material statuses, unknowns, scope notes and source dates are preserved; RA is not relabeled as degree materials
- Optional supplement failure is explicitly disclosed and preserves original materials and other pages
- Repeated dialog opens, related-record changes and navigation dismissal are exercised by DOM contracts
- HTML/source safety and invalid-record fail-closed checks pass

## Updated cross-view contracts

Two existing tests in `tests/render.test.mjs` were updated to verify the new independent-filter behavior: an advisor's RA selection does not turn the projects page into an RA empty state, and an empty advisor rank does not filter the projects page to zero. Both tests also verify that returning to the advisor page restores its exact selection and result count. Every other byte of that published test file is preserved.

No test was skipped. The complete suite after these exact updates passed all 101 tests.

## Browser verification blocked

Chromium fails during launch because socket creation is denied (`Operation not permitted`). No browser assertion, screenshot, visual acceptance, keyboard-focus acceptance or complete accessibility pass is claimed. Browser regression scripts have been updated for desktop/mobile navigation, full reading routes, direct entry/refresh, original-source flow, Back/Forward, isolated filters, repeated actions and optional-data failures, but remain unexecuted in a permitted browser environment.

## Before publication

Run the full suite against any later edits, execute both browser suites in a permitted preview environment, inspect desktop and 320/390px views, verify remote HEAD against the expected base, and regenerate the exact release manifest. Do not publish research directories or material-research files wholesale.
