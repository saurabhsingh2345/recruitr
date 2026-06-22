'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, Users, Loader2, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react'
import { CandidateNav } from '@/components/CandidateNav'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from 'sonner'

interface TeamMember {
  userId: string
  name: string
  username: string
  joinedAt: string
  skills: Array<{ name: string; proofScore: number }>
}

interface TeamData {
  _id: string
  name: string
  inviteCode: string
  members: TeamMember[]
  ownerId: string
}

interface RadarPoint {
  skill: string
  teamAvg: number
  maxMember: number
  coverage: number
}

interface Analysis {
  radar: RadarPoint[]
  strengths: string[]
  gaps: string[]
  memberCount: number
  aiRecommendation: string
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    fetch(`/api/teams/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTeam(d?.team ?? null); setLoadingTeam(false) })
      .catch(() => setLoadingTeam(false))
  }, [id])

  async function loadAnalysis() {
    setLoadingAnalysis(true)
    const r = await fetch(`/api/teams/${id}/analysis`)
    if (r.ok) setAnalysis(await r.json())
    setLoadingAnalysis(false)
  }

  async function regenerateCode() {
    setRegenerating(true)
    const r = await fetch(`/api/teams/${id}/invite`, { method: 'POST' })
    if (r.ok) {
      const { inviteCode } = await r.json()
      setTeam(prev => prev ? { ...prev, inviteCode } : prev)
      toast.success('New invite code generated')
    }
    setRegenerating(false)
  }

  function copyLink() {
    const url = `${window.location.origin}/team/join/${team?.inviteCode}`
    navigator.clipboard?.writeText(url)
    toast.success('Invite link copied')
  }

  if (loadingTeam) {
    return (
      <div className="min-h-screen bg-[#04050e] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2DE2C5]" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#04050e] text-white">
        <CandidateNav />
        <div className="max-w-xl mx-auto px-4 py-32 text-center">
          <h1 className="text-xl font-semibold mb-4">Team not found</h1>
          <Link href="/dashboard" className="text-[#2DE2C5] text-sm hover:underline">← Dashboard</Link>
        </div>
      </div>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/team/join/${team.inviteCode}`

  return (
    <div className="min-h-screen bg-[#04050e] text-white">
      <CandidateNav />
      <div className="max-w-3xl mx-auto px-4 py-10">

        <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">{team.name}</h1>
            <div className="flex items-center gap-2 text-xs text-white/35">
              <Users className="w-3.5 h-3.5" />
              {team.members.length} member{team.members.length !== 1 ? 's' : ''}
            </div>
          </div>
          {/* Invite */}
          <div className="text-right">
            <div className="text-xs text-white/30 mb-1.5">Invite link</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 font-mono text-[#2DE2C5]">
                {team.inviteCode}
              </code>
              <button
                onClick={copyLink}
                className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-white/40"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={regenerateCode}
                disabled={regenerating}
                className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-white/40 disabled:opacity-40"
                title="Regenerate invite code"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-[10px] text-white/20 mt-1 max-w-[200px] truncate">{joinUrl}</div>
          </div>
        </div>

        {/* Members */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 mb-6">
          <h2 className="text-xs text-white/30 uppercase tracking-wider mb-4">Members</h2>
          <div className="space-y-3">
            {team.members.map(m => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2DE2C5]/10 flex items-center justify-center text-sm font-semibold text-[#2DE2C5]">
                  {m.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.name || m.username}</div>
                  {m.username && (
                    <div className="text-xs text-white/30 truncate">@{m.username}</div>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[200px]">
                  {m.skills.slice(0, 3).map(s => (
                    <span key={s.name} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/40">
                      {s.name} {s.proofScore}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill graph */}
        {!analysis ? (
          <button
            onClick={loadAnalysis}
            disabled={loadingAnalysis}
            className="w-full py-3.5 rounded-xl border border-[#2DE2C5]/20 text-[#2DE2C5] text-sm hover:bg-[#2DE2C5]/[0.06] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingAnalysis ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analysing team skills…</>
            ) : (
              <><TrendingUp className="w-4 h-4" /> Generate skill graph</>
            )}
          </button>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-xs text-white/30 uppercase tracking-wider mb-5">Team skill radar</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={analysis.radar}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Radar
                  name="Team avg"
                  dataKey="teamAvg"
                  stroke="#2DE2C5"
                  fill="#2DE2C5"
                  fillOpacity={0.15}
                />
                <Radar
                  name="Best member"
                  dataKey="maxMember"
                  stroke="#8B7CF8"
                  fill="#8B7CF8"
                  fillOpacity={0.08}
                />
                <Tooltip
                  contentStyle={{ background: '#0a0c1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}/100`]}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <div className="text-xs text-[#2DE2C5] uppercase tracking-wider mb-2">Strengths</div>
                <div className="space-y-1">
                  {analysis.strengths.map(s => (
                    <div key={s} className="text-sm text-white/70">✓ {s}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#FB7185] uppercase tracking-wider mb-2">Gaps</div>
                <div className="space-y-1">
                  {analysis.gaps.map(s => (
                    <div key={s} className="text-sm text-white/70 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-[#FB7185] shrink-0" /> {s}
                    </div>
                  ))}
                  {analysis.gaps.length === 0 && (
                    <div className="text-sm text-white/30">No major gaps</div>
                  )}
                </div>
              </div>
            </div>

            {/* AI hire recommendation */}
            {analysis.aiRecommendation && (
              <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Hire recommendation</div>
                <p className="text-sm text-white/65 leading-relaxed">{analysis.aiRecommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
