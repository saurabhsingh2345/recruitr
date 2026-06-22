'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search, Users, Bell, TrendingUp, Zap, Clock,
  Building2, ArrowRight, ExternalLink, Star, ChevronRight, MessageSquare, MapPin,
} from 'lucide-react'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { getScoreColor } from '@/lib/scoring'
import { toast } from 'sonner'

/* ── Types ─────────────────────────────────────────────────── */

interface RecruiterData {
  user: {
    name: string; username: string; avatarUrl: string
    company: string; jobTitle: string; openRoles: string
  }
}

interface PipelineStat { status: string; label: string; count: number; color: string }

interface CandidateMatch {
  _id: string
  user: { name: string; username: string; avatarUrl: string; openToWork: boolean; lastSessionDate: string | null }
  targetRole: string
  cohortPercentile: number
  location: string
  topSkills: { name: string; proofScore: number }[]
}

function lastActiveLabel(date: string | null): string | null {
  if (!date) return null
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return null
}

interface ActivityItem {
  _id: string
  type: 'message' | 'status_change' | 'new_thread'
  candidateName: string
  candidateUsername: string
  detail: string
  updatedAt: string
}

const PIPELINE_COLS = [
  { status: 'active',              label: 'Contacted',  color: '#AEB5E0' },
  { status: 'screening',           label: 'Screening',  color: '#8B7CF8' },
  { status: 'interview_scheduled', label: 'Scheduled',  color: '#f59e0b' },
  { status: 'offer_extended',      label: 'Offer',      color: '#3FC5F0' },
  { status: 'hired',               label: 'Hired',      color: '#2DE2C5' },
]

/* ── Candidate card ─────────────────────────────────────────── */

function CandidateCard({ c, onContact }: { c: CandidateMatch; onContact: (c: CandidateMatch) => void }) {
  const lastActive = lastActiveLabel(c.user?.lastSessionDate ?? null)
  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-[#080A18] hover:border-white/[0.12] transition-all flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          {c.user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.user.avatarUrl} alt={c.user.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-sm">
              {c.user?.name?.[0] || '?'}
            </div>
          )}
          {c.user?.openToWork && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#2DE2C5] border-2 border-[#080A18]" title="Open to work" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate leading-none mb-0.5">{c.user?.name}</div>
          <div className="text-[11px] text-[#888FC0] flex items-center gap-1 truncate">
            <span className="truncate">{c.targetRole}</span>
            {c.location && <><span>·</span><MapPin className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{c.location}</span></>}
          </div>
        </div>
        {(c.cohortPercentile ?? 0) > 0 && (
          <div className="text-[10px] font-bold font-mono text-[#2DE2C5] shrink-0">
            top {100 - c.cohortPercentile}%
          </div>
        )}
      </div>

      {/* Skill chips — click to proof page */}
      <div className="flex flex-wrap gap-1">
        {c.topSkills?.slice(0, 3).map(skill => {
          const col = getScoreColor(skill.proofScore)
          return (
            <Link
              key={skill.name}
              href={`/proof/${c.user?.username}/${encodeURIComponent(skill.name)}`}
              target="_blank"
              className="group flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md border font-medium transition-all hover:brightness-125"
              style={{ color: col, borderColor: col + '35', background: col + '12' }}
              title={`View ${skill.name} proof`}
            >
              {skill.name} <span className="font-mono">{Math.round(skill.proofScore)}</span>
              <ExternalLink className="w-2 h-2 opacity-0 group-hover:opacity-60 transition-opacity ml-0.5 shrink-0" />
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2">
        {lastActive && (
          <div className="flex items-center gap-1 text-[10px] text-[#888FC0] flex-1">
            <Clock className="w-2.5 h-2.5" />{lastActive}
          </div>
        )}
        <div className="flex gap-1.5 ml-auto">
          <Link href={`/p/${c.user?.username}`} target="_blank">
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-white/[0.08] text-[#AEB5E0] hover:text-white">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => onContact(c)}
            className="h-7 px-2.5 text-xs bg-[#2DE2C5]/15 text-[#2DE2C5] border border-[#2DE2C5]/30 hover:bg-[#2DE2C5]/25"
          >
            Contact
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function RecruiterDashboardPage() {
  const router = useRouter()
  const [recruiter, setRecruiter] = useState<RecruiterData | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStat[]>([])
  const [matches, setMatches] = useState<CandidateMatch[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [quickSearch, setQuickSearch] = useState('')
  const [totalContacted, setTotalContacted] = useState(0)
  const [responseRate, setResponseRate] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, appsRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/applications'),
        ])

        const meData = await meRes.json()
        if (!meData?.user) { router.push('/recruiter/login'); return }

        // A candidate landing here should go to their own dashboard — NOT be
        // converted into a recruiter via setup.
        if (meData.user.role !== 'recruiter') {
          window.location.href = '/dashboard'
          return
        }

        setRecruiter(meData)

        // Build pipeline stats from applications
        const appsData = await appsRes.json()
        const apps: { status: string; recruiterId: string; messages: unknown[] }[] = appsData.applications || []
        const myApps = apps.filter(a => a.recruiterId === meData.user._id?.toString() || true)

        const counts: Record<string, number> = {}
        let totalUnread = 0
        let responded = 0

        myApps.forEach(app => {
          counts[app.status] = (counts[app.status] || 0) + 1
          // unread
          const unreadCount = (appsData.applications || []).find((a: { _id: string; unreadCount: number }) =>
            a._id === (app as unknown as { _id: string })._id
          )?.unreadCount || 0
          totalUnread += unreadCount
          if (app.messages.length > 1) responded++
        })

        setUnread(totalUnread)
        setTotalContacted(myApps.length)
        setResponseRate(myApps.length ? Math.round((responded / myApps.length) * 100) : 0)

        setPipeline(PIPELINE_COLS.map(col => ({
          ...col,
          count: counts[col.status] || 0,
        })))

        // Build activity from recent apps
        const recentActivity: ActivityItem[] = myApps.slice(0, 5).map((app: unknown) => {
          const a = app as { _id: string; status: string; updatedAt: string; candidateInfo?: { name: string; username: string }; lastMessage?: { content: string } }
          return {
            _id: a._id,
            type: 'message',
            candidateName: a.candidateInfo?.name || 'Candidate',
            candidateUsername: a.candidateInfo?.username || '',
            detail: a.lastMessage?.content
              ? `"${a.lastMessage.content.slice(0, 60)}..."`
              : `Status: ${a.status}`,
            updatedAt: a.updatedAt,
          }
        })
        setActivity(recentActivity)

        // Fetch top candidate matches based on open roles
        const roles = meData.user.openRoles || ''
        const firstRole = roles.split(',')[0]?.trim() || ''
        if (firstRole) {
          const searchRes = await fetch('/api/recruiter/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: firstRole, skills: [], minScore: 60, page: 1 }),
          })
          if (searchRes.ok) {
            const searchData = await searchRes.json()
            setMatches(searchData.candidates?.slice(0, 6) || [])
          }
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!quickSearch.trim()) return
    router.push(`/recruiter?q=${encodeURIComponent(quickSearch)}`)
  }

  const statsCards = [
    { label: 'In Pipeline',      value: totalContacted, icon: Users,       color: '#AEB5E0', sub: 'total threads' },
    { label: 'Active',           value: pipeline.find(p => p.status === 'active')?.count || 0, icon: Zap, color: '#2DE2C5', sub: 'need action' },
    { label: 'Response rate',    value: `${responseRate}%`, icon: TrendingUp, color: '#8B7CF8', sub: 'replied to you' },
    { label: 'Unread messages',  value: unread,         icon: Bell,        color: '#f59e0b', sub: 'from candidates' },
  ]

  return (
    <div className="h-screen flex overflow-hidden">
      <RecruiterNav unread={unread} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 border-b border-white/[0.05] bg-[#04050e]/90 backdrop-blur px-8 h-[56px] flex items-center justify-between">
          <div className="text-sm text-white/40">
            {loading ? (
              <Skeleton className="h-4 w-40 bg-white/[0.04]" />
            ) : (
              <>
                {recruiter?.user?.company && (
                  <span className="text-white font-medium">{recruiter.user.company} · </span>
                )}
                Dashboard
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/recruiter">
              <Button size="sm" className="btn-supernova font-semibold text-xs h-8 px-4 gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Search engineers
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

            {/* Quick search bar */}
            <form onSubmit={handleQuickSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
              <Input
                value={quickSearch}
                onChange={e => setQuickSearch(e.target.value)}
                placeholder='Try "senior Go engineer, Bangalore, distributed systems"'
                className="pl-11 h-12 bg-[#080A18] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30 text-sm rounded-xl"
              />
              {quickSearch && (
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#2DE2C5] hover:text-[#5af0d6] transition-colors font-medium">
                  Search →
                </button>
              )}
            </form>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {statsCards.map(({ label, value, icon: Icon, color, sub }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-5 rounded-xl border border-white/[0.06] bg-[#080A18]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#AEB5E0]">{label}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '15' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 bg-[#0B0E1C]" />
                  ) : (
                    <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
                  )}
                  <div className="text-[10px] text-[#888FC0] mt-1">{sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Pipeline + Top matches */}
            <div className="grid grid-cols-[1fr_1.6fr] gap-6">
              {/* Pipeline overview */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080A18] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold">Pipeline</h2>
                  <Link href="/messages" className="text-xs text-[#2DE2C5] hover:text-[#5af0d6] flex items-center gap-1 transition-colors">
                    Full board <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 bg-[#0B0E1C] rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pipeline.map(col => {
                      const total = pipeline.reduce((s, c) => s + c.count, 0)
                      const pct = total ? (col.count / total) * 100 : 0
                      return (
                        <Link key={col.status} href="/messages" className="block">
                          <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
                            <span className="text-sm text-[#AEB5E0] group-hover:text-white transition-colors flex-1">{col.label}</span>
                            <div className="flex items-center gap-2">
                              {col.count > 0 && (
                                <div className="h-1.5 rounded-full bg-white/[0.05] w-16 overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col.color }} />
                                </div>
                              )}
                              <span className="text-sm font-mono font-bold w-6 text-right" style={{ color: col.count > 0 ? col.color : '#888FC0' }}>
                                {col.count}
                              </span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {!loading && totalContacted === 0 && (
                  <div className="mt-4 p-4 rounded-xl border border-dashed border-white/[0.06] text-center">
                    <p className="text-xs text-[#888FC0] mb-3">No candidates in pipeline yet</p>
                    <Link href="/recruiter">
                      <Button size="sm" className="text-xs bg-[#2DE2C5]/15 text-[#2DE2C5] border border-[#2DE2C5]/30 hover:bg-[#2DE2C5]/25">
                        Find engineers →
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Setup nudge if company not set */}
                {!loading && !recruiter?.user?.company && (
                  <div className="mt-4 p-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.05]">
                    <p className="text-xs text-[#f59e0b] mb-2 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      Complete your profile
                    </p>
                    <Link href="/recruiter/profile">
                      <Button size="sm" variant="outline" className="w-full text-xs h-7 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10">
                        Add company info →
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Top matches */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080A18] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-semibold">Top matches</h2>
                    {recruiter?.user?.openRoles && (
                      <p className="text-xs text-[#888FC0] mt-0.5">
                        Based on: {recruiter.user.openRoles.split(',')[0]?.trim()}
                      </p>
                    )}
                  </div>
                  <Link href="/recruiter" className="text-xs text-[#2DE2C5] hover:text-[#5af0d6] flex items-center gap-1 transition-colors">
                    All engineers <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-[#0B0E1C] rounded-xl" />)}
                  </div>
                ) : matches.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {matches.slice(0, 4).map(c => (
                      <CandidateCard
                        key={c._id}
                        c={c}
                        onContact={(candidate) => {
                          router.push(`/recruiter?contact=${candidate.user.username}`)
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Star className="w-8 h-8 text-[#888FC0] mb-3" />
                    <p className="text-sm text-[#AEB5E0] mb-1">No matches yet</p>
                    <p className="text-xs text-[#888FC0] mb-4 max-w-xs">
                      {recruiter?.user?.openRoles
                        ? 'No verified engineers found for your open roles yet.'
                        : 'Add your open roles in profile settings to see top matches here.'}
                    </p>
                    <Link href={recruiter?.user?.openRoles ? '/recruiter' : '/recruiter/profile'}>
                      <Button size="sm" className="text-xs bg-[#2DE2C5]/15 text-[#2DE2C5] border border-[#2DE2C5]/30 hover:bg-[#2DE2C5]/25">
                        {recruiter?.user?.openRoles ? 'Browse all engineers →' : 'Set open roles →'}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#080A18] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Recent activity</h2>
                <Link href="/messages" className="text-xs text-[#2DE2C5] hover:text-[#5af0d6] flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 bg-[#0B0E1C] rounded-lg" />)}
                </div>
              ) : activity.length > 0 ? (
                <div className="space-y-1">
                  {activity.map((item) => (
                    <Link key={item._id} href={`/messages/${item._id}`}>
                      <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                        <div className="w-7 h-7 rounded-full bg-[#2DE2C5]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#2DE2C5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.candidateName}</div>
                          <div className="text-xs text-[#888FC0] truncate">{item.detail}</div>
                        </div>
                        <div className="text-[10px] text-[#888FC0] shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(item.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-[#888FC0] mx-auto mb-3" />
                  <p className="text-sm text-[#AEB5E0]">No activity yet</p>
                  <p className="text-xs text-[#888FC0] mt-1">Start by searching for engineers and sending your first message.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
