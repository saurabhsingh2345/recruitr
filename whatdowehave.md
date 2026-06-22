# What We Have Built — Intervue

*Internal document for investor conversations. Accurate as of June 2026 — last updated 2026-06-23 (cross-session memory engine, company-mode simulation, peer interview mode, team skill graph, year-in-review wrapped card, onboarding flow, score confidence bands in UI, GitLab Settings card, handshake + recruiter-viewed notifications wired, password change, score decay signal, company mode on report, admin growth dashboard, /companies discovery page, Resume Studio JD match score, weekly brief archive, team skill staleness fix, landing page improvements, light mode polish).*

---

## The One-Line Version

Intervue is a verified technical identity platform with an AI interview engine on the candidate side and an autonomous agent-to-agent matching protocol on the recruiter side. The agents negotiate fit before either human is involved.

---

## What Is Shipped and Running

### 1. GitHub Sync

Candidates sync their GitHub profile from Settings → Connections. The sync fetches **live, uncached data** from the GitHub API — new repos pushed minutes ago are picked up immediately. Up to 50 repositories are scanned (most recently updated, non-forks only). Languages, topics, repo complexity, and star counts feed directly into proof scores.

A background BullMQ job handles large syncs. If Redis is unavailable the sync runs inline — the app degrades gracefully.

---

### 2. AI Interview Engine

Candidates start a technical interview in five formats: **coding, system design, project deep-dive, behavioural, and gap** (targeted skill drills). Every session is personalized — the AI reads the candidate's actual GitHub repos at session start and asks questions grounded in real projects.

- Responses stream in real-time via Vercel AI SDK.
- Monaco code editor inside the interview: JavaScript, TypeScript, Python, Go, Java, C++, Rust.
- Code execution against Judge0.
- Voice mode via browser SpeechRecognition + SpeechSynthesis (no external API).
- Socratic hints — the AI nudges without giving away answers.
- At session end the AI produces: overall score, four-axis breakdown (technical depth, problem-solving, communication, code quality), strengths, gaps, study recommendations, **ideal answers** (expert 2–3 sentence responses per question asked), and an **AI verdict** — a single punchy sentence under 80 characters summarising demonstrated capability. Stored on the insight report.
- Scores feed back into the candidate's skill profile (weighted blend of existing score + new performance for existing skills; interview score clamped 20–100 for newly discovered skills). Every session appends to the per-skill score history.
- Daily streak tracking with freeze tokens.
- **Shareable public reports** — Pro candidates can share a `/interview/report/shared/[token]` link. Recruiters can view verified interview performance without needing an account.
- **Session proof receipt** — after a session completes, a full-screen receipt is shown before the report: score in large monospace, skill delta (before → after +N), AI verdict, and two buttons (View full report / Share). OG image at `/api/receipt/[sessionId]` — dark 1200×630 card with score, format, delta, and verdict.
- **Session abandonment** — if the browser is closed mid-session, `navigator.sendBeacon` fires a `POST /api/interview/[id]/abandon` which marks the session `abandoned` so it doesn't linger as `in_progress` forever.
- **Markdown rendering** — interviewer and candidate messages render with a custom lightweight renderer. Handles fenced code blocks with language labels, numbered and bullet lists, H2/H3 headers, bold/italic/inline code. Applied to both the live session chat and the transcript tab on the report page.

---

### 3. Verified Skill Profile

Every candidate has a profile with **proofScores** (0–100) per skill. Not self-reported. Derived from:

- **GitHub repos** — languages, complexity, recency, commit history. Formula: `score = evidenceCount × 0.4 + repoComplexity × 0.3 + recencyScore × 0.3`.
- **Resume PDF** — extracted and parsed by the AI against actual project evidence.
- **Interview sessions** — each completed session updates the relevant skill score.
- **External sources** (active parsers):
  - DEV.to — articles, tags, reaction counts → technical writing signal
  - Stack Overflow — reputation, top answer tags → answer quality signal
  - Hacker News — karma, years active → community engagement signal
  - LinkedIn — via Python/Playwright scraper microservice; requires `LINKEDIN_LI_AT` cookie
  - **GitLab** — public REST API (no OAuth); fetches up to 30 repos, extracts skills via AI, computes proofScore from evidence count + repo complexity + recency. Surfaced in Settings → Connections tab.
  - **Twitter/X** — bio + 20 recent tweets → AI skill extraction; scaffolded at `/api/profile/sync/twitter`; blocked on `TWITTER_BEARER_TOKEN` env var.

**Score history** is stored per skill (`scoreHistory: { score, source, at }[]`) — every sync and every session appends to this log, forming the raw data for sparklines.

**Score confidence bands** — `getConfidenceBand(scoreHistory)` in `lib/scoring.ts` computes a ±σ interval from score history standard deviation. Displayed in the UI: the dashboard `SkillLegendRow` shows the score with `±σ` below it in small monospace when the candidate has ≥3 sessions with non-zero sigma; the public profile `/p/[username]` skill rows do the same. A candidate with sessions clustered at 82–85 shows `82 ± 2`; one with erratic 60–90 swings shows `75 ± 15`.

Each skill has evidence lines stored and displayed everywhere a score appears. The evidence count ("8 sources") is shown alongside every score on the public profile, the dashboard, and recruiter cards.

**Cohort ranking** — the candidate's average proof score is compared against all verified candidates and expressed as a percentile ("Top 10%"). Recalculates on every profile sync and immediately after every completed interview session.

---

### 4. Public Profile, Shareable Badges, Proof Pages, and Embeds

Every candidate has a public profile at `/p/[username]`. The default layout shows:

- **Header:** avatar, name, bio, and Verified/Vouched badges on the left. The candidate's **"Top X%"** cohort rank in large monospace type on the right.
- **Ranked skill list:** all verified skills sorted by score, each row showing a thin progress bar, a monospace score with ±σ confidence band, and an evidence source count.
- GitHub projects, experience, education, and a recruiter contact CTA below the fold.

Two visual themes — **Minimal** and **Terminal** — selectable via `?theme=` param or Settings.

**Rank card OG image** — `GET /api/rank-card/[username]` returns a 1200×630 image: dark background, "Top X%" at ~150px in monospace, top skill name and score below it. Automatically used as the `og:image` for every `/p/[username]` URL.

**Share buttons** — `RankCardShare` component: Share on X (pre-filled tweet), Share on LinkedIn, and copy link.

**Proof pages** at `/proof/[username]/[skill]` — detailed evidence behind one score.

**Skill badge** — 400×80 edge-rendered image at `/api/badge/[username]/[skill]`. Embed in LinkedIn, GitHub READMEs, resumes.

**Summary badge** — 600×80 edge-rendered image at `/api/badge/[username]/summary` — top 3 skills side-by-side with color-coded scores.

**README snippet generator** — Settings → Connections tab: live badge preview + markdown snippet + GitHub Actions YAML that auto-refreshes the badge weekly.

**Embeds** — each proof skill has an iframe embed URL at `/embed/[username]/[skill]`. Returns raw HTML with an inline SVG score ring, `X-Frame-Options: ALLOWALL`, `frame-ancestors: *`.

---

### 5. Verified badge + Vouched badge

Candidates with a GitHub connection and at least one assessed skill show a **Verified** badge on their public profile.

Candidates who have referred 3+ others who each completed a proof session earn a **Vouched** badge — a second badge shown alongside Verified on `/p/[username]`.

---

### 6. Candidate Onboarding Flow

New candidates who sign in with GitHub land on the dashboard. If `profile.onboardingComplete !== true`, a full-screen overlay modal appears — **OnboardingModal** — walking through three steps:

1. **Step 0 — GitHub connected:** confirms the connection, shows the top repo with its language chip. CTA: "See what we found →" or "Skip for now".
2. **Step 1 — First interview:** proposes a format derived from the top repo language (`coding` if a language was detected, `project_deepdive` otherwise). One button starts the session and routes to the interview page.
3. **Step 2 — Proof scores ready:** shown when the candidate returns to the dashboard after completing that first session. Displays top 4 skills with color-coded bars and scores. CTA: "View your profile →" marks onboarding complete and navigates to the public profile.

Progress is tracked via `Profile.onboardingStep` and `Profile.onboardingComplete`. Two API routes: `POST /api/onboarding/step` (update step) and `POST /api/onboarding/skip` (mark complete + step=99).

---

### 7. Atlas — The Candidate's AI Agent

Atlas is not a chatbot. It is an AI that works for the candidate 24/7 on their behalf.

**Atlas speaks first.** When a candidate opens the agent page, Atlas has already analyzed their profile and leads with the most important insight.

**Conversational coach.** Full chat interface wired to Groq. Atlas has complete context on skill scores, pending opportunities, comp preferences, and discoverability setting.

**Preferences enforcement.** Candidates set comp floor, locations, stages, dealbreakers, and discoverability (`open`, `passive`, `invisible`). Invisible candidates are never surfaced.

**Two-column layout.** Left column (42%) contains the Atlas chat and opportunities inbox. Right column (58%) contains skill rings and tabbed secondary tools.

**Skill rings and sparklines.** Top row shows top skills as circular progress rings with live proofScores and Recharts sparklines.

**Tabbed right panel.** Four tabs: **Skill path**, **Market**, **Learning**, **Negotiate**.

- **Skill path tab** — SkillUnlockPath + **MemoryInsights** widget. MemoryInsights polls `/api/me/memory` and displays recurring weak areas identified across past sessions (severity-coded, seen Nx count). Gives the candidate a concrete weakness list grounded in actual interview performance.

- **Market** — market intelligence feed (demand scores per skill, week-over-week delta).

- **Learning** — phased learning plan per skill (current → target level, estimated weeks, per-phase resources).

- **Negotiate** — offer analysis and counter-offer coaching with talking points from verified proof scores.

**Weekly career brief.** Every Monday at 08:00 UTC, personalized email from Atlas.

---

### 8. Cross-Session Memory Engine

The platform now tracks **recurring weaknesses across sessions** and uses them to sharpen every subsequent interview.

**How it works:**

1. When a session completes, `extractWeaknessSignals(sessionId, gaps[])` runs fire-and-forget. It calls the LLM to parse the session's gap list into structured signals: `{ skill, topic, severity: 1|2|3 }`. Saved to `insightReport.weaknessSignals[]` on the session document.

2. When a new session is started, `getCandidateMemory(userId)` aggregates signals from the last 5 completed sessions. Signals that appear in 2+ sessions OR have severity 3 are surfaced as "recurring weaknesses". The result is a formatted string injected into the opening interview prompt and stored as `session.memoryContext`.

3. Every subsequent AI response in that session also sees the memory via `contextualSystem` in the respond route — the AI knows which topics to probe harder.

4. The **MemoryInsights** component in the Atlas skills tab shows the candidate their own weakness map: topic, skill category, severity label (Minor / Recurring / Critical), and session count. This is the candidate-facing surface of the memory layer.

**Why it matters:** the AI doesn't start from zero each session. It treats each interview as a chapter in a continuing story, drilling harder on the candidate's known weak spots.

---

### 9. Company-Mode Simulation

Candidates can paste a job description before starting any interview session. The platform mirrors that company's interview style for the entire session.

**How it works:**

- A **CompanyModeToggle** component sits in the dashboard's "Start a session" section — a collapsible card with a JD textarea. Active when paste length > 20 characters.
- On session start, if a JD is present, `analyzeCompanyStyle(jd)` calls the LLM to extract: inferred company name, and a 2–3 sentence interview style description (technical depth, focus areas from the JD, culture signals).
- The style string is stored as `session.companyMode.style` and injected into both the opening prompt and every subsequent `contextualSystem` in the respond route under a `[COMPANY MODE]` marker.
- The AI conducts the entire interview as if it were that company — matching their stated technical depth, focusing on the skills they care about, and reflecting their culture signals.

---

### 10. Peer Interview Mode

Candidates can practice interviewing each other — one takes the **interviewer** role, one takes the **candidate** role. An AI moderator observes and drops coaching tips.

**Flow:**

1. Candidate goes to `/peer/find` — selects format (coding / design / behavioural), skill focus, and preferred role.
2. The queue API (`POST /api/peer/queue`) tries to match with an existing waiting session for the same skill + format. If matched, both enter the session immediately. If not, a new session is created in `waiting` status and the client polls every 5 seconds.
3. On match, the AI moderator drops a welcome message via Groq (both names, format, instructions).
4. Both participants chat on `/peer/[sessionId]` — a two-role interface showing AI moderator messages in a distinct purple style. Polling every 3 seconds.
5. Every 6 human messages, the AI moderator optionally drops a single-sentence coaching tip for either participant (silently skipped if things are going well).
6. Either participant can end the session. The interviewer can score the candidate (0–100 slider). On end, the AI generates a 3-sentence summary: what the candidate demonstrated, one area to improve, one tip for the interviewer.

**Model:** `PeerSession` — skill, format, status (`waiting / active / completed / abandoned`), participants with roles, messages with sender role, AI summary, interviewer score.

---

### 11. Team Skill Graph

Candidates can create teams — small groups (up to 20 members) who share their skill snapshots to visualize collective coverage and gaps.

**Flow:**

1. Create a team (name it) — generates an 8-character nanoid invite code.
2. Share invite link: `/team/join/[code]`. Joining fetches the user's current top 8 skill scores and adds them to the team's member list.
3. On the team page `/teams/[id]`: member list with skill chips, invite code with copy + regenerate buttons.
4. Click "Generate skill graph" → calls `/api/teams/[id]/analysis` which:
   - Aggregates proof scores across all members for 10 canonical skills.
   - Computes team average and max-member score per skill.
   - Identifies **strengths** (top 3 by team avg) and **gaps** (avg < 50 or coverage < half the team).
   - Calls Groq to write a 2–3 sentence hire recommendation specific to the gaps.
5. Result renders as a Recharts **RadarChart** with two overlapping polygons (team avg + best member), plus strengths/gaps columns and the AI hire recommendation.

**Why it matters for investor narrative:** teams evaluate themselves before hiring. Intervue becomes the tool engineering managers use to understand their own gap before opening a JD.

---

### 12. Year-in-Review Wrapped Card

Every candidate has a `/wrapped/[year]` page — a shareable summary of their year in technical interviews.

**Data aggregated:**
- Total sessions completed
- Average score across all sessions
- Top skill (most practiced)
- Favourite format
- Best single session (score + skill)
- Peak proof score across all current skills
- Longest daily streak
- Monthly activity bar chart (sessions per month)

**UI:**
- Stat cards for sessions, avg score, best streak
- Detail cards for top skill, favourite format, best session, peak proof score
- Animated monthly bar chart
- Share buttons: post on X (pre-filled tweet), save OG image (PNG download), copy link

**OG image** — edge-rendered 1200×630 at `/api/wrapped/[year]/image?name=...&sessions=...&avg=...&skill=...&streak=...`. Dark gradient background, large monospace stats, suitable for social sharing.

**Dashboard CTA** — a wrapped card appears on the dashboard when the candidate has ≥3 completed sessions. In December it links to the current year; otherwise it links to the previous year.

---

### 13. The Two-Agent Matching System — The Core Differentiator

The problem with recruiting is spam. Our answer: **Atlas (candidate-side) and Scout (recruiter-side) negotiate fit before either human is contacted**.

**End-to-end flow:**

1. Recruiter pastes a job description. Scout structures it into a typed spec: must-have skills with minimum proof scores, nice-to-have skills, comp range (₹ LPA), locations, company stage, domain, team context, dealbreakers.

2. Recruiter clicks "Source". Scout pre-filters the verified pool by skill presence, sorted by cohort percentile.

3. **Handshake Protocol** runs per candidate:
   - Scout sends a fit inquiry to Atlas.
   - Atlas evaluates against **deterministic hard gates**: tech bar (every must-have skill at or above minimum proofScore), comp overlap, location, stage, dealbreakers.
   - The LLM writes human-facing reasoning and answers specific recruiter "asks" — strictly from verified evidence. It cannot invent skills.
   - `mutualFit = false` → status `declined_by_atlas`. Neither human is bothered.
   - `mutualFit = true` → Atlas generates a warm surfacing message. Candidate receives an **in-app notification** (`handshake_surfaced`) and sees it on their agent page.

4. Candidate sees the skill-check sequence animated on their agent page: "Checking React 84 ≥ 80 → Cleared", "Checking Docker 55 ≥ 60 → Below bar".

5. **Evidence snapshots** captured at evaluation time — immutable audit trail.

6. Full agent transcript visible to recruiter on the role detail page.

**Why this matters:** the hard gates are deterministic code. The LLM sits on top of a trust layer it cannot subvert.

---

### 14. In-App Notification Centre

Candidates have a **bell icon** in the sidebar header showing an unread count badge. Clicking it opens a dropdown with the last 30 notifications, newest first.

Notification types: `interview_complete`, `score_milestone`, `leaderboard_entry`, `certificate_issued`, `handshake_surfaced`, `weekly_brief`, `recruiter_viewed`. Each entry shows a type emoji, title, body (truncated), and relative timestamp ("3m ago").

**API:**
- `GET /api/notifications/inbox` — last 30 notifications + unread count
- `PATCH /api/notifications/inbox` — mark all as read (called automatically on open)
- `PATCH /api/notifications/read/[id]` — mark single notification as read

**Where notifications are created:**
- Interview complete (`interview_complete`) — immediately after session finishes
- Certificate issued (`certificate_issued`) — when a milestone is crossed
- Leaderboard entry (`leaderboard_entry`) — when the Monday cron fires
- Handshake surfaced (`handshake_surfaced`) — when `mutualFit = true` in the Handshake Protocol. Company name included; hidden if role has blind mode enabled.
- Recruiter viewed (`recruiter_viewed`) — when a recruiter calls the reveal endpoint on a candidate's profile. Deduplicated: only one notification per candidate per 24-hour window regardless of how many recruiters view.

**Model:** `Notification` — userId, type, title, body, link, read, createdAt. Auto-expires after 90 days via MongoDB TTL index.

---

### 15. Scout — Autonomous Sourcing

Scout runs continuously without recruiter intervention.

When a candidate's skill scores are updated (after any interview session or profile sync), a BullMQ job fires automatically on the `autonomous-sourcing` queue. The worker:

1. Fetches the updated candidate's profile.
2. Finds all active RoleSpecs that have `autoSourceEnabled: true` and whose must-have skills overlap with the updated skills.
3. Skips roles already handshaked with this candidate.
4. Runs the full Handshake Protocol for each new (role, candidate) pair.
5. If `mutualFit = true`: creates the Handshake doc and sends the recruiter an email notification.
6. Capped at 20 roles per job run to avoid Groq rate limits. Concurrency: 3 workers.

---

### 16. Referral System

Every candidate has a unique 8-character referral code. The code is generated idempotently on first GitHub OAuth.

Sharing the link (`/onboarding?ref=CODE`) stores the code in localStorage. After OAuth, the code is claimed via `POST /api/referral`.

Referral dashboard at `/settings/referrals`: referral link with copy button, stats grid (total referred / completed), progress bars per referral, and vouched status card.

**Milestone:** when a referred candidate completes their 3rd interview session, the referrer's `vouchedCount` increments. At `vouchedCount ≥ 3` the referrer receives the Vouched badge.

---

### 17. Skill Milestone Certificates

When a candidate's proof score crosses a milestone threshold (50 → Intermediate, 70 → Proficient, 85 → Expert), a certificate is automatically issued:

- Stored in the Certificate model with a unique 32-character token.
- Public page at `/certificate/[token]` with skill name, milestone label, score at issuance, supporting evidence, and issue date.
- LinkedIn share button + copy link button.
- 1200×630 edge-rendered OG image at `/api/certificate/[token]` — certificate-style design, color-coded by milestone level.
- Candidate receives a Resend email notification immediately on issuance.
- Candidate also receives an **in-app notification** (`certificate_issued`) via the notification centre.
- One certificate per (user, skill, milestone) — duplicates are silently skipped.

---

### 18. Recruiter Product

**Auth:** separate email + password (bcryptjs) — GitHub OAuth is for candidates only.

**Onboarding:** captures company name, size, and initial roles.

**Dashboard:** pipeline stats, top matches, recent activity, natural language search.

**Roles page:** create, view, and manage open roles. Each role shows all Handshake results with verdict chips and the full agent dialogue.

**Role fit forecast:** before sourcing, recruiters can click "Check pool →" to get a live forecast: total verified candidates, how many pass all gates, per-skill gate analysis, breakdown by location, identified bottleneck skill.

**Blind screening mode:** candidate names, usernames, avatars, and GitHub handles replaced with deterministic anonymous labels. Recruiter evaluates proof scores before identity is revealed. Reveal endpoint rate-limited, logged to BadgeEvent, and triggers `recruiter_viewed` in-app notification to the candidate (once per 24h).

**Talent pool watchlist:** recruiters can add candidates to a watchlist per role with per-skill score alerts and status change alerts.

**Interview question generator:** identifies gap skills and strength skills, produces three sets of questions: probing gap questions, verification questions for strengths, behavioral questions. Generated by Groq, specific to the (candidate, role) pair.

**Hiring velocity dashboard** at `/recruiter/analytics`:
- KPI cards: surfaced, applied, interviewed, offered (last 12 weeks).
- Average time-to-offer in days.
- Recharts line chart: weekly surfaced vs. applied pipeline.
- Horizontal bar chart: top 10 skill gaps.
- Day × hour activity heatmap.

**Candidate search:** filter by skill name, minimum proof score, target role, location, vouchedOnly. Returns profiles ranked by cohort percentile.

**Kanban pipeline:** Applications move between New Inquiry → Screening → Interview → Offer → Closed.

**ATS API:** `GET /api/ats/candidates/search` authenticated by `x-api-key`.

**Email notifications** via Resend: new messages, scheduled interviews, watchlist alerts, autonomous sourcing matches.

**Interview scheduling** with `.ics` calendar file generation.

---

### 19. Leaderboard Notifications

Every Monday at 09:00 UTC, the cron at `/api/cron/leaderboard-notify` checks:

- **Global skill leaderboards** — top 20 for each of 9 tracked skills (Go, TypeScript, Python, Rust, React, Node.js, Kubernetes, Java, System Design).
- **Skill × city leaderboards** — top 10 per skill × city combo across 6 cities (Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Pune).

For each candidate appearing in a board for the first time that week: Resend email + in-app notification. Deduplication via `LeaderboardAlert` (unique on userId + skill + city + weekOf).

---

### 20. Leaderboard

Public leaderboard at `/leaderboard` — no login required.

Two filter axes: **Skill** and **City**. URL: `/leaderboard?skill=Go&city=Bangalore` — fully shareable, search-engine indexed. `generateMetadata` produces skill+city-specific titles for every combination.

Top 3 as a podium with gold/silver/bronze styling. Remaining rows in a table: rank icon, avatar, name + vouched badge, location, score in monospace, cohort percentile badge.

---

### 21. Atlas Market Intelligence Feed (Daily Cron)

A daily cron at 02:00 UTC aggregates skill demand across the platform: active role counts per skill, verified candidates, average proof scores, demand score (0–100), week-over-week delta. Stores results in the MarketFeed collection with 48-hour TTL.

Visible to candidates on the Atlas agent page as a horizontal scroll strip of skill cards.

---

### 22. Weekly Brief Cron

Every Monday at 08:00 UTC, the cron at `/api/cron/weekly-brief` batches up to 50 candidates with `emailBriefEnabled: true`, generates a personalized 3-paragraph brief via Groq, and sends it via Resend. Deduplication via the WeeklyBrief model (unique on userId + weekOf).

---

### 23. Open Proof API v1

Public read-only endpoint at `/api/v1/proof/:username/:skill`. No API key required.

Returns: `proofScore`, `label`, `color` (hex), `evidence[]` (top 5 citations), `scoreHistory[]` (last 10 entries), `lastUpdated`, `proofUrl`.

Rate limited to 100 requests per IP per hour via Upstash Redis sliding-window sorted set. Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` headers. CORS: `*`. Invisible candidates return 404.

Documentation page at `/docs`.

---

### 24. Resume Studio

Candidates generate tailored resumes from a single page:

1. Enter job title + optional JD paste.
2. AI reads verified skill scores, GitHub projects, work experience, education, and bio → produces ATS-optimized resume in ~5 seconds.
3. **JD match score** — when a JD is provided, the AI returns an integer 0–100 match score and a 1–2 sentence analysis of key matches and gaps. Displayed as a progress bar and notes between the generator and preview.
4. Auto-saved to library with timestamp.
5. Copy ATS plain text (one click).
6. **Download PDF** (one click) — formatted A4 PDF generated client-side from `@react-pdf/renderer`. Lazy-loaded so it doesn't add to initial bundle.
7. Library panel: all saved resumes with delete.

Generator only uses verified profile data — cannot hallucinate skills.

---

### 25. Score Decay Signal

`getDecaySignal(lastUpdated)` in `lib/scoring.ts` returns `{ level: 'fresh'|'ageing'|'stale', daysIdle, label }`. A skill last updated within 30 days is `fresh` (no indicator). Between 30–60 days it is `ageing` (orange `Nd idle` chip in the dashboard skill row). Over 60 days it is `stale` (red chip + `practice to refresh` hint). This is an honest signal — scores are not reduced, only flagged.

---

### 26. Admin Growth Dashboard

`/admin` — visible only to emails listed in the `ADMIN_EMAILS` env var. Fetches from `GET /api/admin/stats`.

Surfaces: total users, new users last 30 days, sessions in last 7 days, completion rate %, company-mode session count, team count, weekly briefs sent, top 8 practised skills (horizontal bar chart), 7-day daily session histogram (BarChart with gradient cells), and two flywheel health meters (session completion rate, company-mode adoption %).

---

### 27. /companies Discovery Page

`/companies` — public, server-rendered (SSR), fully SEO-indexed. Aggregates real usage data: companies practised for via company-mode, sorted by session count. Falls back to a seed list of 8 well-known companies if fewer than 5 real entries exist. Each card shows company name, session count, avg score, and a snippet of the inferred interview style.

Nav link added to the landing page. Footer link added. Links back to "Start a company-mode interview" CTA.

---

### 28. Weekly Brief Archive

`/briefs` — candidates can view all past Atlas weekly briefs. The list view (`GET /api/me/briefs`) shows up to 52 weeks of brief subjects and dates. Clicking a brief expands it inline and fetches the full HTML body from `GET /api/me/briefs/[id]`. A link to the archive is surfaced in the Atlas agent page skills tab below MemoryInsights.

---

### 29. Settings — Password Change

Credential-auth candidates (email+password) can change their password from Settings → Privacy → Password section. Requires current password verification via bcrypt before accepting the new one. GitHub OAuth candidates see an informational message instead. Implemented at `POST /api/auth/change-password`.

---

## Data Models

| Model | Purpose |
|---|---|
| User | Auth, preferences, discoverability, streak, subscription, referral fields |
| Profile | parsedSkills with proofScore + scoreHistory, projects, cohortPercentile, vouchedBadge, `onboardingComplete`, `onboardingStep` |
| InterviewSession | format, scores, insightReport (strengths/gaps/idealAnswers/aiVerdict/`weaknessSignals[]`), scoreUpdate, share token, `memoryContext`, `companyMode` |
| PeerSession | Two-participant mock interview: skill, format, status, participants with roles, messages with sender role, AI summary, interviewer score |
| Team | name, ownerId, inviteCode (8-char nanoid), members[] with skill snapshots (up to 8 skills each), max 20 members |
| Application | messages, interview, outcome, pipeline status |
| RoleSpec | mustHave/niceHave skill bars, comp, locations, stage, blind/autoSource flags |
| Handshake | verdict with skillMatches + evidence snapshots, agent exchanges |
| Watchlist | skillAlerts with thresholds, recruiterId + candidateId |
| Certificate | skill, milestone, scoreAtIssuance, evidence, token (32-char), issuedAt |
| WeeklyBrief | userId, weekOf (unique), subject, bodyHtml, sentAt |
| MarketFeed | skill, demandScore, demandDelta, activeRoles, candidateCount — TTL 48h |
| BadgeEvent | serve/visit/signup events — 90-day TTL auto-expiry |
| SavedResume | userId, jobTitle, content (name/headline/skills/experience/projects/education), timestamps |
| LeaderboardAlert | userId, skill, city, rank, weekOf — deduplicates leaderboard notification emails |
| Notification | userId, type, title, body, link, read — in-app notification centre; TTL 90 days |

---

## Infrastructure

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, Framer Motion, Recharts |
| Database | MongoDB Atlas, Mongoose |
| Auth | NextAuth v5, GitHub OAuth (candidates) + bcryptjs Credentials (recruiters + credential candidates) |
| AI | Vercel AI SDK v6, Ollama (dev) / Groq llama-3.3-70b-versatile (prod) |
| Code Execution | Judge0 |
| Background Jobs | BullMQ + ioredis, queues: connection-sync / role-sourcing / autonomous-sourcing |
| Email | Resend |
| Billing | Stripe v22 |
| LinkedIn Parsing | Python/FastAPI + Playwright + linkedin_scraper (separate process) |
| GitLab Parsing | Public GitLab REST API v4 + Groq analysis (no OAuth required); surfaced in Settings → Connections |
| Twitter/X Parsing | Twitter API v2 bearer token + Groq analysis (scaffolded; activate with `TWITTER_BEARER_TOKEN`) |
| Typesense | Scaffolded full-text search client (`lib/typesense.ts`); recruiter search falls back to MongoDB if not configured |
| Video Interviews | LiveKit scaffolded (`/api/interview/room`); activate with `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| Crons | Vercel Crons — weekly brief (Mon 08:00 UTC), leaderboard notify (Mon 09:00 UTC), market feed (daily 02:00 UTC) |
| Rate Limiting | Upstash Redis REST API (sliding window sorted set) |
| Edge Routes | ImageResponse (badges + certificate OG + rank card + receipt + wrapped OG), embed route (raw HTML) |
| Deployment | Vercel (Next.js + edge), separate process for BullMQ worker and Python parser |
| Memory Engine | `lib/memory.ts` — cross-session weakness signal extraction + aggregation; injected into every interview session |

---

## What Is Not Done Yet

- **Mobile app** — web only.
- **Twitter/X parser** — route scaffolded at `/api/profile/sync/twitter`; blocked on `TWITTER_BEARER_TOKEN` env var (requires elevated Twitter Developer access).
- **Typesense full-text search** — scaffolded (`lib/typesense.ts`); recruiter search has fallback to MongoDB. Needs a running Typesense instance (`TYPESENSE_HOST`, `TYPESENSE_API_KEY`) and an initial index sync job to activate.
- **LiveKit video interviews** — room token API scaffolded at `/api/interview/room`; no UI built. Needs `livekit-server-sdk` installed and env vars set.
- **LinkedIn parser** requires a running Python microservice and a valid session cookie — not a zero-setup integration.
- **Peer interview matchmaking latency** — the queue currently has no skill-level matching; two candidates of very different skill levels can be paired. A future version should weight by cohort percentile before matching.
- **Company mode OG card** — company name shown on the report page but not yet on the OG image at `/api/receipt/[sessionId]`.

---

## The Line We Drew

The Handshake Protocol runs fully deterministic hard gates. The LLM cannot override them. A candidate without verified Kubernetes experience will not be surfaced to a role that requires it, regardless of what the model generates. The evidence snapshot captured at evaluation time is immutable — inflating a score after the fact does not rewrite what the agent claimed at match time.

That is the trust layer the entire product is built on.
