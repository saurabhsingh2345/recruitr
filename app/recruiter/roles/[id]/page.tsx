'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Code2, ArrowLeft, Sparkles, Loader2, Target, MapPin, Building2,
  CheckCircle2, XCircle, Clock, ExternalLink, Zap, ShieldCheck, Plus, X, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { pollJob } from '@/lib/pollJob'

interface SkillBar { skill: string; minScore: number; specialization?: string; minSpecScore?: number }
interface SkillMatch { skill: string; required: number; candidateScore: number | null; cleared: boolean }
interface Verdict {
  mutualFit: boolean; techBarCleared: boolean; compOverlap: boolean
  locationMatch: boolean; stageMatch: boolean; dealbreakerHit: boolean
  reasoning: string; score: number
}
interface Exchange { from: 'scout' | 'atlas'; kind: string; content: string; evidenceSnapshot: { skillName: string; proofScore: number; snapshotAt: string }[]; at: string }
interface Handshake {
  _id: string
  candidateName: string; candidateUsername: string; candidateAvatar: string
  status: string
  verdict: Verdict | null
  exchanges: Exchange[]
}
interface Role {
  _id: string; title: string; seniority: string; company: string
  mustHave: SkillBar[]; niceHave: SkillBar[]
  compMinLpa: number; compMaxLpa: number; locations: string[]; stage: string
  domain: string; teamContext: string; status: string; blind: boolean
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  surfaced_to_candidate: { label: 'Surfaced — awaiting candidate', color: '#f59e0b' },
  candidate_accepted: { label: 'Interested', color: '#2DE2C5' },
  candidate_declined: { label: 'Candidate passed', color: '#AEB5E0' },
  declined_by_atlas: { label: 'Not a fit', color: '#888FC0' },
  connected: { label: 'Connected', color: '#2DE2C5' },
}

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [role, setRole] = useState<Role | null>(null)
  const [handshakes, setHandshakes] = useState<Handshake[]>([])
  const [loading, setLoading] = useState(true)
  const [sourcing, setSourcing] = useState(false)
  const [asks, setAsks] = useState<string[]>([])
  const [newAsk, setNewAsk] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [forecast, setForecast] = useState<{
    totalPassingAllGates: number
    totalVerifiedCandidates: number
    skillGates: { skill: string; required: number; candidatesAboveBar: number; sensitivityGain: number }[]
    bottleneckSkill: string | null
  } | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/roles/${id}`)
    if (res.ok) {
      const data = await res.json()
      setRole(data.role)
      setHandshakes(data.handshakes || [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const loadForecast = useCallback(async () => {
    if (!role) return
    setForecastLoading(true)
    try {
      const res = await fetch('/api/recruiter/roles/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mustHave: role.mustHave, locations: role.locations }),
      })
      if (res.ok) setForecast(await res.json())
    } finally {
      setForecastLoading(false)
    }
  }, [role])

  async function runSourcing() {
    setSourcing(true)
    try {
      const res = await fetch(`/api/roles/${id}/source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asks }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Sourcing failed'); return }
      if (data.queued) {
        toast.message('Scout is sourcing in the background…')
        const result = await pollJob<{ message: string }>(data.jobId)
        toast.success(result.message || 'Scout finished sourcing')
      } else {
        toast.success(data.message || 'Scout finished sourcing')
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sourcing failed')
    } finally {
      setSourcing(false)
    }
  }

  // Show fits first, then everything else
  const fits = handshakes.filter((h) =>
    ['surfaced_to_candidate', 'candidate_accepted', 'connected'].includes(h.status)
  )
  const others = handshakes.filter((h) => !fits.includes(h))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
      </div>
    )
  }
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#AEB5E0]">Role not found.</div>
    )
  }

  return (
    <div className="min-h-screen text-foreground">
      <nav className="border-b border-white/[0.05] glass-card px-6 h-14 flex items-center justify-between">
        <Link href="/recruiter/roles" className="flex items-center gap-2 text-sm text-[#AEB5E0] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> All roles
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center shadow-[0_0_12px_rgba(45,226,197,0.4)]">
            <Code2 className="w-4 h-4 text-[#05060F]" />
          </div>
          <span className="font-bold text-sm">intervue</span>
          <Badge className="bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20 text-[10px]">Scout</Badge>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-[300px_1fr] gap-6">
        {/* ── Left: the bar ── */}
        <div className="space-y-4">
          <div className="node-panel p-5">
            <div className="flex items-start justify-between mb-1">
              <h1 className="text-lg font-bold leading-tight">{role.title}</h1>
              {role.blind && <Badge className="bg-[#8B7CF8]/10 text-[#8B7CF8] border-[#8B7CF8]/20 text-[9px]">Blind</Badge>}
            </div>
            <div className="text-xs text-[#AEB5E0] capitalize mb-4">
              {role.seniority} · {role.company || 'your company'}
            </div>

            <div className="space-y-3 text-xs">
              {role.compMaxLpa > 0 && (
                <div className="flex items-center gap-2 text-[#AEB5E0]">
                  <Zap className="w-3.5 h-3.5 text-[#2DE2C5]" />
                  {role.compMinLpa || '?'}–{role.compMaxLpa} LPA
                </div>
              )}
              {role.locations.length > 0 && (
                <div className="flex items-center gap-2 text-[#AEB5E0]">
                  <MapPin className="w-3.5 h-3.5 text-[#3FC5F0]" />
                  {role.locations.join(', ')}
                </div>
              )}
              {role.stage && (
                <div className="flex items-center gap-2 text-[#AEB5E0]">
                  <Building2 className="w-3.5 h-3.5 text-[#8B7CF8]" />
                  {role.stage}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="text-[10px] text-[#888FC0] uppercase tracking-wider mb-2 font-semibold">Must-have bar</div>
              <div className="flex flex-wrap gap-1.5">
                {role.mustHave.length ? role.mustHave.map((m) => (
                  <div key={m.skill} className="flex flex-col gap-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-[#2DE2C5]/25 bg-[#2DE2C5]/5 text-[#2DE2C5] font-medium">
                      {m.skill} ≥{m.minScore}
                    </span>
                    {m.specialization && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-[#8B7CF8]/20 bg-[#8B7CF8]/5 text-[#8B7CF8] font-medium">
                        {m.specialization} ≥{m.minSpecScore}
                      </span>
                    )}
                  </div>
                )) : <span className="text-[10px] text-[#888FC0]">none</span>}
              </div>
              {role.niceHave.length > 0 && (
                <>
                  <div className="text-[10px] text-[#888FC0] uppercase tracking-wider mt-3 mb-2 font-semibold">Nice to have</div>
                  <div className="flex flex-wrap gap-1.5">
                    {role.niceHave.map((m) => (
                      <span key={m.skill} className="text-[10px] px-1.5 py-0.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-[#AEB5E0]">
                        {m.skill} ≥{m.minScore}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Asks Scout will pose to candidate agents */}
          <div className="node-panel p-5">
            <div className="text-[10px] text-[#888FC0] uppercase tracking-wider mb-2 font-semibold">Questions for Atlas</div>
            <p className="text-[11px] text-[#AEB5E0] mb-3 leading-relaxed">
              Scout asks each candidate&apos;s agent these — answered from verified evidence.
            </p>
            <div className="space-y-1.5 mb-3">
              {asks.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#ECF0FF] bg-[#05060F] border border-[#1A1E3A] rounded-lg px-2.5 py-1.5">
                  <span className="flex-1">{a}</span>
                  <button onClick={() => setAsks(asks.filter((_, j) => j !== i))} className="text-[#888FC0] hover:text-[#f43f5e]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newAsk}
                onChange={(e) => setNewAsk(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newAsk.trim()) { setAsks([...asks, newAsk.trim()]); setNewAsk('') } }}
                placeholder="e.g. Has she led a team?"
                className="flex-1 bg-[#05060F] border border-[#1A1E3A] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
              />
              <button
                onClick={() => { if (newAsk.trim()) { setAsks([...asks, newAsk.trim()]); setNewAsk('') } }}
                className="px-2 rounded-lg bg-[#2DE2C5]/10 text-[#2DE2C5] hover:bg-[#2DE2C5]/20"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pool forecast panel */}
          <div className="node-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#3FC5F0]" />
                <div className="text-[10px] text-[#888FC0] uppercase tracking-wider font-semibold">Pool forecast</div>
              </div>
              <button
                onClick={loadForecast}
                disabled={forecastLoading}
                className="text-[10px] text-[#2DE2C5] hover:text-[#5BF0D8] transition-colors disabled:opacity-50"
              >
                {forecastLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Check pool →'}
              </button>
            </div>
            {forecast ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{forecast.totalPassingAllGates}</span>
                  <span className="text-xs text-[#AEB5E0]">of {forecast.totalVerifiedCandidates} pass all gates</span>
                </div>
                {forecast.skillGates.map((g) => (
                  <div key={g.skill} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#AEB5E0]">{g.skill} ≥{g.required}</span>
                      <span className="font-mono text-white">{g.candidatesAboveBar}</span>
                    </div>
                    {g.sensitivityGain > 0 && (
                      <div className="text-[10px] text-[#888FC0]">
                        Loosen by 10 → +{g.sensitivityGain} candidates
                      </div>
                    )}
                  </div>
                ))}
                {forecast.bottleneckSkill && (
                  <div className="mt-2 pt-2 border-t border-white/[0.05] text-[11px] text-[#f59e0b]">
                    ⚠ Bottleneck: {forecast.bottleneckSkill}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[#888FC0]">Click "Check pool" to see how many verified engineers clear this role&apos;s bar.</p>
            )}
          </div>

          <Button onClick={runSourcing} disabled={sourcing} className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
            {sourcing
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Scout is sourcing…</>
              : <><Sparkles className="w-4 h-4 mr-2" />Run Scout sourcing</>}
          </Button>
        </div>

        {/* ── Right: handshake results ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#2DE2C5]" />
            <h2 className="font-semibold">Handshakes</h2>
            <span className="text-xs text-[#888FC0]">
              {fits.length} fit{fits.length === 1 ? '' : 's'} · {handshakes.length} evaluated
            </span>
          </div>

          {handshakes.length === 0 ? (
            <div className="node-panel p-10 text-center">
              <ShieldCheck className="w-10 h-10 text-[#2DE2C5]/40 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No handshakes yet</h3>
              <p className="text-sm text-[#AEB5E0] max-w-sm mx-auto">
                Hit <span className="text-[#2DE2C5]">Run Scout sourcing</span>. Scout evaluates verified
                engineers against your bar and negotiates fit with each candidate&apos;s agent — you only
                see the ones who genuinely match.
              </p>
            </div>
          ) : (
            <>
              {[...fits, ...others].map((h) => {
                const meta = STATUS_META[h.status] || { label: h.status, color: '#AEB5E0' }
                const isOpen = expanded === h._id
                return (
                  <motion.div key={h._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="node-panel p-4">
                    <div className="flex items-center gap-3">
                      {h.candidateAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.candidateAvatar} alt={h.candidateName} className="w-9 h-9 rounded-full" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#3FC5F0] flex items-center justify-center text-[#05060F] font-bold text-sm">
                          {h.candidateName?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{h.candidateName}</span>
                          {h.verdict && h.verdict.mutualFit && (
                            <span className="text-xs font-mono font-bold text-[#2DE2C5]">{h.verdict.score}</span>
                          )}
                        </div>
                        <span className="text-[11px]" style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/p/${h.candidateUsername}`} target="_blank">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-white/[0.08] text-[#AEB5E0] hover:text-white">
                            <ExternalLink className="w-3 h-3 mr-1" /> Profile
                          </Button>
                        </Link>
                        <button
                          onClick={() => setExpanded(isOpen ? null : h._id)}
                          className="text-xs text-[#2DE2C5] hover:text-[#5BF0D8]"
                        >
                          {isOpen ? 'Hide' : 'Transcript'}
                        </button>
                      </div>
                    </div>

                    {/* Gate chips */}
                    {h.verdict && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {[
                          ['Tech bar', h.verdict.techBarCleared],
                          ['Comp', h.verdict.compOverlap],
                          ['Location', h.verdict.locationMatch],
                          ['Stage', h.verdict.stageMatch],
                          ['No dealbreakers', !h.verdict.dealbreakerHit],
                        ].map(([label, ok]) => (
                          <span
                            key={label as string}
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
                            style={{
                              background: ok ? 'rgba(45,226,197,0.08)' : 'rgba(244,63,94,0.08)',
                              color: ok ? '#2DE2C5' : '#f43f5e',
                            }}
                          >
                            {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {label as string}
                          </span>
                        ))}
                      </div>
                    )}

                    {h.verdict?.reasoning && (
                      <p className="text-xs text-[#AEB5E0] mt-3 leading-relaxed italic">“{h.verdict.reasoning}”</p>
                    )}

                    {/* Agent transcript */}
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                        {h.exchanges.map((ex, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span
                              className="font-semibold shrink-0 w-12"
                              style={{ color: ex.from === 'scout' ? '#3FC5F0' : '#2DE2C5' }}
                            >
                              {ex.from === 'scout' ? 'Scout' : 'Atlas'}
                            </span>
                            <span className="text-[#AEB5E0] flex-1 leading-relaxed">{ex.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
