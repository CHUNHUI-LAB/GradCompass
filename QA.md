# GradCompass candidate QA

Checked: 2026-10-01

## Passed

- 21 normalization checks in `data/catalog-test-manifest.json`
- 26 Node tests: bachelor/no-tuimian/no-master predicate, unknown and excluded routes, institution and degree isolation, search and empty reset, thematic and recruitment filters, expired dates, compare limits, safe source URLs and HTML escaping, explicit source dates, private-field removal, static accessibility features, actual rendering-contract initialization, requirements and recruit evidence, repeated comparison and modal close
- JavaScript syntax checks for app and core modules
- Relative static assets and no external runtime dependencies
- No inline executable JavaScript, no inline style attributes, restrictive Content Security Policy, HTTP(S)-only source links with noopener/noreferrer
- Semantic landmarks, labeled controls, native modal dialogs, Escape dismissal implementation, focus-visible styles, reduced-motion support, minimum 44 px primary controls

## Not verified

Actual browser smoke tests were attempted but did not reach application execution:
1. Cloud browser rejected localhost with `ERR_BLOCKED_BY_CLIENT`
2. Local Chromium could not start because this environment does not permit the required process singleton socket (`Operation not permitted`)

Therefore this candidate has not passed visual screenshot review, viewport overflow measurement, browser focus-return verification, or a full automated accessibility audit. No screenshots have been fabricated. The included `tests/browser-smoke.mjs` covers desktop/mobile layouts, filters, dialog dismissal, comparisons, repeated actions, back navigation, empty state, CSP/runtime errors and deadline/material views when run in a browser-capable environment.

Data and text rendering tests are not a substitute for visual QA. Before announcing full publication completion, test the final public URL and verify the exact deployed commit.

## Publication boundary

This is a local candidate. No repository write, Pages setup, deployment, external analytics or data refresh schedule was performed by this build. The release manifest is a file-integrity record, not a deployment confirmation.
