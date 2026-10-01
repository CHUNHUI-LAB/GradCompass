# Application experience candidate QA

Base: `7272ec6826b1742ed68af3f424b2286f6aa602ca`. Status: local candidate, not published.

## Passed

- Baseline all 23 GitHub blob hashes match the held checkout
- 67 Node / DOM-contract tests: original 59 plus 7 schema/content/safety tests and 1 application navigation test
- Existing 32 advisor records, 10 profiles, 46 opportunity / 30 advisor counts and rank intersections preserved
- Default one bachelor-background record; explicit cross-background selection reveals one master-to-PhD record
- Missing/invalid schema, source URL, mandatory context, unsafe URL and duplicate records fail closed
- HTML content escaped; source links use HTTPS and noopener noreferrer
- Global opportunity filters hidden on experience view and restored unchanged upon return
- Separate unavailable/empty states; source date precision retained; public experience payload excludes XHS and private identifiers

## Blocked / not verified

Local Chromium launches failed because required socket creation was denied (`Operation not permitted`) and crashpad could not initialize; an escalated launch also failed. The dot cloud browser rejected `http://127.0.0.1:4186` with `ERR_BLOCKED_BY_CLIENT`. No workaround around that restriction was attempted.

The added `tests/experiences-browser.mjs` covers desktop/mobile 390px and 320px layout, overflow, native disclosure, repeated scope clicks, Back/Forward, rank persistence and optional-data failure isolation. Those browser assertions were not executed to completion. No screenshots or visual, keyboard-focus, or full accessibility pass is claimed. Existing browser smoke suite was not completed on this candidate.

Before publishing, run both browser suites in a permitted preview environment, inspect phone and desktop screenshots, recheck remote HEAD against the base and review the exact allowlist. Do not publish audit folders or research sources wholesale.
