# What We Have Built — Intervue

*Internal document for investor conversations. Accurate as of June 2026.*

---

## The One-Line Version

Intervue is a verified technical identity platform with an AI interview engine on the candidate side and an autonomous agent-to-agent matching protocol on the recruiter side. The agents talk to each other before either human is involved.

---

## What Is Shipped and Running

### 0. GitHub Sync

Candidates sync their GitHub profile by clicking "Sync repos" in Settings → Connections. The sync always fetches **live, uncached data** from the GitHub API (`cache: 'no-store'`) — new repos pushed minutes ago are picked up immediately. Up to 50 repositories are scanned (sorted by most recently updated), non-fork repos only. Languages, topics, repo complexity, and star counts feed directly into skill proof scores.

### 1. AI Interview Engine

Candidates can start a technical interview in five formats: **coding, system design, project deep-dive, behavioural, and gap sessions** (targeted skill drills). Every session is personalized — the AI reads the candidate's actual GitHub repos at session start and asks questions grounded in real projects they've pushed.

- Sessions stream responses in real-time (Vercel AI SDK streaming).
- There is a live Monaco code editor inside the interview with support for JavaScript, TypeScript, Python, Go, Java, C++, and Rust.
- Code runs against Judge0 for execution feedback.
- Voice mode is implemented using the browser's SpeechRecognition + SpeechSynthesis APIs (Chrome/Safari). Turn-based, no external voice API dependency.
- Candidates can request Socratic hints — the AI nudges without giving away answers.
- At session end the AI analyzes the full transcript and produces a structured assessment: overall score, four-axis breakdown (technical depth, problem-solving, communication, code quality), strengths, gaps, and study recommendations.
- Session scores feed back into the candidate's skill profile (weighted blend of existing score and new performance). Score history is tracked per skill over time.
- Streak tracking is live: daily practice streaks with freeze tokens to protect them.
- **Completed reports can be shared publicly** via a Pro-gated share link (`/interview/report/shared/[token]`) — a candidate can send a recruiter a direct link to their verified interview performance without them needing an account.

### 2. Verified Skill Profile

Every candidate has a profile that stores **proofScores** (0–100) per skill. These are not self-reported. They are derived from:

- **GitHub repos** — parsed via GitHub API directly. Languages, repo complexity, recency, and commit history feed a scoring formula: `score = evidenceCount × 0.4 + repoComplexity × 0.3 + recencyScore × 0.3`.
- **Resume** — uploaded as PDF, text extracted and parsed by the AI against actual project evidence in the repo history.
- **Interview sessions** — each completed session updates the relevant skill's proofScore.
- **External sources** (active parsers, no OAuth required):
  - DEV.to — articles, tags, reaction counts → technical writing + topic signals
  - Stack Overflow — reputation, top answer tags, answer quality
  - Hacker News — karma, years active → community engagement signal
  - LinkedIn — integrated via a Python/Playwright scraper microservice; requires `LINKEDIN_LI_AT` cookie and the microservice running

The `/connections` page lets candidates register handles on each source. A sync button kicks off parsing and merges signals into the skill graph. This can run synchronously or be queued via BullMQ if Redis is configured.

**Score history** is stored per skill over time (`scoreHistory: { score, source, at }[]`). Every sync and every interview session appends to this log — forming the raw data for sparklines and trend analysis.

Each skill has evidence lines (human-readable citations like "Wrote 4 DEV.to articles on TypeScript — 210 reactions") that are stored and shown on the public profile and used by the agents.

**Cohort ranking** is calculated across all verified candidates and shown on the dashboard as "Top X%" — for example, "Top 10%" means the candidate's average proof score beats 90% of the cohort. It recalculates on every profile sync and surfaces on the leaderboard (top 50 by percentile, public).

### 3. Public Profile, Shareable Badges, and Proof Pages

Every candidate has a public profile at `/p/[username]` with their bio, skill constellation visualization, scored skills with evidence citations, projects from GitHub, and experience/education from the resume. The profile supports four visual themes (Minimal, Terminal, Magazine, Bento) fully customizable from the settings page.

Each skill has a **proof page** at `/proof/[username]/[skill]` showing the detailed evidence behind one score — the specific repos, articles, and interviews that produced it. This page has correct OpenGraph tags so that LinkedIn and Twitter unfurl it with the badge image as the preview.

Each skill also has a **shareable badge** — a 400×80 image generated at the edge (`/api/badge/[username]/[skill]`) showing the candidate name, skill name, and live proof score. These are designed to be embedded in LinkedIn, GitHub README, or resumes. The markdown snippet is `[![Skill 84](badgeUrl)](proofUrl)` — clicking the badge in a README lands on the proof page, not just an image.

### 4. Atlas — The Candidate's AI Agent

Atlas is not a chatbot. It is an AI that works for the candidate 24/7 on their behalf.

**Atlas speaks first.** When a candidate opens their agent page, Atlas has already analyzed their profile and leads with the most important insight: which skill is blocking a live recruiter match, or which score has decayed most. The candidate doesn't have to ask.

**Atlas as a conversational coach.** The agent page has a full chat interface wired to Groq (`llama-3.3-70b-versatile`). Atlas has complete context on the candidate's skill scores, pending opportunities, comp preferences, and discoverability setting. Candidates can ask anything: "Why did this role not match me?", "Which skill should I practice this week?", "What's a good score for a senior role?". The proactive insight is injected as Atlas's first message — the conversation starts from a position of knowledge, not a blank prompt.

**Atlas enforces preferences.** Candidates set their own preferences (comp floor, locations, stages, dealbreakers) and their discoverability (`open`, `passive`, `invisible`). Invisible candidates are never surfaced — not even to their own agent. This gives the candidate genuine control, which is the consent layer that makes the system trustworthy.

**Skill rings and sparklines.** The left panel of the agent page shows the candidate's top skills as circular progress rings with live proofScores. Below each ring is a recharts sparkline drawn from the score history — a candidate can see at a glance whether their React score is trending up or flat.

### 5. The Two-Agent Matching System — The Core Differentiator

This is the product bet. The problem with recruiting is spam: recruiters blast inMails; candidates ignore them. Both sides waste time on conversations that were never going to work.

Our answer is that **two AI agents — Atlas (candidate-side) and Scout (recruiter-side) — negotiate fit before either human is contacted**.

**How it works end-to-end:**

1. A recruiter creates a role by pasting a job description. Scout structures it into a typed spec: must-have skills with minimum proof scores, nice-to-have skills, compensation range (₹ LPA), acceptable locations, company stage, domain, team context, and dealbreakers.

2. The recruiter clicks "Source" on a role. Scout pre-filters the verified candidate pool by skill presence in MongoDB, sorted by cohort percentile.

3. For each candidate in the pool, the **Handshake Protocol** runs:
   - Scout sends a fit inquiry to Atlas.
   - Atlas evaluates the role against the candidate's verified evidence using **deterministic hard gates**:
     - Tech bar: does every must-have skill have a proofScore ≥ the required minimum?
     - Comp overlap: does the role's max pay meet the candidate's floor?
     - Location: is there geographic overlap?
     - Stage: is the company stage in the candidate's acceptable list?
     - Dealbreakers: does the role description contain any of the candidate's listed dealbreakers?
   - The LLM only writes the human-facing reasoning and answers specific recruiter "asks" (e.g. "does this person have production Kubernetes experience?") — strictly from verified evidence. It cannot invent skills.
   - If `mutualFit = false`: Handshake status is set to `declined_by_atlas`. Neither human is ever bothered.
   - If `mutualFit = true`: Atlas generates a warm surfacing message and the candidate sees it on their agent page.

4. The candidate sees only genuine matches, with an explanation of why their agent surfaced this one. They can accept or decline. Accepting opens an Application thread and notifies the recruiter.

5. **Evidence snapshots** are captured at evaluation time: every agent exchange that cites a skill stores the candidate's actual proofScore at that moment (`evidenceSnapshot: { skillName, proofScore, snapshotAt }[]`). The verdict also records per-skill match results (`skillMatches: { skill, required, candidateScore, cleared }[]`). This means the audit trail is immutable — a score inflated after the fact doesn't retroactively change what was claimed.

6. **The in-progress reveal** is visible to the candidate. When they expand a surfaced opportunity, they see an animated skill-check sequence: "Checking React 84 ≥ 80 → Cleared", "Checking Docker 55 ≥ 60 → Below bar". This makes the agent's logic transparent and earns trust.

7. The full agent transcript (every exchange between Scout and Atlas) is stored and visible to the recruiter on the role detail page — complete auditability.

**Why this matters:** The hard gates are deterministic code, not LLM guesses. An agent cannot hallucinate that a candidate has Kubernetes experience if their proofScore for that skill doesn't meet the bar. The LLM sits on top of a trust layer it cannot subvert.

### 6. Recruiter Product

- Separate auth (email + password, bcryptjs) — GitHub OAuth is only for candidates.
- Recruiter onboarding captures company name, size, and open roles.
- Recruiter dashboard: pipeline stats, top matches, recent activity, natural language search bar.
- **Roles** page: create, view, and manage open roles. Each role shows all Handshake results with verdict chips (tech bar cleared, comp overlap, location match, etc.) and the full agent dialogue.
- **Candidate cards** show: avatar, open-to-work status dot, last active timestamp, location, and skill chips that link directly to `/proof/[username]/[skill]` — a recruiter can click a skill chip and land on the proof page for that specific claim in one click.
- **Candidate search**: filter the verified pool by skill name, minimum proof score, location. Returns profiles ranked by cohort percentile.
- **Kanban pipeline**: Applications move between New Inquiry → Screening → Interview → Offer → Closed with drag-and-drop. Each card links to the conversation thread.
- **ATS API**: `GET /api/ats/candidates/search?skill=X&minScore=70&location=Y` authenticated by `x-api-key`. Returns paginated candidates with top skills and proof scores. Enterprise ATS systems can integrate without touching the UI.
- Email notifications via Resend for new messages and scheduled interviews.
- Interview scheduling with `.ics` calendar file generation.
- Password reset flow for recruiter accounts.

### 7. Application Threading

When a Handshake converts (candidate accepts), an Application record is created. Candidates and recruiters can exchange messages in a dedicated thread at `/messages/[id]`. The recruiter can update the application status, record an outcome (hired / rejected / withdrawn), and schedule interviews.

### 8. Billing — Pro Tier

Intervue has a paid Pro tier at **₹399/month** via Stripe (UPI, cards, net banking supported).

Free tier includes: unlimited AI interview sessions, GitHub profile analysis, public profile + badges + proof pages, Atlas agent access.

Pro tier adds:
- **Additional data sources** — LinkedIn, Stack Overflow, DEV.to connections (GitHub is always free — protecting the growth flywheel)
- **Score history sparklines** on the dashboard and agent panel
- **Score-change email alerts** — when a connection sync changes a skill score, Pro users receive a formatted email showing before/after/delta for each changed skill
- **Public report share links** — shareable interview reports accessible without auth
- **Priority ranking** in recruiter search results

The webhook handler processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed` events. Subscription state (tier, status, period end) is stored on the User document.

### 9. Resume Studio (Multi-Resume Library)

Candidates can generate unlimited tailored resumes from a single page. The flow:

1. **Enter a job title** (e.g. "Senior Backend Engineer", "SDE-2 at Stripe") — optionally paste the full JD for even tighter tailoring.
2. **Generate** — the AI reads the candidate's verified Intervue skill scores, GitHub projects (with tech stacks and descriptions), work experience, education, and bio, then produces a complete ATS-optimized resume in ~5 seconds.
3. **Auto-saved** — every generated resume is saved to the candidate's library with the job title as the name.
4. **Library panel** — all saved resumes appear in the left panel with timestamps. Click any to load it back into the preview. Delete versions you no longer need.
5. **Copy ATS text** — one click copies a clean plain-text version ready to paste into any ATS. PDF export is in roadmap.

The resume generator only uses information from the candidate's actual verified profile — it cannot hallucinate work history or skills that aren't there.

### 10. Infrastructure

- **Next.js 16 App Router** — server components, streaming, edge routes.
- **MongoDB Atlas + Mongoose** — main data store. Models: User, Profile, InterviewSession, Application, RoleSpec, Handshake, BadgeEvent.
- **Auth**: NextAuth v5 beta with two providers: GitHub OAuth (candidates) + Credentials/bcryptjs (recruiters). Edge-safe split config for middleware.
- **AI provider**: Ollama locally (llama3.2, no API cost in dev) with automatic Groq fallback (`llama-3.3-70b-versatile`) when Ollama is unreachable. All AI routes use `getModel()` — switching providers is one env var.
- **BullMQ + ioredis**: background worker process for slow jobs (LinkedIn scraping, large sourcing runs). Graceful degradation — the app runs fully without Redis; jobs just run inline.
- **Python microservice** (`python-parser/`): FastAPI service with a `joeyism/linkedin_scraper` + Playwright integration for LinkedIn parsing. Separate process; Node calls it via HTTP.
- **Judge0**: code execution in interviews (self-hosted or cloud endpoint).
- **Resend**: transactional email. Currently sends: new message notifications, interview schedule confirmations, password reset links, score-change alerts (Pro).
- **Stripe v22**: subscription billing. Webhook-driven state machine for subscription lifecycle.
- **BadgeEvent model** with 90-day TTL index: badge serves, proof page visits, and signup referrers are logged for funnel analytics without permanent storage.

---

## What Is Not Done Yet

Telling you what isn't built is as important as what is.

- **Resume PDF export** is not yet implemented — candidates can copy ATS plain text but not download a formatted PDF.
- **No mobile app.** Web only.
- **Twitter/X and GitLab** source parsers are scaffolded but blocked on OAuth app credentials — not implemented.
- **Typesense** full-text search is in the plan but deferred; current search is MongoDB regex.
- **LiveKit / video interviews** are in the plan but not started.
- **BullMQ sourcing is capped at ~12 candidates per run** synchronously. At scale this needs the worker process running with Redis — the infrastructure is built but not deployed to production yet.
- **Score confidence bands** (showing uncertainty alongside a proof score) are not implemented — scores are presented as point estimates.
- **cohortPercentile** recalculates on profile generation but not after every session — leaderboard ranking can lag by one sync cycle.
- **No recruiter analytics dashboard** beyond the basic stats strip.

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4, Framer Motion, Recharts |
| Database | MongoDB Atlas, Mongoose |
| Auth | NextAuth v5, GitHub OAuth + bcryptjs Credentials |
| AI | Vercel AI SDK v6, Ollama (dev) / Groq llama-3.3-70b (prod fallback) |
| Code Execution | Judge0 |
| Background Jobs | BullMQ + ioredis (Upstash Redis) |
| Email | Resend |
| Billing | Stripe v22 |
| LinkedIn Parsing | Python/FastAPI + Playwright + linkedin_scraper |
| Deployment | Vercel (Next.js), separate process for worker and Python parser |

---

## The Number That Matters

The Handshake Protocol runs fully deterministic hard gates. The LLM cannot override them. A candidate without verified Kubernetes experience will not be surfaced to a role that requires it, regardless of what the LLM generates. And the evidence snapshot captured at evaluation time means the audit trail is immutable — inflating a score after the fact doesn't rewrite what the agent claimed.

That is the line we drew and the code enforces it.
