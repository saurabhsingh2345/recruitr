# Intervue — The Master Plan

> **Hiring is broken by two things: information asymmetry and wasted human time.**
> Candidates lie (or can't prove the truth). Recruiters lie (or don't know the role).
> Both sides waste weeks on matches that were never going to work.
>
> **Intervue fixes this with three things:**
> 1. A **Candidate Agent** that builds, proves, and represents a person 24/7.
> 2. A **Recruiter Agent** that understands a role and sources + screens against it autonomously.
> 3. **A verified trust layer in between** — the source of truth neither agent can lie about, and the protocol through which the two agents negotiate fit *before* a single human minute is spent.
>
> The magic: two agents do the awkward early-stage dance — *is this real? is it a fit? is the comp right? is the candidate actually interested?* — over a foundation of cryptographically verified evidence. Humans only meet when there is genuine, proven, mutual interest.

---

## 0. Why This Changes the Landscape

The status quo:

```
Candidate                          Recruiter
   │ writes inflated resume            │ writes vague JD
   │ sprays 100 applications           │ keyword-searches LinkedIn
   │ ghosted 95 times                  │ screens 200 resumes by hand
   │ takes 5 interviews to find fit    │ 90% of calls are bad fits
   └──────────── weeks wasted ─────────┘
```

The Intervue model:

```
Candidate Agent (Atlas)            Recruiter Agent (Scout)
   │ builds verified identity          │ ingests role → structured bar
   │ knows the human's true prefs       │ continuously sources verified pool
   │ answers recruiter Qs 24/7          │ screens against the bar w/ evidence
   │ filters noise for the human        │ briefs recruiter only on real fits
   └──────── Trust Layer (Intervue) ────┘
              evidence both trust
              protocol both speak
              outcomes that calibrate
   Result: humans meet only on proven mutual interest. Days, not weeks.
```

Why neither agent can lie:
- **Atlas can't inflate the candidate** — every skill claim is backed by code, interviews, and writing we independently verified.
- **Scout can't misrepresent the role** — we track hire outcomes; companies that over-promise lose trust score.
- **Intervue is the neutral arbiter** — we verify both sides, so the negotiation is grounded in fact.

This is the moat. LinkedIn sells candidate attention to recruiters. We do the opposite: candidates own their agent and their data; recruiters pay for access to a *pre-verified, pre-screened, genuinely-interested* shortlist.

---

## 1. The Three Pillars

### Pillar A — The Candidate Agent ("Atlas")
A persistent AI that works **for the candidate**, never for us or the recruiter.

It does five jobs:
1. **Build** — orchestrates scraping of the candidate's entire internet presence into a verified identity graph.
2. **Coach** — "Your Go score is 72. Three deeper interview sessions on concurrency would push it to ~85. Here's a practice plan."
3. **Represent** — answers recruiter-agent questions 24/7 from verified evidence, even while the human sleeps.
4. **Filter** — screens inbound interest against the human's private preferences (comp, location, stage, domain) so the human only sees real opportunities.
5. **Prepare** — when a real interview is booked, briefs the candidate on the company, the interviewer, likely questions, and their own weak spots.

### Pillar B — The Recruiter Agent ("Scout")
A persistent AI that works **for the recruiter**.

It does five jobs:
1. **Understand** — turns a messy JD or a conversation into a structured role spec with a clear "bar" (must-haves, nice-to-haves, comp band, location, company stage, team context).
2. **Source** — continuously queries the verified pool; surfaces new matches as candidates cross the bar or join.
3. **Screen** — talks to candidates' agents, asks the hard questions, gets evidence-backed answers, ranks by true fit.
4. **Engage** — drafts personalized outreach grounded in the candidate's actual work; manages cadence; books interviews.
5. **Brief** — gives the human recruiter a ranked shortlist of *interested, qualified* candidates with a one-paragraph "why" and the evidence behind it.

### Pillar C — The Trust Layer (Intervue's core IP — "the magic")
Three components:
1. **The Verified Identity Graph** — the source of truth. Multi-source evidence, graded and scored. Neither agent can contradict it.
2. **The Proof-of-Skill Score** — the common language both agents speak. Confidence-banded, evidence-cited, audit-hashed, decaying over time.
3. **The Handshake Protocol** — the agent-to-agent negotiation that compresses weeks of human back-and-forth into a verified, preference-aware, consent-gated handshake.
4. **The Outcome Loop** — post-hire feedback that calibrates every score and every recruiter's trust rating over time.

---

## 2. The Handshake Protocol (The Heart of the Product)

This is the genuinely novel mechanism. Concretely:

```
1. Scout has role spec with a bar:
   { mustHave: [Go≥80, distributed_systems≥75], compBand: [40,60]L,
     location: [Bangalore, remote], stage: SeriesB+, teamLead: nice }

2. Scout queries the verified pool → finds Candidate X clears the technical bar.

3. Scout sends a FIT INQUIRY to Atlas (X's agent) — NOT to the human yet:
   { role, company (revealed or blind), compBand, stage, asks: [
       "Has she led a team?", "Is the Kafka experience production-grade?" ] }

4. Atlas evaluates:
   - Against X's PRIVATE preferences (set by X: "≥45L, remote-first, no crypto, Series B+")
   - Answers the asks FROM VERIFIED EVIDENCE:
       "Led a team of 4 on payments-api (verified via PR review patterns + LinkedIn).
        Kafka is production: 2 yrs, 50k TPS pipeline, see repo + interview session #3."

5. Atlas computes a mutual-fit verdict:
   - Comp overlaps? Location matches? Stage matches? Tech bar cleared both ways?
   - If NO → Atlas declines politely, recruiter never bothered the human, candidate never spammed.
   - If YES → Atlas surfaces to the human candidate:
       "Scout @ [Company] thinks you fit [role]. Comp 45–60L, remote, Series C.
        I checked it against your prefs — it's a match. Interested? [Yes] [No] [Ask me]"

6. Candidate taps YES (one tap, fully informed, zero spam to get here).

7. NOW the human recruiter is notified:
   "Candidate X is interested AND clears your bar. Brief attached. Schedule?"

8. Humans take over: real conversation, real interview, scheduling, offer.
```

Everything before step 7 is automated and evidence-grounded. Weeks of recruiter sourcing + candidate filtering collapse into a handshake measured in minutes. And because both sides are Intervue-verified, the handshake is **trustworthy** — that's why recruiters will pay and candidates will trust us.

**Consent & control (non-negotiable for trust):**
- The candidate sets discoverability (open / passive / invisible), preferences, and what Atlas may disclose.
- A recruiter can run a "blind" inquiry (company hidden) so candidates aren't biased, but comp/stage must always be disclosed.
- Atlas never shares contact info until the candidate says yes.
- Everything Atlas says on the candidate's behalf is logged and visible to the candidate.

---

## 3. The Full Loop (End-to-End, What Must Actually Function)

This is the "proper functioning app" the product must deliver:

```
CANDIDATE SIDE                          RECRUITER SIDE
──────────────                          ──────────────
1. Sign in (GitHub OAuth)               1. Sign in (GitHub OAuth) → /recruiter/setup
2. Connect accounts                      2. Create role (JD paste or chat w/ Scout)
   (GitHub, LinkedIn, SO, X, GitLab…)    3. Scout structures the bar
3. Atlas scrapes + builds identity       4. Scout sources verified pool
4. Atlas runs verification interviews    5. Scout screens via Handshake Protocol
5. Verified profile goes live                     │
6. Set preferences + discoverability     ◄────────┤ Fit Inquiry
7. Atlas filters inbound interest        ─────────► Mutual-fit verdict
8. Candidate accepts real opportunities  6. Recruiter gets briefed shortlist
        │                                          │
        └────────── CONNECTION ───────────────────┘
9. Messaging thread opens (both humans)
10. Schedule interview (calendar + ICS + reminders)
11. Real interview happens
12. Outcome recorded (hired / passed / withdrawn)
13. Post-hire feedback (3mo, 12mo) → calibrates scores + recruiter trust
```

Every numbered step needs a real implementation. Sections 4–11 below specify each.

---

## 4. Identity & Scraping (Feeds Atlas)

The candidate agent is only as good as the evidence. We aggregate the whole internet presence.

| Source | Method | Tool | Signal extracted |
|---|---|---|---|
| **GitHub** | OAuth + GraphQL | `octokit` | commits, PRs, reviews, issues, stars, languages, consistency, code complexity, repo impact |
| **GitLab** | OAuth + REST | `@gitbeaker/rest` | same as GitHub |
| **LinkedIn** | OAuth (official) or user cookie → Proxycurl | `linkedin-api` (Py) | roles, tenure, education, endorsements, recommendations, posts |
| **Stack Overflow** | Official API (free) | direct | answer quality, accepted %, reputation by tag |
| **X/Twitter** | OAuth2 + Nitter fallback | `twitter-api-v2` | technical threads, engagement, topics, follower quality |
| **DEV.to** | REST (free, no auth) | direct | articles, reactions, comments, topics |
| **Medium / Substack** | RSS | `rss-parser` | articles, topics, cadence |
| **Hashnode** | GraphQL (free) | direct | publications, articles |
| **Hacker News** | Algolia HN API (free) | direct | comments, Show/Ask HN, karma |
| **npm / PyPI** | Registry JSON (free) | direct | packages, downloads, dependents |
| **YouTube** | Data API v3 | `googleapis` | talks, tutorials, reach |
| **Google Scholar** | scrape | `scholarly` (Py) | papers, citations, h-index |

**Orchestration:** Atlas enqueues per-source jobs on **BullMQ** (Redis-backed, Upstash we already have). Each worker writes raw events → `identity_events`. An **enrichment worker** then runs the AI pipeline.

**Enrichment pipeline (per candidate):**
1. **Code analysis** — `tree-sitter` AST → complexity, test/doc coverage, patterns. `semgrep` → security/anti-patterns.
2. **Writing analysis** — LLM rubric over SO answers, PR descriptions, articles → clarity, depth, accuracy, structure.
3. **Career narrative** — LLM synthesizes a coherent story from all events.
4. **Skill→evidence mapping** — `{ "Go": { score, tier, confidence, evidence:[{source,quote,url,date,weight}] } }`.
5. **Behavioral analysis** — collaboration, consistency, growth, ownership, influence from interaction patterns.
6. **Embedding** — each evidence chunk embedded → MongoDB Atlas Vector Search (powers recruiter Q&A / RAG).

**Skill tiers (not just a number):**
```
Awareness      → mentioned in bio/README
Proficient     → 3+ repos, non-trivial code
Expert         → reviews others, answers SO, shipped at scale
Thought leader → articles, talks, work cited by others
```

---

## 5. The Verification Engine (Interviews That Can't Be Cheated)

Generic questions are worthless — ChatGPT answers them. Every question is **generated from the candidate's own work.**

**Generation:** before each session, Scout/Atlas pulls top repos (by AST complexity), reverted/debated PRs, SO answers with gaps, and claims-vs-code mismatches, then generates questions like:

> "In `payments-api/lib/retry.go:142` your jitter range is [0,100ms]. Why not [0,500ms]?"
> "PR #47 removed the mutex; PR #61 three weeks later added it back. What did you learn?"
> "You wrote on DEV.to that you prefer event sourcing — your repo doesn't use it. Why not?"

Unpreparable. Requires knowing your own work.

**Session types:**
| Round | Format | Measures |
|---|---|---|
| Screen | async video + short code | communication, basics |
| Deep Dive | live, questions from their code | true knowledge depth |
| Live Coding | Monaco + Judge0, novel problem | problem solving, code quality |
| System Design | Excalidraw whiteboard | architecture thinking |
| Behavioral | voice (Speech APIs), STAR | communication, self-awareness |

**Anti-cheat signals:** typing cadence vs paste bursts, clipboard events, tab-switch frequency (visibility API), response-latency distribution, coherence-under-3-level-followup, voice rounds (can't ChatGPT a live voice convo), mandatory code execution (must pass tests).

**Score architecture (credible, not a black box):**
```ts
interface VerifiedScore {
  skill: string
  score: number            // 0–100
  band: [number, number]   // e.g. [82,91] — never a bare number
  confidence: number       // from evidence count + consistency
  sessions: number
  evidence: { source, url, quote, weight }[]
  issuedAt: Date
  expiresAt: Date          // decays at 6mo, expires ~18mo
  auditHash: string        // sha256(score+evidence+sessions+issuedAt)
}
```
Decay forces re-verification (retention + freshness). Audit hash makes inflation detectable.

---

## 6. The Recruiter Agent (Scout) — In Detail

**Role intake:** recruiter pastes a JD or chats with Scout. Scout produces a structured spec:
```ts
interface RoleSpec {
  title, seniority
  mustHave:  SkillBar[]    // { skill, minScore }
  niceHave:  SkillBar[]
  compBand:  [number, number]
  locations: string[]      // incl. "remote"
  stage:     CompanyStage
  teamContext, domain, dealbreakers
}
```

**Sourcing:** structured spec → **Typesense** (fast filter/rank) over the verified pool + MongoDB aggregation. Re-ranked by fit. Saved searches create **standing alerts** — Scout pings when a new candidate crosses the bar.

**Screening:** Scout runs the Handshake Protocol (§2) against each promising candidate's Atlas.

**Candidate Q&A (RAG):** recruiter asks free-text → vector search over candidate evidence → LLM answers with citations:
> "Does she handle distributed systems?" → "Yes. payments-api handles 50k TPS, she wrote the consensus layer (repo). SO answers show deep CAP understanding. Confidence: high."

**Outreach:** Scout drafts grounded messages ("I saw your GopherCon talk on lock-free queues…"), sends via Resend / LinkedIn (user OAuth) / copy, tracks open + reply + time-to-reply.

**Brief:** ranked shortlist of *interested + qualified*, each with a one-paragraph why + evidence.

---

## 7. Connection & Scheduling (Agents → Humans)

Once a candidate accepts (Handshake step 6→7):
- **Thread opens** in the existing `applications` model (messages, status pipeline) — both humans now talk directly.
- **Scheduling**: pick slots → generate ICS (already have) → email both via Resend → reminders (BullMQ delayed jobs at 24h/1h). Optionally embed **Cal.com** for availability.
- **Live interview room**: video via **LiveKit** (self-hostable WebRTC) or async. Whiteboard via Excalidraw. Code via Monaco+Judge0.
- **Outcome capture**: recruiter marks hired/passed/withdrawn → writes `hire_outcomes`.

---

## 8. Accounts, Auth & All the Logins

| Who | Login | Notes |
|---|---|---|
| Candidate | GitHub OAuth | default `role: candidate`; lands `/onboarding` |
| Recruiter | GitHub OAuth | `/recruiter/login` → `/recruiter/setup` sets `role: recruiter` + company |
| Team member | invite link | joins a `recruiter_teams` doc with a seat |
| Source connections | per-source OAuth / cookie | GitHub, LinkedIn, X, GitLab, Google (YouTube/Scholar) — stored as `connections` on the user, tokens encrypted |

**Already done:** split NextAuth v5 config (`auth.config.ts` edge-safe + `auth.ts` DB) so middleware works in edge runtime. `middleware.ts` gates recruiter/candidate routes. Role-write via `/api/me` PATCH.

**Needed next:**
- **Account Connections page** — connect/disconnect each scraping source, show sync status, re-auth.
- **Encrypted token vault** — OAuth tokens for sources (use libsodium / Node `crypto`), never plaintext.
- **Email/password fallback** (bcryptjs already in deps) for users without GitHub, esp. recruiters.
- **Team invites + seats** — multi-recruiter pipelines.

---

## 9. Data Model (Collections)

```
users                (exists — add: connections[], preferences, discoverability, planTier)
profiles             (exists — expand: behavioral scores, narrative, tiers)
identity_events      (NEW — raw per-source events)
skill_evidence       (NEW — normalized, embedded evidence items)
verified_scores      (NEW — the score objects from §5)
score_audit_log      (NEW — immutable issuance history)
interview_sessions   (exists — add: question provenance, anti-cheat signals)
interview_questions  (NEW — generated questions w/ source refs)
role_specs           (NEW — Scout's structured roles)
applications         (exists — the connection/thread/pipeline)
handshakes           (NEW — fit inquiries, verdicts, audit trail)
recruiter_teams      (NEW — members, seats, shared pipelines)
saved_searches       (NEW — standing alerts for Scout)
hire_outcomes        (NEW — post-hire feedback)
agent_messages       (NEW — Atlas↔Scout transcript, candidate-visible)
```

---

## 10. Architecture

```
Next.js 16 (App Router, Vercel)
  ├─ MongoDB Atlas              source of truth + Vector Search (RAG)
  ├─ Upstash Redis              cache + BullMQ queues (have it)
  ├─ Typesense                  fast candidate search (Railway ~$5/mo)
  ├─ BullMQ workers (Node)      aggregation · enrichment · interview-gen ·
  │                             score-recalc · scheduling-reminders · handshake
  ├─ Python microservice        LinkedIn/SO scrape · tree-sitter · semgrep ·
  │   (have skeleton)           spaCy · sentence-transformers · scholarly
  ├─ Judge0 CE                  code execution
  ├─ LiveKit                    interview video (optional, self-host)
  └─ Agent runtime              Atlas + Scout (Vercel AI SDK tool-calling,
                                Ollama-first → Groq fallback, per §11)
```

**Why workers:** scraping + enrichment can't run in a request. They must be background jobs with retries, rate-limit handling, and progress the candidate can watch.

---

## 11. The Agent Runtime (How Atlas & Scout Actually Work)

Both agents are **tool-using LLM loops** (Vercel AI SDK `generateText` + tools, Ollama-first → Groq fallback — already wired in `lib/groq.ts`).

**Atlas tools:** `getVerifiedEvidence(skill)`, `getCandidatePreferences()`, `evaluateFit(roleSpec)`, `answerRecruiterAsk(question)`, `surfaceToHuman(opportunity)`, `bookPrep(session)`.

**Scout tools:** `structureRole(jd)`, `searchPool(spec)`, `sendFitInquiry(candidateId, asks)`, `rankCandidates()`, `draftOutreach(candidate)`, `briefRecruiter(shortlist)`.

**Shared protocol bus:** Atlas and Scout exchange typed messages persisted in `handshakes` + `agent_messages`. Every exchange is logged and candidate-visible (trust requirement).

**Guardrails:** Atlas only ever asserts what `getVerifiedEvidence` returns — it is prompt-constrained and tool-constrained from inventing skills. Scout must always disclose comp + stage. A validation layer rejects any agent claim not backed by an evidence ID.

---

## 12. UI — Designed, Not Assembled

Principles: spatial depth (4 surface layers, not just dark+green), motion that teaches, type as personality (`Geist` UI / `Cal Sans` display / `Geist Mono` numeric), density for power users, data as editorial art.

**Build:**
- Design tokens: 11-step color scales, semantic tokens (`--verified`, `--score-high/mid/low`), 4 surfaces.
- `shiki` syntax highlighting, `cmdk` command palette, `@react-three/fiber` hero, `gsap` scroll reveals, `vaul` drawers.

**Page reworks:**
- **Landing** — *show* the product (profile building live, handshake animating), don't describe it.
- **Atlas dashboard (candidate)** — agent chat + identity build progress + score growth + inbound opportunities Atlas filtered.
- **Public profile** — immersive destination: identity header, presence bar, **evidence wall**, behavioral radar, timeline, code showcase, interview highlights. Replaces resume + portfolio + LinkedIn.
- **Interview room** — focus mode, animated AI presence, live transcript, slide-in editor, gentle timer, score-rings-fill finale.
- **Scout dashboard (recruiter)** — war room: pipeline + standing alerts + ranked briefs + Cmd+K NL search + candidate Q&A panel.

---

## 13. Trust, Safety & Fairness (Why People Believe Us)

- **Cryptographic audit trail** on every score (inflation-evident).
- **Outcome loop**: 3mo/12mo post-hire surveys → recalibrate scores + recruiter trust rating. Goal stat: *"Intervue 85+ engineers: 94% 12-month retention across N hires."*
- **Consent-first**: candidate owns data, controls disclosure + discoverability, sees every word Atlas says.
- **Bias controls**: blind inquiries (company/name hidden); scores from evidence + work, not pedigree; audit for disparate impact.
- **Anti-gaming**: anti-cheat in interviews; cross-source corroboration (a skill claimed but unsupported across all sources is flagged); decay prevents stale flexing.

---

## 14. Business Model

- **Candidate Free** — full profile, 3 sessions/mo, Atlas basic, public profile.
- **Candidate Pro (₹299/mo)** — unlimited sessions, full Atlas (proactive sourcing, prep), behavioral analysis, featured placement, PDF export.
- **Recruiter (₹4,999/seat/mo)** — full Scout, NL search, candidate Q&A, handshake, outreach, pipeline + team.
- **Enterprise** — ATS API, custom rubrics, outcome reporting, cohort benchmarks, bulk handshake.

Candidates control; recruiters pay. The inverse of LinkedIn.

---

## 15. Build Sequence (Grounded in What Exists)

**What already works:** GitHub OAuth, candidate onboarding + dashboard, basic profile (GitHub scrape), generic interview loop + report + streak, recruiter login/setup/dashboard, candidate search, Kanban pipeline, messaging, scheduling/ICS, email (Resend), badge OG image, leaderboard, ATS stub, split-config auth + middleware. Build clean.

### Phase 1 — Foundations for Agents (the data + queue spine)
1. Stand up **BullMQ** + worker process (Upstash Redis).
2. **Account Connections** page + encrypted token vault (GitHub deeper first; then SO, DEV.to, HN — all free APIs).
3. **Aggregation workers** → `identity_events`; **enrichment worker** → `skill_evidence` (+ embeddings) → expand `profiles`.
4. New collections from §9.

### Phase 2 — Make the Profile Real & Trustworthy
5. **Behavioral dimensions** (communication, consistency, growth, ownership, influence).
6. **Public profile redesign** — evidence wall, behavioral radar, timeline, code showcase.
7. **Code-personalized interview questions** (tree-sitter) + **multi-round sessions** + **anti-cheat** + **VerifiedScore** w/ bands + audit hash.

### Phase 3 — The Agents
8. **Atlas** runtime — build/coach/represent/filter/prepare tools + candidate agent dashboard.
9. **Scout** runtime — role intake, sourcing (Typesense), screening, brief + recruiter Q&A (RAG).
10. **Handshake Protocol** — `handshakes`, fit inquiry, mutual-fit verdict, consent gates, candidate-visible logs.

### Phase 4 — Connection, Scheduling, Trust Loop
11. Scheduling reminders (BullMQ delayed), optional Cal.com/LiveKit, richer thread.
12. **Outcome loop** — post-hire surveys → score + recruiter-trust calibration.
13. **Team seats + invites**, saved-search alerts, recruiter analytics.

### Phase 5 — UI Overhaul (parallel from Phase 2 on)
14. Design tokens + fonts; landing; interview room; profile; Scout/Atlas dashboards; Cmd+K.

---

## 16. Tools (OSS)

| Need | Tool | License |
|---|---|---|
| Job queue | `bullmq` | MIT |
| Search | `typesense` | GPL-3 |
| Vectors/RAG | MongoDB Atlas Vector Search | — |
| Embeddings | `sentence-transformers` (Py) | Apache |
| Code AST | `tree-sitter` | MIT |
| Code patterns | `semgrep` (Py) | LGPL |
| Scraping | `playwright` (have) | Apache |
| GitHub/GitLab | `octokit`, `@gitbeaker/rest` | MIT |
| Feeds | `rss-parser` | MIT |
| Syntax UI | `shiki` | MIT |
| Cmd palette | `cmdk` | MIT |
| 3D / scroll | `@react-three/fiber`, `gsap` | MIT / std |
| Drawers | `vaul` | MIT |
| Scheduling | `cal.com` embed | AGPL |
| Video | `livekit` | Apache |
| Code exec | `judge0-ce` | GPL |
| Analytics | `posthog` | MIT |
| Whiteboard | `excalidraw` | MIT |
| PDF | `@react-pdf/renderer` (have) | MIT |
| Fonts | `Geist`, `Cal Sans` | OFL |
| Token crypto | libsodium / Node `crypto` | ISC |

---

## 17. New Env Vars

```bash
# Source OAuth
LINKEDIN_CLIENT_ID= / LINKEDIN_CLIENT_SECRET=
TWITTER_CLIENT_ID=  / TWITTER_CLIENT_SECRET=
GITLAB_CLIENT_ID=   / GITLAB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=   / GOOGLE_CLIENT_SECRET=
STACKEXCHANGE_KEY=
# Infra
UPSTASH_REDIS_REST_URL= / UPSTASH_REDIS_REST_TOKEN=   # have
TYPESENSE_HOST= / TYPESENSE_API_KEY=
JUDGE0_API_URL=https://ce.judge0.com
LIVEKIT_URL= / LIVEKIT_API_KEY= / LIVEKIT_API_SECRET=
TOKEN_ENCRYPTION_KEY=        # 32-byte key for the source-token vault
POSTHOG_KEY=
RESEND_API_KEY=              # have (optional)
ATS_API_KEY=                 # have
```

---

## 18. Success in 6 Months

- A candidate shares their Intervue link instead of a resume; the recruiter replies within the hour.
- A recruiter describes a role to Scout and has an *interested, verified* shortlist by morning — zero manual sourcing.
- Two agents close the gap from "role exists" to "humans talking" in **under 24 hours**, with no spam on either side.
- Calibration data proves Intervue 85+ engineers retain at >90% — the sentence that makes us unconditionally trusted.
- Recruiters open Intervue before LinkedIn. Engineers list their Intervue profile like they list GitHub.

---

## Immediate Next Step

Phase 1, item 1–3: stand up the **BullMQ worker spine + Account Connections + deeper GitHub aggregation into `identity_events`/`skill_evidence`**. That is the foundation every agent feature stands on — without real multi-source evidence, Atlas has nothing to represent and Scout has nothing to trust.
