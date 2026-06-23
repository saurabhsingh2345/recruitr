# What We Have Built — Intervue

*Internal document. Accurate as of 2026-06-23. Full audit of shipped features, known issues, architecture, and env var requirements.*

---

## The One-Line Version

Intervue is a verified technical identity platform. On the candidate side an AI engine builds proof-of-skill from real code, sessions, and external sources. On the recruiter side an autonomous agent (Scout) negotiates fit against another autonomous agent (Atlas) before either human is contacted.

---

## Auth Providers

| Provider | Who | Flow |
|---|---|---|
| GitHub OAuth | Candidates | Login → find/create User by `githubId` → create Profile with `githubUsername` |
| X / Twitter OAuth 2.0 | Candidates | Login → find/create User by `twitterId` → create Profile with empty `githubUsername`; username collision gets `_x` suffix |
| Credentials (email + bcrypt) | Recruiters | Register → `passwordHash` stored; login via `POST /api/auth/credentials` |

Twitter OAuth requires `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET`. GitHub requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`. Both conditional — at least one must be configured.

---

## Candidate Architecture

### Pages & Routes

| Route | What it does |
|---|---|
| `/` | Marketing landing page — feature sections, comparison table, company links, nav |
| `/onboarding` | OAuth landing — GitHub or X/Twitter OAuth, resume upload, role selection; referral code claim |
| `/dashboard` | Main candidate hub — hero card (avatar, stats row: sessions/avg score/streak/rank), skill constellation, interview type quick-start, recent sessions, experience/education/projects |
| `/agent` | Atlas — two-panel: chat + opportunities left, skill tools right |
| `/interview/new` | Pre-session config — format picker, skill picker, company-mode JD toggle |
| `/interview/[id]` | Live session — streaming chat, Monaco editor, code execution, voice mode |
| `/interview/report/[id]` | Session report — scores, breakdown, ideal answers, AI verdict, transcript, share |
| `/interview/report/shared/[token]` | Public shareable report (Pro only) — no login required |
| `/p/[username]` | Public profile — ranked skills, GitHub projects, experience, education, recruiter CTA |
| `/proof/[username]/[skill]` | Skill proof detail — all evidence sources behind a single score |
| `/certificate/[token]` | Milestone certificate — skill, level, score at issuance, LinkedIn share |
| `/leaderboard` | Public leaderboard — filter by skill × city, podium top 3 |
| `/companies` | Public company discovery (SSR/SEO) — companies practised via company-mode |
| `/settings` | Full settings — profile, portfolio, connections (GitHub/X/GitLab/LinkedIn), privacy, notifications, billing, password |
| `/settings/referrals` | Referral dashboard — link, stats, per-referral progress |
| `/briefs` | Weekly brief archive — expandable list of all past Atlas weekly summaries |
| `/resumes` | Resume Studio — AI resume generation, JD match score, PDF download, library |
| `/connections` | Connections overview — public sources (GitHub, LinkedIn, SO, DEV.to, HN, X/Twitter) + OAuth sources (GitLab) |
| `/messages` | Recruiter message inbox |
| `/messages/[id]` | Individual message thread with recruiter |
| `/peer/find` | Find a peer — format, skill, role selection, matchmaking queue |
| `/peer/[sessionId]` | Live peer interview — two-role chat, AI moderator, end + score |
| `/teams/[id]` | Team skill graph — members, radar chart, strengths/gaps, hire recommendation |
| `/team/join/[code]` | Join a team via invite code |
| `/wrapped/[year]` | Year-in-review card — sessions, avg score, top skill, streak, monthly chart, share |
| `/pricing` | Pricing page — Free vs Pro |
| `/docs` | Open Proof API v1 documentation |
| `/admin` | Internal growth dashboard (ADMIN_EMAILS gated) |

---

## Recruiter Architecture

### Pages & Routes

| Route | What it does |
|---|---|
| `/recruiter` | Recruiter landing / marketing |
| `/recruiter/login` | Email + password login (separate from GitHub/Twitter OAuth) |
| `/recruiter/forgot-password` | Password reset request |
| `/recruiter/reset-password` | Token-based password reset |
| `/recruiter/setup` | Onboarding — company name, size, initial roles |
| `/recruiter/dashboard` | Pipeline overview, top matches, KPI stats, natural-language search |
| `/recruiter/roles` | Role list — create, view, manage |
| `/recruiter/roles/[id]` | Role detail — handshake results, verdict chips, agent transcript, interview-prep questions |
| `/recruiter/analytics` | Hiring velocity — KPI cards, weekly pipeline chart, skill gap chart, activity heatmap |
| `/recruiter/watchlist` | Talent pool — saved candidates, per-skill score alerts |
| `/recruiter/profile` | Recruiter profile settings |

---

## Feature Inventory — Candidate Side

### 1. Multi-Source Identity Graph

All sources write to `profile.parsedSkills[]` via additive merge — skills from other sources are never overwritten.

| Source | Kind | Route | Env Var Required | Notes |
|---|---|---|---|---|
| GitHub repos | OAuth (login) | `POST /api/profile/sync/github` | `GITHUB_TOKEN` (optional, rate limit) | Fetches repos + events + README; AI extracts skills + writes `githubActivitySummary` |
| Resume PDF | Upload | `POST /api/resume/upload` | `PARSER_SERVICE_URL` (optional) | Text extraction fallback if no parser |
| Interview sessions | In-app | `POST /api/interview/[id]/complete` | — | Score blend: existing × 0.7 + session × 0.3 |
| DEV.to | Public | `POST /api/connections/sync` | — | Articles, tags, reaction counts |
| Stack Overflow | Public | `POST /api/connections/sync` | — | Reputation, top answer tags |
| Hacker News | Public | `POST /api/connections/sync` | — | Karma, community signal |
| LinkedIn | Public (scraper) | `POST /api/profile/sync/linkedin` | `PARSER_SERVICE_URL` + `PARSER_SERVICE_SECRET` | External Python/Playwright service |
| GitLab | Public REST | `POST /api/profile/sync/gitlab` | — | GitLab v4 API, no OAuth needed |
| X / Twitter | Bearer Token | `POST /api/profile/sync/twitter` | `TWITTER_BEARER_TOKEN` | Reads public bio + 20 tweets; AI extracts skills + writes `twitterActivitySummary` |

**Score history** — every sync and every session appends `{ score, source, at }` to `scoreHistory[]`.

**Confidence bands** — `±σ` from `scoreHistory`. Shown on dashboard and public profile.

**Score decay signal** — fresh (<30d), ageing (30–60d, flagged), stale (>60d, flagged). Scores are not penalised — only surfaced as a signal.

**Cohort ranking** — candidate avg score vs all public profiles. Recalculates after every session and sync.

---

### 2. AI Interview Engine

Five formats: **coding, system_design, project_deepdive, behavioural, gap**.

- Personalized opening — GitHub users: live repo fetch. Twitter-auth users: `profile.twitterActivitySummary`. Fallback: "No external project data available yet."
- Streaming via Vercel AI SDK
- Monaco editor: JS, TS, Python, Go, Java, C++, Rust
- Code execution via Judge0
- Voice mode: browser SpeechRecognition + SpeechSynthesis
- Socratic hints — nudges without giving answers
- Session produces: overall score, four-axis breakdown, strengths, gaps, study recs, ideal answers, AI verdict (≤80 chars)
- Score update: weighted blend of existing score + session score; 20–100 clamp for new skills
- Daily streak with freeze tokens
- Shareable public reports (Pro-gated) via `/interview/report/shared/[token]`
- Session proof receipt — full-screen card after completion; OG image at `/api/receipt/[sessionId]`
- Session abandonment — `navigator.sendBeacon` fires on browser close

---

### 3. Verified Skill Profile

`proofScore` (0–100) per skill across all sources. Formula for GitHub/sync sources:

```
evidenceCount × 15 × 0.4 + repoComplexity × 0.3 + recency × 0.3
```

Interview sessions blend: `existingScore × 0.7 + sessionScore × 0.3`.

---

### 4. Public Profile & Sharing

`/p/[username]` — avatar, name, bio, badges, cohort rank ("Top X%"), ranked skills with ±σ + evidence count, GitHub projects, experience, education, recruiter CTA.

**Portfolio themes:** Minimal, Terminal, Magazine, Bento.

**OG rank card** — 1200×630 at `/api/rank-card/[username]`.

**Skill badges** — 400×80 at `/api/badge/[username]/[skill]`; summary badge 600×80 at `/api/badge/[username]/summary`.

**Proof pages** — `/proof/[username]/[skill]` — full evidence breakdown.

**Embeds** — iframe at `/embed/[username]/[skill]`.

**README snippet generator** — badge preview + markdown + GitHub Actions YAML for weekly auto-refresh.

---

### 5. Verified + Vouched Badges

**Verified** — GitHub or X connected + at least one assessed skill.
**Vouched** — referred 3+ candidates who each completed a proof session.

---

### 6. Onboarding Flow

Three-step full-screen flow at `/onboarding`:

1. Connect — GitHub OAuth or X/Twitter OAuth
2. Upload resume (PDF, optional)
3. Select target role

Post-OAuth referral code claim from localStorage. `OnboardingModal` overlay for in-app reminders (localStorage + DB gated against reappearance).

---

### 7. Atlas — The Candidate's AI Agent

**Chat context (fully enriched):**
- All skill scores (top 10 by proofScore)
- GitHub projects (name, description, tech stack, language)
- Work experience + education from resume
- Last 5 completed sessions with scores + gap summaries
- Recurring weakness topics from memory engine
- Pending handshakes (company, role, fit %)
- Comp preferences, discoverability, target role, cohort rank
- `githubActivitySummary` — AI summary of recent GitHub push activity
- `twitterActivitySummary` — AI summary from X/Twitter bio + tweets (when synced)

**Right panel — 4 tabs:**

- **Skill path** — SkillUnlockPath + MemoryInsights (recurring weak areas by severity) + weekly brief link
- **Market** — demand scores per skill (live fallback when cron hasn't run)
- **Learning** — full skill picker + goal selector (Proficient 70+ / Expert 85+ / FAANG-ready); phased AI learning plan
- **Negotiate** — offer counter-coaching using verified proof scores

**Discoverability** — open / passive / invisible. Preferences: comp floor, locations, stages, dealbreakers — enforced deterministically by Scout.

---

### 8. Cross-Session Memory Engine

1. Post-session: `extractWeaknessSignals()` parses gaps into `{ skill, topic, severity: 1|2|3 }` → saved to `insightReport.weaknessSignals[]`.
2. Pre-session: `getCandidateMemory()` aggregates from last 8 sessions. Recurring (≥2 sessions) or critical (severity 3) signals injected into opening prompt as `memoryContext`.
3. Fallback: synthesises from `insightReport.gaps` for old sessions without `weaknessSignals`.

---

### 9. Company-Mode Simulation

Paste a JD before any interview. AI adopts that company's interview style for the entire session. `analyzeCompanyStyle(jd)` extracts inferred company name + 2–3 sentence style description. `/companies` page shows companies practised for.

---

### 10. Peer Interview Mode

Candidate vs candidate. `/peer/find` → format + skill + role selection → polling queue → live session. AI moderator. Interviewer scores candidate (0–100 slider). AI generates 3-sentence summary.

Known gap: no cohort-based matchmaking (random pairing).

---

### 11. Team Skill Graph

Groups up to 20 candidates. Create → 8-char invite code → `/team/join/[code]`. Radar chart (team avg + best member), strengths/gaps, AI hire recommendation. "Refresh my skills" re-syncs from current profile.

---

### 12. Year-in-Review Wrapped

`/wrapped/[year]` — sessions, avg score, top skill, favourite format, best session, streak, monthly chart. OG image at `/api/wrapped/[year]/image`. Dashboard CTA at ≥3 sessions.

---

### 13. Skill Milestone Certificates

Auto-issued at proofScore 50 (Intermediate), 70 (Proficient), 85 (Expert). Public at `/certificate/[token]`. LinkedIn share, 1200×630 OG. Resend email + in-app notification. One per (user, skill, milestone).

---

### 14. Referral System

8-char unique code per candidate. `/onboarding?ref=CODE`. 3 referred candidates × 3 sessions each → Vouched badge. `/settings/referrals` dashboard.

---

### 15. In-App Notifications

Bell icon → last 30. Types: `interview_complete`, `score_milestone`, `leaderboard_entry`, `certificate_issued`, `handshake_surfaced`, `weekly_brief`, `recruiter_viewed`. 90-day TTL. `recruiter_viewed` deduplicated per 24h.

---

### 16. Resume Studio

Enter job title + optional JD → AI generates ATS-optimized resume from verified data. JD match score (0–100). Copy ATS plain text / download PDF. Auto-saved library with timestamps.

---

### 17. Leaderboard

Public, no login. Skill × city filter. Top 3 podium + table. Monday 09:00 UTC cron notifies new entrants.

---

### 18. Weekly Career Brief

Monday 08:00 UTC cron → up to 50 candidates with `emailBriefEnabled: true`. Personalized 3-paragraph Atlas brief via Groq + Resend. Archive at `/briefs`. Deduplicated per (userId + weekOf).

---

### 19. Market Intelligence Feed

Daily 02:00 UTC cron — active role counts, candidate supply, avg proof scores, demand score (0–100), week-over-week delta. TTL 48h. Live fallback when empty: generates on-demand from session frequency + profile skill supply.

---

### 20. Open Proof API v1

`GET /api/v1/proof/:username/:skill` — public, no auth. Returns proofScore, label, color, evidence, score history, lastUpdated. Rate-limited via Upstash (100 req/IP/hr). Invisible candidates → 404. Docs at `/docs`.

---

### 21. Admin Growth Dashboard

`/admin` — `ADMIN_EMAILS` gated. Total users, new last 30d, sessions last 7d, completion rate, company-mode count, team count, briefs sent, top skills chart, 7-day histogram, flywheel meters.

---

### 22. Billing

- **Free** — unlimited interviews, public profile, Atlas, badges, leaderboard, all core features
- **Pro** — shareable reports; higher recruiter search rank; additional data sources
- Stripe: checkout, billing portal, webhook (tier flips on subscription events)

---

## Feature Inventory — Recruiter Side

### 1. Auth & Onboarding

Email + password (bcryptjs). Forgot/reset password flow. Setup wizard captures company name, size, initial roles.

### 2. Dashboard

Pipeline KPI cards, top matches, recent activity, natural-language candidate search.

### 3. Role Management

Create roles with typed specs: must-have skills + minimum proof scores, nice-to-have, comp range (₹ LPA), locations, stage, blind mode, auto-source flag. Role detail: handshake results + verdict chips + agent dialogue transcript + interview-prep questions.

### 4. Two-Agent Matching (The Core Differentiator)

Recruiter pastes JD → Scout structures into typed spec → "Source" button → Scout pre-filters pool by skill presence → Handshake Protocol per candidate:

- Scout sends fit inquiry to Atlas
- Atlas runs **deterministic hard gates**: tech bar (every must-have ≥ minimum proofScore), comp overlap, location, stage, dealbreakers
- LLM writes reasoning — cannot invent skills; strictly from verified evidence
- `mutualFit = false` → `declined_by_atlas` — neither human bothered
- `mutualFit = true` → surfacing message → candidate in-app notification + agent inbox
- Evidence snapshots captured at evaluation time — immutable audit trail

Hard gates are deterministic code. LLM sits on top. Cannot be subverted.

### 5. Role Fit Forecast

Pre-sourcing pool analysis: total verified candidates, how many pass all gates, per-skill gate analysis, bottleneck skill, location breakdown.

### 6. Scout — Autonomous Sourcing

When any candidate's skill scores update, a BullMQ job fires on `autonomous-sourcing` queue. Finds all `autoSourceEnabled` RoleSpecs with overlapping skills. Runs Handshake Protocol for each new (role, candidate) pair. Caps at 20 roles/run. Duplicate check uses `roleSpecId` (Handshake schema field).

### 7. Blind Screening Mode

Names, usernames, avatars replaced with anonymous labels. Recruiter evaluates proof scores before identity reveal. Reveal endpoint: rate-limited, logged to BadgeEvent, triggers `recruiter_viewed` notification (once per 24h).

### 8. Talent Pool Watchlist

Save candidates per role. Per-skill score alerts. `/recruiter/watchlist`.

### 9. Interview Prep Questions

Per-application — gap questions, strength verification questions, behavioural questions. Ownership verified via `application.recruiterId`. Role context looked up by recruiter + jobTitle (gracefully handles missing role).

### 10. Hiring Velocity Analytics

`/recruiter/analytics` — KPI cards (surfaced/applied/interviewed/offered, last 12 weeks), time-to-offer, weekly pipeline chart, top skill gap chart, day × hour activity heatmap. Handshakes queried by `roleSpecId`; applications queried by `recruiterId` (no roleId FK on Application). Interview count: `interview.status !== 'proposed'`. Offer count: `outcome.result === 'hired'`.

### 11. Kanban Pipeline

Applications move through: active → screening → interview_scheduled → offer_extended → hired/rejected/withdrawn.

### 12. Candidate Search

Filter by skill, minimum proof score, target role, location, vouchedOnly. Ranked by cohort percentile. Typesense full-text search (falls back to MongoDB).

### 13. ATS API

`GET /api/ats/candidates/search` — authenticated by `x-api-key`. External ATS integration.

### 14. Messaging & Scheduling

In-app messaging. Interview scheduling (`interview.date/time/timezone/type/meetLink/status`). `.ics` calendar file generation. Resend email notifications.

---

## Data Models

| Model | Key Fields |
|---|---|
| User | `authProvider` (github/credentials/twitter), `githubId`, `twitterId`, `role` (candidate/recruiter), `openToWork`, `discoverability`, `referralCode`, `subscriptionTier`, `subscriptionStatus`, `streak`, `emailBriefEnabled`, `connections[]`, `preferences` (minCompLpa, locations, stages, dealbreakers) |
| Profile | `parsedSkills[]` (name, proofScore, scoreHistory[], evidence[], lastUpdated), `projects[]`, `experiences[]`, `educations[]`, `portfolioProjects[]`, `cohortPercentile`, `targetRole`, `yearsOfExperience`, `bio`, `githubUsername`, `githubActivitySummary`, `twitterActivitySummary`, `isPublic`, `vouchedBadge`, `onboardingComplete`, `onboardingStep`, `portfolioTheme`, `portfolioCustomization` |
| InterviewSession | `format`, `targetSkill`, `status`, `messages[]`, `scores` (overall, breakdown, delta), `insightReport` (strengths, gaps, idealAnswers, aiVerdict, weaknessSignals[]), `scoreUpdate`, `shareToken`, `memoryContext`, `companyMode` (jdSnippet, style, company), `completedAt` |
| PeerSession | `skill`, `format`, `status`, `participants[]` (userId, role, name, username), `messages[]`, `aiSummary`, `interviewerScore` |
| Team | `name`, `ownerId`, `inviteCode`, `members[]` (userId, name, username, skills[]), max 20 members |
| Application | `recruiterId`, `candidateId`, `recruiterInfo` (name, company, title, avatarUrl, username), `candidateInfo` (name, username, avatarUrl, targetRole), `jobTitle`, `status`, `messages[]`, `interview` (date, time, timezone, type, meetLink, notes, status: proposed/confirmed/declined/completed), `outcome` (result: hired/rejected/withdrawn, notes, updatedAt) |
| RoleSpec | `recruiterId`, `mustHave[]` (skill, minScore), `niceHave[]`, `compMinLpa/MaxLpa`, `locations[]`, `stage`, `domain`, `teamContext`, `dealbreakers[]`, `blind`, `blindScreeningEnabled`, `autoSourceEnabled`, `status` (draft/active/paused/closed) |
| Handshake | `roleSpecId`, `recruiterId`, `candidateId`, `verdict` (mutualFit, score, reasoning, skillMatches[], techBarCleared, compOverlap, locationMatch, stageMatch, dealbreakerHit), `exchanges[]`, `surfacingMessage`, `status`, `applicationId` |
| Watchlist | `recruiterId`, `candidateId`, `roleSpecId`, `skillAlerts[]` (skill, threshold) |
| Certificate | `userId`, `skill`, `milestone`, `scoreAtIssuance`, `evidence[]`, `token`, `issuedAt` |
| WeeklyBrief | `userId`, `weekOf` (unique per user), `subject`, `bodyHtml`, `sentAt` |
| MarketFeed | `skill`, `demandScore`, `demandDelta`, `activeRoles`, `avgProofScore`, `candidateCount`, `generatedAt` — TTL 48h |
| SavedResume | `userId`, `jobTitle`, `content`, `jdMatchScore`, timestamps |
| BadgeEvent | `type`, `username`, `skill` — 90d TTL |
| LeaderboardAlert | `userId`, `skill`, `city`, `rank`, `weekOf` — unique constraint |
| Notification | `userId`, `type`, `title`, `body`, `link`, `read` — 90d TTL |

---

## Infrastructure

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, Framer Motion, Recharts |
| Database | MongoDB Atlas, Mongoose |
| Auth | NextAuth v5 — GitHub OAuth + Twitter/X OAuth 2.0 (candidates) + bcryptjs Credentials (recruiters) |
| AI | Vercel AI SDK v6, Ollama (dev, `qwen2.5-coder:7b`) / Groq `llama-3.3-70b-versatile` (prod). Always `maxOutputTokens`. `getModel()` — Ollama-first, Groq fallback |
| Code Execution | Judge0 |
| Background Jobs | BullMQ + ioredis. Queues: `connection-sync`, `role-sourcing`, `autonomous-sourcing` |
| Email | Resend |
| Billing | Stripe v22 — checkout, portal, webhook |
| LinkedIn Parsing | Python/FastAPI + Playwright (separate process, `PARSER_SERVICE_URL`) |
| GitLab Parsing | GitLab REST API v4 + Groq (no OAuth) |
| Twitter/X Parsing | Twitter API v2 Bearer Token + Groq (`TWITTER_BEARER_TOKEN`) |
| Typesense | Scaffolded (`lib/typesense.ts`); recruiter search falls back to MongoDB |
| Video Interviews | LiveKit — token API at `/api/interview/room`; no UI built |
| Crons | Vercel Crons — weekly brief (Mon 08:00 UTC), leaderboard notify (Mon 09:00 UTC), market feed (daily 02:00 UTC) |
| Rate Limiting | Upstash Redis REST API — sliding window sorted set |
| Edge Routes | ImageResponse — badges, certificate OG, rank card, receipt, wrapped OG |
| Memory Engine | `lib/memory.ts` — `extractWeaknessSignals()` post-session, `getCandidateMemory()` pre-session |

---

## Env Var Requirements

### Must Have (nothing works without these)

```
NEXTAUTH_SECRET
MONGODB_URI
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET     # or TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET
NEXTAUTH_URL                                 # prod only
```

### AI (one must work)

```
GROQ_API_KEY                # fallback; get from console.groq.com (free tier)
OLLAMA_BASE_URL             # dev; default http://localhost:11434/v1
OLLAMA_MODEL                # e.g. qwen2.5-coder:7b
```

### X / Twitter

```
TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET   # "Continue with X" login button
TWITTER_BEARER_TOKEN                        # bio + tweet skill parsing
```

Both optional. Twitter login requires OAuth 2.0 enabled in Twitter Developer portal with callback: `<NEXTAUTH_URL>/api/auth/callback/twitter`.

### Optional (features degrade gracefully without these)

```
GITHUB_TOKEN                # rate limit: 60 → 5000 req/hr
RESEND_API_KEY              # email — score alerts, certs, briefs, schedule notifications
CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET  # portfolio media uploads
STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID + STRIPE_WEBHOOK_SECRET  # billing
UPSTASH_REDIS_URL + UPSTASH_REDIS_TOKEN     # rate limiting + BullMQ
TYPESENSE_HOST + API_KEY + COLLECTION       # fast candidate search
PARSER_SERVICE_URL + PARSER_SERVICE_SECRET  # LinkedIn parser microservice
JUDGE0_API_URL + JUDGE0_API_KEY            # code execution in interviews
ATS_API_KEY                                # external ATS integration
ADMIN_EMAILS                               # comma-separated for /admin access
```

---

## Known Issues & Behaviour

| Issue | Status |
|---|---|
| Onboarding modal reappeared on every back-navigation | **Fixed** — localStorage + `Profile.updateOne` (upsert removed) |
| Atlas learning tab regenerated on every tab switch | **Fixed** — always mounted, CSS toggle |
| Market feed empty on fresh deploy | **Fixed** — live fallback from sessions + profiles |
| Memory shows "No recurring weaknesses" for old sessions | **Fixed** — synthesises from `insightReport.gaps` |
| All `CandidateNav` pages had broken layout | **Fixed** — `h-screen flex overflow-hidden` + `flex-1 overflow-y-auto` |
| `Sync All` job overwrote GitLab/Twitter connection status with error | **Fixed** — skip list: `['github', 'gitlab', 'twitter']` |
| Skill data loss on GitHub re-sync (replaced all skills) | **Fixed** — additive merge preserves other-source skills |
| LinkedIn sync wrote no-op (arrayFilters $set never matched) | **Fixed** — `$pull` + `$push` upsert pattern |
| GitLab sync created duplicate connection entries on re-sync | **Fixed** — `$pull` + `$push` upsert pattern |
| Twitter sync created duplicate entries on re-sync | **Fixed** — `$pull` + `$push` upsert pattern |
| DEV.to/SO/HN sync never wrote `scoreHistory` entries | **Fixed** — every signal merge now appends `{ score, source, at }` |
| Fake GitHub connection row for Twitter-auth users | **Fixed** — synthetic row only injected when `authProvider === 'github'` |
| Twitter activity summary never reached Atlas chat | **Fixed** — `profile.twitterActivitySummary` stored on sync, selected + injected in Atlas context |
| Interview start fetched GitHub repos for Twitter-auth users (always empty) | **Fixed** — checks `authProvider`; falls back to `twitterActivitySummary` |
| Settings password section showed change form for Twitter users | **Fixed** — shows "X/Twitter login" message for `authProvider === 'twitter'` |
| `autonomousSourcing.ts` queried Handshake using `roleId` (field doesn't exist) | **Fixed** — corrected to `roleSpecId` |
| Recruiter analytics queried Handshake with `roleId` (field doesn't exist) | **Fixed** — corrected to `roleSpecId`; applications queried by `recruiterId` |
| Analytics `interviewed` count always 0 (checked `interview.scheduledAt`) | **Fixed** — checks `interview.status !== 'proposed'` |
| Analytics `offered` count always 0 (checked `outcome === 'hired'`) | **Fixed** — checks `outcome.result === 'hired'` |
| Interview prep route always returned 403 (`application.roleId` undefined) | **Fixed** — ownership verified via `application.recruiterId`; role looked up by recruiter + jobTitle |
| Peer interview pairs candidates randomly | **Known** — no cohort-based matchmaking |
| Company mode OG image missing company name | **Fixed** — `companyMode.company` now rendered as badge |
| Typesense search not active | **Scaffolded** — falls back to MongoDB |
| LiveKit video interviews not wired | **Scaffolded** — token API exists, no UI |

---

## What Is Not Done Yet

### Near-Term (Low Effort, High Value)

- **Peer matchmaking by cohort** — sort queue by cohort percentile before pairing; avoid top 5% vs bottom 20%
- **Twitter auth user onboarding** — step 0 currently says "Connect GitHub"; needs variant for X/Twitter users
- **Atlas: skill comparison** — side-by-side learning plans for two skills

### Medium-Term

- **Typesense activation** — `lib/typesense.ts` scaffolded; needs running instance + initial index sync job
- **LiveKit video interviews** — token API ready; need to build the video UI page
- **LinkedIn zero-setup** — currently requires separate Python process; could use a hosted API
- **Atlas goal tracking** — set a goal ("Expert in TypeScript by August"), Atlas tracks + nudges weekly
- **Application ↔ RoleSpec FK** — Application model has no `roleId` foreign key; analytics does a recruiter-level approximation. Add `roleSpecId` to Application on creation for exact funnel tracking

### Long-Term

- **Mobile app** — web-only today
- **Interview replay** — playback transcript with score overlay
- **Verified reference checks** — former managers attest to skills via signed link
- **Multi-language support** — interview in local language
- **Public API v2** — authenticated ATS integration
- **Cohort benchmarks by company** — "Your TypeScript is higher than 70% of engineers who practised for this company"
- **Recruiter AI assistant** — plain-text hire description → Scout drafts the RoleSpec

---

## The Trust Layer

The Handshake Protocol's hard gates are deterministic code — not prompts. The LLM cannot override them. A candidate without verified Kubernetes experience is never surfaced to a role that requires it, regardless of what the model generates. Evidence snapshots are captured at evaluation time and are immutable — inflating a score after a match does not rewrite what Atlas claimed.

That's the thing that makes everything else defensible.
