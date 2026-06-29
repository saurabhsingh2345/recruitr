/**
 * Typesense client scaffold.
 * Set TYPESENSE_HOST, TYPESENSE_API_KEY, and TYPESENSE_PORT in .env to enable.
 * When not configured, all functions return null and callers fall back to MongoDB.
 */

const TYPESENSE_HOST = process.env.TYPESENSE_HOST
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY
const TYPESENSE_PORT = process.env.TYPESENSE_PORT || '8108'
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'https'

export const typesenseEnabled = Boolean(TYPESENSE_HOST && TYPESENSE_API_KEY)

const BASE_URL = typesenseEnabled
  ? `${TYPESENSE_PROTOCOL}://${TYPESENSE_HOST}:${TYPESENSE_PORT}`
  : ''

async function tsRequest(path: string, options: RequestInit = {}) {
  if (!typesenseEnabled) throw new Error('Typesense not configured')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY!,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Typesense ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── Collection schemas ────────────────────────────────────────────────────

export const PROFILES_SCHEMA = {
  name: 'profiles',
  fields: [
    { name: 'userId',       type: 'string' },
    { name: 'username',     type: 'string', facet: false },
    { name: 'name',         type: 'string' },
    { name: 'bio',          type: 'string', optional: true },
    { name: 'location',     type: 'string', optional: true, facet: true },
    { name: 'skills',       type: 'string[]', facet: true },
    { name: 'searchText',   type: 'string', optional: true },
    { name: 'avgScore',     type: 'float' },
    { name: 'openToWork',   type: 'bool', facet: true },
    { name: 'updatedAt',    type: 'int64' },
    // Auto-embedded vector for semantic search. Typesense generates the vector
    // on its own server from the listed fields (built-in MiniLM model — no
    // external embedding API needed), so a recruiter can search by intent
    // ("someone who can own infra at an early stage") not just keywords.
    {
      name: 'embedding',
      type: 'float[]',
      embed: {
        from: ['name', 'searchText', 'skills'],
        model_config: { model_name: 'ts/all-MiniLM-L12-v2' },
      },
    },
  ],
  default_sorting_field: 'avgScore',
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

export async function ensureCollections() {
  if (!typesenseEnabled) return
  try {
    const existing = (await tsRequest('/collections')) as { name: string }[]
    const names = existing.map(c => c.name)
    if (!names.includes('profiles')) {
      await tsRequest('/collections', { method: 'POST', body: JSON.stringify(PROFILES_SCHEMA) })
    }
  } catch (err) {
    console.error('[typesense] ensureCollections failed:', err)
  }
}

// ── Index a profile ───────────────────────────────────────────────────────

export interface ProfileDoc {
  id: string
  userId: string
  username: string
  name: string
  bio?: string
  location?: string
  skills: string[]
  /** rich free-text (skills + evidence + projects) the embedding is built from */
  searchText?: string
  avgScore: number
  openToWork: boolean
  updatedAt: number
}

export async function indexProfile(doc: ProfileDoc) {
  if (!typesenseEnabled) return
  try {
    await tsRequest(`/collections/profiles/documents/${doc.id}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    })
  } catch (err) {
    console.error('[typesense] indexProfile failed:', err)
  }
}

/** Bulk upsert via JSONL import — used by the backfill job. Returns count indexed. */
export async function indexProfilesBatch(docs: ProfileDoc[]): Promise<number> {
  if (!typesenseEnabled || docs.length === 0) return 0
  try {
    const jsonl = docs.map((d) => JSON.stringify(d)).join('\n')
    const res = await fetch(`${BASE_URL}/collections/profiles/documents/import?action=upsert`, {
      method: 'POST',
      headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY!, 'Content-Type': 'text/plain' },
      body: jsonl,
    })
    if (!res.ok) throw new Error(`Typesense import ${res.status}: ${await res.text()}`)
    const text = await res.text()
    // import returns one JSON result per line; count the successes
    return text.split('\n').filter((l) => l.includes('"success":true')).length
  } catch (err) {
    console.error('[typesense] indexProfilesBatch failed:', err)
    return 0
  }
}

export async function deleteProfileFromIndex(userId: string) {
  if (!typesenseEnabled) return
  try {
    await tsRequest(`/collections/profiles/documents/${userId}`, { method: 'DELETE' })
  } catch {
    // best-effort
  }
}

// ── Search candidates ─────────────────────────────────────────────────────

export interface TypesenseSearchParams {
  q: string
  skills?: string[]
  location?: string
  openToWork?: boolean
  minScore?: number
  page?: number
  perPage?: number
}

export interface TypesenseHit {
  userId: string
  username: string
  name: string
  location?: string
  skills: string[]
  avgScore: number
  openToWork: boolean
}

export async function searchCandidates(params: TypesenseSearchParams): Promise<TypesenseHit[] | null> {
  if (!typesenseEnabled) return null

  const filterParts: string[] = []
  if (params.skills?.length) filterParts.push(`skills:=[${params.skills.map(s => `\`${s}\``).join(',')}]`)
  if (params.location) filterParts.push(`location:=${params.location}`)
  if (params.openToWork != null) filterParts.push(`openToWork:=${params.openToWork}`)
  if (params.minScore && params.minScore > 0) filterParts.push(`avgScore:>=${params.minScore}`)

  const hasQuery = Boolean(params.q && params.q.trim() && params.q !== '*')
  // With a real query → hybrid (keyword + vector) so intent matches, not just
  // tokens. With no query → fall back to ranking by score.
  const query = new URLSearchParams({
    q: hasQuery ? params.q : '*',
    query_by: hasQuery ? 'name,username,skills,bio,embedding' : 'name',
    ...(hasQuery ? {} : { sort_by: 'avgScore:desc' }),
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
    ...(filterParts.length ? { filter_by: filterParts.join(' && ') } : {}),
  })

  try {
    const result = await tsRequest(`/collections/profiles/documents/search?${query}`)
    return (result.hits || []).map((h: { document: TypesenseHit }) => h.document)
  } catch (err) {
    console.error('[typesense] searchCandidates failed:', err)
    return null
  }
}
