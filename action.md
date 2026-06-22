# Action Plan — Candidate-First

## The only question that matters right now

Can a developer drop an Intervue badge in their GitHub README, have a recruiter click it, and immediately understand what that person can actually do — without signing up, without knowing Intervue exists, in under 10 seconds?

If yes: every recruiter who clicks any badge is a potential customer. The product sells itself.
If no: nothing else matters.

Everything below is ordered to answer that question as fast as possible.

---

## Block 1 — Fix The Foundation (3 days)

The scores are wrong. The leaderboard is fake. Recruiter search is broken. These are not minor bugs — they mean the product is lying to everyone using it. Do this before touching anything else.

### 1.1 Wire cohortPercentile after profile generation
**File**: `app/api/profile/generate/route.ts` — after `profile.save()`:

```ts
const allProfiles = await Profile.find({ isPublic: true }).select('parsedSkills').lean()
const scores = allProfiles.map(p => {
  const sk = p.parsedSkills || []
  return sk.length ? sk.reduce((s: number, x: { proofScore: number }) => s + x.proofScore, 0) / sk.length : 0
})
const myScore = profile.parsedSkills.reduce((s: number, x: { proofScore: number }) => s + x.proofScore, 0) / (profile.parsedSkills.length || 1)
profile.cohortPercentile = calculateCohortPercentile(myScore, scores)
await profile.save()
```

Repeat at the bottom of `app/api/interview/[id]/complete/route.ts` after the skill update loop.

### 1.2 Fix proofScore formula for new interview skills
**File**: `app/api/interview/[id]/complete/route.ts` — line ~139.

Replace `calculateProofScore({ repoComplexity: analysis.overallScore })` with:
```ts
proofScore: Math.round(analysis.overallScore * 0.7 + 30 * 0.3)
```

Passing interview score as `repoComplexity` is semantically wrong and produces incorrect numbers.

### 1.3 Add idealAnswers to the interview analysis prompt
**File**: `app/api/interview/[id]/complete/route.ts` — in the `analysisPrompt` JSON schema, add:
```
"idealAnswers": {
  "<exact question asked>": "<what an expert answer looks like, 2-3 sentences>",
  ...one entry per question in the transcript...
}
```

The report page already renders `idealAnswers` but it's always `{}`. This is the most useful thing in a report — "here's what a senior engineer would have said."

### 1.4 Fix leaderboard N+1
**File**: `app/leaderboard/page.tsx` — line ~33 has `User.findById(p.userId)` inside a for-loop. Replace with:

```ts
const userIds = profiles.map(p => p.userId)
const users = await User.find({ _id: { $in: userIds } }).select('username name avatarUrl openToWork').lean()
const userMap = new Map(users.map(u => [u._id.toString(), u]))
// use userMap.get(p.userId.toString()) when mapping rows
```

50 roundtrips → 1.

### 1.5 Fix recruiter multi-skill search
**File**: `app/api/recruiter/search/route.ts` — `$elemMatch { name: { $in: skills } }` passes a candidate if they have ANY one skill from the list.

Replace with `$and` so ALL skills must match at the required score:
```ts
if (skills.length > 0) {
  filter['$and'] = skills.map((skill: string) => ({
    parsedSkills: {
      $elemMatch: { name: { $regex: skill, $options: 'i' }, proofScore: { $gte: minScore } }
    }
  }))
}
```

### 1.6 LinkedIn sync: fail visibly, not silently
**File**: `app/api/profile/sync/linkedin/route.ts` — wrap the scraper in try/catch. On failure:
```ts
return NextResponse.json({ error: 'LinkedIn sync unavailable', code: 'SERVICE_DOWN' }, { status: 503 })
```

The settings page already has `linkedinStatus` state — wire this code to show a clear "Service unavailable — try again later" with a retry button. Never fail silently.

---

## Block 2 — The Proof Story (1 week)

This is the highest-leverage week of engineering in the entire roadmap. After this block, every badge that gets clicked anywhere on the internet is a product demo.

### 2.1 Build `/proof/[username]/[skill]` — the most important page

**File to create**: `app/proof/[username]/[skill]/page.tsx`

This is NOT the profile page. It is a single-skill proof document. A recruiter lands here after clicking a badge. In 10 seconds they should know:

1. Who this person is — name, GitHub handle, target role, cohort percentile
2. What this skill score means — the number, the label, where they rank
3. Why the score is what it is — the actual evidence (GitHub repos, interview sessions, external sources)
4. What they demonstrated in a live session — a 2-3 sentence excerpt from the most recent interview transcript for this skill

No nav. No sidebar. No other skills. One skill, full story. Two CTAs at the bottom: "View full profile" and "Build yours free."

Data it needs (all available from existing API):
- `GET /api/profile/[username]` — skill score + evidence strings
- `GET /api/interview/sessions` (may need a filter) — most recent session for this skill, for the transcript excerpt

Layout sketch:
```
[intervue logo]                     [Build yours free →]

─────────────────────────────────────────────────────
[Avatar] [Name]  ·  Senior Backend Engineer  ·  Bangalore
         @github-handle  ·  Top 12% nationally
─────────────────────────────────────────────────────

        React
    [Score ring: 84/100]   Proficient · Top 18%

HOW THIS SCORE WAS BUILT
  ◆ GitHub — 18 repos, 1,240 commits across 3 years
  ◆ Interviews — 2 sessions, avg score 87/100
  ◆ DEV.to — 4 published articles on React patterns

WHAT THEY DEMONSTRATED IN A LIVE SESSION  (latest: Jun 18)
  Technical depth 89  ·  Problem solving 85  ·  Communication 90
  "Strong understanding of React reconciliation. Correctly identified
   the stale closure issue and proposed a useCallback solution..."

─────────────────────────────────────────────────────
  [View full profile →]    [Build yours free →]
```

### 2.2 Update badge click destination
The badge SVG at `app/api/badge/[username]/[skill]/route.ts` (or wherever it renders) likely links to `/p/[username]`. Change the link to `/proof/[username]/[encodeURIComponent(skill)]`.

Also check `components/portfolio/ShareBadgeButton.tsx` — any badge copy logic should use the proof URL, not the profile URL.

### 2.3 Badge markdown copy snippet on public profile
**File**: `app/p/[username]/page.tsx` — in the `SkillBar` component (or the `ShareBadgeButton`), add a copy button that writes to clipboard:
```
![React 84](https://intervue.dev/api/badge/USERNAME/React)
```

One click. No modal. Just copy. Developers share things that are easy to share.

### 2.4 The first-score activation moment — most important UX in the product

When a user completes a session and their score crosses a meaningful threshold for the **first time** (score ≥ 60 and `before === 0`), do not send them to the regular report. Show a full-screen celebration moment **right there, at peak engagement**.

The screen shows:
- "Your [Skill] score: **61**/100" with the animated score ring
- "You're now ranked. Share this." — not buried on the profile page, given directly
- The badge image (live, rendered): `![React 61](https://intervue.dev/api/badge/username/React)`
- A one-click copy button for the markdown snippet
- A "View your full report" link below (secondary CTA)

If score < 60 on the first session, skip the celebration and show the normal report with a clear next-step prompt: "Practice again — get to 60 to unlock your shareable badge."

**File**: `app/interview/report/[id]/page.tsx` — gate on `scoreUpdate.before === 0 && scoreUpdate.after >= 60`. If true, render the `FirstScoreScreen` component above the report (or as an overlay that the user dismisses to see the full report below).

This is the missing activation event. Without it the badge flywheel never starts.

### 2.5 Interview report: score update + share link

**File**: `app/api/interview/[id]/complete/route.ts` — include in the response:
```json
{
  "scoreUpdate": { "skill": "React", "before": 71, "after": 84, "delta": 13, "newPercentile": 85 }
}
```

**File**: `app/interview/report/[id]/page.tsx`:
1. Show a prominent banner at the top when `delta > 0`:
   "React: 71 → **84** (+13 pts) · You're now in the top 18% nationally"
2. Add an "idealAnswers" section after "Areas to Improve" — render the AI's expert answers for each question. This is the most instructive part of the report.
3. Add a "Share this report" button — make the report publicly accessible at this URL without auth. The candidate opts in by clicking share. Paste the URL to a recruiter and they see exactly what happened in the session.

---

## Block 3 — Atlas: Career Intelligence, Not a Handshake Inbox (1 week)

Atlas is currently a preferences panel + handshake inbox. That's a feature, not a product. Atlas needs to feel like it's watching your career and actually gives a shit about it.

### 3.1 Backend: proactive candidate context
**File**: `app/api/atlas/context/route.ts` — new GET endpoint, auth-gated.

Returns:
```json
{
  "proactiveInsight": "You haven't practiced Kubernetes in 47 days. Your score is 32. Three active roles in your area require ≥ 65. Want a focused session?",
  "decayingSkills": [{ "name": "Kubernetes", "score": 32, "daysSinceLastSession": 47, "requiredByActiveRoles": 3 }],
  "recentProgress": [{ "skill": "React", "before": 71, "after": 84, "delta": 13, "at": "2026-06-22" }],
  "pendingHandshakes": 2,
  "matchedRolesCount": 5
}
```

Logic for `proactiveInsight`: find the skill with the lowest score that is required by active sourcing roles, whose last interview session was > 30 days ago. One sentence. Direct. Actionable.

**File**: `lib/agents/atlas.ts` — add `buildCandidateContext(userId)` that gets profile + recent sessions + open handshakes. Prepend this to every Atlas prompt so the agent knows the candidate before they type anything.

### 3.2 Atlas page redesign
**File**: `app/agent/page.tsx` — full redesign.

Current page: preferences form + handshake list. Serviceable but not inspiring.

New structure:
```
Left panel (w-72, fixed):
  ┌──────────────────────┐
  │ Your top 5 skills    │ ← score rings, small
  │                      │
  │ React      84  ████  │
  │ Node.js    71  ███   │
  │ TypeScript 78  ████  │
  │                      │
  │ Cohort: top 12%      │
  │                      │
  │ ── Incoming ──────── │
  │  2 matches waiting   │ ← badge + click to expand
  │                      │
  │ ── Preferences ───── │
  │  [gear icon] Edit    │ ← collapsed by default
  └──────────────────────┘

Main area:
  ┌─────────────────────────────────────────────────┐
  │ Atlas opens with the proactive insight           │
  │ (fetched from /api/atlas/context)                │
  │                                                  │
  │  ┌─────────────────────────────────────────┐    │
  │  │ 💬 Kubernetes: 32/100 · 47 days idle    │    │
  │  │    3 roles need ≥65. Practice now?      │    │
  │  │    [Start 15-min session →]             │    │
  │  └─────────────────────────────────────────┘    │
  │                                                  │
  │  [Atlas chat below — user can ask anything]      │
  │                                                  │
  └─────────────────────────────────────────────────┘
```

Key change: Atlas speaks first. The first message is always the proactive insight, not a blank chat box. The "Start session" button goes directly to `/interview/new?skill=Kubernetes`.

Handshakes get a dedicated section in the left panel — a badge count. Clicking it expands to the current handshake list. The handshakes are important but they're not the primary UI. The primary UI is: Atlas knows what you should work on and tells you.

### 3.3 Score sparklines on dashboard + Atlas left panel
**Model**: `lib/models/Profile.ts` — add to `ISkill`:
```ts
scoreHistory: { score: number; source: string; at: Date }[]
```

**Write to scoreHistory in**:
- `app/api/interview/[id]/complete/route.ts` — push `{ score: newScore, source: 'interview', at: new Date() }` before saving
- `app/api/profile/generate/route.ts` — push `{ score: initial, source: 'github', at: now }` for each skill on first generation

**UI**: Tiny 40px sparkline (Recharts `LineChart`, minimal config, no axes, just the line) next to each skill score in both Atlas left panel and the dashboard. Shows growth trajectory. Recharts is already in the stack.

---

## Block 4 — GitHub Action Sync (3 days, do right after Block 1)

A developer adding a GitHub Action to their repo is a commitment signal. Every subsequent push is re-engagement you didn't pay for.

### 4.1 Sync token on User model
**File**: `lib/models/User.ts` — add `syncToken: string` and `lastSyncAt: Date`.

**File**: `app/api/me/sync-token/route.ts` — GET: if no `syncToken` exists, generate one (`crypto.randomBytes(32).toString('hex')`), save, return it.

**File**: `app/api/connections/sync/route.ts` — at the top of the POST handler, accept Bearer token auth:
```ts
const authHeader = req.headers.get('authorization')
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.slice(7)
  const user = await User.findOne({ syncToken: token })
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  // proceed with user._id instead of session.user.id
}
```

### 4.2 Settings: Auto-sync section
**File**: `app/settings/page.tsx` (Connections tab) — add under GitHub section:

Show a card titled "Auto-sync on push":
- Toggle: enable/disable
- Token display (blurred input, copy button, "Regenerate" button that hits `/api/me/sync-token`)
- YAML snippet pre-filled with the user's token, copy button
- "Last synced: 2 hours ago" pulled from `lastSyncAt`

### 4.3 Score change email on sync
**File**: `lib/jobs/syncConnections.ts` — after sync completes, compare scores before/after. If any skill changed:
```
Subject: Your profile updated — React: 71 → 84
Body: "Your push to github.com/you/my-app just updated your Intervue profile.
       React moved from 71 to 84 (+13 pts). View your proof score →"
```

One email per sync event. Only if a score changed. Via the existing `lib/email.ts`.

---

## Block 5 — Recruiter (after Blocks 1-2 are live)

Don't start this until the proof story works. The recruiter experience lives or dies on whether the scores are trustworthy. Fix the foundation first, then make the recruiter experience extraordinary.

### 5.1 Recruiter candidate card: proof confidence
Every candidate card in search results and the Kanban should show:
- Top 3 skills with score + a small "Verified by N sources" label
- "Last active: X days ago" (from `profile.updatedAt`)
- One-line AI summary (pull from `interviewSession.insightReport.strengths[0]` or the most recent session)

### 5.2 Skill deep-dive from recruiter card
When a recruiter clicks a skill badge on a candidate card → opens `/proof/[username]/[skill]` in a new tab. They get the full evidence trail before initiating a handshake.




### 5.3 Password reset for recruiter accounts
**Model**: `lib/models/User.ts` — add `resetToken: string`, `resetTokenExpiry: Date`.

**Routes**:
- `app/api/auth/forgot-password/route.ts` — POST: generate token, send email via `lib/email.ts`
- `app/api/auth/reset-password/route.ts` — POST: validate token, update `passwordHash`, clear token

**Page**: `app/recruiter/reset-password/page.tsx`

Add "Forgot password?" to `app/recruiter/login/page.tsx`. Recruiters who can't log in don't come back.

---

## Block 6 — Billing (after Block 3, before Block 5)

Don't build billing as the last thing. Build it when the product is good enough that someone would pay, but before it has so many features that the tier boundaries become confusing.

**Free tier must earn trust, not beg for upgrades:**
- Unlimited interview sessions — 3/month is not enough to believe the scores. Practice must be free.
- GitHub source, full public profile, badges, proof pages
- Atlas — can chat, can accept/decline handshakes
- Leaderboard visibility

**Pro — ₹399/month (not ₹499 — the lower anchor matters in India):**
- All source integrations (LinkedIn, DEV.to, Stack Overflow)
- Score history + sparklines
- GitHub Action auto-sync
- Atlas proactive insights (the weekly career snapshot)
- Priority in sourcing — shown first to recruiters
- Full interview report shareable links
- Download reports as PDF

Gate the growth and visibility layer, not the core practice experience.

**Files**: `lib/stripe.ts`, `app/api/billing/checkout/route.ts`, `app/api/billing/webhook/route.ts`

Add `subscriptionTier: 'free' | 'pro' | 'recruiter_starter' | 'recruiter_pro'` to `lib/models/User.ts`.

---

## Block 7 — Handshake: Make It Feel Like Something

The handshake protocol is the platform's secret. It's currently invisible — it happens in the background and the candidate just sees a notification. Make the ritual visible.

### 7.1 Handshake in-progress screen
When Atlas initiates a handshake with Scout, show the candidate a real-time screen — not just a notification:

```
Atlas is evaluating a match →

[Company hidden] · Senior Backend Engineer · Bangalore

Checking: React     84 ≥ 80  ✓  Cleared
Checking: Node.js   71 ≥ 70  ✓  Cleared
Checking: Docker    55 ≥ 60  ✗  Below bar

Result: Strong match · Tech bar cleared · 2 of 3 requirements met
Atlas: "Comp and location align. This role has been surfaced to you."
```

This is pure UI — the backend protocol already works. The candidate needs to SEE the machine working for them. That's the moment the platform feels different from everything else.

### 7.2 Immutable evidence snapshots
**File**: `lib/models/Handshake.ts` — change `evidenceIds: string[]` to:
```ts
evidence: {
  skillName: string
  proofScore: number
  sourceIds: string[]
  snapshotAt: Date
}[]
```

Snapshot scores at handshake time. The audit trail must be permanent. If a candidate improves their score later, the original handshake record still shows what was true when the match was made.

---

## What Not To Build Yet

| Feature | Why Not Now |
|---|---|
| Atlas weekly career analysis cron | No data signal yet. Build it when you have 200+ active candidates and you can see retention patterns |
| Salary intelligence | Requires real offer data from within the platform. The `Application` model will have it eventually — mine it then |
| Per-skill benchmark chips (p25/p50/p75) | Not enough profiles for meaningful percentiles yet |
| Semantic / embedding search | MongoDB Atlas M10+ vector search has a cost. Justify it with real recruiter usage first |
| Video interviews (LiveKit) | 3+ weeks of work. Ship everything above first |
| Question bank SEO pages | Content marketing. The product needs to work first |
| GitLab connector | Low leverage vs making GitHub excellent |
| Team fit agent | Phase 3 enterprise feature |
| ATS webhook push | No enterprise customers yet |

---

## The Signal to Watch

After Block 2 is live: measure badge clicks → proof page visits → signups.

If clicks don't convert to signups: the proof page isn't compelling enough. Fix it.
If clicks aren't happening: the badge isn't being shared. The copy snippet (2.3) wasn't discovered or the score wasn't high enough to be proud of. Fix the interview experience.
If clicks convert but people don't come back: Atlas (Block 3) is the answer.

Build in this order. Measure at each step. Don't skip ahead.
