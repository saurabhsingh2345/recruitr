'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Play,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Clock,
  GitBranch,
  Flame,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { CandidateNav } from '@/components/CandidateNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { SkillConstellation } from '@/components/SkillConstellation'

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
    projects: Array<{ repoName: string; description: string; techStack: string[]; githubUrl: string }>
    experiences: Array<{ title: string; company: string; duration: string }>
    educations: Array<{ institution: string; degree: string }>
  }
}

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Session',
}

const FORMAT_ICONS: Record<string, string> = {
  coding: '⌨️',
  system_design: '🏗️',
  project_deepdive: '🔍',
  behavioural: '💬',
  gap: '⚡',
}

/** Compact skill legend row paired with the constellation */
function SkillLegendRow({ name, score, scoreHistory }: { name: string; score: number; scoreHistory?: { score: number }[] }) {
  const color = getScoreColor(score)
  const sparkData = scoreHistory && scoreHistory.length >= 2 ? scoreHistory.slice(-8) : null
  return (
    <div className="flex items-center gap-3">
      <span className="node-dot w-2 h-2 shrink-0" style={{ background: color, boxShadow: `0 0 8px 1px ${color}99` }} />
      <span className="text-xs text-[#ECF0FF] w-24 truncate">{name}</span>
      <div className="flex-1 h-1.5 bg-[#11142a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
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
      <span className="text-[11px] font-mono w-7 text-right" style={{ color }}>{score}</span>
      <Badge
        className="text-[9px] px-1.5 py-0 h-4 hidden lg:inline-flex"
        style={{ backgroundColor: color + '20', color, borderColor: color + '30' }}
      >
        {getScoreLabel(score)}
      </Badge>
    </div>
  )
}


const INTERVIEW_TYPES = [
  { format: 'coding', label: 'Live Coding', icon: '⌨️', desc: 'Monaco editor + AI pair', color: '#2DE2C5' },
  { format: 'system_design', label: 'System Design', icon: '🏗️', desc: 'Whiteboard + AI dialogue', color: '#3FC5F0' },
  { format: 'project_deepdive', label: 'Project Deep-dive', icon: '🔍', desc: 'Walk through your repos', color: '#8B7CF8' },
  { format: 'behavioural', label: 'Behavioural', icon: '💬', desc: 'STAR-based stories', color: '#E879F9' },
]

export default function DashboardPage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [startingInterview, setStartingInterview] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, sessRes, notifRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/sessions'),
          fetch('/api/notifications'),
        ])
        if (meRes.ok) {
          const meData = await meRes.json()
          // Recruiters don't belong on the candidate dashboard — send them home.
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
        body: JSON.stringify({ format, targetSkill: skill || data?.profile?.targetRole || 'General' }),
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

  return (
    <div className="h-screen flex overflow-hidden">
      <CandidateNav
        username={data?.user?.username}
        unread={unreadMessages}
        footer={
          <div className="space-y-1 pb-1">
            {streak > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#8B7CF8]/[0.07] border border-[#8B7CF8]/15">
                <Flame className={`w-3.5 h-3.5 shrink-0 ${streak >= 3 ? 'text-[#8B7CF8]' : 'text-white/25'}`} />
                <span className="text-xs text-white/40 flex-1">Streak</span>
                <span className="text-xs font-bold text-[#8B7CF8] font-mono">{streak}d</span>
              </div>
            )}
            <button
              onClick={toggleOpenToWork}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                openToWork
                  ? 'bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20'
                  : 'text-white/30 border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${openToWork ? 'bg-[#2DE2C5] animate-pulse' : 'bg-white/20'}`} />
              {openToWork ? 'Open to work' : 'Not looking'}
            </button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-[#050508]/95 backdrop-blur px-8 h-[56px] flex items-center justify-between">
          <div className="text-sm text-white/35">
            {loading ? (
              <Skeleton className="h-4 w-40 bg-white/[0.04]" />
            ) : (
              <>Welcome back, <span className="text-white font-medium">{data?.user?.name?.split(' ')[0]}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/p/${data?.user?.username}`} target="_blank">
              <Button variant="ghost" size="sm" className="text-white/35 hover:text-white gap-1.5 text-xs h-8 px-3">
                <ExternalLink className="w-3.5 h-3.5" />
                Public profile
              </Button>
            </Link>
            <Button
              size="sm"
              className="btn-supernova font-semibold gap-1.5 h-8 px-4 text-xs"
              onClick={() => startInterview('coding', topSkill?.name || 'General')}
              disabled={startingInterview}
            >
              <Play className="w-3 h-3" />
              Start interview
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-8 space-y-10">

          {/* Identity + stats header */}
          {loading ? (
            <Skeleton className="h-24 w-full rounded-xl bg-white/[0.03]" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-start gap-8"
            >
              {/* Identity */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative shrink-0">
                  {data?.user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.user.avatarUrl} alt={data.user.name} className="w-14 h-14 rounded-full border border-white/[0.08]" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-xl">
                      {data?.user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#050508] ${data?.user?.openToWork ? 'bg-[#2DE2C5]' : 'bg-white/20'}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="text-xl font-bold tracking-tight">{data?.user?.name || 'Engineer'}</h1>
                    {data?.user?.openToWork && (
                      <span className="text-[9px] font-semibold bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 px-1.5 py-0.5 rounded">OPEN</span>
                    )}
                  </div>
                  <div className="text-sm text-white/40">
                    {data?.profile?.targetRole || 'Engineer'}
                    {data?.user?.username && <span className="text-white/20"> · @{data.user.username}</span>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-stretch gap-px rounded-xl overflow-hidden border border-white/[0.06] shrink-0">
                {[
                  { label: 'Avg Score', value: avgScore || null, suffix: '', color: avgScore ? getScoreColor(avgScore) : undefined },
                  { label: 'Ranking', value: cohortPct > 0 ? `Top ${100 - cohortPct}%` : null, suffix: '', color: '#3FC5F0' },
                  { label: 'Sessions', value: completedSessions.length || null, suffix: '', color: undefined },
                  { label: 'Streak', value: currentStreak > 0 ? `${currentStreak}d` : null, suffix: '', color: '#8B7CF8' },
                ].map((stat, i, arr) => (
                  <div key={stat.label} className={`px-5 py-4 bg-[#0a0c1a] flex flex-col items-center justify-center min-w-[80px] ${i < arr.length - 1 ? 'border-r border-white/[0.06]' : ''}`}>
                    <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1.5">{stat.label}</div>
                    <div className="text-xl font-bold font-mono" style={{ color: stat.value ? (stat.color || 'white') : 'rgba(255,255,255,0.15)' }}>
                      {stat.value ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Two-column layout: skills + sessions */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">

            {/* Left: Skill network */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Proof-of-skill network</h2>
                <Link href="/settings" className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <Skeleton className="h-72 rounded-xl bg-white/[0.03]" />
              ) : skills.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.06] p-8 text-center">
                  <GitBranch className="w-7 h-7 text-white/20 mx-auto mb-3" />
                  <div className="text-sm font-medium mb-1">No skills detected yet</div>
                  <div className="text-xs text-white/35 mb-4">Complete an interview to map your network</div>
                  <Button size="sm" className="btn-supernova font-semibold text-xs h-8" onClick={() => startInterview('gap', 'General')}>
                    Start a gap session
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0c1a] p-5 space-y-4">
                  <div className="flex items-center justify-center">
                    <SkillConstellation
                      skills={skills}
                      centerLabel={(data?.user?.name?.[0] || 'U').toUpperCase()}
                      avatarUrl={data?.user?.avatarUrl || undefined}
                      size={280}
                    />
                  </div>
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
                    {skills.map((skill) => (
                      <SkillLegendRow key={skill.name} name={skill.name} score={skill.proofScore} scoreHistory={skill.scoreHistory} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Start session + recent sessions */}
            <div className="space-y-6">
              {/* Interview types */}
              <div className="space-y-2">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Start a session</h2>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVIEW_TYPES.map((type) => (
                    <button
                      key={type.format}
                      onClick={() => startInterview(type.format, skills[0]?.name || 'General')}
                      disabled={startingInterview}
                      className="group p-3.5 rounded-xl border border-white/[0.06] bg-[#0a0c1a] hover:border-white/[0.12] hover:bg-[#0d1020] text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-2.5"
                        style={{ background: type.color + '12', border: `1px solid ${type.color}20` }}
                      >
                        {type.icon}
                      </div>
                      <div className="font-medium text-xs leading-tight">{type.label}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent sessions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Recent sessions</h2>
                  <span className="text-[11px] text-white/20">{completedSessions.length} done</span>
                </div>

                {loading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.03]" />)}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.05] p-5 text-center text-xs text-white/30">
                    No sessions yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sessions.slice(0, 6).map((session) => (
                      <div key={session._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group">
                        <div className="text-base w-6 text-center shrink-0">{FORMAT_ICONS[session.format] || '📋'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{FORMAT_LABELS[session.format]}</div>
                          <div className="text-[10px] text-white/25 truncate">{session.targetSkill}</div>
                        </div>
                        {session.status === 'completed' && session.scores?.overall ? (
                          <span className="text-xs font-mono font-bold shrink-0" style={{ color: getScoreColor(session.scores.overall) }}>
                            {session.scores.overall}
                          </span>
                        ) : (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                            session.status === 'in_progress' ? 'bg-[#8B7CF8]/15 text-[#8B7CF8]' : 'text-white/20'
                          }`}>
                            {session.status.replace('_', ' ')}
                          </span>
                        )}
                        {session.status === 'completed' && (
                          <Link href={`/interview/report/${session._id}`}>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Experience + Education in a row */}
          {!loading && ((data?.profile?.experiences?.length ?? 0) > 0 || (data?.profile?.educations?.length ?? 0) > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {data?.profile?.experiences && data.profile.experiences.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Experience</h2>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0a0c1a] divide-y divide-white/[0.04]">
                    {data.profile.experiences.map((exp, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                        <div className="w-7 h-7 rounded-lg bg-[#8B7CF8]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase className="w-3 h-3 text-[#8B7CF8]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{exp.title}</div>
                          <div className="text-xs text-white/40 mt-0.5">{exp.company}
                            {exp.duration && <span className="text-white/25"> · {exp.duration}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data?.profile?.educations && data.profile.educations.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Education</h2>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0a0c1a] divide-y divide-white/[0.04]">
                    {data.profile.educations.map((edu, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                        <div className="w-7 h-7 rounded-lg bg-[#3FC5F0]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="w-3 h-3 text-[#3FC5F0]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{edu.institution}</div>
                          {edu.degree && <div className="text-xs text-white/40 mt-0.5">{edu.degree}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Projects */}
          {!loading && data?.profile?.projects && data.profile.projects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-white/30">GitHub Projects</h2>
                <Link
                  href={`https://github.com/${data?.user?.username}`}
                  target="_blank"
                  className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
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
                    className="p-4 rounded-xl border border-white/[0.06] bg-[#0a0c1a] hover:border-white/[0.12] transition-colors block group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-sm text-[#2DE2C5] truncate">{project.repoName}</div>
                      <GitBranch className="w-3.5 h-3.5 text-white/20 shrink-0 group-hover:text-white/40 transition-colors" />
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed mb-3 line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {project.techStack?.slice(0, 3).map((tech) => (
                        <span key={tech} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30 border border-white/[0.05]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
