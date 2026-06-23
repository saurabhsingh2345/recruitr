import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  GitBranch, ExternalLink, MapPin, Shield, Star, Briefcase,
  GraduationCap, CheckCircle2, TrendingUp, Calendar, Zap, ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getScoreColor, getScoreLabel, getConfidenceBand } from '@/lib/scoring'
import { ShareBadgeButton } from './ShareBadgeButton'
import { RankCardShare } from '@/components/RankCardShare'
import { ThemeMinimal } from '@/components/portfolio/ThemeMinimal'
import { ThemeTerminal } from '@/components/portfolio/ThemeTerminal'
import type { PortfolioData } from '@/components/portfolio/types'

interface SessionSnap {
  _id: string
  targetSkill: string
  format: string
  scores: { overall: number }
  completedAt: string
  rigorConditions?: {
    faceDetectionActive: boolean
    fullScreenEnforced: boolean
    copyPasteBlocked: boolean
    windowSwitchDetected: boolean
  }
  scoreUpdate?: { before: number; after: number; delta: number }
}

interface Specialization {
  name: string
  skill: string
  score: number
  scoreHistory: Array<{ score: number; at: string; sessionId?: string }>
  confirmedByUser: boolean
  evidence: { repoLinks: string[]; sessionIds: string[] }
}

interface Params {
  params: Promise<{ username: string }>
  searchParams: Promise<{ theme?: string; preview?: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params
  const data = await getProfile(username)
  if (!data) return {}

  const { user, profile } = data
  const rank = profile.cohortPercentile > 0 ? `Top ${100 - profile.cohortPercentile}%` : null
  const baseUrl = process.env.NEXTAUTH_URL || 'https://intervue.in'
  const rankCardUrl = `${baseUrl}/api/rank-card/${username}`
  const topSpec = (profile.specializations || [])[0]
  const specDesc = topSpec ? ` · ${topSpec.name} specialist` : ''

  return {
    title: `${user.name} — ${profile.targetRole || 'Engineer'}${specDesc} · Intervue`,
    description: rank
      ? `${user.name} is ${rank} of ${profile.targetRole || 'engineers'} in India, verified by Intervue.`
      : `${user.name}'s verified engineering profile on Intervue.`,
    openGraph: {
      title: `${user.name} — ${rank ?? 'Verified'} on Intervue`,
      description: `Proof-of-skill scores verified by AI interviews and GitHub.`,
      images: [{ url: rankCardUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${user.name} — ${rank ?? 'Verified'} on Intervue`,
      images: [rankCardUrl],
    },
  }
}

async function getProfile(username: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/profile/${username}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatLabel(fmt: string) {
  const labels: Record<string, string> = {
    coding: 'Coding',
    system_design: 'System Design',
    project_deepdive: 'Project Deep-dive',
    behavioural: 'Behavioural',
    gap: 'Gap Analysis',
    pm_case: 'PM Case Study',
    design_critique: 'Design Critique',
    ops_case: 'Ops / Program Mgmt',
    sales_discovery: 'Sales Discovery',
  }
  return labels[fmt] || fmt
}

function RigorBadge({ conditions }: { conditions?: SessionSnap['rigorConditions'] }) {
  if (!conditions) return null
  const checks = [
    { label: 'Face detection', ok: conditions.faceDetectionActive },
    { label: 'Full screen', ok: conditions.fullScreenEnforced },
    { label: 'Copy blocked', ok: conditions.copyPasteBlocked },
  ].filter(c => c.ok)
  if (checks.length === 0) return null
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 text-[#2DE2C5] text-[10px] font-medium">
      <Shield className="w-2.5 h-2.5" />
      Verified · {checks.length} rigor check{checks.length !== 1 ? 's' : ''}
    </span>
  )
}

export default async function PublicProfilePage({ params, searchParams }: Params) {
  const { username } = await params
  const { theme: themeOverride } = await searchParams
  const data = await getProfile(username)
  if (!data) notFound()

  const { user, profile, sessions = [], verifiedCard = null } = data

  /* ── Theme routing ── */
  const resolvedTheme = themeOverride || profile.portfolioTheme
  if (resolvedTheme === 'minimal' || resolvedTheme === 'terminal') {
    const portfolioData: PortfolioData = { user, profile }
    if (resolvedTheme === 'minimal') return <ThemeMinimal {...portfolioData} />
    return <ThemeTerminal {...portfolioData} />
  }

  const allSkills = (profile.parsedSkills || []).sort(
    (a: { proofScore: number }, b: { proofScore: number }) => b.proofScore - a.proofScore
  )

  const specializations: Specialization[] = (profile.specializations || []).sort(
    (a: Specialization, b: Specialization) => b.score - a.score
  )

  const topSpec = specializations[0]

  // One-line proof statement from top skill + spec
  const topSkill = allSkills[0]
  const proofStatement = topSpec
    ? `Proven depth in ${topSpec.name}${allSkills[1] ? `, ${allSkills[1].name}` : ''}`
    : topSkill
    ? `Verified ${topSkill.name} engineer · ${allSkills.length} skill${allSkills.length !== 1 ? 's' : ''} proven`
    : 'Verified engineer on Intervue'

  const completedSessions: SessionSnap[] = sessions.filter((s: SessionSnap) => s.scores?.overall > 0)
  const sessionCount = completedSessions.length

  return (
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-card border-b border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
              <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-sm">intervue</span>
          </Link>
          <Link href="/onboarding">
            <Button size="sm" className="btn-supernova font-semibold text-xs h-8 px-4">
              Build your profile
            </Button>
          </Link>
        </div>
      </nav>

      <div className="relative max-w-3xl mx-auto px-6 pt-8 pb-20 space-y-8">

        {/* ── Hero Section ── */}
        <header className="border-b border-white/[0.06] pb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full shrink-0 ring-2 ring-[#2DE2C5]/20" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-xl shrink-0">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-semibold leading-tight">{user.name}</h1>

                {/* Specialization label — the key identity line */}
                {topSpec ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Zap className="w-3 h-3 text-[#2DE2C5] shrink-0" />
                    <span className="text-sm font-medium text-[#2DE2C5]">{topSpec.name} Specialist</span>
                    <span className="text-[#888FC0] text-sm">· {topSpec.skill}</span>
                  </div>
                ) : profile.bio ? (
                  <p className="text-sm text-[#888FC0] mt-0.5 truncate max-w-xs">{profile.bio}</p>
                ) : null}

                {/* Proof statement */}
                <p className="text-xs text-[#888FC0] mt-1.5 max-w-xs leading-relaxed">{proofStatement}</p>

                {/* Credibility signals row */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 font-medium">
                    Verified by Intervue
                  </span>
                  {sessionCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-[#AEB5E0] border border-white/[0.07] font-medium">
                      {sessionCount} interview session{sessionCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {profile.vouchedBadge && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#8B7CF8]/10 text-[#8B7CF8] border border-[#8B7CF8]/20 font-medium">
                      Vouched
                    </span>
                  )}
                  {profile.location && (
                    <span className="flex items-center gap-1 text-[10px] text-[#888FC0]">
                      <MapPin className="w-2.5 h-2.5" />{profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rank number */}
            <div className="text-right shrink-0 flex flex-col items-end gap-3">
              {profile.cohortPercentile > 0 && (
                <div>
                  <div className="font-mono text-4xl font-medium leading-none">
                    Top {100 - profile.cohortPercentile}%
                  </div>
                  <div className="text-xs text-[#888FC0] mt-1">
                    of {profile.targetRole || 'engineers'} in India
                  </div>
                </div>
              )}
              <RankCardShare username={username} percentile={profile.cohortPercentile} />
            </div>
          </div>
        </header>

        {/* ── Verified Card ── */}
        {verifiedCard && (
          <section>
            <Link
              href={`/verified-card/${verifiedCard.cardToken}`}
              className="flex items-center justify-between p-4 rounded-xl border border-[#2DE2C5]/30 bg-[#2DE2C5]/[0.04] hover:bg-[#2DE2C5]/[0.08] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2DE2C5]/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 text-[#2DE2C5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2DE2C5]">Intervue Verified</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 font-medium">Card</span>
                  </div>
                  <p className="text-sm font-medium text-white mt-0.5">
                    {[verifiedCard.targetLevel, verifiedCard.targetRole].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-xs text-[#888FC0] mt-0.5">
                    {verifiedCard.sessionCount} sessions · Issued {new Date(verifiedCard.issuedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    {verifiedCard.topSkills?.[0] && ` · Top: ${verifiedCard.topSkills[0].name} ${verifiedCard.topSkills[0].score}/100`}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#2DE2C5]/50 group-hover:text-[#2DE2C5] transition-colors shrink-0" />
            </Link>
          </section>
        )}

        {/* ── Specialization Breakdown ── */}
        {specializations.length > 0 && (
          <section>
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-[#888FC0] mb-4">
              Specializations
            </h2>
            <div className="space-y-4">
              {specializations.map((spec) => {
                const color = getScoreColor(spec.score)
                const history = spec.scoreHistory || []
                const earliest = history[0]?.score
                const progression = history.length >= 2 && earliest
                  ? spec.score - earliest
                  : null

                // Find related sessions
                const relatedSessions = completedSessions.filter(
                  s => spec.evidence.sessionIds.includes(s._id) || s.targetSkill.toLowerCase() === spec.skill.toLowerCase()
                ).slice(0, 3)

                // Find related repos
                const relatedRepos = spec.evidence.repoLinks.slice(0, 3)

                return (
                  <div key={`${spec.skill}-${spec.name}`}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">

                    {/* Spec header */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-semibold text-sm">{spec.name}</span>
                        <span className="text-xs text-[#888FC0]">· {spec.skill}</span>
                        {spec.confirmedByUser && (
                          <CheckCircle2 className="w-3 h-3 text-[#2DE2C5] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {progression !== null && progression > 0 && (
                          <span className="text-[10px] text-[#2DE2C5] font-mono">+{progression} pts</span>
                        )}
                        <span className="font-mono text-lg font-bold" style={{ color }}>{spec.score}</span>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${spec.score}%`, backgroundColor: color }}
                      />
                    </div>

                    {/* Evidence */}
                    {(relatedSessions.length > 0 || relatedRepos.length > 0) && (
                      <div className="space-y-2">
                        {relatedSessions.length > 0 && (
                          <div>
                            <div className="text-[10px] text-[#888FC0] uppercase tracking-wider mb-1.5">
                              Proven in sessions
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {relatedSessions.map(s => (
                                <span key={s._id}
                                  className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[#AEB5E0]">
                                  <span className="font-mono font-medium" style={{ color: getScoreColor(s.scores.overall) }}>
                                    {s.scores.overall}
                                  </span>
                                  <span>· {formatLabel(s.format)} · {formatDate(s.completedAt)}</span>
                                  <RigorBadge conditions={s.rigorConditions} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {relatedRepos.length > 0 && (
                          <div>
                            <div className="text-[10px] text-[#888FC0] uppercase tracking-wider mb-1.5">
                              GitHub evidence
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {relatedRepos.map(url => {
                                const parts = url.split('/')
                                const repoName = parts.slice(-2).join('/')
                                return (
                                  <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[#2DE2C5] hover:border-[#2DE2C5]/30 transition-colors">
                                    <GitBranch className="w-2.5 h-2.5" />
                                    {repoName}
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Verified Skills ── */}
        {allSkills.length > 0 && (
          <section>
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-[#888FC0] mb-4">
              Verified skills
            </h2>
            <div className="space-y-3">
              {allSkills.map((skill: { name: string; proofScore: number; evidence: string[]; scoreHistory?: { score: number }[] }) => {
                const color = getScoreColor(skill.proofScore)
                const band = skill.scoreHistory && skill.scoreHistory.length >= 3
                  ? getConfidenceBand(skill.scoreHistory)
                  : null
                return (
                  <div key={skill.name} className="flex items-center gap-3 group">
                    <div className="w-28 text-sm text-white/70 group-hover:text-[#2DE2C5] transition-colors truncate">
                      {skill.name}
                    </div>
                    <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${skill.proofScore}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="text-right w-10 shrink-0">
                      <div className="font-mono text-sm font-medium leading-none" style={{ color }}>
                        {skill.proofScore}
                      </div>
                      {band && band.sigma > 0 && (
                        <div className="font-mono text-[9px] text-[#888FC0] leading-none mt-0.5">
                          ±{band.sigma}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-[#888FC0] w-16 text-right shrink-0">
                      {skill.evidence?.length > 0
                        ? `${skill.evidence.length} ${skill.evidence.length === 1 ? 'source' : 'sources'}`
                        : getScoreLabel(skill.proofScore)}
                    </div>
                    <ShareBadgeButton username={username} skillName={skill.name} />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Progression Timeline ── */}
        {completedSessions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#2DE2C5]" />
              <h2 className="font-semibold text-sm">Interview History</h2>
              <span className="text-[10px] text-[#888FC0]">— proof of growth over time</span>
            </div>
            <div className="space-y-2">
              {completedSessions.slice(0, 8).map((s) => {
                const color = getScoreColor(s.scores.overall)
                const rigorActive = s.rigorConditions?.faceDetectionActive ||
                  s.rigorConditions?.fullScreenEnforced ||
                  s.rigorConditions?.copyPasteBlocked
                return (
                  <div key={s._id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:border-white/[0.09] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-[#888FC0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{s.targetSkill}</span>
                        <span className="text-xs text-[#888FC0]">· {formatLabel(s.format)}</span>
                        {rigorActive && (
                          <RigorBadge conditions={s.rigorConditions} />
                        )}
                      </div>
                      <div className="text-[10px] text-[#888FC0] mt-0.5">{formatDate(s.completedAt)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-lg font-bold" style={{ color }}>
                        {s.scores.overall}
                      </div>
                      {s.scoreUpdate && s.scoreUpdate.delta > 0 && (
                        <div className="text-[10px] text-[#2DE2C5] font-mono">+{s.scoreUpdate.delta}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── GitHub Projects ── */}
        {profile.projects?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-[#AEB5E0]" />
              <h2 className="font-semibold text-sm">Featured Projects</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.projects.slice(0, 4).map((project: {
                repoName: string; githubUrl: string; description: string
                techStack: string[]; stars?: number
              }) => (
                <a key={project.repoName} href={project.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="block p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-[#2DE2C5]/25 hover:bg-white/[0.025] transition-all group">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-sm text-[#2DE2C5] font-medium group-hover:text-[#5af0d6] transition-colors truncate">
                      {project.repoName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {project.stars != null && project.stars > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#AEB5E0]">
                          <Star className="w-2.5 h-2.5" />{project.stars}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 text-[#888FC0] group-hover:text-[#AEB5E0] transition-colors" />
                    </div>
                  </div>
                  <p className="text-xs text-[#888FC0] leading-relaxed mb-3 line-clamp-2">{project.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {project.techStack?.slice(0, 4).map((tech: string) => (
                      <Badge key={tech} className="text-[9px] px-1.5 py-0 h-4 bg-white/[0.04] text-[#AEB5E0] border-white/[0.06]">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Portfolio projects ── */}
        {profile.portfolioProjects?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[#8B7CF8]" />
              <h2 className="font-semibold text-sm">Portfolio</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.portfolioProjects.slice(0, 6).map((p: {
                title: string; description: string; techStack: string[]
                images: string[]; liveUrl: string; githubUrl: string; featured: boolean
              }, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                  {p.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.title} className="w-full h-36 object-cover rounded-lg mb-3 opacity-80" />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-sm">{p.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.githubUrl && (
                        <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[#888FC0] hover:text-[#AEB5E0]">
                          <GitBranch className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {p.liveUrl && (
                        <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="text-[#888FC0] hover:text-[#2DE2C5]">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#888FC0] leading-relaxed mb-2">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.techStack?.slice(0, 4).map((t: string) => (
                      <Badge key={t} className="text-[9px] px-1.5 py-0 h-4 bg-white/[0.04] text-[#AEB5E0] border-white/[0.06]">{t}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Experience ── */}
        {profile.experiences?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-[#AEB5E0]" />
              <h2 className="font-semibold text-sm">Experience</h2>
            </div>
            <div className="space-y-2">
              {profile.experiences.map((exp: { title: string; company: string; duration: string }, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                  <div className="w-8 h-8 rounded-lg bg-[#8B7CF8]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#8B7CF8]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{exp.title}</div>
                    <div className="text-xs text-[#AEB5E0] mt-0.5">{exp.company}</div>
                    {exp.duration && <div className="text-xs text-[#888FC0] mt-0.5">{exp.duration}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Education ── */}
        {profile.educations?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-[#AEB5E0]" />
              <h2 className="font-semibold text-sm">Education</h2>
            </div>
            <div className="space-y-2">
              {profile.educations.map((edu: { institution: string; degree: string }, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                  <div className="w-8 h-8 rounded-lg bg-[#3FC5F0]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#3FC5F0]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{edu.institution}</div>
                    {edu.degree && <div className="text-xs text-[#AEB5E0] mt-0.5">{edu.degree}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Anti-cheat trust block ── */}
        {completedSessions.some(s =>
          s.rigorConditions?.faceDetectionActive || s.rigorConditions?.fullScreenEnforced
        ) && (
          <section className="rounded-2xl border border-[#2DE2C5]/15 bg-[#2DE2C5]/[0.03] p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2DE2C5]/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-[#2DE2C5]" />
              </div>
              <div>
                <div className="font-semibold text-sm mb-1">Verified under rigor conditions</div>
                <p className="text-xs text-[#888FC0] leading-relaxed mb-3">
                  These scores were earned in monitored sessions — no external tools, copy-paste blocked, full-screen enforced.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Face detection', icon: '👁' },
                    { label: 'Full screen', icon: '⛶' },
                    { label: 'Copy blocked', icon: '🔒' },
                  ].map(c => (
                    <span key={c.label} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#2DE2C5]/[0.08] border border-[#2DE2C5]/20 text-[#2DE2C5]">
                      {c.icon} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Recruiter CTA ── */}
        <div className="relative rounded-2xl border border-white/[0.06] bg-[#080A18] p-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2DE2C5]/03 to-[#8B7CF8]/03 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl icon-teal flex items-center justify-center mx-auto mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-1">Interested in {user.name}?</h3>
            <p className="text-xs text-[#AEB5E0] mb-5 max-w-sm mx-auto leading-relaxed">
              Sign in to send a message, propose an interview, and manage the full hiring pipeline — directly on Intervue.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href={`/recruiter?contact=${username}`}>
                <Button size="sm" className="btn-supernova text-[#05060F] font-semibold h-9 px-5 text-sm">
                  Contact {user.name.split(' ')[0]}
                </Button>
              </Link>
              <Link href="/recruiter">
                <Button size="sm" variant="outline"
                  className="border-white/[0.08] text-[#AEB5E0] hover:text-white hover:border-white/20 h-9 px-5 text-sm bg-transparent">
                  Recruiter dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
