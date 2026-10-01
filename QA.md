# GradCompass R2 candidate QA

Evidence checked: 2026-10-01

## Passed for R2

- 42 Node tests, including independent opportunity IDs, same-advisor comparison, immutable inclusion rules, RA employment evidence, RA/degree separation, two-job/one-advisor counting, unknown deadline times, work-permit caveats, current-check status, safe source rendering, filters, reset, details and comparison
- 21 original normalization checks remain applicable because `data/catalog.json` is unchanged
- JavaScript syntax checks
- Strict relative static asset references, Content Security Policy, escaped data text, HTTP(S)-only source links, noopener/noreferrer
- Labeled controls, native dialogs, Escape dismissal implementation, visible focus styles, reduced-motion support and primary 44 px targets remain in place

## Browser verification scope

R1 was verified on the deployed site: desktop width 1180 px and mobile width 502 px showed no horizontal overflow. Institution + MPhil + explicit-recruitment filtering, detail Escape/focus return, reset, two-profile comparison and back navigation passed.

These are R1 results. R2 changes opportunity records, RA details, comparison and status display; its real browser smoke test is still pending. Local Chromium cannot start because the environment does not permit its required process socket, and the cloud browser cannot access the local preview service. No R2 screenshot or viewport pass is claimed.

The included `tests/browser-smoke.mjs` has been updated for R2 and should run against the final published URL. Node/DOM-contract tests do not replace visual layout, browser focus or full accessibility checks.

## Data limits

- Two PolyU RA job pages were verified independently: references 260907004 and 260724022
- Both advertise honours-degree/equivalent eligibility and 12-month full-/part-time work; neither requires an existing master's for the Research Assistant role
- Research Associate qualifications in the same advertisement do not apply to these RA records
- Deadline dates are public; exact times, remaining headcount and individual work-permit eligibility are not verified
- Daily checking is enabled, but its first successful run has not been verified; academic evidence dates remain unchanged

## Publication boundary

This is an unpublished R2 candidate. No repository writes or deployments were made in this build. The release manifest is an integrity record, not publication confirmation.
