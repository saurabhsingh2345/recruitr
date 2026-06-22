import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GitBranch, ExternalLink, MapPin, Award, Shield, Star, Briefcase, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { ShareBadgeButton } from './ShareBadgeButton'
import { SkillConstellation } from '@/components/SkillConstellation'
import { ThemeMinimal } from '@/components/portfolio/ThemeMinimal'
import { ThemeTerminal } from '@/components/portfolio/ThemeTerminal'
import { ThemeMagazine } from '@/components/portfolio/ThemeMagazine'
import { ThemeBento } from '@/components/portfolio/ThemeBento'
import type { PortfolioData } from '@/components/portfolio/types'

interface Params {
  params: Promise<{ username: string }>
  searchParams: Promise<{ theme?: string; preview?: string }>
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

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
      />
    </svg>
  )
}

function SkillBar({ name, score, evidence, username }: { name: string; score: number; evidence: string[]; username: string }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-colors group">
      <div className="relative shrink-0">
        <ScoreRing score={score} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold font-mono" style={{ color }}>{score}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-sm">{name}</span>
          <Badge
            className="text-[9px] px-1.5 py-0 h-4 font-medium"
            style={{ backgroundColor: color + '18', color, borderColor: color + '30' }}
          >
            {getScoreLabel(score)}
          </Badge>
          <ShareBadgeButton username={username} skillName={name} />
        </div>
        {evidence.slice(0, 2).map((e, i) => (
          <p key={i} className="text-xs text-[#888FC0] leading-relaxed">· {e}</p>
        ))}
      </div>
    </div>
  )
}

export default async function PublicProfilePage({ params, searchParams }: Params) {
  const { username } = await params
  const { theme: themeOverride } = await searchParams
  const data = await getProfile(username)
  if (!data) notFound()

  const { user, profile } = data

  /* ── Theme routing — searchParams.theme overrides saved theme ── */
  const resolvedTheme = themeOverride || profile.portfolioTheme
  if (resolvedTheme) {
    const portfolioData: PortfolioData = { user, profile }
    switch (resolvedTheme) {
      case 'minimal':   return <ThemeMinimal {...portfolioData} />
      case 'terminal':  return <ThemeTerminal {...portfolioData} />
      case 'magazine':  return <ThemeMagazine {...portfolioData} />
      case 'bento':     return <ThemeBento {...portfolioData} />
    }
  }

  /* ── Default layout (no theme chosen yet) ───────────────────── */
  const topSkills = (profile.parsedSkills?.sort(
    (a: { proofScore: number }, b: { proofScore: number }) => b.proofScore - a.proofScore
  ) || []).slice(0, 5)

  const avgScore = topSkills.length > 0
    ? Math.round(topSkills.reduce((s: number, sk: { proofScore: number }) => s + sk.proofScore, 0) / topSkills.length)
    : 0

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

      {/* Constellation hero */}
      <div className="relative overflow-hidden border-b border-white/[0.05]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(45,226,197,0.1),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 pt-10 pb-8 flex justify-center">
          {topSkills.length > 0 ? (
            <SkillConstellation
              skills={topSkills}
              centerLabel={(user.name?.[0] || 'U').toUpperCase()}
              avatarUrl={user.avatarUrl || undefined}
              size={380}
            />
          ) : user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-[#05060F] shadow-[0_0_0_2px_rgba(45,226,197,0.3)] mt-6"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-[#05060F] bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-2xl shadow-[0_0_0_2px_rgba(45,226,197,0.3)] mt-6">
              {user.name?.[0] || 'U'}
            </div>
          )}
        </div>
      </div>

      <div className="relative max-w-3xl mx-auto px-6 pt-8 pb-20 space-y-7">

        {/* Identity block */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/25">
              <Shield className="w-3 h-3 text-[#2DE2C5]" />
              <span className="text-[10px] text-[#2DE2C5] font-semibold">Verified by Intervue</span>
            </div>
          </div>

          {profile.targetRole && (
            <p className="text-[#AEB5E0] text-sm font-medium">{profile.targetRole}</p>
          )}

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {profile.location && (
              <div className="flex items-center gap-1 text-xs text-[#888FC0]">
                <MapPin className="w-3 h-3" />
                {profile.location}
              </div>
            )}
            <a
              href={`https://github.com/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#888FC0] hover:text-[#2DE2C5] transition-colors"
            >
              <GitBranch className="w-3 h-3" />
              @{user.username}
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {profile.yearsOfExperience > 0 && (
              <Badge className="bg-white/[0.04] text-[#AEB5E0] border-white/[0.07] text-xs">
                {profile.yearsOfExperience}+ yrs exp
              </Badge>
            )}
            {avgScore > 0 && (
              <Badge className="bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20 text-xs">
                Avg score {avgScore}
              </Badge>
            )}
            {profile.cohortPercentile > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                <Award className="w-3 h-3 text-[#f59e0b]" />
                <span className="text-xs text-[#f59e0b]">
                  Top {100 - profile.cohortPercentile}% · {profile.targetRole} India
                </span>
              </div>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-center text-sm text-[#AEB5E0] leading-relaxed max-w-lg mx-auto">
            {profile.bio}
          </p>
        )}

        {/* Skill scores */}
        {topSkills.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[#2DE2C5]" />
              <h2 className="font-semibold text-sm">Proof-of-Skill Scores</h2>
              <span className="text-xs text-[#888FC0] ml-auto">Verified via AI interviews + GitHub</span>
            </div>
            <div className="space-y-2">
              {topSkills.map((skill: { name: string; proofScore: number; evidence: string[] }) => (
                <SkillBar key={skill.name} name={skill.name} score={skill.proofScore} evidence={skill.evidence} username={username} />
              ))}
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
