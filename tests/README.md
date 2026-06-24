# E2E Tests

Run with: `npx playwright test`

## Test coverage (45 tests across 11 files)

| # | File | Tests | Requires auth |
|---|------|-------|---------------|
| 1 | 01-assessment-create | Recruiter creates assessment + gets invites | `TEST_RECRUITER_*` |
| 2 | 02-candidate-identify | Guest opens token link, identifies | invite token from #1 |
| 3 | 03-candidate-round | Guest starts round, responds, completes | invite token from #1 |
| 4 | 04-assessment-report | Report shows composite score + verdict thresholds | invite token from #1 |
| 5 | 05-account-conversion | `/onboarding?assessmentToken=xxx` claim flow | invite token from #1 |
| 6 | 06-jd-match-atlas | JD match alert in Atlas UI | `TEST_CANDIDATE_*` |
| 7 | 07-linkedin-milestone | Milestone detection logic + regression test | none (logic tests) |
| 8 | 08-company-tracks | All 20 company track pages, start CTA hrefs | none |
| 9 | 09-report-continue-track | `/interview/new?companyTrackId=` pre-fill | `TEST_CANDIDATE_*` |
| 10 | 10-offer-negotiate | Offer banner → Atlas negotiate tab | none |

## Running the full suite

Set credentials in `.env.local` (or shell env) before running:

```sh
TEST_RECRUITER_EMAIL=you@example.com
TEST_RECRUITER_PASSWORD=your-password

# Optional — enables candidate-auth UI tests
TEST_CANDIDATE_EMAIL=candidate@example.com
TEST_CANDIDATE_PASSWORD=candidate-password
```

The assessment flow tests (1–5) run sequentially. State is passed between them via
`tests/.state.json`. Run them in order:

```sh
npx playwright test --project=all
```

Or run just the stateless tests (no credentials needed):

```sh
npx playwright test tests/07-linkedin-milestone.spec.ts tests/08-company-tracks.spec.ts tests/10-offer-negotiate.spec.ts --project=all
```
