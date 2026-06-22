# Intervue — Forward Plan

*What we have, what's broken, what to build next, in what order. Actionable.*

---

## First: Honest Assessment of What We Have Today

### Working and solid
- AI interview engine (5 formats, streaming, Monaco, Judge0, voice mode, hints, scoring)
- Verified profile with proofScores derived from GitHub + resume + sessions
- Atlas/Scout handshake protocol with deterministic hard gates
- Multi-source parsers: DEV.to, Stack Overflow, HN (all working, real APIs, no OAuth)
- BullMQ background job infrastructure with graceful inline fallback
- Public profile + shareable OG badge images
- Recruiter product: role creation, sourcing, Kanban pipeline, ATS API
- Dual auth: GitHub OAuth (candidates) + email/password (recruiters)
- Application threading + email notifications

### Working but fragile
- **LinkedIn scraper**: requires Python process + Playwright + browser cookie (`LINKEDIN_LI_AT`). Breaks when the cookie expires (weekly). Needs a more reliable approach.
- **Resume PDF parsing**: depends on the Python parser microservice being alive. No graceful fallback UI when service is down.
- **Profile generation**: calls `generateText` with potentially large repo summaries — can hit token limits silently and return empty skills with no user-visible error.

### Likely silent bugs
- **`cohortPercentile` never recalculates**: `calculateCohortPercentile()` exists in `lib/scoring.ts` but is never called after profile generation. Every profile likely has `cohortPercentile: 0`. The leaderboard sorts by this field — it's probably returning everyone at equal rank.
- **`embeddings: number[]` field on Profile** is always empty — the field exists, schema is there, but nothing ever writes to it.
- **`idealAnswers` in `InsightReport`** is always `{}` — the AI analysis prompt doesn't ask for ideal answers and the field is never populated, but the data model and report page reference it.
- **Leaderboard N+1**: fetches up to 50 profiles then queries User by ID in a for-loop. 50 sequential DB roundtrips per page load.
- **Recruiter search**: `$elemMatch` on skills only matches ONE must-have skill, not all. A candidate with React but not Node passes a React + Node filter.

### Not yet implemented (scaffolded only)
- Twitter/X and GitLab source parsers (stubs, `requires OAuth` error)
- Semantic/embedding-based search (field exists, never populated)
- Recruiter analytics (dashboard has stat blocks that may show zeros)
- Score confidence bands (scores are point estimates, no uncertainty shown)
- Immutable evidence IDs in handshake transcripts (currently use skill name strings)
- No billing, no paid tiers, no Stripe

---

## Phase 0 — Fix What's Broken (Do This First, ~1 Week)

These are bugs or fragilities that will embarrass us in a demo or erode trust.

### 0.1 Fix cohortPercentile recalculation

**File**: `app/api/profile/generate/route.ts` — after saving the profile.

```ts
// After profile.save(), recalculate cohortPercentile across all profiles
const allProfiles = await Profile.find({ isPublic: true }).select('parsedSkills').lean()
const overallScores = allProfiles.map(p => {
  const skills = p.parsedSkills || []
  return skills.length ? skills.reduce((s, sk) => s + sk.proofScore, 0) / skills.length : 0
})
const myScore = profile.parsedSkills.reduce((s, sk) => s + sk.proofScore, 0) / (profile.parsedSkills.length || 1)
profile.cohortPercentile = calculateCohortPercentile(myScore, overallScores)
await profile.save()
```

Also recalculate in `app/api/interview/[id]/complete/route.ts` after updating skill scores.

### 0.2 Fix leaderboard N+1

**File**: `app/leaderboard/page.tsx` — replace the per-profile User query loop with a single aggregation.

```ts
// Replace the for loop entirely
const profiles = await Profile.find({ isPublic: { $ne: false } })
  .sort({ cohortPercentile: -1 })
  .limit(50)
  .lean()

const userIds = profiles.map(p => p.userId)
const users = await User.find({ _id: { $in: userIds } })
  .select('username name avatarUrl openToWork')
  .lean()

const userMap = new Map(users.map(u => [u._id.toString(), u]))
// then map profiles with userMap.get(...)
```

### 0.3 Fix recruiter search multi-skill matching

**File**: `app/api/recruiter/search/route.ts` — `$elemMatch` only checks one array element. For multi-skill matching:

```ts
// Replace single $elemMatch with $all on $elemMatch for each skill
if (skills.length > 0) {
  filter['$and'] = skills.map(skill => ({
    parsedSkills: {
      $elemMatch: { name: { $regex: skill, $options: 'i' }, proofScore: { $gte: minScore } }
    }
  }))
}
```

### 0.4 Populate idealAnswers in interview report

**File**: `app/api/interview/[id]/complete/route.ts` — add `idealAnswers` to the analysis prompt:

```
"idealAnswers": {
  "question 1 from transcript": "what an expert answer looks like",
  "question 2": "..."
}
```

This populates the field that the report page already references but always gets `{}`.

### 0.5 Make LinkedIn scraper resilient

Current approach (Playwright + browser cookie) is too fragile for production. Two paths:

**Path A (quick, pragmatic)**: Add a `/api/profile/sync/linkedin` route health check. If the parser service is down, return a clear error toast with a "service unavailable" reason instead of silently failing. Give users a "retry" button.

**Path B (better, medium effort)**: Replace the Playwright scraper with the **LinkedIn unofficial API via RapidAPI** (free tier: 100 calls/month). No cookie needed, no Playwright. Edit `python-parser/parsers/linkedin.py` or move entirely into Node with a `fetch` call to RapidAPI. Cost: ~$0 at MVP scale.

**Path C (proper, longer)**: Apply for LinkedIn API partner access. Not realistic at early stage.

Recommendation: do Path A now (30 min), Path B in Phase 1.

### 0.6 ProofScore update formula is mixing concepts

**File**: `app/api/interview/[id]/complete/route.ts` line ~137:

```ts
proofScore: calculateProofScore({
  evidenceCount: 1,
  repoComplexity: analysis.overallScore,  // ← passing interview score as "repoComplexity" is wrong
  recencyMonths: 0,
})
```

Fix: use the interview overall score directly, weighted with recency:

```ts
proofScore: Math.round(analysis.overallScore * 0.7 + 30 * 0.3) // new skill, recency bonus
```

---

## Phase 1 — Make the Core Product Excellent (~2 Weeks)

These features make the existing product meaningfully better before we build new things.

### 1.1 ProofScore History / Timeline

**What**: Every skill should store a `scoreHistory` array so we can show how a skill has grown over time. This is one of the highest-trust signals for both candidates (motivation) and recruiters (growth trajectory).

**Data model change** — `lib/models/Profile.ts`:

```ts
// Add to ISkill interface
scoreHistory: { score: number; source: 'github' | 'interview' | 'devto' | 'stackoverflow' | string; at: Date }[]
```

**Where to write history**:
- `app/api/interview/[id]/complete/route.ts`: push `{ score: newScore, source: 'interview', at: new Date() }` before saving
- `app/api/connections/sync/route.ts` (or the sync job): push `{ score, source: sourceId, at }` for each signal

**UI**: Add a mini sparkline chart (Recharts `LineChart`) on the profile page and dashboard for each skill. Already have Recharts in the stack. The `/p/[username]` public profile should show growth, not just current score.

### 1.2 Wire up Semantic Search (Embeddings)

The `embeddings: number[]` field already exists on every Profile. It just needs to be populated.

**Step 1**: After profile generation in `app/api/profile/generate/route.ts`, generate an embedding of the candidate's skill list + bio + target role using `embed()` from the AI SDK:

```ts
import { embed } from 'ai'

const text = [
  profile.targetRole,
  profile.bio,
  ...profile.parsedSkills.map(s => `${s.name} ${s.evidence.join(' ')}`),
].join(' ')

const { embedding } = await embed({ model: await getEmbeddingModel(), value: text })
profile.embeddings = embedding
await profile.save()
```

**Step 2**: Add `getEmbeddingModel()` to `lib/groq.ts` — use Ollama's `nomic-embed-text` or Groq's embedding endpoint.

**Step 3**: For recruiter search, compute query embedding and do cosine similarity against stored embeddings in MongoDB. The `$vectorSearch` aggregation operator is available in MongoDB Atlas (M10+). Add `lib/vectorSearch.ts`.

**Step 4**: Replace the NL "quick search bar" on the recruiter dashboard (`app/recruiter/dashboard/page.tsx`) with a semantic search that hits the vector endpoint.

### 1.3 Score Confidence Bands

**What**: Show uncertainty alongside proof scores. A score of 75 with 1 piece of evidence is very different from 75 with 8 pieces across GitHub + interviews + DEV.to.

**Data model**: Add `evidenceCount: number` and `confidence: 'low' | 'medium' | 'high'` to `ISkill`. Derived rule:
- `low`: 1-2 sources, < 3 evidence items
- `medium`: 2-4 sources, 3-6 evidence items  
- `high`: 3+ sources, 7+ evidence items

**UI**: Show as a subtle label beside the score — "verified by 3 sources" or a green/yellow/amber dot. On the public profile and in handshake transcripts.

**Recruiter impact**: Recruiters can filter by `confidence: 'high'` only, which is a premium differentiator.

### 1.4 Immutable Evidence IDs

**Current problem**: Handshake exchanges store `evidenceIds: ['React', 'Node.js']` — just skill names. If the skill is renamed or removed, the audit trail breaks.

**Fix**: When Atlas writes a Handshake, store evidence as structured refs:

```ts
interface EvidenceRef {
  skillName: string
  proofScore: number
  sourceIds: string[]  // e.g. ['github:repo/my-app', 'interview:session_id']
  snapshotAt: Date
}
```

Change `evidenceIds: string[]` to `evidence: EvidenceRef[]` in the Handshake model. Snapshot at the time of the handshake so the record is immutable.

### 1.5 Password Reset for Recruiter Auth

**What**: Recruiters sign up with email/password but there's no password reset. If they forget their password, they're locked out forever.

**Steps**:
- Add `resetToken: string` and `resetTokenExpiry: Date` fields to User model
- `POST /api/auth/forgot-password`: generates token, sends email via Resend with reset link
- `POST /api/auth/reset-password`: validates token, updates `passwordHash`, clears token
- Page: `app/recruiter/reset-password/page.tsx`

### 1.6 GitLab and DEV.to GitHub Action Source

**GitLab** (no OAuth needed): GitLab has a fully public API for public repos. Add `parseGitLab(username)` to `lib/sources.ts` the same way as DEV.to — fetch `https://gitlab.com/api/v4/users/${username}/projects` (no auth required for public projects). Change `kind` from `'oauth'` to `'public'` for GitLab.

**GitHub Action — "Sync on push"**: Create a GitHub Action YAML template that candidates can add to any repo. The action calls `POST /api/connections/sync` with a PAT. Every time they push to GitHub, their Intervue profile syncs. This is a massive engagement and retention driver — makes the platform feel alive.

```yaml
# .github/workflows/intervue-sync.yml
on: [push]
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://intervue.dev/api/connections/sync -H "Authorization: Bearer ${{ secrets.INTERVUE_TOKEN }}"
```

Add `POST /api/connections/sync` to accept a bearer token (stored as a User field `syncToken`) in addition to session auth.

---

## Phase 2 — Atlas Career Twin (~3 Weeks)

Turn Atlas from a one-time interview agent into a persistent career intelligence layer.

### 2.1 Weekly Career Analysis Job

**What**: Once a week, Atlas runs a structured analysis of each candidate's profile and generates a career intelligence report: what's strong, what's a gap, what's the market paying, what to study next.

**Implementation**:
- Add a BullMQ queue `career-analysis` to `lib/queue.ts`
- Job: `lib/jobs/careerAnalysis.ts` — for each active candidate, build their snapshot, call `getModel()` with a career analysis prompt, store result
- New model: `lib/models/CareerInsight.ts` with `userId, generatedAt, recommendations, gapSkills, salaryEstimate, marketTrends`
- Trigger: schedule with a cron-like approach (a `/api/cron/career-analysis` route gated by `CRON_SECRET`, called by Vercel Cron)
- UI: `app/atlas/page.tsx` (rename from `/agent`) — show career insights as a feed of weekly snapshots

### 2.2 Skill Gap Recommendations

**What**: Given the candidate's current skills and their target role, Atlas identifies the highest-leverage skill to improve next and why.

**Prompt design**:
```
Candidate: Backend Engineer
Target: Senior Backend Engineer
Current skills (with scores): Node.js 84, PostgreSQL 78, AWS 61, Docker 55, Kubernetes 32
Gap analysis: What 2-3 skills should they focus on to reach Senior Backend, in priority order?
Expected salary impact of each improvement?
```

**UI**: A "Study Plan" card on the candidate dashboard and Atlas page. Tapping a skill opens a gap session directly.

### 2.3 Salary Intelligence

**What**: Show candidates what the market pays for their current proof score level and target role. Not LLM guesses — ground this in data.

**Short-term approach**: Build a simple salary dataset in code (`lib/salaryData.ts`) as a JSON map of `{ role, location, p25, p50, p75 }` based on publicly available data (Levels.fyi, Glassdoor public data). Not a live API — just a reasonably maintained reference table. India LPA and USD ranges.

**Atlas integration**: When a candidate's skill scores change, show "Your profile puts you in the ₹18-22 LPA range for Senior Backend roles in Bangalore."

**Long-term**: As we accumulate offer data from accepted handshakes (the `Application` model captures outcomes), we build real market data from within the platform.

### 2.4 ProofScore Benchmark Feed

**What**: Show candidates where they rank per skill against others with the same target role — not just overall cohort percentile.

**Implementation**:
- New API: `GET /api/benchmarks?skill=React&targetRole=Frontend+Engineer` — returns p25/p50/p75 proof scores for that skill among candidates with that target role
- MongoDB aggregation: `Profile.aggregate([{ $unwind: '$parsedSkills' }, { $match: { 'parsedSkills.name': skill, targetRole: regex } }, { $group: { _id: null, scores: { $push: '$parsedSkills.proofScore' } } }])`
- UI: Small benchmark chip next to each skill on the dashboard ("You're in the top 23% for React among Frontend Engineers")

---

## Phase 3 — Recruiter Intelligence (~2 Weeks)

### 3.1 Funnel Analytics Dashboard

**What**: Give recruiters a real analytics view — not just a stat strip.

**Metrics to show**:
- Handshakes run → surfaced to candidate → candidate accepted → connected → hired (funnel)
- Avg time from sourcing to connection
- Which skills are hardest to fill (least tech bar cleared)
- Which roles convert best
- Candidate response rate by role

**Implementation**: New API `GET /api/recruiter/analytics` — MongoDB aggregation over Handshake and Application collections. New page `app/recruiter/analytics/page.tsx`. Use Recharts (already in stack) for funnel visualization.

### 3.2 Bulk Sourcing and Saved Searches

**What**: Recruiters with multiple open roles need to source efficiently. Add:
- "Source all active roles" button — enqueues sourcing for every open role at once
- Saved search templates (save a skill + score combination as a reusable filter)
- Candidate bookmarking (star a candidate to a shortlist, separate from a specific role)

### 3.3 Team Fit Analysis (Lightweight v1)

**What**: Recruiter inputs their current team's skills (manually, or by listing their GitHub usernames if they're in the system). When sourcing, Scout weights candidates by how well they complement the team's weaknesses.

**Implementation**:
- Add optional `teamContext: { skill: string; teamScore: number }[]` to RoleSpec
- In `lib/agents/fit.ts`, add a `teamComplementScore` to FitGates — bonus score for skills the team is weak on
- UI: Team composition input on the role creation form (optional section)

This is a small addition to the existing handshake flow but a big positioning differentiator.

### 3.4 ATS Webhook Push

**Current**: Recruiters pull from our ATS API. Enterprise ATS systems (Greenhouse, Lever, Ashby) expect webhook push when a candidate's status changes.

**Implementation**:
- Add `webhookUrl: string` to RoleSpec (or a new `RecruiterSettings` model)
- In `app/api/applications/[id]/route.ts` PATCH handler — when status changes, fire a `POST` to the webhook with the application data
- Format: standard ATS payload shape (candidate name, email, stage, profile URL, top skills + scores)

---

## Phase 4 — Open Source / Growth Flywheel (~1 Week)

These are cheap to build and drive organic adoption.

### 4.1 Open-Source Badge Ecosystem

The badge at `/api/badge/[username]/[skill]` is already built. Make it a growth channel:

- **GitHub README badge**: Create a markdown snippet generator on the public profile page. One click copies `![React 84](https://intervue.dev/api/badge/username/React)` — embeds the live badge in any README.
- **npm-style badge shields**: Add a `?style=flat` query param variant that renders a shields.io-compatible flat badge for embedding anywhere.
- **Badge verification page**: When someone clicks a badge image, it should go to a landing page showing the evidence behind the score — not just the score number. This is the trust proof that makes the badge worth embedding.

### 4.2 "Interview Questions Bank" (SEO / Inbound)

**What**: A public, statically generated question bank at `intervue.dev/questions/[topic]` with real interview questions grouped by skill and format. Each question links to "practice this question" → account creation flow.

**Why**: This is pure SEO. Search volume for "system design interview questions", "react interview questions" etc. is enormous. Our AI interview engine is the monetizable conversion at the end of the funnel.

**Implementation**: `app/questions/[topic]/page.tsx` — static generation with a curated JSON dataset of ~500 questions across 20 skills and 5 formats. No AI needed for the static page.

### 4.3 Embeddable Skill Verifier Widget

**What**: Companies can embed a widget on their own career page: "Verify your skills with Intervue before applying." Candidate completes one mini-session, their score is attached to the application.

**Implementation**: A `<script>` tag that loads an iframe pointing to `/embed/verify?skill=React&company=acme` — a stripped-down interview session (3 questions, 8 minutes). On completion, fires a postMessage with the session result to the parent page.

This is the "Interview as a Service" entry point for enterprise.

---

## Phase 5 — Monetization (~1-2 Weeks)

Don't build this until Phase 1 is done. Revenue without retention is churn.

### 5.1 Pricing Model

**Candidate Free**:
- 3 interview sessions/month
- Basic profile with GitHub source
- Public profile + badges
- Atlas matching (passive)

**Candidate Pro (₹499/month or $6/month)**:
- Unlimited sessions
- All source integrations (DEV.to, Stack Overflow, LinkedIn, GitLab)
- ProofScore timeline
- Salary intelligence
- Atlas Career Twin (weekly reports)
- Priority in sourcing results

**Recruiter Starter (₹4,999/month or $59/month)**:
- 3 active roles
- 50 sourcing runs/month
- Kanban pipeline
- ATS API

**Recruiter Pro (₹12,999/month or $149/month)**:
- Unlimited roles and sourcing
- Team Fit Agent
- Analytics suite
- Webhook push
- Bulk workflows

**Enterprise**: Custom pricing, private talent pools, white-label.

### 5.2 Stripe Integration

**Files to create**:
- `lib/stripe.ts` — Stripe client, price IDs as constants
- `app/api/billing/checkout/route.ts` — creates Stripe Checkout session
- `app/api/billing/webhook/route.ts` — handles `customer.subscription.created/updated/deleted`, writes `User.subscriptionTier`
- Add `subscriptionTier: 'free' | 'pro' | 'recruiter_starter' | 'recruiter_pro' | 'enterprise'` to User model
- Middleware: check `subscriptionTier` against feature gates in API routes

### 5.3 Usage Metering

Add `monthlySessionCount: number` and `monthlySessionReset: Date` to User. In `app/api/interview/start/route.ts`, check against tier limit before starting a session. Return `{ error: 'upgrade_required', upgradeUrl: '/billing' }` with status 402.

---

## Phase 6 — Long-Term Bets (3-6 Months)

Things we're planting the seed for now.

### 6.1 Offer Negotiation Agent

When a Handshake converts to a hire offer, Atlas activates a negotiation mode:
- Ingests the offer details (salary, equity, benefits)
- Benchmarks against our internal salary data (built in Phase 2.3) and the candidate's cohort position
- Generates a counter-offer recommendation with justification grounded in the candidate's proof scores
- Optionally drafts an actual negotiation email for the candidate to send

This is extremely high value — directly impacts the candidate's lifetime earnings. Strong case for a premium product or a success fee model (% of salary improvement).

### 6.2 Multi-Agent Network (The Real Long-Term)

Today: one Scout per role, one Atlas per candidate.

Future: Atlas agents from different candidates can form coalitions around skill clusters. Scout agents from different roles can share sourcing pre-filters. The "network of agents" becomes a market — bids, quotes, trust scores — that runs before any human is involved.

This is the recruiting protocol, not a recruiting app.

### 6.3 Video Interview Integration

Wire LiveKit for real-time video interviews. The AI interviewer becomes a voice agent (using a TTS service — ElevenLabs or OpenAI TTS) that can see the candidate's screen share for coding sessions. This competes directly with HireVue but with the advantage that results feed into verified proofScores, not opaque black-box assessments.

### 6.4 Mobile App (React Native / Expo)

The interview experience on mobile is subpar (Monaco editor, voice). But the Atlas agent UX — checking your matched opportunities, accepting/declining, chatting with the recruiter — is perfect for mobile. Build the Atlas and messaging experience as a native app first; the full interview engine stays web.

---

## What to Ignore (From the ChatGPT Roadmap)

The ChatGPT vision document had several ideas that are directionally right but tactically wrong to pursue now:

- **"Benchmark Network" as a standalone feature**: Correct direction, but our cohort percentile already does this. Phase 2.4 extends it without a separate product.
- **"ProofScore Timeline" with traceable deltas per source**: Right idea. We called this Phase 1.1 and it's 2 days of work, not a major feature.
- **"Offer Negotiation Agent"**: Very good. Deferred to Phase 6 because it requires salary data we don't have yet. Build the data layer in Phase 2 first.
- **"Team Fit Agent" as a complex separate product**: Our Phase 3.3 gets 80% of the value as a small addition to the handshake flow. Don't rebuild the whole matching engine for it.

---

## Execution Order Summary

| Phase | Focus | Est. Time | Unlocks |
|---|---|---|---|
| **0** | Fix silent bugs (percentile, N+1, search) | 3-4 days | Everything works as advertised |
| **1** | Score history, embeddings, GitLab, GitHub Action | 2 weeks | Demo-worthy, trust-worthy |
| **2** | Atlas Career Twin, salary, benchmarks | 3 weeks | Weekly engagement, retention |
| **3** | Recruiter analytics, team fit, webhooks | 2 weeks | Enterprise conversations |
| **4** | Badge ecosystem, question bank, embed widget | 1 week | Organic growth |
| **5** | Stripe, pricing, usage metering | 1-2 weeks | Revenue |
| **6** | Negotiation agent, video, mobile | 3-6 months | Platform defensibility |

**The one thing that matters most before anything in Phase 1+**: Phase 0. If `cohortPercentile` is always 0, the leaderboard is meaningless, the ranking in sourcing is random, and the "top X%" on the recruiter dashboard is wrong. Fix that first, then build.
