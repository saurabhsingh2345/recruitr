# What We Have Built — Intervue

*Internal document. Accurate as of 2026-06-23. Full audit of shipped features, known issues, architecture, and future scope.*

---

## The One-Line Version

Intervue is a verified technical identity platform. On the candidate side an AI engine builds proof-of-skill from real code, sessions, and external sources. On the recruiter side an autonomous agent (Scout) negotiates fit against another autonomous agent (Atlas) before either human is contacted.

---

## Candidate Architecture

### Pages & Routes

| Route | What it does |
|---|---|
| `/` | Marketing landing page — feature sections, comparison table, company links, nav |
| `/onboarding` | OAuth landing — GitHub OAuth result, referral code claim |
| `/dashboard` | Main candidate hub — hero card (avatar, stats row: sessions/avg score/streak/rank), skill constellation, interview type quick-start, recent sessions, experience/education/projects; full light+dark mode |
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
| `/settings` | Full settings — profile, portfolio, connections, privacy, notifications, billing |
| `/settings/referrals` | Referral dashboard — link, stats, per-referral progress |
| `/briefs` | Weekly brief archive — expandable list of all past Atlas weekly summaries |
| `/resumes` | Resume Studio — AI resume generation, JD match score, PDF download, library |
| `/connections` | Connections overview page |
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
| `/recruiter/login` | Email + password login (separate from GitHub OAuth) |
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

### 1. GitHub Sync
Live, uncached data from GitHub API. Up to 50 repos (recently updated, non-forks). Languages, topics, complexity, star counts feed proof scores. Background BullMQ job; degrades to inline if Redis is unavailable.

---

### 2. AI Interview Engine
Five formats: **coding, system design, project deep-dive, behavioural, gap**. Personalized — AI reads candidate's GitHub repos at session start and grounds questions in real projects.

- Streaming via Vercel AI SDK
- Monaco editor: JS, TS, Python, Go, Java, C++, Rust
- Code execution via Judge0
- Voice mode: browser SpeechRecognition + SpeechSynthesis (no external API)
- Socratic hints — nudges without giving answers
- Session produces: overall score, four-axis breakdown, strengths, gaps, study recs, ideal answers, AI verdict (≤80 chars)
- Score update: weighted blend of existing score + new performance; 20–100 clamp for new skills
- Daily streak tracking with freeze tokens
- Shareable public reports (Pro-gated) via `/interview/report/shared/[token]`
- Session proof receipt — full-screen score card after completion; OG image at `/api/receipt/[sessionId]`
- Session abandonment — `navigator.sendBeacon` fires abandon on browser close
- Markdown rendering — code blocks, lists, headers, bold/italic in chat and transcript

---

### 3. Verified Skill Profile
`proofScore` (0–100) per skill. Sources:

- GitHub repos — formula: `evidenceCount × 0.4 + complexity × 0.3 + recency × 0.3`
- Resume PDF — extracted by AI
- Interview sessions — each session updates the relevant skill
- DEV.to — articles, tags, reaction counts
- Stack Overflow — reputation, top answer tags
- Hacker News — karma, years active
- LinkedIn — via Python/Playwright microservice (requires `LINKEDIN_LI_AT` cookie)
- GitLab — public REST API v4, up to 30 repos, AI extraction (no OAuth)
- Twitter/X — scaffolded, blocked on `TWITTER_BEARER_TOKEN`

**Score history** — `scoreHistory: { score, source, at }[]` per skill. Every sync and session appends.

**Confidence bands** — `getConfidenceBand()` in `lib/scoring.ts` computes ±σ from score history. Shown in dashboard skill rows and public profile: `82 ± 2` for consistent performers, `75 ± 15` for volatile ones.

**Score decay signal** — `getDecaySignal()`: fresh (<30d, no indicator), ageing (30–60d, orange chip), stale (>60d, red chip). Scores are not reduced, only flagged.

**Cohort ranking** — candidate's avg score vs all verified candidates expressed as a percentile. Recalculates after every session and profile sync.

---

### 4. Public Profile & Sharing
`/p/[username]` — avatar, name, bio, badges, cohort rank ("Top X%"), ranked skill list with bars + ±σ + evidence count, GitHub projects, experience, education, recruiter CTA.

**Portfolio themes:** 4 options — Minimal, Terminal, Magazine, Bento (selectable in Settings → Portfolio).

**OG rank card** — 1200×630 at `/api/rank-card/[username]`. Used as `og:image` for every profile URL.

**Skill badges** — 400×80 edge-rendered at `/api/badge/[username]/[skill]`. Summary badge 600×80 at `/api/badge/[username]/summary` (top 3 skills).

**Proof pages** — `/proof/[username]/[skill]` — full evidence breakdown.

**Embeds** — iframe at `/embed/[username]/[skill]` — raw HTML, `frame-ancestors: *`.

**README snippet generator** — Settings → Connections: badge preview + markdown snippet + GitHub Actions YAML for weekly auto-refresh.

---

### 5. Verified + Vouched Badges
**Verified** — GitHub connected + at least one assessed skill.
**Vouched** — referred 3+ candidates who each completed a proof session. Shown on `/p/[username]`.

---

### 6. Onboarding Flow
Full-screen overlay modal (`OnboardingModal`) for new candidates:
1. Step 0 — GitHub connected; shows top repo + language chip
2. Step 1 — Start first interview (format derived from top language)
3. Step 2 — Proof scores ready (post-first-session return)

"Skip for now" — permanently dismissed via **localStorage** (`ob_skip_<username>`) + DB write (`Profile.updateOne`, no upsert). Both gates prevent reappearance on back-navigation.

"Complete your profile" banner — added to Settings → Profile tab when `onboardingComplete !== true`, with "Start first interview →" CTA and "Dismiss" link.

API routes: `POST /api/onboarding/skip`, `POST /api/onboarding/step`.

---

### 7. Atlas — The Candidate's AI Agent
Two-panel layout: chat (42% left) + skill tools (58% right).

**Chat context includes (fully enriched):**
- All skill scores (up to 10)
- GitHub projects (repo name, description, tech stack, language)
- Work experience and education from resume
- Last 5 completed sessions with scores and gap summaries
- Recurring weakness topics from memory engine
- Pending handshakes (company, role, fit %)
- Comp preferences, discoverability, target role, cohort rank

**Opportunities inbox** — collapsible section below chat. Pending handshakes show skill check animation (Checking React 84 ≥ 80 → Cleared), fit score, surfacing message, accept/pass buttons. History shows resolved handshakes with thread links.

**Right panel — 4 tabs:**

- **Skill path** — SkillUnlockPath (recommended next sessions) + MemoryInsights (recurring weak areas by severity + session count) + weekly brief archive link
- **Market** — Market intelligence feed (demand scores per skill, with live fallback when daily cron hasn't run yet)
- **Learning** — Full skill picker showing ALL user skills with proof scores; goal selector (Proficient 70+ / Expert 85+ / FAANG-ready); phased learning plan per skill generated by AI; no infinite regeneration (always mounted, CSS hidden when inactive)
- **Negotiate** — Offer analysis and counter-offer coaching using verified proof scores

**Discoverability** — open / passive / invisible. Preferences: comp floor, locations, stages, dealbreakers — enforced by Scout on every handshake.

---

### 8. Cross-Session Memory Engine
Tracks recurring weaknesses across sessions and injects them into each new interview.

1. After session completion, `extractWeaknessSignals()` parses gaps into `{ skill, topic, severity: 1|2|3 }`. Saved to `insightReport.weaknessSignals[]`.
2. On new session start, `getCandidateMemory()` aggregates signals from last 8 sessions. Recurring (≥2 sessions) or critical (severity 3) signals are formatted and injected into the opening prompt as `session.memoryContext`.
3. Every AI response in the session sees the memory via `contextualSystem`.
4. Fallback: if `weaknessSignals` is empty (sessions from before the feature launched), synthesizes signals from `insightReport.gaps` (plain text strings).
5. MemoryInsights widget on Atlas skills tab shows the candidate their own weakness map.

---

### 9. Company-Mode Simulation
Paste a JD before any interview. AI adopts that company's interview style for the entire session.

- `analyzeCompanyStyle(jd)` extracts: inferred company name + 2–3 sentence style description (depth, focus, culture)
- Style injected into opening prompt and every subsequent AI response via `[COMPANY MODE]` marker
- Company name shown on session report as a badge
- `/companies` discovery page shows companies practised for, sorted by session count, with inferred style snippets

---

### 10. Peer Interview Mode
Candidate vs candidate, one interviewer one interviewee, AI moderator.

- `/peer/find` — format + skill + role selection
- Queue API matches on skill + format; if matched both enter session; if not, polls every 5 seconds
- AI moderator drops welcome message, coaching tips every 6 human messages
- Either can end; interviewer scores candidate (0–100 slider); AI generates 3-sentence summary
- **Known gap:** no skill-level matching — two very different skill levels can be paired

---

### 11. Team Skill Graph
Groups of up to 20 candidates pool their skill snapshots.

- Create team → 8-char nanoid invite code → `/team/join/[code]`
- "Refresh my skills" button — PATCH `/api/teams/[id]` updates the member's skill snapshot from current Profile
- "Generate skill graph" → RadarChart (team avg + best member), strengths/gaps columns, AI hire recommendation
- Skill data can go stale (fixed: Refresh button re-syncs from current profile)

---

### 12. Year-in-Review Wrapped
`/wrapped/[year]` — sessions, avg score, top skill, favourite format, best session, peak proof score, longest streak, monthly bar chart. Share on X / save image / copy link. OG image at `/api/wrapped/[year]/image`. Dashboard CTA appears at ≥3 completed sessions.

---

### 13. Skill Milestone Certificates
Auto-issued when proof score crosses 50 (Intermediate), 70 (Proficient), 85 (Expert).

- Public page at `/certificate/[token]`
- LinkedIn share + copy link
- 1200×630 OG image via ImageResponse
- Resend email + in-app notification on issuance
- One per (user, skill, milestone) — deduplicated

---

### 14. Referral System
8-char unique referral code per candidate. `/onboarding?ref=CODE` stores in localStorage, claimed after OAuth. At 3 referred candidates completing 3 sessions each → Vouched badge. `/settings/referrals` shows full dashboard.

---

### 15. In-App Notifications
Bell icon in sidebar → dropdown of last 30 notifications.

Types: `interview_complete`, `score_milestone`, `leaderboard_entry`, `certificate_issued`, `handshake_surfaced`, `weekly_brief`, `recruiter_viewed`.

Auto-expires after 90 days (MongoDB TTL). `recruiter_viewed` deduplicated per 24h window.

---

### 16. Resume Studio
1. Enter job title + optional JD → AI generates ATS-optimized resume from verified data
2. JD match score (0–100) + 1–2 sentence analysis when JD provided
3. Copy ATS plain text / download PDF (`@react-pdf/renderer`, lazy-loaded)
4. Auto-saved to library with timestamp; delete from library

---

### 17. Leaderboard
`/leaderboard` — public, no login. Skill × city filter (9 skills, 6 cities). URL-shareable. Top 3 podium + table with rank, avatar, name, vouched badge, score, cohort percentile.

Monday 09:00 UTC cron sends in-app + Resend email notification to new leaderboard entrants.

---

### 18. Weekly Career Brief
Monday 08:00 UTC cron — up to 50 candidates with `emailBriefEnabled: true` get a personalized 3-paragraph brief from Atlas via Groq + Resend. Archive at `/briefs` (expandable, lazy body load). Deduplicated per (userId + weekOf).

---

### 19. Market Intelligence Feed
Daily 02:00 UTC cron aggregates skill demand: active role counts, candidate supply, avg proof scores, demand score (0–100), week-over-week delta. Stored in MarketFeed (TTL 48h). **Live fallback when MarketFeed is empty:** generates on-demand from `InterviewSession` practice frequency + `Profile` skill supply, normalized to 0–100.

---

### 20. Open Proof API v1
`GET /api/v1/proof/:username/:skill` — public, no auth. Returns proofScore, label, color, top 5 evidence sources, last 10 score history entries, lastUpdated, proofUrl. Rate-limited via Upstash Redis (100 req/IP/hour). Invisible candidates return 404. Docs at `/docs`.

---

### 21. Admin Growth Dashboard
`/admin` — ADMIN_EMAILS gated. Total users, new last 30d, sessions last 7d, completion rate, company-mode count, team count, briefs sent, top skills bar chart, 7-day session histogram, flywheel health meters.

---

### 22. Billing
- **Free** — unlimited AI interviews, public profile, Atlas, badges, leaderboard, all core features
- **Pro** — shareable report links; appears higher in recruiter search; additional data sources (LinkedIn, SO, DevTo)
- Stripe: checkout, billing portal, webhook (tier flips on subscription events)

---

## Feature Inventory — Recruiter Side

### 1. Auth & Onboarding
Email + password with bcryptjs. Forgot/reset password flow. Setup wizard captures company name, size, initial roles.

### 2. Dashboard
Pipeline KPI cards, top matches, recent activity, natural-language candidate search.

### 3. Role Management
Create roles with typed specs: must-have skills + minimum proof scores, nice-to-have, comp range (₹ LPA), locations, stage, blind mode, auto-source flag. Role detail page shows all handshake results with verdict chips and full agent dialogue transcript.

### 4. Two-Agent Matching (The Core Differentiator)
Recruiter pastes JD → Scout structures into typed spec → "Source" button → Scout pre-filters verified pool by skill presence, sorted by cohort percentile → Handshake Protocol per candidate:

- Scout sends fit inquiry to Atlas
- Atlas runs **deterministic hard gates**: tech bar (every must-have at or above minimum proofScore), comp overlap, location, stage, dealbreakers
- LLM writes human-facing reasoning (cannot invent skills — strictly from verified evidence)
- `mutualFit = false` → `declined_by_atlas` — neither human bothered
- `mutualFit = true` → warm surfacing message → candidate in-app notification + agent inbox
- Evidence snapshots captured at evaluation time — **immutable audit trail**

Hard gates are deterministic code. LLM sits on top. Cannot be subverted.

### 5. Role Fit Forecast
"Check pool →" before sourcing: total verified candidates, how many pass all gates, per-skill gate analysis, bottleneck skill, location breakdown.

### 6. Scout — Autonomous Sourcing
When any candidate's skill scores update (post-interview or sync), a BullMQ job fires automatically on `autonomous-sourcing` queue. Finds all `autoSourceEnabled` RoleSpecs with overlapping skills. Runs Handshake Protocol for each new (role, candidate) pair. Caps at 20 roles/run. Concurrency: 3 workers.

### 7. Blind Screening Mode
Names, usernames, avatars, GitHub handles replaced with deterministic anonymous labels. Recruiter evaluates proof scores before identity reveal. Reveal endpoint: rate-limited, logged to BadgeEvent, triggers `recruiter_viewed` notification to candidate (once per 24h).

### 8. Talent Pool Watchlist
Save candidates per role. Per-skill score alerts and status change alerts. `/recruiter/watchlist`.

### 9. Interview Prep Questions
Per (candidate, role) pair — gap questions, strength verification questions, behavioural questions — generated by Groq.

### 10. Hiring Velocity Analytics
`/recruiter/analytics` — KPI cards (surfaced/applied/interviewed/offered, last 12 weeks), time-to-offer, weekly pipeline chart, top 10 skill gap chart, day × hour activity heatmap.

### 11. Kanban Pipeline
Applications move through: New Inquiry → Screening → Interview → Offer → Closed.

### 12. Candidate Search
Filter by skill, minimum proof score, target role, location, vouchedOnly. Ranked by cohort percentile. Typesense full-text search scaffolded (falls back to MongoDB).

### 13. ATS API
`GET /api/ats/candidates/search` — authenticated by `x-api-key`. External ATS integration.

### 14. Messaging & Scheduling
In-app messaging between recruiter and candidate. Interview scheduling with `.ics` calendar file generation. Resend email notifications for new messages, scheduled interviews, watchlist alerts.

---

## Data Models

| Model | Key Fields |
|---|---|
| User | role (candidate/recruiter), openToWork, discoverability (open/passive/invisible), referralCode, subscriptionTier (free/pro), subscriptionStatus, streak, emailBriefEnabled, connections[], preferences (minCompLpa, locations, stages, dealbreakers) |
| Profile | parsedSkills (name, proofScore, scoreHistory[], evidence[], lastUpdated), projects[], experiences[], educations[], portfolioProjects[], cohortPercentile, targetRole, yearsOfExperience, bio, githubUsername, isPublic, vouchedBadge, onboardingComplete, onboardingStep, portfolioTheme, portfolioCustomization |
| InterviewSession | format, targetSkill, status, messages[], scores (overall, breakdown, delta), insightReport (strengths, gaps, idealAnswers, aiVerdict, weaknessSignals[]), scoreUpdate, shareToken, memoryContext, companyMode (jdSnippet, style, company), completedAt |
| PeerSession | skill, format, status (waiting/active/completed/abandoned), participants[] (userId, role, name, username), messages[] (role, content, senderName), aiSummary, interviewerScore |
| Team | name, ownerId, inviteCode, members[] (userId, name, username, skills[]), max 20 members |
| Application | messages[], interview (scheduledAt, format, joinUrl), outcome, pipelineStatus (new_inquiry/screening/interview/offer/closed) |
| RoleSpec | mustHave[] (skill, minScore), niceHave[], compMin/Max, locations[], stage, blind, autoSourceEnabled, domain, teamContext, dealbreakers[] |
| Handshake | candidateId, roleSpecId, verdict (mutualFit, score, reasoning, skillMatches[], techBarCleared, compOverlap, locationMatch, stageMatch, dealbreakerHit), evidenceSnapshot, agentExchanges[], surfacingMessage, status, applicationId |
| Watchlist | recruiterId, candidateId, roleSpecId, skillAlerts[] (skill, threshold) |
| Certificate | userId, skill, milestone (intermediate/proficient/expert), scoreAtIssuance, evidence[], token, issuedAt |
| WeeklyBrief | userId, weekOf (unique per user), subject, bodyHtml, sentAt |
| MarketFeed | skill, demandScore (0–100), demandDelta, activeRoles, avgProofScore, candidateCount, generatedAt — TTL 48h |
| SavedResume | userId, jobTitle, content (name/headline/skills/experience/projects/education), jdMatchScore, timestamps |
| BadgeEvent | type (serve/visit/signup), username, skill — 90d TTL |
| LeaderboardAlert | userId, skill, city, rank, weekOf — unique constraint deduplicates notifications |
| Notification | userId, type, title, body, link, read — 90d TTL |

---

## Infrastructure

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, Framer Motion, Recharts |
| Database | MongoDB Atlas, Mongoose |
| Auth | NextAuth v5 — GitHub OAuth (candidates) + bcryptjs Credentials (recruiters + credential candidates) |
| AI | Vercel AI SDK v6, Ollama (dev) / Groq llama-3.3-70b-versatile (prod). Always `maxOutputTokens`, never `maxTokens`. `getModel()` from `lib/groq.ts` — Ollama-first, Groq fallback |
| Code Execution | Judge0 |
| Background Jobs | BullMQ + ioredis. Queues: `connection-sync`, `role-sourcing`, `autonomous-sourcing` |
| Email | Resend |
| Billing | Stripe v22 — checkout, portal, webhook |
| LinkedIn Parsing | Python/FastAPI + Playwright + linkedin_scraper (separate process, requires session cookie) |
| GitLab Parsing | Public GitLab REST API v4 + Groq (no OAuth) — Settings → Connections |
| Twitter/X Parsing | Twitter API v2 bearer token + Groq — scaffolded at `/api/profile/sync/twitter` |
| Typesense | Scaffolded (`lib/typesense.ts`); recruiter search falls back to MongoDB |
| Video Interviews | LiveKit — token API at `/api/interview/room`; no UI built |
| Crons | Vercel Crons — weekly brief (Mon 08:00 UTC), leaderboard notify (Mon 09:00 UTC), market feed (daily 02:00 UTC) |
| Rate Limiting | Upstash Redis REST API — sliding window sorted set |
| Edge Routes | ImageResponse — badges, certificate OG, rank card, receipt, wrapped OG |
| Memory Engine | `lib/memory.ts` — `extractWeaknessSignals()` post-session, `getCandidateMemory()` pre-session |
| Misc API | `GET /api/jobs/[id]` — poll BullMQ background job state; `GET/POST /api/me/sync-token` — manage GitHub Actions sync token for badge auto-refresh; `POST /api/auth/change-password` — in-settings password change for credential accounts |
| Deployment | Vercel (Next.js + edge), separate processes for BullMQ worker and Python LinkedIn parser |

---

## Known Issues & Odd Behaviour

| Issue | Status |
|---|---|
| Onboarding modal reappeared on every back-navigation | **Fixed** — localStorage (`ob_skip_<username>`) + `Profile.updateOne` (removed dangerous upsert that failed silently on missing required field) |
| Atlas learning tab regenerated on every tab switch | **Fixed** — component always mounted, CSS `hidden` toggle prevents remount; `useEffect` only fires on skill/goal change |
| Market feed empty on fresh deploy (cron hasn't run) | **Fixed** — live fallback generates from `InterviewSession` + `Profile` aggregates |
| Memory shows "No recurring weaknesses" for old sessions | **Fixed** — synthesises from `insightReport.gaps` when `weaknessSignals` is empty |
| All pages using `CandidateNav` had broken layout | **Fixed** — sidebar rendered as block, content stacked below. Now all pages use `h-screen flex overflow-hidden` + `flex-1 overflow-y-auto` main |
| Atlas light mode text invisible | **Partially fixed** — CSS overrides added for `text-[#AEB5E0]`, `text-[#888FC0]`, `text-[#555B8A]`, `text-[#ECF0FF]`, `bg-[#0D1020]`, `bg-[#080A18]` |
| Dashboard light mode broken (hardcoded dark hex colors) | **Fixed** — full dashboard rewrite to use `bg-card`, `border-border`, `text-foreground/*` theme tokens; hero card stats row added; interview type cards use colored left-border accent |
| Peer interview pairs candidates randomly | **Not fixed** — no skill-level matching; two vastly different skill levels can be paired |
| Company mode OG image missing company name | **Fixed** — `companyMode` now selected from session; receipt OG image renders a teal company-name badge when `companyMode.company` is set |
| Twitter/X parser inactive | **Blocked** — requires `TWITTER_BEARER_TOKEN` (elevated Twitter Developer access) |
| LinkedIn parser requires external process | **By design** — separate Python/Playwright service; not zero-setup |
| Typesense search not active | **Scaffolded** — falls back to MongoDB; needs running Typesense instance + initial index sync |
| LiveKit video interviews not wired | **Scaffolded** — token API exists, no UI; needs `livekit-server-sdk` + env vars |
| WeeklyBrief cron only fires for `emailBriefEnabled: true` | **Fixed** — live toggle added to Settings → Notifications ("Weekly Atlas brief" row); PATCH `/api/me` with `emailBriefEnabled` now whitelisted |
| `/connections` page has "Needs OAuth — coming soon" section | **Scaffolded** — some OAuth connection sources not yet wired |
| Atlas learning path only shows one skill at a time | **Partially improved** — now shows all user skills as picker + goal selector; but no ability to compare plans side-by-side |
| Portfolio docs say "two themes" | **Out of date** — 4 themes exist: Minimal, Terminal, Magazine, Bento |

---

## What Is Not Done Yet (Scope)

### Near-Term (Low Effort, High Value)
- **Peer matchmaking by cohort** — sort queue by cohort percentile before matching; avoid pairing top 5% with bottom 20%
- **Atlas: skill comparison view** — side-by-side learning plans for two skills
- **Settings → tell them about onboarding** — already added "Complete your profile" banner; could go further with a step-by-step progress tracker

### Medium-Term
- **Twitter/X parser activation** — just needs `TWITTER_BEARER_TOKEN` env var; code is ready
- **Typesense full-text search** — `lib/typesense.ts` scaffolded; needs instance + index sync job
- **LiveKit video interviews** — token API exists; need to build the video interview UI page
- **LinkedIn parser zero-setup** — currently requires a separate Python process; could replace with a direct HTTP API call to an existing service
- **Atlas goal tracking** — candidates set a goal (e.g., "Get to Expert in TypeScript by August") and Atlas tracks progress, sends weekly nudges
- **Recruiter analytics: candidate funnel heatmap** — which skills cause the most handshake failures (per role)

### Long-Term
- **Mobile app** — web-only today; React Native or PWA
- **Interview replay** — playback the session transcript with score overlay and AI commentary
- **Verified reference checks** — former managers/peers can attest to skills via a signed link; adds social proof layer to proof scores
- **Multi-language support** — interview in local language; proof scores stay universal
- **Public API v2** — authenticated API for ATS platforms to pull verified profiles directly (v1 is public read-only per-skill)
- **Cohort benchmarks by company** — "Your TypeScript score is higher than 70% of engineers who practised for this company"
- **Recruiter AI assistant** — instead of clicking through roles, recruiter describes a hire in plain text and Scout drafts the RoleSpec automatically

---

## The Trust Layer

The Handshake Protocol's hard gates are deterministic code — not prompts. The LLM cannot override them. A candidate without verified Kubernetes experience is never surfaced to a role that requires it, regardless of what the model generates. Evidence snapshots are captured at evaluation time and are immutable — inflating a score after a match does not rewrite what Atlas claimed.

That's the thing that makes everything else defensible.
