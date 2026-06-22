import Link from 'next/link'
import { MapPin, ExternalLink, Shield, ArrowUpRight } from 'lucide-react'
import type { PortfolioData } from './types'
import { getScoreColor } from '@/lib/scoring'
import { socialIcon, GithubIcon } from './SocialIcons'

export function ThemeMinimal({ user, profile }: PortfolioData) {
  const c = profile.portfolioCustomization
  const accent = c?.accentColor || '#2DE2C5'
  const topSkills = (profile.parsedSkills || []).sort((a, b) => b.proofScore - a.proofScore).slice(0, 6)
  const projects = profile.portfolioProjects?.length ? profile.portfolioProjects : []
  const showSkills = c?.showSkills !== false
  const showExp = c?.showExperience !== false
  const showProj = c?.showProjects !== false
  const showEdu = c?.showEducation !== false

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#f0f0f0]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs text-[#666] hover:text-[#0a0a0a] transition-colors">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-semibold text-[#0a0a0a]">intervue</span>
          </Link>
          <div className="flex items-center gap-3">
            {c?.socialLinks?.slice(0, 4).map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-[#999] hover:text-[#0a0a0a] transition-colors">
                {socialIcon(s.platform)}
              </a>
            ))}
            <Link href={`https://github.com/${user.username}`} target="_blank" className="text-[#999] hover:text-[#0a0a0a] transition-colors">
              <GithubIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-start">
          <div>
            <div className="flex items-center gap-3 mb-6">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name}
                  className="w-14 h-14 rounded-full ring-2 ring-[#f0f0f0]" />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: accent }}>
                  {user.name[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#999]">@{user.username}</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: accent + '15', color: accent }}>
                    <Shield className="w-2.5 h-2.5" />Verified
                  </span>
                </div>
                {profile.location && (
                  <div className="flex items-center gap-1 text-xs text-[#999] mt-0.5">
                    <MapPin className="w-3 h-3" />{profile.location}
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-5xl font-black text-[#0a0a0a] leading-[1.05] tracking-[-0.03em] mb-4">
              {user.name}
            </h1>
            <p className="text-xl text-[#555] font-medium mb-6">
              {c?.customTitle || profile.targetRole || 'Software Engineer'}
              {profile.yearsOfExperience > 0 && (
                <span className="text-[#999] font-normal"> · {profile.yearsOfExperience}+ years</span>
              )}
            </p>
            {profile.bio && (
              <p className="text-[15px] text-[#666] leading-relaxed max-w-xl mb-8">{profile.bio}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <a href={`mailto:?subject=Hiring%20inquiry%20for%20${user.name}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: '#0a0a0a' }}>
                Contact me <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[#555] border border-[#e8e8e8] hover:border-[#ccc] hover:text-[#0a0a0a] transition-all">
                <GithubIcon className="w-3.5 h-3.5" />GitHub
              </a>
            </div>
          </div>

          {/* Proof score highlight */}
          {topSkills[0] && (
            <div className="hidden lg:block">
              <div className="w-52 p-6 rounded-2xl border border-[#f0f0f0] bg-[#fafafa]">
                <div className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">Top skill</div>
                <div className="text-6xl font-black leading-none mb-2" style={{ color: getScoreColor(topSkills[0].proofScore) }}>
                  {topSkills[0].proofScore}
                </div>
                <div className="text-sm font-semibold text-[#0a0a0a] mb-1">{topSkills[0].name}</div>
                <div className="text-[11px] text-[#999]">out of 100 · proof score</div>
                {profile.cohortPercentile > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#eee] text-[11px] text-[#666]">
                    Top <span className="font-bold text-[#0a0a0a]">{100 - profile.cohortPercentile}%</span> of candidates
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="border-t border-[#f0f0f0]" />

      {/* Main content */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-16">

          {/* Left column */}
          <div className="space-y-16">

            {/* Portfolio projects */}
            {showProj && projects.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#999] mb-8">Projects</h2>
                <div className="space-y-10">
                  {projects.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).map((p, i) => (
                    <div key={i} className="group">
                      {p.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.title}
                          className="w-full h-52 object-cover rounded-xl mb-5 border border-[#f0f0f0]" />
                      )}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-[#0a0a0a]">{p.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.githubUrl && (
                            <a href={p.githubUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[#999] hover:text-[#0a0a0a] transition-colors">
                              <GithubIcon className="w-4 h-4" />
                            </a>
                          )}
                          {p.liveUrl && (
                            <a href={p.liveUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[#999] hover:text-[#0a0a0a] transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-[#666] leading-relaxed mb-3">{p.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.techStack.map((t) => (
                          <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f5f5f5] text-[#555]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {showSkills && topSkills.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#999] mb-8">Verified Skills</h2>
                <div className="space-y-3">
                  {topSkills.map((skill) => {
                    const color = getScoreColor(skill.proofScore)
                    return (
                      <div key={skill.name} className="flex items-center gap-4">
                        <div className="w-28 shrink-0 text-sm font-medium text-[#0a0a0a]">{skill.name}</div>
                        <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${skill.proofScore}%`, background: color }} />
                        </div>
                        <div className="w-8 text-right text-xs font-bold font-mono shrink-0" style={{ color }}>{skill.proofScore}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-10">

            {showExp && profile.experiences?.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#999] mb-6">Experience</h2>
                <div className="space-y-6">
                  {profile.experiences.map((exp, i) => (
                    <div key={i} className="relative pl-4">
                      <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#ddd]" />
                      <div className="text-sm font-semibold text-[#0a0a0a]">{exp.title}</div>
                      <div className="text-xs text-[#666] mt-0.5">{exp.company}</div>
                      {exp.duration && <div className="text-xs text-[#999] mt-0.5">{exp.duration}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showEdu && profile.educations?.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#999] mb-6">Education</h2>
                <div className="space-y-4">
                  {profile.educations.map((edu, i) => (
                    <div key={i}>
                      <div className="text-sm font-semibold text-[#0a0a0a]">{edu.institution}</div>
                      {edu.degree && <div className="text-xs text-[#666] mt-0.5">{edu.degree}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 rounded-xl border border-[#f0f0f0] bg-[#fafafa] text-center">
              <div className="text-xs text-[#999] mb-2">Verified by</div>
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0a0a0a]" suppressHydrationWarning>
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                  <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
                  <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                intervue
              </Link>
              <p className="text-[11px] text-[#999] mt-2 leading-relaxed">
                Skills verified through AI interviews and GitHub analysis.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
