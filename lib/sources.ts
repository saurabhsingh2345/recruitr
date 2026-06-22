/**
 * External source parsers — the multi-source identity graph (plan §4).
 *
 * Each parser fetches a candidate's public footprint on a platform and returns
 * normalized skill signals + a human summary. These feed the verified profile
 * and give Atlas real evidence to represent the candidate with.
 *
 * Implemented now (free public APIs, no OAuth): DEV.to, Stack Overflow, Hacker News.
 * Slots reserved for OAuth-gated sources (LinkedIn, Twitter, GitLab) — see SOURCES.
 */

export interface SourceSignal {
  name: string          // skill / topic
  evidenceLine: string  // human-readable evidence
  weight: number        // 0-100 signal strength → influences proof score
}

export interface SourceResult {
  ok: boolean
  summary: string
  signals: SourceSignal[]
  error?: string
}

export interface SourceMeta {
  id: string
  label: string
  kind: 'public' | 'oauth'   // public = parse by handle now; oauth = needs app creds
  placeholder: string
  hint: string
}

export const SOURCES: SourceMeta[] = [
  { id: 'github',        label: 'GitHub',          kind: 'public', placeholder: 'username',        hint: 'Repos, commits, languages (already connected via login)' },
  { id: 'linkedin',      label: 'LinkedIn',        kind: 'public', placeholder: 'profile url (linkedin.com/in/…)', hint: 'Roles, tenure, education, about — via secure scraper' },
  { id: 'stackoverflow', label: 'Stack Overflow',  kind: 'public', placeholder: 'user id (e.g. 1234567)', hint: 'Reputation, top tags, answer quality' },
  { id: 'devto',         label: 'DEV.to',          kind: 'public', placeholder: 'username',        hint: 'Articles, topics, engagement' },
  { id: 'hackernews',    label: 'Hacker News',     kind: 'public', placeholder: 'username',        hint: 'Karma, community presence' },
  { id: 'twitter',       label: 'X / Twitter',     kind: 'oauth',  placeholder: 'handle',          hint: 'Technical threads, reach — needs OAuth app' },
  { id: 'gitlab',        label: 'GitLab',          kind: 'oauth',  placeholder: 'username',        hint: 'Repos, MRs — needs OAuth app' },
]

const TIMEOUT = 8000

/* ── DEV.to ─────────────────────────────────────────────────── */

export async function parseDevto(username: string): Promise<SourceResult> {
  try {
    const res = await fetch(
      `https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=30`,
      { signal: AbortSignal.timeout(TIMEOUT) }
    )
    if (!res.ok) return { ok: false, summary: '', signals: [], error: `DEV.to returned ${res.status}` }
    const articles = (await res.json()) as {
      tag_list: string[]; positive_reactions_count: number; title: string
    }[]
    if (!Array.isArray(articles) || articles.length === 0) {
      return { ok: true, summary: 'No public DEV.to articles found.', signals: [] }
    }

    const totalReactions = articles.reduce((s, a) => s + (a.positive_reactions_count || 0), 0)
    // Aggregate tags → topic signals
    const tagCount: Record<string, number> = {}
    const tagReactions: Record<string, number> = {}
    for (const a of articles) {
      for (const t of a.tag_list || []) {
        tagCount[t] = (tagCount[t] || 0) + 1
        tagReactions[t] = (tagReactions[t] || 0) + (a.positive_reactions_count || 0)
      }
    }

    const signals: SourceSignal[] = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({
        name: normalizeTag(tag),
        evidenceLine: `Wrote ${count} DEV.to article${count > 1 ? 's' : ''} on ${tag} (${tagReactions[tag]} reactions)`,
        weight: Math.min(70, 35 + count * 6 + Math.min(20, tagReactions[tag] / 5)),
      }))

    // Technical writing as a behavioral skill
    signals.push({
      name: 'Technical Writing',
      evidenceLine: `Published ${articles.length} articles on DEV.to with ${totalReactions} total reactions`,
      weight: Math.min(85, 40 + articles.length * 3 + Math.min(25, totalReactions / 10)),
    })

    return {
      ok: true,
      summary: `${articles.length} articles · ${totalReactions} reactions`,
      signals,
    }
  } catch (err) {
    return { ok: false, summary: '', signals: [], error: String(err) }
  }
}

/* ── Stack Overflow ─────────────────────────────────────────── */

export async function parseStackOverflow(userId: string): Promise<SourceResult> {
  const id = userId.replace(/\D/g, '')
  if (!id) return { ok: false, summary: '', signals: [], error: 'Stack Overflow needs a numeric user id' }
  try {
    const [userRes, tagRes] = await Promise.all([
      fetch(`https://api.stackexchange.com/2.3/users/${id}?site=stackoverflow`, { signal: AbortSignal.timeout(TIMEOUT) }),
      fetch(`https://api.stackexchange.com/2.3/users/${id}/top-tags?site=stackoverflow&pagesize=8`, { signal: AbortSignal.timeout(TIMEOUT) }),
    ])
    if (!userRes.ok) return { ok: false, summary: '', signals: [], error: `Stack Overflow returned ${userRes.status}` }

    const userData = (await userRes.json()) as { items?: { reputation: number; display_name: string }[] }
    const user = userData.items?.[0]
    if (!user) return { ok: true, summary: 'No Stack Overflow user found for that id.', signals: [] }

    const tagData = (await tagRes.json()) as {
      items?: { tag_name: string; answer_score: number; answer_count: number }[]
    }
    const tags = tagData.items || []

    const signals: SourceSignal[] = tags
      .filter((t) => t.answer_count > 0)
      .slice(0, 6)
      .map((t) => ({
        name: normalizeTag(t.tag_name),
        evidenceLine: `${t.answer_count} Stack Overflow answers in ${t.tag_name} (score ${t.answer_score})`,
        weight: Math.min(90, 45 + Math.min(30, t.answer_score) + Math.min(15, t.answer_count * 2)),
      }))

    return {
      ok: true,
      summary: `${user.reputation.toLocaleString()} reputation · ${tags.length} active tags`,
      signals,
    }
  } catch (err) {
    return { ok: false, summary: '', signals: [], error: String(err) }
  }
}

/* ── Hacker News ────────────────────────────────────────────── */

export async function parseHackerNews(username: string): Promise<SourceResult> {
  try {
    const res = await fetch(
      `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(username)}.json`,
      { signal: AbortSignal.timeout(TIMEOUT) }
    )
    if (!res.ok) return { ok: false, summary: '', signals: [], error: `HN returned ${res.status}` }
    const user = (await res.json()) as { karma?: number; created?: number } | null
    if (!user) return { ok: true, summary: 'No Hacker News user found.', signals: [] }

    const years = user.created ? Math.max(1, Math.round((Date.now() / 1000 - user.created) / 31536000)) : 0
    // HN is a community-presence signal, not a hard skill — surfaced as evidence only.
    const signals: SourceSignal[] = []
    if ((user.karma || 0) > 50) {
      signals.push({
        name: 'Community Engagement',
        evidenceLine: `${user.karma} Hacker News karma over ${years} year${years > 1 ? 's' : ''}`,
        weight: Math.min(75, 30 + Math.min(40, (user.karma || 0) / 50)),
      })
    }

    return { ok: true, summary: `${user.karma || 0} karma · ${years}y on HN`, signals }
  } catch (err) {
    return { ok: false, summary: '', signals: [], error: String(err) }
  }
}

/* ── LinkedIn (via Python parser microservice + linkedin_scraper) ── */

export async function parseLinkedIn(profileUrl: string): Promise<SourceResult> {
  const parserUrl = process.env.PARSER_SERVICE_URL
  if (!parserUrl) {
    return { ok: false, summary: '', signals: [], error: 'LinkedIn parser service not configured (PARSER_SERVICE_URL)' }
  }
  try {
    const res = await fetch(`${parserUrl}/parse/linkedin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': process.env.PARSER_SERVICE_SECRET || '',
      },
      body: JSON.stringify({ profile_url: profileUrl }),
      signal: AbortSignal.timeout(90000), // scraping is slow
    })
    if (!res.ok) {
      return { ok: false, summary: '', signals: [], error: `Parser returned ${res.status}` }
    }
    const data = (await res.json()) as SourceResult
    return data
  } catch (err) {
    return { ok: false, summary: '', signals: [], error: String(err) }
  }
}

/* ── Dispatcher ─────────────────────────────────────────────── */

export async function parseSource(source: string, handle: string): Promise<SourceResult> {
  switch (source) {
    case 'devto': return parseDevto(handle)
    case 'stackoverflow': return parseStackOverflow(handle)
    case 'hackernews': return parseHackerNews(handle)
    case 'linkedin': return parseLinkedIn(handle)
    default:
      return { ok: false, summary: '', signals: [], error: `${source} requires OAuth — not yet available` }
  }
}

/* ── helpers ────────────────────────────────────────────────── */

function normalizeTag(tag: string): string {
  const map: Record<string, string> = {
    js: 'JavaScript', ts: 'TypeScript', javascript: 'JavaScript', typescript: 'TypeScript',
    node: 'Node.js', nodejs: 'Node.js', golang: 'Go', go: 'Go', py: 'Python', python: 'Python',
    reactjs: 'React', react: 'React', postgres: 'PostgreSQL', postgresql: 'PostgreSQL',
    k8s: 'Kubernetes', kubernetes: 'Kubernetes', aws: 'AWS', rust: 'Rust', java: 'Java',
  }
  const key = tag.toLowerCase().replace(/[.\s-]/g, '')
  if (map[key]) return map[key]
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}
