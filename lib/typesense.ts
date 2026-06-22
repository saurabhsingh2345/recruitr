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
    { name: 'avgScore',     type: 'float' },
    { name: 'openToWork',   type: 'bool', facet: true },
    { name: 'updatedAt',    type: 'int64' },
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

export async function indexProfile(doc: {
  id: string
  userId: string
  username: string
  name: string
  bio?: string
  location?: string
  skills: string[]
  avgScore: number
  openToWork: boolean
  updatedAt: number
}) {
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

// ── Search candidates ─────────────────────────────────────────────────────

export interface TypesenseSearchParams {
  q: string
  skills?: string[]
  location?: string
  openToWork?: boolean
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

  const query = new URLSearchParams({
    q: params.q || '*',
    query_by: 'name,username,skills,bio',
    sort_by: 'avgScore:desc',
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
