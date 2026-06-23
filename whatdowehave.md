# Intervue — What We Have

*Updated 2026-06-24. Live, tested, ship-ready.*

---

## In one line

Candidates prove skills through AI interviews. Recruiters get a verified match — no resume guessing, no wasted screens.

---

## Candidate Flow (end to end)

```
Landing (/) → Onboarding (GitHub/X OAuth + resume) → Dashboard
    → Interview (9 formats) → Session → Report + Score update
    → Atlas chat (career goal, skill path, market)
    → Verified Card (5 sessions + goal + score ≥70) → LinkedIn/X share
    → Recruiter match notification → Message thread → Offer → "I got hired"
```

### Stage by stage

| Stage | Route | What happens |
|---|---|---|
| **Land** | `/` | Marketing, "Get started free" |
| **Auth** | `/onboarding` | GitHub OAuth or X/Twitter OAuth → resume (optional) → role |
| **Hub** | `/dashboard` | Skill bars, session history, verified card progress, rank vs cohort |
| **Format pick** | `/interview/new` | 9 formats in 2 groups (see below), skill input, optional JD paste |
| **Session** | `/interview/[id]` | AI chat + Monaco editor (engineering) or chat-only (non-engineering) |
| **Report** | `/interview/report/[id]` | Score, 4-axis breakdown, ideal answers, study recs. proofScore updates |
| **Agent** | `/agent` | Atlas chat — career goal card, skill path, market feed, learning plan |
| **Verified Card** | `/dashboard` → `/verified-card/[token]` | Issue once eligible. LinkedIn/X share with OG image |
| **Match** | `/messages` | Scout-surfaced notification → recruiter message thread |
| **Thread** | `/messages/[id]` | Chat, interview scheduling, offer extended → "I got hired" button |
| **Hire signal** | (auto) | HireSignal written for top 8 skills at time of hire — calibration data |

---

## Interview Formats (9 total)

**Engineering roles**
| Format | Editor | Notes |
|---|---|---|
| Live Coding | ✅ Monaco + Judge0 | Algo / DS challenge |
| System Design | ✅ Monaco | Whiteboard-style |
| Project Deep-dive | ✅ Monaco | From GitHub repos |
| Behavioural | ❌ | STAR framework |
| Gap Session | ❌ | 10-min drill on one weakness |

**Non-engineering roles** *(new — 2026-06-23)*
| Format | Editor | Notes |
|---|---|---|
| PM Case Study | ❌ | Product scenario. Scored on problem framing, prioritisation, communication, insight quality |
| Design Critique | ❌ | UX scenario. Scored on UX reasoning, systems thinking, communication, design rationale |
| Ops / Program Mgmt | ❌ | Ops challenge. Scored on process design, resource allocation, communication, risk ID |
| Sales Discovery | ❌ | Discovery roleplay. Scored on discovery quality, objection handling, communication, value articulation |

---

## What's Built

### Candidate
- **Identity graph** — GitHub, resume, sessions, DEV.to, Stack Overflow, HN, LinkedIn (scraper), GitLab, X/Twitter all merge additive into `parsedSkills[]`
- **AI sessions** — streaming, voice, hints, code execution, cross-session memory, company-mode JD
- **proofScore** — per-skill, 0–100, score history + confidence band (±σ), cohort percentile
- **Public profile** — `/p/[username]` ranked skills, 4 portfolio themes, OG rank card
- **Proof pages** — `/proof/[username]/[skill]` full evidence breakdown
- **Badges** — SVG embed + GitHub Action auto-refresh
- **Leaderboard** — skill × city, Monday notify cron
- **Atlas agent** — chat with full candidate context, career goal, skill path, market feed, learning plan, offer negotiation coaching
- **Verified Card** — issued on 5 sessions + career goal + score ≥70. Public page + OG image + LinkedIn/X share
- **HireSignal** — permanent calibration records at time of hire (no TTL)
- **Outcome tracking** — "I got hired" modal on offer_extended applications; hiredCompany/role/salary recorded
- **Certificates** — auto at 50/70/85 proofScore milestones
- **Resume Studio** — AI-generated resume from verified data, JD match score, PDF
- **Notifications** — bell icon, 11 types, 90d TTL
- **Weekly brief** — Monday cron, personalized Atlas summary per candidate
- **Peer interviews** — candidate vs candidate + AI moderator
- **Team graph** — radar chart, strengths/gaps, hire rec
- **Year Wrapped** — `/wrapped/[year]` with OG image
- **Referrals** — 8-char code, Vouched badge at 3 referrals × 3 sessions each
- **Billing** — Stripe Pro (₹399/mo), gates shareable reports + higher recruiter rank

### Recruiter
- Email/password auth, forgot/reset password
- Role creation with typed spec (must-have skills + min scores, comp, location, stage)
- **Two-agent matching** — Scout structures JD → Handshake Protocol: Atlas runs deterministic hard gates (tech bar, comp, location, stage, dealbreakers) → mutualFit or declined, neither human bothered
- Role fit forecast — pool analysis before sourcing
- Autonomous sourcing — BullMQ job on every score update
- Blind screening mode
- Kanban pipeline (6 stages)
- Candidate search — skill + score + role + location filter; Typesense (scaffolded, falls back to MongoDB)
- Analytics — KPI cards, pipeline funnel, skill gap chart, activity heatmap
- Interview prep questions per application
- ATS API (`GET /api/ats/candidates/search` + `x-api-key`)
- Messaging + scheduling + `.ics` calendar generation
- Watchlist + score alerts

---

## Data Models (key fields only)

| Model | Key Fields |
|---|---|
| User | `authProvider` (github/credentials/twitter), `role`, `discoverability`, `preferences` (comp/location/stage/dealbreakers), `streak`, `subscriptionTier` |
| Profile | `parsedSkills[]` (name, proofScore, scoreHistory[], evidence[]), `careerGoal` (targetRole, targetLevel, targetStage, targetLocation, targetSalaryLPA), `cohortPercentile`, `specializations[]` |
| InterviewSession | `format` (9 values), `targetSkill`, `status`, `messages[]`, `insightReport` (scores, breakdown, idealAnswers, weaknessSignals[]), `memoryContext`, `companyMode`, `rigorConditions` |
| Application | `status` (6 stages), `outcome` (result, hiredCompany, hiredRole, hiredSalaryLPA, hiredAt) |
| HireSignal | `skill`, `proofScoreAtHire`, `sessionCount`, `sessionAvgScore`, `targetRole`, `hiredAt` — permanent, no TTL |
| VerifiedCard | `cardToken`, `targetRole`, `targetLevel`, `topSkills[]` (name, score, percentile), `sessionCount`, `shareCount` |
| Handshake | `verdict` (mutualFit, skillMatches[], techBarCleared, compOverlap, locationMatch, stageMatch), `exchanges[]` — immutable at evaluation time |
| RoleSpec | `mustHave[]` (skill, minScore), `compRange`, `locations`,




 `stage`, `blind`, `autoSourceEnabled` |

---

## Infrastructure

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router, React 19, Tailwind v4 |
| DB | MongoDB Atlas + Mongoose |
| Auth | NextAuth v5 — GitHub OAuth + X OAuth + bcrypt Credentials |
| AI | Vercel AI SDK v6 + Groq `llama-3.3-70b-versatile` (Ollama in dev) |
| Code execution | Judge0 |
| Email | Resend |
| Jobs | BullMQ + Redis (inline fallback when Redis absent) |
| Billing | Stripe |
| Search | Typesense (scaffolded) → MongoDB fallback |
| Images | Next.js ImageResponse — badges, rank card, cert OG, receipt, wrapped, verified card OG |
| Crons | Vercel — weekly brief (Mon 08:00), leaderboard (Mon 09:00), market feed (daily 02:00), specialization inference (Sun 08:00) |
| Rate limiting | Upstash Redis sliding window |

---

## Env Vars

**Required**
```
NEXTAUTH_SECRET, MONGODB_URI
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET   # or Twitter equivalent
NEXTAUTH_URL                              # prod only
GROQ_API_KEY                             # or Ollama running locally
```

**Optional (features degrade gracefully)**
```
TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET + TWITTER_BEARER_TOKEN
RESEND_API_KEY, CLOUDINARY_*, STRIPE_*, UPSTASH_*, TYPESENSE_*
PARSER_SERVICE_URL + PARSER_SERVICE_SECRET   # LinkedIn scraper
JUDGE0_API_URL + JUDGE0_API_KEY
GITHUB_TOKEN, ATS_API_KEY, ADMIN_EMAILS
```

---

## What's Left

### Must fix before sharing with anyone
| Gap | Detail |
|---|---|
| Non-engineering session completion | `complete` route works for all 9 formats (FORMAT_RUBRICS tested in code), but no E2E test run yet — need one real session completed end-to-end |
| Verified Card E2E | OG image + public page exist but never tested with a real issued card |
| Atlas career goal steering | Goal is saved and injected into `proactiveInsight`, but Atlas chat LLM doesn't explicitly reference it unless the seed message triggers it — needs prompt tuning |

### Nice to have (2–4 hrs each)
| Gap | Detail |
|---|---|
| `/interview/new` shows "Behavioural" for non-engineering roles | Should split: move Behavioural + Gap under both groups since they apply to all roles, not just engineering |
| Recruiter search doesn't know about new formats | `sourceForRole` pre-filter and Handshake works on skills not formats — fine for now |
| Peer matchmaking | Random pairing today; cohort sort is 30 min of work |
| Typesense activation | Scaffolded; needs a running instance + index sync cron |
| LiveKit video | Token API ready; no UI |

### Strategic (not blocking, but needed for the "10 verified → 5 hired" thesis)
| Gap | Detail |
|---|---|
| Outcome loop data | HireSignal writes correctly, but there's no dashboard/analytics showing "Intervue verified = X% hire rate" yet — this is the proof of the thesis |
| Atlas actively coaching toward goal | Right now Atlas has the goal as context; it should proactively surface "You need 2 more sessions in Product Strategy to hit your PM goal" without being asked |
| Recruiter seeing verified card | When a recruiter views a candidate, they don't see the Verified Card — should be the centerpiece of the candidate profile |
