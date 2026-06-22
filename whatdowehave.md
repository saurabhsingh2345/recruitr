# What We Have Built — Intervue

*Internal document for investor conversations. Accurate as of June 2026.*

---

## The One-Line Version

Intervue is a verified technical identity platform with an AI interview engine on the candidate side and an autonomous agent-to-agent matching protocol on the recruiter side. The agents talk to each other before either human is involved.

---

## What Is Shipped and Running

### 1. AI Interview Engine

Candidates can start a technical interview in five formats: **coding, system design, project deep-dive, behavioural, and gap sessions** (targeted skill drills). Every session is personalized — the AI reads the candidate's actual GitHub repos at session start and asks questions grounded in real projects they've pushed.

- Sessions stream responses in real-time (Vercel AI SDK streaming).
- There is a live Monaco code editor inside the interview with support for JavaScript, TypeScript, Python, Go, Java, C++, and Rust.
- Code runs against Judge0 for execution feedback.
- Voice mode is implemented using the browser's SpeechRecognition + SpeechSynthesis APIs (Chrome/Safari). Turn-based, no external voice API dependency.
- Candidates can request Socratic hints — the AI nudges without giving away answers.
- At session end the AI analyzes the full transcript and produces a structured assessment: overall score, four-axis breakdown (technical depth, problem-solving, communication, code quality), strengths, gaps, and study recommendations.
- Session scores feed back into the candidate's skill profile (weighted blend of existing score and new performance).
- Streak tracking is live: daily practice streaks with freeze tokens to protect them.

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

Each skill has evidence lines (human-readable citations like "Wrote 4 DEV.to articles on TypeScript — 210 reactions") that are stored and shown on the public profile and used by the agents.

**Cohort percentile** is calculated across all candidates and surfaces on the leaderboard (top 50 by percentile, public).

### 3. Public Profile and Shareable Badges

Every candidate has a public profile at `/p/[username]` with their bio, skill constellation visualization, scored skills with evidence citations, projects from GitHub, and experience/education from the resume.

Each skill has a **shareable OG image badge** — a 400×80 image generated at the edge (`/api/badge/[username]/[skill]`) showing the candidate name, skill name, and live proof score. These are designed to be embedded in LinkedIn, GitHub README, or resumes.

### 4. The Two-Agent Matching System — The Core Differentiator

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
   - If `mutualFit = true`: Atlas generates a warm surfacing message and the candidate sees it on their `/agent` page.

4. The candidate sees only genuine matches on their Atlas page, with an explanation of why their agent surfaced this one. They can accept or decline. Accepting opens an Application thread and notifies the recruiter.

5. The full agent transcript (every exchange between Scout and Atlas) is stored and visible to the recruiter on the role detail page — complete auditability.

**Why this matters:** The hard gates are deterministic code, not LLM guesses. An agent cannot hallucinate that a candidate has Kubernetes experience if their proofScore for that skill doesn't meet the bar. The LLM sits on top of a trust layer it cannot subvert.

Candidates set their own preferences (comp floor, locations, stages, dealbreakers) and their **discoverability** (`open`, `passive`, `invisible`). Invisible candidates are never surfaced — not even to their own agent. This gives the candidate genuine control, which is the consent layer that makes the system trustworthy.

### 5. Recruiter Product

- Separate auth (email + password, bcryptjs) — GitHub OAuth is only for candidates.
- Recruiter onboarding captures company name, size, and open roles.
- Recruiter dashboard: pipeline stats, top matches, recent activity, natural language search bar.
- **Roles** page: create, view, and manage open roles. Each role shows all Handshake results with verdict chips (tech bar cleared, comp overlap, location match, etc.) and the full agent dialogue.
- **Candidate search**: filter the verified pool by skill name, minimum proof score, location. Returns profiles ranked by cohort percentile.
- **Kanban pipeline**: Applications move between New Inquiry → Screening → Interview → Offer → Closed with drag-and-drop. Each card links to the conversation thread.
- **ATS API**: `GET /api/ats/candidates/search?skill=X&minScore=70&location=Y` authenticated by `x-api-key`. Returns paginated candidates with top skills and proof scores. Enterprise ATS systems can integrate without touching the UI.
- Email notifications via Resend for new messages and scheduled interviews.
- Interview scheduling with `.ics` calendar file generation.

### 6. Application Threading

When a Handshake converts (candidate accepts), an Application record is created. Candidates and recruiters can exchange messages in a dedicated thread at `/messages/[id]`. The recruiter can update the application status, record an outcome (hired / rejected / withdrawn), and schedule interviews.

### 7. Infrastructure

- **Next.js 16 App Router** — server components, streaming, edge routes.
- **MongoDB Atlas + Mongoose** — main data store. Models: User, Profile, InterviewSession, Application, RoleSpec, Handshake.
- **Auth**: NextAuth v5 beta with two providers: GitHub OAuth (candidates) + Credentials/bcryptjs (recruiters). Edge-safe split config for middleware.
- **AI provider**: Ollama locally (llama3.2, no API cost in dev) with automatic Groq fallback (`llama-3.3-70b-versatile`) when Ollama is unreachable. All AI routes use `getModel()` — switching providers is one env var.
- **BullMQ + ioredis**: background worker process for slow jobs (LinkedIn scraping, large sourcing runs). Graceful degradation — the app runs fully without Redis; jobs just run inline.
- **Python microservice** (`python-parser/`): FastAPI service with a `joeyism/linkedin_scraper` + Playwright integration for LinkedIn parsing. Separate process; Node calls it via HTTP.
- **Judge0**: code execution in interviews (self-hosted or cloud endpoint).

---

## What Is Not Done Yet

Telling you what isn't built is as important as what is.

- **No billing or paid tier.** Zero revenue infrastructure exists today.
- **No mobile app.** Web only.
- **Twitter/X and GitLab** source parsers are scaffolded but blocked on OAuth app credentials — not implemented.
- **Typesense** full-text search is in the plan but deferred; current search is MongoDB regex.
- **LiveKit / video interviews** are in the plan but not started.
- **BullMQ sourcing is capped at ~12 candidates per run** synchronously. At scale this needs the worker process running with Redis — the infrastructure is built but not deployed to production yet.
- **Evidence IDs** in Handshake exchanges currently use skill names as references, not real immutable document IDs. Fine for now; needs hardening before high-stakes audit use.
- **Score confidence bands** (showing uncertainty alongside a proof score) are not implemented — scores are presented as point estimates.
- **No recruiter analytics dashboard** beyond the basic stats strip.

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4, Framer Motion |
| Database | MongoDB Atlas, Mongoose |
| Auth | NextAuth v5, GitHub OAuth + bcryptjs Credentials |
| AI | Vercel AI SDK v6, Ollama (dev) / Groq llama-3.3-70b (prod fallback) |
| Code Execution | Judge0 |
| Background Jobs | BullMQ + ioredis (Upstash Redis) |
| Email | Resend |
| LinkedIn Parsing | Python/FastAPI + Playwright + linkedin_scraper |
| Deployment | Vercel (Next.js), separate process for worker and Python parser |

---

## The Number That Matters

The Handshake Protocol runs fully deterministic hard gates. The LLM cannot override them. A candidate without verified Kubernetes experience will not be surfaced to a role that requires it, regardless of what the LLM generates. That is the line we drew and the code enforces it.

Everything else is features. This is the trust mechanism.
