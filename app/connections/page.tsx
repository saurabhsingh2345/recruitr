'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, RefreshCw, Check, X, Plus,
  Link2, ShieldCheck, Lock, Sparkles, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { pollJob } from '@/lib/pollJob'

interface SourceMeta { id: string; label: string; kind: 'public' | 'oauth'; placeholder: string; hint: string }
interface Connection { source: string; handle: string; status: string; summary: string; lastSyncedAt: string | null }

const SOURCE_COLORS: Record<string, string> = {
  github: '#ECF0FF', stackoverflow: '#8B7CF8', devto: '#3FC5F0',
  hackernews: '#ff6600', linkedin: '#0a66c2', twitter: '#AEB5E0', gitlab: '#fc6d26',
}

export default function ConnectionsPage() {
  const [sources, setSources] = useState<SourceMeta[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingGithub, setSyncingGithub] = useState(false)
  const [githubSyncResult, setGithubSyncResult] = useState<{ skillsAdded: number; projectsUpdated: number; publicRepos: number; noPublicRepos?: boolean } | null>(null)
  const [syncingTwitter, setSyncingTwitter] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingSource, setSavingSource] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/connections')
    if (res.ok) {
      const data = await res.json()
      setSources(data.sources || [])
      setConnections(data.connections || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const connOf = (id: string) => connections.find((c) => c.source === id)

  async function connect(source: string) {
    const handle = (drafts[source] || '').trim()
    if (!handle) { toast.error('Enter your handle first'); return }
    setSavingSource(source)
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, handle }),
      })
      if (res.ok) { toast.success(`${source} connected`); setDrafts((d) => ({ ...d, [source]: '' })); await load() }
      else toast.error('Failed to connect')
    } finally {
      setSavingSource(null)
    }
  }

  async function disconnect(source: string) {
    const res = await fetch(`/api/connections?source=${source}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Disconnected'); await load() }
  }

  async function syncGithub() {
    setSyncingGithub(true)
    setGithubSyncResult(null)
    try {
      const res = await fetch('/api/profile/sync/github', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'GitHub sync failed')
        return
      }
      if (!data.ok && data.reason === 'no_public_repos') {
        setGithubSyncResult({ skillsAdded: 0, projectsUpdated: 0, publicRepos: 0, noPublicRepos: true })
        toast.message('No public repos found', { description: 'Use the GitHub Actions token in Settings → Connections for private repos.' })
        return
      }
      setGithubSyncResult({ skillsAdded: data.skillsAdded, projectsUpdated: data.projectsUpdated, publicRepos: data.publicRepos })
      toast.success(`GitHub synced — ${data.skillsAdded} skills, ${data.projectsUpdated} projects`)
      await load()
    } catch {
      toast.error('GitHub sync failed')
    } finally {
      setSyncingGithub(false)
    }
  }

  async function syncTwitter() {
    setSyncingTwitter(true)
    try {
      const res = await fetch('/api/profile/sync/twitter', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'TWITTER_NOT_CONFIGURED') {
          toast.message('X/Twitter sync not available', { description: 'TWITTER_BEARER_TOKEN is not configured on this instance.' })
        } else {
          toast.error(data.error || 'X/Twitter sync failed')
        }
        return
      }
      toast.success(`X/Twitter synced — ${data.skillsAdded} skills extracted`)
      await load()
    } catch {
      toast.error('X/Twitter sync failed')
    } finally {
      setSyncingTwitter(false)
    }
  }

  async function syncAll() {
    setSyncing(true)
    try {
      const res = await fetch('/api/connections/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Sync failed'); return }
      if (data.queued) {
        toast.message('Parsing your sources in the background…')
        const result = await pollJob<{ message: string }>(data.jobId)
        toast.success(result.message)
      } else {
        toast.success(data.message)
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const publicSources = sources.filter((s) => s.kind === 'public')
  const oauthSources = sources.filter((s) => s.kind === 'oauth')
  // GitHub is always synthetic (connected via login); only count real non-github connections
  const syncableCount = connections.filter((c) => c.handle && c.source !== 'github').length

  return (
    <div className="min-h-screen text-foreground">
      <nav className="border-b border-white/[0.05] bg-[#050508]/95 backdrop-blur px-6 h-[56px] flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" className="shrink-0">
            <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
            <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold text-sm">intervue</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#2DE2C5]" /> Connect your sources
            </h1>
            <p className="text-sm text-white/40 max-w-lg">
              The more Atlas can see, the stronger it can represent you. We parse your public
              footprint across the internet into verified, evidence-backed skills.
            </p>
          </div>
          <Button onClick={syncAll} disabled={syncing || syncableCount === 0} className="btn-supernova font-semibold shrink-0">
            {syncing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Parsing…</> : <><RefreshCw className="w-4 h-4 mr-2" />Sync all</>}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {/* Public sources */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-[#2DE2C5]" />
                <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Parse now — public</h2>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0c1a] divide-y divide-white/[0.04]">
                {publicSources.map((s) => {
                  const conn = connOf(s.id)
                  const color = SOURCE_COLORS[s.id] || 'rgba(255,255,255,0.4)'
                  const isGithub = s.id === 'github'
                  const isTwitter = s.id === 'twitter'
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: color + '18', color }}>
                          {s.label[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{s.label}</span>
                            {conn?.handle && (
                              <Badge className="text-[9px]" style={{ background: '#2DE2C5' + '15', color: '#2DE2C5', borderColor: '#2DE2C5' + '30' }}>
                                <Check className="w-2.5 h-2.5 mr-0.5" /> connected
                              </Badge>
                            )}
                            {conn?.status === 'error' && !isGithub && (
                              <Badge className="text-[9px] bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/30">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> error
                              </Badge>
                            )}
                            {isGithub && githubSyncResult && !githubSyncResult.noPublicRepos && (
                              <span className="text-[10px] text-white/30">
                                {githubSyncResult.publicRepos} public repos · {githubSyncResult.skillsAdded} skills · {githubSyncResult.projectsUpdated} projects
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/30">
                            {isGithub && githubSyncResult?.noPublicRepos
                              ? 'No public repos found — use GitHub Actions token for private repos'
                              : conn?.summary || s.hint}
                          </p>
                        </div>
                        {isGithub && (
                          <Button size="sm" onClick={syncGithub} disabled={syncingGithub}
                            className="h-7 text-[11px] bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/25 hover:bg-[#2DE2C5]/20 shrink-0">
                            {syncingGithub ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                            {syncingGithub ? 'Syncing…' : 'Re-sync'}
                          </Button>
                        )}
                        {isTwitter && conn?.handle && (
                          <Button size="sm" onClick={syncTwitter} disabled={syncingTwitter}
                            className="h-7 text-[11px] bg-[#AEB5E0]/10 text-[#AEB5E0] border border-[#AEB5E0]/25 hover:bg-[#AEB5E0]/20 shrink-0">
                            {syncingTwitter ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                            {syncingTwitter ? 'Syncing…' : 'Sync'}
                          </Button>
                        )}
                        {conn?.handle && !isGithub && !isTwitter && (
                          <button onClick={() => disconnect(s.id)} className="text-white/25 hover:text-[#f43f5e] transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {isTwitter && conn?.handle && (
                          <button onClick={() => disconnect(s.id)} className="text-white/25 hover:text-[#f43f5e] transition-colors ml-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {!conn?.handle && !isGithub && (
                        <div className="flex gap-2 mt-2">
                          <input
                            value={drafts[s.id] || ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') connect(s.id) }}
                            placeholder={s.placeholder}
                            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#2DE2C5]/40"
                          />
                          <Button size="sm" onClick={() => connect(s.id)} disabled={savingSource === s.id} className="h-8 text-xs bg-[#2DE2C5]/15 text-[#2DE2C5] border border-[#2DE2C5]/30 hover:bg-[#2DE2C5]/25">
                            {savingSource === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3 mr-1" />Connect</>}
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* OAuth sources */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-white/30" />
                <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Sync via Settings</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {oauthSources.map((s) => {
                  const color = SOURCE_COLORS[s.id] || 'rgba(255,255,255,0.4)'
                  const isGitlab = s.id === 'gitlab'
                  return (
                    <div key={s.id} className="p-4 rounded-xl border border-white/[0.06] bg-[#0a0c1a] opacity-50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mb-2" style={{ background: color + '18', color }}>
                        {s.label[0]}
                      </div>
                      <div className="text-sm font-semibold">{s.label}</div>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-tight">
                        {isGitlab ? 'Configure in Settings → Connections' : s.hint}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-white/25 mt-3 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#8B7CF8]" />
                GitLab syncs via Settings → Connections.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
