# Intervue — What We Have

*Updated 2026-06-25 (session 3). Live, tested, TypeScript clean.*

---

## In one line

Candidates prove skills through AI interviews. Recruiters get a verified match — no resume guessing, no wasted screens. External candidates can now be assessed without an account.

---

## Candidate Flow (end to end)

```
Landing (/) → Onboarding (GitHub/X OAuth + resume) → Dashboard
    → Interview (9 formats) → Session → Report + Score update
    → Atlas chat (career goal, skill path, market, JD match alert)
    → Verified Card (5 sessions + goal + score ≥70) → LinkedIn/X share
    → Recruiter match notification → Message thread → Offer banner
    → Atlas negotiate tab → "I got hired"
```

### Stage by stage

| Stage | Route | What happens |
|---|---|---|
| **Land** | `/` | Marketing, "Get started free" |
| **Auth** | `/onboarding` | GitHub OAuth or X/Twitter OAuth → resume (optional) → role. Accepts `?assessmentToken=` to claim a guest assessment after signup |
| **Hub** | `/dashboard` | Skill bars, session history, verified card progress, rank vs cohort, company tracks promo card |
| **Format pick** | `/interview/new` | 9 formats in 2 groups, skill input, optional JD paste. Reads `?companyTrackId=&roundIndex=&format=&skill=` — pre-fills everything for company track sessions |
| **Session** | `/interview/[id]` | AI chat + Monaco editor (engineering) or chat-only (non-engineering). Voice, hints, code execution (Run), **code submission to LLM (Submit)**, cross-session memory, company-mode JD injection |
| **Report** | `/interview/report/[id]` | Score, breakdown (5 axes for coding — includes `code_correctness`), code submissions panel (per-submission `X/10` scores + avg), ideal answers, gaps with next steps, study recs, progression velocity, specialization impact, LinkedIn share card (milestone reached), "Continue track →" card (company track sessions) |
| **Agent** | `/agent` | Atlas — career goal card, proactive skill push, JD match alert (from recent Resume Studio), market feed, learning plan, offer negotiation coach. Auto-switches to negotiate tab when `?tab=negotiate&offerId=` present |
| **Companies** | `/companies` | 20 company tracks grid. Each links to detail page |
| **Company track** | `/companies/[id]` | Round list, focus areas, "Start Round 1 →" → pre-fills interview/new |
| **Verified Card** | `/dashboard` → `/verified-card/[token]` | Issued once eligible. Public page + OG image + LinkedIn/X share |
| **Profile** | `/p/[username]` | 4 portfolio themes, ranked skills, proof links |
| **Proof** | `/proof/[username]/[skill]` | Full evidence breakdown — sessions, repos, sources |
| **Leaderboard** | `/leaderboard` | Skill × city, Monday notify cron |
| **Peer** | `/peer/find` → `/peer/[sessionId]` | Candidate vs candidate + AI moderator |
| **Resume** | `/resumes` | AI-generated resume from verified data, JD match score, PDF export |
| **Briefs** | `/briefs` | Weekly Atlas summaries, stored |
| **Year Wrapped** | `/wrapped/[year]` | Stats card with OG image |
| **Match** | `/messages` | Scout-surfaced notification → recruiter message thread |
| **Thread** | `/messages/[id]` | Chat, scheduling, offer banner (purple, non-dismissible when `offer_extended`) → Atlas negotiate link |
| **Hire signal** | (auto) | HireSignal written at hire time — permanent calibration data |

---

## Assessment Suite (no-account candidate flow)

External candidates can complete multi-round assessments without creating an Intervue account.

```
Recruiter creates assessment → candidate gets email with unique link
    → /assess/[token] (identify with name+email) → round list overview
    → /assess/[token]/round/[N] (AI session, same engine, countdown timer)
    → PATCH complete → composite score recomputed → verdict set
    → /assess/[token]/report (full per-round reports, verdict, "Create account →" CTA)
    → /onboarding?assessmentToken= → claim → skills merge into profile
```

| Stage | Route | What happens |
|---|---|---|
| **Landing** | `/assess/[token]` | Shows identify form (name + email) on first visit. Shows round overview once identified. Expired/completed states handled |
| **Round** | `/assess/[token]/round/[N]` | Full interview session (AI chat + Monaco for engineering). Sequential lock — round N blocked until N-1 complete. Countdown timer auto-submits on expiry |
| **Report** | `/assess/[token]/report` | All rounds with insightReports, composite score, verdict chip, verdict reason. Conversion CTA → `/onboarding?assessmentToken=`. Recruiter view includes same data |
| **Claim** | POST `/api/assess/[token]/claim` | Links invite to new account. Merges all session scores into profile. Requires auth |

**Verdict thresholds:** composite ≥80 → Strong hire · ≥65 → Hire · ≥50 → Maybe · <50 → No hire

### Recruiter side

| Route | What it does |
|---|---|
| `/recruiter/assessments` | List all assessments with candidate count, deadline, status |
| `/recruiter/assessments/new` | 3-step form: details → rounds (up to 6, reorderable, all 9 formats) → candidates (individual or CSV paste) |
| `/recruiter/assessments/[id]` | Verdict dashboard: per-candidate composite score, verdict chip, per-round score chips, "View full report" link, Export CSV, Close assessment |

---

## Interview Formats (9 total)

**Engineering**
| Format | Editor | Rubric axes |
|---|---|---|
| Live Coding | Monaco + Judge0 | technical_depth, problem_solving, communication, code_quality, **code_correctness** |
| System Design | Monaco | technical_depth, problem_solving, communication, design_quality |
| Project Deep-dive | Monaco | technical_depth, problem_solving, communication, ownership_signal |
| Behavioural | — | situation_clarity, action_quality, communication, impact_articulation |
| Gap Session | — | technical_depth, problem_solving, communication, concept_clarity, **code_correctness** |

**Non-engineering**
| Format | Editor | Rubric axes |
|---|---|---|
| PM Case Study | — | problem_framing, prioritization_logic, communication, insight_quality |
| Design Critique | — | ux_reasoning, systems_thinking, communication, design_rationale |
| Ops / Program Mgmt | — | process_design, resource_allocation, communication, risk_identification |
| Sales Discovery | — | discovery_quality, objection_handling, communication, value_articulation |

---

## What's Built

### Candidate

- **Identity graph** — GitHub, resume, sessions, DEV.to, Stack Overflow, HN, LinkedIn (scraper), GitLab, X/Twitter all merge additively into `parsedSkills[]`
- **AI sessions** — streaming, voice, hints, Judge0 code execution (**Run** button), **code submission to LLM** (**Submit** button — auto-runs then sends code + output to AI for evaluation), cross-session weakness memory, company-mode JD injection, rigor conditions
- **Coding challenge protocol** — for `coding` and `gap` formats, LLM proactively asks a fresh challenge after each submission (progressively harder), requires function signature + examples + constraints in each problem
- **Per-submission correctness score** — LLM emits `**Correctness: X/10**` after evaluating each submission; parsed server-side and stored as `codeSubmissions[].codeScore`; displayed on report page with per-submission score + session average
- **proofScore** — per-skill 0–100, score history, confidence band (±σ), cohort percentile, decay signal, progression velocity label
- **Insight report** — strengths, gaps with actionable next steps, ideal answers (per question), study recommendations, AI verdict sentence, next session recommendation, specialization impact blurb, LinkedIn draft (milestone sessions)
- **LinkedIn share card** — auto-generated when score crosses 60/70/80/90 milestone on any skill. Editable textarea, copy + LinkedIn share button. Shows on report page
- **Company tracks** — 20 companies (Google, Meta, Amazon, Stripe, Zerodha, Razorpay + 14 more) with real interview process data. Round-by-round pre-fill. "Continue track →" on report page
- **Public profile** — `/p/[username]` — 4 portfolio themes (minimal, terminal, magazine, bento), ranked skills, OG rank card
- **Proof pages** — `/proof/[username]/[skill]` — full evidence breakdown
- **Badges** — SVG embed + GitHub Action auto-refresh (`/api/badge/[username]/[skill]`, `/api/badge/[username]/summary`)
- **Leaderboard** — skill × city, Monday notify cron
- **Atlas agent** — career goal card, proactive skill push (most urgent gap, career goal-aligned), JD match alert (from recent Resume Studio), market feed, learning plan, offer negotiation coaching, negotiate tab auto-populates from `?offerId=` param
- **Verified Card** — issued at 5 sessions + career goal + score ≥70. Public page + OG image + LinkedIn/X share
- **HireSignal** — permanent calibration records at time of hire (no TTL)
- **Outcome tracking** — "I got hired" modal; hiredCompany/role/salary/LPA recorded
- **Certificates** — auto at 50/70/85 proofScore milestones. OG image per cert
- **Session receipt** — OG image per session (`/api/receipt/[sessionId]`)
- **Resume Studio** — AI-generated resume from verified data, JD match score (stored on SavedResume, lazy-computed), PDF export, top gaps saved
- **Notifications** — bell icon, 11 types, 90d TTL, inbox. **Email notification preferences** (interview reminders, recruiter views, score milestones) now saved to DB and toggled live in Settings → Notifications
- **Weekly brief** — Monday cron, personalized Atlas summary per candidate, stored in `/briefs`
- **Specialization inference** — Sunday cron, AI infers specializations from session + repo patterns
- **Peer interviews** — candidate vs candidate + AI moderator
- **Team graph** — radar chart, strengths/gaps, hire rec
- **Year Wrapped** — `/wrapped/[year]` with OG image
- **Referrals** — 8-char code, Vouched badge at 3 referrals × 3 sessions each
- **Streak** — daily session streak with freeze tokens (2-day gap forgiveness)
- **Billing** — Stripe Pro (₹399/mo), gates shareable reports + higher recruiter rank
- **Offer negotiate banner** — persistent purple banner in `/messages/[id]` when `offer_extended`. One-click → Atlas negotiate tab with role + company pre-loaded

### Recruiter

- Email/password auth, forgot/reset password
- Role creation with typed spec (must-have skills + min scores, comp, location, stage)
- **Two-agent matching** — Scout structures JD → Handshake Protocol: Atlas runs deterministic hard gates (tech bar, comp, location, stage, dealbreakers) → mutualFit or declined
- Role fit forecast — pool analysis before sourcing
- Autonomous sourcing — BullMQ job on every score update
- Blind screening mode
- Kanban pipeline (6 stages)
- Candidate search — skill + score + role + location filter
- Analytics — KPI cards, pipeline funnel, skill gap chart, activity heatmap
- Interview prep questions per application
- ATS API (`GET /api/ats/candidates/search` + `x-api-key`)
- Messaging + scheduling + `.ics` calendar generation
- Watchlist + score alerts
- **Assessment Suite** — create no-account assessments, invite any email, verdict dashboard, CSV export (see above)

---

## Data Models

| Model | Key fields |
|---|---|
| **User** | `authProvider` (github/credentials/twitter), `role`, `discoverability`, `preferences` (comp/location/stage/dealbreakers/noticePeriod), `streak` (currentStreak, longestStreak, freezeTokens), `subscriptionTier`, `referralCode`, `vouchedCount`, `emailBriefEnabled`, **`notifReminders`**, **`notifRecruiterViews`**, **`notifScoreMilestones`** |
| **Profile** | `parsedSkills[]` (name, proofScore, scoreHistory[], evidence[], confidence band), `careerGoal` (targetRole, targetLevel, targetStage, targetLocation, targetSalaryLPA), `cohortPercentile`, `specializations[]`, `portfolioTheme` (4 options), `experiences[]`, `educations[]`, `connections[]` (7 sources) |
| **InterviewSession** | `format` (9 values), `targetSkill`, `status`, `messages[]`, **`codeSubmissions[]`** (language, code, judge0Output, **codeScore 0–10**, timestamp), `insightReport` (strengths, gaps, gapsWithNextSteps, idealAnswers, studyRecs, aiVerdict, weaknessSignals, nextSessionRec, progressionSignal, specializationImpact, **linkedInDraft**), `scoreUpdate`, `companyMode`, `rigorConditions`, `assessmentInviteId`, `assessmentRoundOrder`, `metadata` (companyTrackId, roundIndex) |
| **Assessment** | `recruiterId`, `title`, `role`, `rounds[]` (order, format, title, durationMinutes, instructions), `deadline`, `status` (draft/active/closed) |
| **AssessmentInvite** | `assessmentId`, `token` (32-char hex, unique), `candidateName`, `candidateEmail`, `userId` (optional, set on claim), `rounds[]` (roundOrder, sessionId, status, score, breakdown), `compositeScore`, `verdict` (strong_hire/hire/maybe/no_hire), `verdictReason`, `status` |
| **Application** | `status` (6 stages), `outcome` (result, hiredCompany, hiredRole, hiredSalaryLPA, hiredAt) |
| **SavedResume** | `jobTitle`, `content`, **`matchScore`** (lazy-computed, cached), **`topGaps[]`** (skills below bar) |
| **HireSignal** | `skill`, `proofScoreAtHire`, `sessionCount`, `sessionAvgScore`, `targetRole`, `hiredAt` — permanent, no TTL |
| **VerifiedCard** | `cardToken`, `targetRole`, `targetLevel`, `topSkills[]` (name, score, percentile), `sessionCount`, `shareCount` |
| **Handshake** | `verdict` (mutualFit, skillMatches[], techBarCleared, compOverlap, locationMatch, stageMatch), `exchanges[]` — immutable at evaluation time |
| **RoleSpec** | `mustHave[]` (skill, minScore), `compRange`, `locations`, `stage`, `blind`, `autoSourceEnabled` |
| **Certificate** | Auto-issued at 50/70/85 milestones. OG image via `/api/certificate/[token]` |
| **WeeklyBrief** | Monday cron output per user, displayed at `/briefs` |
| **MarketFeed** | Daily AI-generated market intel, displayed in Atlas |
| **PeerSession** | Two-candidate sessions with AI moderator |
| **Team** | Radar chart, invite code, gap analysis |
| **Notification** | 11 types, 90d TTL, read/unread |
| **LeaderboardAlert** | Monday notify trigger |
| **Watchlist** | Recruiter score-change alerts |
| **BadgeEvent** | Refresh log for badge SVGs |

---

## Image Generation (Next.js ImageResponse)

| Route | Output |
|---|---|
| `/api/badge/[username]/[skill]` | SVG skill proof badge (GitHub embed) |
| `/api/badge/[username]/summary` | Multi-skill summary badge |
| `/api/rank-card/[username]` | OG rank card (profile share) |
| `/api/certificate/[token]` | Certificate OG image |
| `/api/receipt/[sessionId]` | Per-session receipt card |
| `/api/verified-card/[token]/og` | Verified Card OG image |
| `/api/wrapped/[year]/image` | Year Wrapped share image |

---

## Lib Utilities

| File | What it does |
|---|---|
| `lib/groq.ts` | `getModel()` → Groq `llama-3.3-70b-versatile` (Ollama removed). `INTERVIEW_SYSTEM_PROMPT`, `PROFILE_GENERATION_PROMPT`. Coding protocol injected at respond time (not in base prompt) |
| `lib/scoring.ts` | `calculateProofScore`, `calculateCohortPercentile`, `getScoreLabel`, `getConfidenceBand`, `getDecaySignal`, `getScoreColor` |
| `lib/assessment.ts` | `computeVerdict()`, `computeCompositeScore()`, verdict labels + colors |
| `lib/interview-insights.ts` | `computeProgressionVelocity`, `suggestNextSession`, `computeSpecializationImpact`, `buildGapsWithNextSteps` |
| `lib/memory.ts` | `extractWeaknessSignals` (post-session), `getCandidateMemory` (cross-session weakness context for AI) |
| `lib/company-mode.ts` | `analyzeCompanyStyle(jd)` — infers company name + interview style from JD text |
| `lib/sources.ts` | DEV.to, Stack Overflow, HN, LinkedIn (scraper), GitLab parsers |
| `lib/specialization-inference.ts` | Sunday cron — AI infers specialization labels from sessions + repos |
| `lib/certificates.ts` | `checkAndIssueCertificates` — called on session complete |
| `lib/notifications.ts` | `createNotification` — 11 types |
| `lib/referrals.ts` | `processReferralMilestone`, `ensureReferralCode` |
| `lib/watchlist.ts` | Score-change alert triggers |
| `lib/ics.ts` | `.ics` calendar file generation |
| `lib/stripe.ts` | Billing helpers |
| `lib/data/companyTracks.ts` | 20 company tracks — static, no DB. `getTrackById()` |
| `lib/agents/scout.ts` | Scout agent — JD → structured RoleSpec, outreach drafts |
| `lib/agents/atlas.ts` | Atlas agent — candidate-side evaluation, fit scoring |
| `lib/agents/handshake.ts` | Handshake protocol — deterministic gate evaluation |
| `lib/agents/fit.ts` | Fit scoring utilities |

---

## Cron Jobs (Vercel)

| Schedule | Route | What it does |
|---|---|---|
| Mon 08:00 | `/api/cron/weekly-brief` | AI-generated weekly summary per candidate, stored as WeeklyBrief |
| Mon 09:00 | `/api/cron/leaderboard-notify` | Notifies candidates who entered top 10 in their skill × city |
| Daily 02:00 | `/api/cron/market-feed` | AI-generated market intel stored as MarketFeed |
| Sun 08:00 | `/api/cron/infer-specializations` | AI infers specialization labels per candidate |

---

## Infrastructure

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router, React 19, Tailwind v4 |
| DB | MongoDB Atlas + Mongoose |
| Auth | NextAuth v5 — GitHub OAuth + X OAuth + bcrypt Credentials |
| AI | Vercel AI SDK v6 + Groq `llama-3.3-70b-versatile` |
| Code execution | Judge0 |
| Email | Resend (`RESEND_API_KEY`). Dev mode: invite links log to console. Prod: requires verified domain in Resend |
| Jobs | BullMQ + Redis (inline fallback when Redis absent) |
| Billing | Stripe |
| Search | Typesense (scaffolded) → MongoDB fallback |
| Images | Next.js ImageResponse — 7 OG/badge/cert image routes |
| Crons | Vercel — 4 scheduled jobs |
| Rate limiting | Upstash Redis sliding window |
| E2E tests | Playwright (`@playwright/test`) — 45 tests, 10 spec files |

---

## Env Vars

**Required**
```
AUTH_SECRET / NEXTAUTH_SECRET
MONGODB_URI
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
NEXTAUTH_URL / AUTH_URL
GROQ_API_KEY
```

**Optional (features degrade gracefully)**
```
RESEND_API_KEY                  # Email invites. Without it: invite URLs log to console (dev mode always skips email)
RESEND_FROM_EMAIL               # Defaults to onboarding@resend.dev (sandbox). Set to noreply@yourdomain.com in prod
TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET + TWITTER_BEARER_TOKEN
STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID + STRIPE_WEBHOOK_SECRET
UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
PARSER_SERVICE_URL + PARSER_SERVICE_SECRET
JUDGE0_API_URL + JUDGE0_API_KEY
GITHUB_TOKEN
ATS_API_KEY
ADMIN_EMAILS
```

*Assessment invite emails use `RESEND_API_KEY` (same as existing email setup). No new env vars required for the assessment suite or employability engine.*

---

## Tests (Playwright)

45 tests across 10 spec files. Run: `npx playwright test --project=all`

| File | Covers | Needs credentials? |
|---|---|---|
| `01-assessment-create` | Recruiter creates assessment, fetches invite token | `TEST_RECRUITER_*` |
| `02-candidate-identify` | 404 on invalid token, identify form validation | invite token |
| `03-candidate-round` | Start round (idempotent), respond, complete | invite token |
| `04-assessment-report` | Composite formula, verdict thresholds, recruiter detail | invite token |
| `05-account-conversion` | `/onboarding?assessmentToken=`, claim 401 gate | invite token |
| `06-jd-match-atlas` | Atlas JD alert, negotiate tab params | `TEST_CANDIDATE_*` |
| `07-linkedin-milestone` | Milestone logic, first-score regression, 401 guard | none |
| `08-company-tracks` | All 20 tracks no-404, "Start Round 1" href correct | none |
| `09-report-continue-track` | Company track pre-fill, continue-track URL params | none |
| `10-offer-negotiate` | Offer banner routing, `/agent?tab=negotiate` | none |

Currently: 20 pass (stateless), 24 skip (need credentials), 0 fail.

---

## What's Left / Known Gaps

### Should fix before sharing with anyone

| Gap | Detail |
|---|---|
| Resend domain not verified | Email invites only deliver to `singhenfec@gmail.com` (sandbox). Add a domain at resend.com/domains + set `RESEND_FROM_EMAIL` to use it. Until then, invite URLs appear in server console |
| Assessment flow tests not run E2E | Tests 01–05 need `TEST_RECRUITER_EMAIL/PASSWORD` set. Full sequential flow (create → identify → round → complete → report → claim) not confirmed in CI |
| Atlas career goal steering | Goal is saved and injected into `proactiveInsight` with goalContext, but Atlas chat LLM doesn't always proactively surface it unless the seed message triggers — needs prompt tuning |
| Verified Card E2E | OG image + public page exist but no confirmed test with a real issued card |

### Nice to have (2–4 hrs each)

| Gap | Detail |
|---|---|
| Peer matchmaking by cohort | Random pairing today; cohort sort is ~30 min |
| Typesense activation | Scaffolded; needs a running instance + index sync cron |
| LiveKit video | Token API ready; no UI |
| Assessment deadline expiry cron | Currently only checks deadline on API access, no background job to mark invites expired |
| Recruiter can't re-invite an expired candidate | No "resend invite" flow |

### Strategic (needed for the "10 verified → 5 hired" thesis)

| Gap | Detail |
|---|---|
| Outcome loop dashboard | HireSignal writes correctly but no dashboard showing "Intervue verified = X% hire rate" — this is the core proof |
| Verified Card on recruiter view | When recruiter views a candidate, the Verified Card should be the centerpiece — it's not surfaced there yet |
| Atlas actively coaching toward goal | Has the goal as context; should proactively message "You need 2 more sessions in Product Strategy to hit PM goal" without being asked |
