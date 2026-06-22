import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GitBranch, ExternalLink, MapPin, Shield, Star, Briefcase, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getScoreColor, getScoreLabel, getConfidenceBand } from '@/lib/scoring'
import { ShareBadgeButton } from './ShareBadgeButton'
import { RankCardShare } from '@/components/RankCardShare'
import { ThemeMinimal } from '@/components/portfolio/ThemeMinimal'
import { ThemeTerminal } from '@/components/portfolio/ThemeTerminal'
import type { PortfolioData } from '@/components/portfolio/types'

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

  return {
    title: `${user.name} — ${profile.targetRole || 'Engineer'} · Intervue`,
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
    const res = await fetch(`${baseUrl}/api/profile/${username}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}


export default async function PublicProfilePage({ params, searchParams }: Params) {
  const { username } = await params
  const { theme: themeOverride } = await searchParams
  const data = await getProfile(username)
  if (!data) notFound()

  const { user, profile } = data

  /* ── Theme routing ── only minimal and terminal ── */
  const resolvedTheme = themeOverride || profile.portfolioTheme
  if (resolvedTheme === 'minimal' || resolvedTheme === 'terminal') {
    const portfolioData: PortfolioData = { user, profile }
    if (resolvedTheme === 'minimal') return <ThemeMinimal {...portfolioData} />
    return <ThemeTerminal {...portfolioData} />
  }

  /* ── Default layout ───────────────────────────────────────────── */
  const allSkills = (profile.parsedSkills || []).sort(
    (a: { proofScore: number }, b: { proofScore: number }) => b.proofScore - a.proofScore
  )

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

      <div className="relative max-w-3xl mx-auto px-6 pt-8 pb-20 space-y-7">

        {/* Profile header — identity + rank number */}
        <header className="border-b border-white/[0.06] pb-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: avatar + identity */}
            <div className="flex items-center gap-4 min-w-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-xl shrink-0">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-semibold leading-tight">{user.name}</h1>
                {profile.bio && (
                  <p className="text-sm text-[#888FC0] mt-0.5 truncate max-w-xs">{profile.bio}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 font-medium">
                    Verified by Intervue
                  </span>
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

            {/* Right: THE NUMBER — what a recruiter's eye lands on */}
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

        {/* Verified skills — ranked list */}
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

        {/* GitHub Projects */}
        {profile.projects?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-[#AEB5E0]" />
              <h2 className="font-semibold text-sm">Featured Projects</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.projects.slice(0, 4).map((project: {
                repoName: string
                githubUrl: string
                description: string
                techStack: string[]
                stars?: number
              }) => (
                <a
                  key={project.repoName}
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-[#2DE2C5]/25 hover:bg-white/[0.025] transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-sm text-[#2DE2C5] font-medium group-hover:text-[#5af0d6] transition-colors truncate">
                      {project.repoName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {project.stars != null && project.stars > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#AEB5E0]">
                          <Star className="w-2.5 h-2.5" />
                          {project.stars}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 text-[#888FC0] group-hover:text-[#AEB5E0] transition-colors" />
                    </div>
                  </div>
                  <p className="text-xs text-[#888FC0] leading-relaxed mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {project.techStack?.slice(0, 4).map((tech: string) => (
                      <Badge
                        key={tech}
                        className="text-[9px] px-1.5 py-0 h-4 bg-white/[0.04] text-[#AEB5E0] border-white/[0.06]"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Portfolio projects */}
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

        {/* Experience */}
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

        {/* Education */}
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

        {/* Recruiter CTA */}
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
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/[0.08] text-[#AEB5E0] hover:text-white hover:border-white/20 h-9 px-5 text-sm bg-transparent"
                >
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
