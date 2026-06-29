'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Play,
  ExternalLink,
  ChevronRight,
  GitBranch,
  Flame,
  Briefcase,
  GraduationCap,
  Loader2,
  Award,
  ShieldCheck,
  Share2,
  Building2,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { CandidateNav } from '@/components/CandidateNav'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getScoreColor, getScoreLabel, getConfidenceBand, getDecaySignal } from '@/lib/scoring'
import { SkillConstellation } from '@/components/SkillConstellation'
import { CompIntelCard } from '@/components/CompIntelCard'
import { CompanyModeToggle } from '@/components/interview/CompanyModeToggle'

interface SkillScore {
  name: string
  proofScore: number
  evidence: string[]
  lastUpdated: string
  scoreHistory?: { score: number; at: string }[]
}

interface Session {
  _id: string
  format: string
  targetSkill: string
  status: string
  scores?: { overall: number }
  createdAt: string
}

interface ProfileData {
  user: { name: string; username: string; avatarUrl: string; openToWork: boolean; currentStreak?: number; longestStreak?: number }
  profile: {
    parsedSkills: SkillScore[]
    targetRole: string
    cohortPercentile: number
    yearsOfExperience: number
    bio: string
    projects: Array<{ repoName: string; description: string; techStack: string[]; githubUrl: string; language?: string }>
    experiences: Array<{ title: string; company: string; duration: string }>
    educations: Array<{ institution: string; degree: string }>
    onboardingComplete?: boolean
    onboardingStep?: number
  }
}

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Session',
  pm_case: 'PM Case Study',
  design_critique: 'Design Critique',
  ops_case: 'Ops / Program Mgmt',
  sales_discovery: 'Sales Discovery',
}

const FORMAT_ICONS: Record<string, string> = {
  coding: '⌨️',
  system_design: '🏗️',
  project_deepdive: '🔍',
  behavioural: '💬',
  gap: '⚡',
  pm_case: '📊',
  design_critique: '🎨',
  ops_case: '⚙️',
  sales_discovery: '🤝',
}

function SkillLegendRow({ name, score, evidence, scoreHistory, lastUpdated }: {
  name: string; score: number; evidence?: string[]; scoreHistory?: { score: number }[]; lastUpdated?: string
}) {
  const color = getScoreColor(score)
  const sparkData = scoreHistory && scoreHistory.length >= 2 ? scoreHistory.slice(-8) : null
  const band = scoreHistory && scoreHistory.length >= 3 ? getConfidenceBand(scoreHistory) : null
  const decay = lastUpdated ? getDecaySignal(lastUpdated) : null
  return (
    <div className="flex items-center gap-3">
      <span className="node-dot w-2 h-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px 1px ${color}80` }} />
      <span className="text-xs text-foreground/80 w-24 truncate">{name}</span>
      <div className="flex-1 h-1.5 bg-foreground/[0.07] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
      </div>
      {sparkData ? (
        <div className="w-12 h-5 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="score" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="w-12 shrink-0" />
      )}
      <div className="w-10 text-right shrink-0">
        <div className="text-[11px] font-mono leading-none" style={{ color }}>{score}</div>
        {band && band.sigma > 0 && (
          <div className="text-[9px] font-mono text-foreground/20 leading-none mt-0.5">±{band.sigma}</div>
        )}
      </div>
      {decay && decay.level !== 'fresh' ? (
        <span
          className="text-[9px] w-14 text-right hidden lg:block truncate"
          style={{ color: decay.level === 'stale' ? '#FB7185' : '#F0A040' }}
          title={decay.label}
        >
          {decay.daysIdle}d idle
        </span>
      ) : evidence && evidence.length > 0 ? (
        <span className="text-[9px] text-foreground/30 w-14 text-right hidden lg:block">
          {evidence.length} {evidence.length === 1 ? 'src' : 'sources'}
        </span>
      ) : (
        <Badge
          className="text-[9px] px-1.5 py-0 h-4 hidden lg:inline-flex"
          style={{ backgroundColor: color + '20', color, borderColor: color + '30' }}
        >
          {getScoreLabel(score)}
        </Badge>
      )}
    </div>
  )
}

const INTERVIEW_TYPES = [
  { format: 'coding',          label: 'Live Coding',      icon: '⌨️', desc: 'Monaco + AI pair',       color: '#2DE2C5' },
  { format: 'system_design',   label: 'System Design',    icon: '🏗️', desc: 'Whiteboard dialogue',    color: '#3FC5F0' },
  { format: 'project_deepdive',label: 'Deep-dive',        icon: '🔍', desc: 'Walk your repos',         color: '#8B7CF8' },
  { format: 'behavioural',     label: 'Behavioural',      icon: '💬', desc: 'STAR-based stories',       color: '#E879F9' },
]

interface VerifiedCardProgress {
  hasGoal: boolean
  sessionCount: number
  sessionsNeeded: number
  topScore: number
  scoreNeeded: number
  eligible: boolean
}

interface VerifiedCardData {
  targetRole: string
  targetLevel: string
  topSkills: { name: string; score: number; percentile: number }[]
  sessionCount: number
  issuedAt: string
  cardToken: string
}

export default function DashboardPage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [assessmentClaimedBanner, setAssessmentClaimedBanner] = useState(false)
  const [startingInterview, setStartingInterview] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [companyJD, setCompanyJD] = useState<string | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [verifiedCard, setVerifiedCard] = useState<VerifiedCardData | null>(null)
  const [cardProgress, setCardProgress] = useState<VerifiedCardProgress | null>(null)
  const [issuingCard, setIssuingCard] = useState(false)
  const [hiredOutcome, setHiredOutcome] = useState<{ company: string; role: string; hiredAt: string } | null>(null)

  useEffect(() => {
    const username = data?.user?.username
    if (!username) return
    if (localStorage.getItem(`ob_skip_${username}`)) setOnboardingDismissed(true)
  }, [data?.user?.username])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('assessmentClaimed') === '1') {
        setAssessmentClaimedBanner(true)
        window.history.replaceState({}, '', '/dashboard')
      }
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [meRes, sessRes, notifRes, cardRes, appsRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/sessions'),
          fetch('/api/notifications'),
          fetch('/api/verified-card/mine'),
          fetch('/api/applications'),
        ])
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData?.user?.role === 'recruiter') {
            window.location.href = '/recruiter/dashboard'
            return
          }
          setData(meData)
        }
        if (sessRes.ok) {
          const sessData = await sessRes.json()
          setSessions(sessData.sessions || [])
        }
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          setUnreadMessages(notifData.count || 0)
        }
        if (cardRes.ok) {
          const cardData = await cardRes.json()
          setVerifiedCard(cardData.card || null)
          setCardProgress(cardData.progress || null)
        }
        if (appsRes.ok) {
          const appsData = await appsRes.json()
          const hired = (appsData.applications || []).find((a: { status: string; outcome?: { result: string; hiredCompany?: string; hiredRole?: string; hiredAt?: string } }) =>
            a.status === 'hired' && a.outcome?.result === 'hired'
          )
          if (hired?.outcome) {
            setHiredOutcome({
              company: hired.outcome.hiredCompany || hired.recruiterInfo?.company || '',
              role: hired.outcome.hiredRole || hired.jobTitle || '',
              hiredAt: hired.outcome.hiredAt || hired.updatedAt || '',
            })
          }
        }
      } catch {
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function startInterview(format: string, skill: string) {
    setStartingInterview(true)
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, targetSkill: skill || data?.profile?.targetRole || 'General', ...(companyJD ? { companyJD } : {}) }),
      })
      if (res.ok) {
        const { sessionId } = await res.json()
        window.location.href = `/interview/${sessionId}`
      } else {
        toast.error('Failed to start interview')
      }
    } catch {
      toast.error('Failed to start interview')
    } finally {
      setStartingInterview(false)
    }
  }

  async function toggleOpenToWork() {
    if (!data) return
    const newVal = !data.user.openToWork
    setData((prev) => prev ? { ...prev, user: { ...prev.user, openToWork: newVal } } : prev)
    await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openToWork: newVal }),
    })
    toast.success(newVal ? 'Visible to recruiters' : 'Hidden from recruiters')
  }

  async function issueCard() {
    setIssuingCard(true)
    try {
      const res = await fetch('/api/verified-card/issue', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        setVerifiedCard(d.card)
        toast.success('Verified card issued!')
      } else {
        toast.error(d.error || 'Failed to issue card')
      }
    } finally {
      setIssuingCard(false)
    }
  }

  const skills = data?.profile?.parsedSkills?.slice(0, 6) || []
  const topSkill = skills[0]
  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const allSkills = data?.profile?.parsedSkills || []
  const avgScore = allSkills.length
    ? Math.round(allSkills.reduce((sum, s) => sum + s.proofScore, 0) / allSkills.length)
    : 0
  const cohortPct = data?.profile?.cohortPercentile ?? 0
  const currentStreak = data?.user?.currentStreak ?? 0
  const streak = data?.user?.currentStreak ?? 0
  const openToWork = data?.user?.openToWork ?? true

  const showOnboarding = !loading && data !== null && data.profile.onboardingComplete !== true && !onboardingDismissed
  const showOnboardingNudge = !loading && data !== null && data.profile.onboardingComplete === true && completedSessions.length === 0
  const isReturningFromSession = showOnboarding && (data?.profile?.onboardingStep ?? 0) >= 2 && allSkills.length > 0
  const topRepo = data?.profile?.projects?.[0]
    ? { name: data.profile.projects[0].repoName, language: data.profile.projects[0].language }
    : null
  const topLanguage = topRepo?.language || allSkills[0]?.name || null

  return (
    <div className="h-screen flex overflow-hidden">
      <CandidateNav
        username={data?.user?.username}
        unread={unreadMessages}
        footer={
          <div className="space-y-1 pb-1">
            {streak > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#8B7CF8]/[0.07] border border-[#8B7CF8]/15">
                <Flame className={`w-3.5 h-3.5 shrink-0 ${streak >= 3 ? 'text-[#8B7CF8]' : 'text-foreground/25'}`} />
                <span className="text-xs text-foreground/40 flex-1">Streak</span>
                <span className="text-xs font-bold text-[#8B7CF8] font-mono">{streak}d</span>
              </div>
            )}
            <button
              onClick={toggleOpenToWork}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                openToWork
                  ? 'bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20'
                  : 'text-foreground/35 border border-transparent hover:bg-foreground/[0.03]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${openToWork ? 'bg-[#2DE2C5] animate-pulse' : 'bg-foreground/20'}`} />
              {openToWork ? 'Open to work' : 'Not looking'}
            </button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto">
        {/* Assessment claimed banner */}
        {assessmentClaimedBanner && (
          <div className="bg-[#2DE2C5]/10 border-b border-[#2DE2C5]/20 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-[#2DE2C5]">
              Welcome to Intervue. Your assessment scores have been added to your profile.
            </span>
            <button onClick={() => setAssessmentClaimedBanner(false)} className="text-[#2DE2C5]/60 hover:text-[#2DE2C5] text-xs ml-4">✕</button>
          </div>
        )}
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="text-sm text-foreground/40">
            {loading ? (
              <Skeleton className="h-4 w-40 bg-foreground/[0.06]" />
            ) : (
              <>Welcome back, <span className="text-foreground font-medium">{data?.user?.name?.split(' ')[0]}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/p/${data?.user?.username}`} target="_blank">
              <Button variant="ghost" size="sm" className="text-foreground/35 hover:text-foreground gap-1.5 text-xs h-8 px-3">
                <ExternalLink className="w-3.5 h-3.5" />
                Public profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">

          {/* Post-skip nudge */}
          {showOnboardingNudge && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.05] p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold mb-0.5">Verify your skills to unlock your proof profile</div>
                <div className="text-xs text-foreground/45 leading-relaxed">
                  Take a quick interview — ~15 min to turn your profile from a keyword list into verified proof scores recruiters trust.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {allSkills.slice(0, 3).map(s => (
                  <button
                    key={s.name}
                    onClick={() => startInterview('coding', s.name)}
                    disabled={startingInterview}
                    className="text-xs px-3 py-2 rounded-lg border border-[#2DE2C5]/25 text-[#2DE2C5] hover:bg-[#2DE2C5]/[0.1] transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    {s.name}
                  </button>
                ))}
                {allSkills.length === 0 && (
                  <button
                    onClick={() => startInterview('gap', 'General')}
                    disabled={startingInterview}
                    className="text-xs px-4 py-2 rounded-lg bg-[#2DE2C5] text-[#04050e] font-semibold hover:bg-[#25c9ae] transition-colors disabled:opacity-40"
                  >
                    Start gap analysis
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Hero card ── */}
          {loading ? (
            <Skeleton className="h-36 w-full rounded-2xl bg-foreground/[0.04]" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              {/* Accent bar */}
              <div className="h-[3px] bg-gradient-to-r from-[#2DE2C5] via-[#3FC5F0] to-[#8B7CF8]" />

              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Avatar + identity */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      {data?.user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={data.user.avatarUrl}
                          alt={data.user.name}
                          className={`w-14 h-14 rounded-full border-2 ${openToWork ? 'border-[#2DE2C5]/40' : 'border-border'}`}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-xl">
                          {data?.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                          data?.user?.openToWork ? 'bg-[#2DE2C5]' : 'bg-foreground/20'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h1 className="text-lg font-semibold leading-tight">{data?.user?.name || 'Engineer'}</h1>
                        {data?.user?.openToWork && (
                          <span className="text-[9px] font-bold bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/25 px-1.5 py-0.5 rounded tracking-wider">
                            OPEN
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-foreground/45">
                        {data?.profile?.targetRole || 'Engineer'}
                        {data?.user?.username && (
                          <span className="text-foreground/25"> · @{data.user.username}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Share */}
                  {data?.user?.username && (
                    <Link href={`/p/${data.user.username}`} target="_blank" className="shrink-0">
                      <button className="text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors text-foreground/40 hover:text-foreground/70">
                        Share profile
                      </button>
                    </Link>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-foreground/40">Sessions</span>
                    <span className="font-mono font-semibold text-foreground">{completedSessions.length}</span>
                  </div>
                  {avgScore > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-foreground/40">Avg score</span>
                      <span className="font-mono font-semibold" style={{ color: getScoreColor(avgScore) }}>{avgScore}</span>
                    </div>
                  )}
                  {currentStreak > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Flame className="w-3.5 h-3.5 text-[#8B7CF8]" />
                      <span className="font-mono font-semibold text-[#8B7CF8]">{currentStreak}d streak</span>
                    </div>
                  )}
                  {cohortPct > 0 && (
                    <div className="flex items-center gap-1.5 text-xs ml-auto">
                      <Award className="w-3.5 h-3.5 text-foreground/30" />
                      <span className="font-mono text-foreground/55 font-medium">Top {100 - cohortPct}%</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Primary CTA */}
          {!loading && (
            <Button
              onClick={() => startInterview(topSkill ? 'coding' : 'gap', topSkill?.name || 'General')}
              disabled={startingInterview}
              className="w-full btn-supernova font-semibold h-11 text-[#05060F]"
            >
              {startingInterview ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Starting…</>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-2" />
                  Start {topSkill ? 'coding' : 'gap'} session
                  {topSkill && <span className="ml-1.5 opacity-60 text-xs font-normal">· {topSkill.name}</span>}
                </>
              )}
            </Button>
          )}

          {/* ── Verified card block ── */}
          {!loading && (
            verifiedCard ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.03] overflow-hidden"
              >
                <div className="h-[3px] bg-[#2DE2C5]" />
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4.5 h-4.5 text-[#2DE2C5]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2DE2C5] tracking-wide">VERIFIED CARD</div>
                      <div className="text-sm font-semibold">{[verifiedCard.targetLevel, verifiedCard.targetRole].filter(Boolean).join(' ')}</div>
                      <div className="text-[11px] text-foreground/40">
                        {verifiedCard.topSkills.slice(0, 3).map(s => `${s.name} ${s.score}`).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/verified-card/${verifiedCard.cardToken}`} target="_blank">
                      <Button size="sm" className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold h-8 gap-1.5 text-xs">
                        <Share2 className="w-3.5 h-3.5" /> Share card
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ) : cardProgress && !cardProgress.eligible ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-foreground/20" />
                  </div>
                  <div>
                    <div className="text-xs text-foreground/40 font-semibold uppercase tracking-wide">Verified card progress</div>
                    <div className="text-sm text-foreground/60 mt-0.5">
                      {!cardProgress.hasGoal
                        ? 'Set a career goal on the Atlas page to start'
                        : cardProgress.sessionsNeeded > 0
                        ? `${cardProgress.sessionsNeeded} more session${cardProgress.sessionsNeeded > 1 ? 's' : ''} needed`
                        : `Top skill needs ${cardProgress.scoreNeeded} more points (currently ${cardProgress.topScore})`
                      }
                    </div>
                  </div>
                </div>
                {cardProgress.hasGoal && (
                  <div className="text-xs text-foreground/25 font-mono shrink-0">
                    {cardProgress.sessionCount}/5 sessions
                  </div>
                )}
              </motion.div>
            ) : cardProgress?.eligible ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[#2DE2C5]/30 bg-[#2DE2C5]/[0.04] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#2DE2C5]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2DE2C5] tracking-wide">READY TO VERIFY</div>
                    <div className="text-sm text-foreground/70">You qualify for a Verified Card. Issue it now.</div>
                  </div>
                </div>
                <Button size="sm" onClick={issueCard} disabled={issuingCard} className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold h-8 shrink-0 text-xs">
                  {issuingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Issue card'}
                </Button>
              </motion.div>
            ) : null
          )}

          {/* ── Hired outcome banner ── */}
          {!loading && hiredOutcome && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-4 flex items-center gap-3"
            >
              <div className="text-2xl">🎉</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#2DE2C5]">Hired via Intervue</div>
                <div className="text-xs text-foreground/50">
                  {hiredOutcome.role}{hiredOutcome.company ? ` at ${hiredOutcome.company}` : ''}
                  {hiredOutcome.hiredAt ? ` · ${new Date(hiredOutcome.hiredAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}
                </div>
              </div>
              <Link href="/messages" className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors shrink-0">
                View thread
              </Link>
            </motion.div>
          )}

          {/* ── Two-column layout ── */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">

            {/* Left: Skill network */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-foreground/35">
                  Proof-of-skill network
                  {avgScore > 0 && (
                    <span className="ml-2 font-mono text-foreground/50 normal-case tracking-normal">avg {avgScore}</span>
                  )}
                </h2>
                <Link href="/settings" className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors flex items-center gap-1">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <Skeleton className="h-72 rounded-xl bg-foreground/[0.04]" />
              ) : skills.length === 0 ? (
                <div className="rounded-xl border border-dashed border-foreground/[0.10] p-8 text-center">
                  <GitBranch className="w-7 h-7 text-foreground/20 mx-auto mb-3" />
                  <div className="text-sm font-medium mb-1">No skills detected yet</div>
                  <div className="text-xs text-foreground/40 mb-4">Complete an interview to map your network</div>
                  <Button size="sm" className="btn-supernova font-semibold text-xs h-8" onClick={() => startInterview('gap', 'General')}>
                    Start a gap session
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-center">
                    <SkillConstellation
                      skills={skills}
                      centerLabel={(data?.user?.name?.[0] || 'U').toUpperCase()}
                      avatarUrl={data?.user?.avatarUrl || undefined}
                      size={280}
                    />
                  </div>
                  <div className="space-y-2.5 pt-2 border-t border-border">
                    {skills.map((skill) => (
                      <SkillLegendRow
                        key={skill.name}
                        name={skill.name}
                        score={skill.proofScore}
                        evidence={skill.evidence}
                        scoreHistory={skill.scoreHistory}
                        lastUpdated={skill.lastUpdated}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Comp intelligence — what your proof level is worth, from verified hires */}
              {topSkill && (
                <div className="mt-6">
                  <CompIntelCard skill={topSkill.name} proofScore={topSkill.proofScore} />
                </div>
              )}
            </div>

            {/* Right: Start session + recent sessions */}
            <div className="space-y-6">

              {/* Interview types */}
              <div className="space-y-2.5">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-foreground/35">Start a session</h2>
                <CompanyModeToggle onJDChange={setCompanyJD} />
                <div className="grid grid-cols-2 gap-2">
                  {INTERVIEW_TYPES.map((type) => (
                    <button
                      key={type.format}
                      onClick={() => startInterview(type.format, skills[0]?.name || 'General')}
                      disabled={startingInterview}
                      className="group p-3.5 rounded-xl border border-border bg-card hover:bg-foreground/[0.03] hover:shadow-md hover:shadow-black/20 hover:border-foreground/[0.15] active:scale-[0.98] text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                      style={{ borderLeftColor: type.color, borderLeftWidth: '3px' }}
                    >
                      <div className="text-base mb-2">{type.icon}</div>
                      <div className="font-medium text-sm leading-tight text-foreground">{type.label}</div>
                      <div className="text-[10px] text-foreground/40 mt-0.5">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Company tracks CTA */}
              <Link
                href="/companies"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#8B7CF8]/20 bg-[#8B7CF8]/[0.04] hover:bg-[#8B7CF8]/[0.08] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#8B7CF8]/15 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#8B7CF8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#8B7CF8]">Company tracks</div>
                  <div className="text-[10px] text-foreground/35">Google, Meta, Stripe, Razorpay + 16 more</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-[#8B7CF8] transition-colors shrink-0" />
              </Link>

              {/* Wrapped CTA */}
              {completedSessions.length >= 3 && (() => {
                const now = new Date()
                const currentYear = now.getFullYear()
                const isDecember = now.getMonth() === 11
                const wrappedYear = isDecember ? currentYear : currentYear - 1
                return (
                  <Link
                    href={`/wrapped/${wrappedYear}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#8B7CF8]/20 bg-[#8B7CF8]/[0.04] hover:bg-[#8B7CF8]/[0.08] transition-colors"
                  >
                    <span className="text-lg">🎁</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#8B7CF8]">{wrappedYear} Wrapped</div>
                      <div className="text-[10px] text-foreground/35">See your year in interviews</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-foreground/20 shrink-0" />
                  </Link>
                )
              })()}

              {/* Recent sessions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold tracking-widest uppercase text-foreground/35">Recent sessions</h2>
                  <span className="text-[11px] text-foreground/25">{completedSessions.length} done</span>
                </div>

                {loading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg bg-foreground/[0.04]" />)}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-foreground/[0.08] p-5 text-center text-xs text-foreground/35">
                    No sessions yet
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {sessions.slice(0, 6).map((session) => {
                      const href = session.status === 'completed'
                        ? `/interview/report/${session._id}`
                        : session.status === 'in_progress'
                        ? `/interview/${session._id}`
                        : null
                      const row = (
                        <div
                          key={session._id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition-colors group cursor-pointer"
                        >
                          <div className="text-base w-6 text-center shrink-0">{FORMAT_ICONS[session.format] || '📋'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate text-foreground/80">{FORMAT_LABELS[session.format]}</div>
                            <div className="text-[10px] text-foreground/35 truncate">{session.targetSkill}</div>
                          </div>
                          {session.status === 'completed' && session.scores?.overall ? (
                            <span className="text-sm font-mono font-bold shrink-0" style={{ color: getScoreColor(session.scores.overall) }}>
                              {session.scores.overall}
                            </span>
                          ) : (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                              session.status === 'in_progress'
                                ? 'bg-[#8B7CF8]/15 text-[#8B7CF8]'
                                : 'text-foreground/25'
                            }`}>
                              {session.status === 'in_progress' ? 'resume' : session.status.replace('_', ' ')}
                            </span>
                          )}
                          {href && (
                            <ChevronRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-foreground/50 transition-colors" />
                          )}
                        </div>
                      )
                      return href ? <Link key={session._id} href={href}>{row}</Link> : row
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Experience + Education ── */}
          {!loading && ((data?.profile?.experiences?.length ?? 0) > 0 || (data?.profile?.educations?.length ?? 0) > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {data?.profile?.experiences && data.profile.experiences.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-semibold tracking-widest uppercase text-foreground/35">Experience</h2>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {data.profile.experiences.map((exp, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                        <div className="w-7 h-7 rounded-lg bg-[#8B7CF8]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-[#8B7CF8]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-foreground/85">{exp.title}</div>
                          <div className="text-xs text-foreground/45 mt-0.5">
                            {exp.company}
                            {exp.duration && <span className="text-foreground/30"> · {exp.duration}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data?.profile?.educations && data.profile.educations.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-semibold tracking-widest uppercase text-foreground/35">Education</h2>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {data.profile.educations.map((edu, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                        <div className="w-7 h-7 rounded-lg bg-[#3FC5F0]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-[#3FC5F0]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-foreground/85">{edu.institution}</div>
                          {edu.degree && <div className="text-xs text-foreground/45 mt-0.5">{edu.degree}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── GitHub Projects ── */}
          {!loading && data?.profile?.projects && data.profile.projects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-foreground/35">GitHub Projects</h2>
                <Link
                  href={`https://github.com/${data?.user?.username}`}
                  target="_blank"
                  className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors flex items-center gap-1"
                >
                  View all <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {data.profile.projects.slice(0, 3).map((project) => (
                  <a
                    key={project.repoName}
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-border bg-card hover:border-foreground/[0.15] transition-colors block group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-sm text-[#2DE2C5] truncate">{project.repoName}</div>
                      <GitBranch className="w-3.5 h-3.5 text-foreground/20 shrink-0 group-hover:text-foreground/40 transition-colors" />
                    </div>
                    <p className="text-xs text-foreground/40 leading-relaxed mb-3 line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {project.techStack?.slice(0, 3).map((tech) => (
                        <span key={tech} className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/[0.05] text-foreground/40 border border-border">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {showOnboarding && data && (
        <OnboardingModal
          username={data.user.username}
          topRepo={topRepo}
          topLanguage={topLanguage}
          parsedSkills={allSkills.map(s => ({ name: s.name, proofScore: s.proofScore }))}
          initialStep={isReturningFromSession ? 2 : 0}
          onDismiss={() => {
            setOnboardingDismissed(true)
            const username = data?.user?.username
            if (username) localStorage.setItem(`ob_skip_${username}`, '1')
            setData(prev => prev ? {
              ...prev,
              profile: { ...prev.profile, onboardingComplete: true, onboardingStep: 99 },
            } : prev)
          }}
        />
      )}
    </div>
  )
}
