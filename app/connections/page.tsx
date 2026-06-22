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
  const connectedCount = connections.filter((c) => c.handle).length

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
          <Button onClick={syncAll} disabled={syncing || connectedCount === 0} className="btn-supernova font-semibold shrink-0">
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
                            {conn?.status === 'error' && (
                              <Badge className="text-[9px] bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/30">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> error
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-white/30">{conn?.summary || s.hint}</p>
                        </div>
                        {conn?.handle && !isGithub && (
                          <button onClick={() => disconnect(s.id)} className="text-white/25 hover:text-[#f43f5e] transition-colors">
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
                <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Needs OAuth — coming soon</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {oauthSources.map((s) => {
                  const color = SOURCE_COLORS[s.id] || 'rgba(255,255,255,0.4)'
                  return (
                    <div key={s.id} className="p-4 rounded-xl border border-white/[0.06] bg-[#0a0c1a] opacity-50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mb-2" style={{ background: color + '18', color }}>
                        {s.label[0]}
                      </div>
                      <div className="text-sm font-semibold">{s.label}</div>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{s.hint}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-white/25 mt-3 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#8B7CF8]" />
                LinkedIn, X, and GitLab need an OAuth app. Once configured, Atlas pulls roles,
                endorsements, and reach automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
