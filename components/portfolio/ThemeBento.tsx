import Link from 'next/link'
import { MapPin, ExternalLink, Shield, ArrowUpRight, Briefcase, GraduationCap, Zap } from 'lucide-react'
import type { PortfolioData } from './types'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { socialIcon, GithubIcon } from './SocialIcons'

export function ThemeBento({ user, profile }: PortfolioData) {
  const c = profile.portfolioCustomization
  const accent = c?.accentColor || '#2DE2C5'
  const topSkills = (profile.parsedSkills || []).sort((a, b) => b.proofScore - a.proofScore).slice(0, 6)
  const projects = profile.portfolioProjects?.length ? profile.portfolioProjects : []
  const showSkills = c?.showSkills !== false
  const showExp = c?.showExperience !== false
  const showProj = c?.showProjects !== false
  const showEdu = c?.showEducation !== false
  const featuredProject = projects.find((p) => p.featured) || projects[0]

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-[#0a0a0a]">

      {/* Floating nav */}
      <nav className="sticky top-4 z-50 mx-4 mt-4">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-[#e8e8e8] shadow-sm">
          <div className="max-w-6xl mx-auto px-5 h-12 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
                <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-xs font-bold text-[#0a0a0a]">intervue</span>
            </Link>
            <div className="flex items-center gap-3">
              {c?.socialLinks?.slice(0, 3).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-[#999] hover:text-[#0a0a0a] transition-colors">
                  {socialIcon(s.platform)}
                </a>
              ))}
              <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer"
                className="text-[#999] hover:text-[#0a0a0a] transition-colors">
                <GithubIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Bento grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-12 gap-3 auto-rows-auto">

        {/* Hero card - 8 col */}
        <div className="col-span-12 md:col-span-8 bg-white rounded-3xl p-8 shadow-sm border border-[#e8e8e8] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.06] -translate-y-1/4 translate-x-1/4"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
          <div className="relative flex items-start gap-5">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name}
                className="w-16 h-16 rounded-2xl ring-2 ring-[#f0f0f0] shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
                style={{ background: accent }}>
                {user.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-black text-[#0a0a0a] tracking-tight">{user.name}</h1>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: accent + '18', color: accent }}>
                  <Shield className="w-2.5 h-2.5" />Verified
                </span>
              </div>
              <div className="text-sm font-medium text-[#555] mb-2">
                {c?.customTitle || profile.targetRole || 'Software Engineer'}
                {profile.yearsOfExperience > 0 && <span className="text-[#999]"> · {profile.yearsOfExperience}yr</span>}
              </div>
              {profile.location && (
                <div className="flex items-center gap-1 text-xs text-[#999] mb-3">
                  <MapPin className="w-3 h-3" />{profile.location}
                </div>
              )}
              {profile.bio && (
                <p className="text-[13px] text-[#666] leading-relaxed mb-4 max-w-lg">{profile.bio}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/recruiter?contact=${user.username}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ background: '#0a0a0a' }}>
                  Contact <ArrowUpRight className="w-3 h-3" />
                </Link>
                <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-[#e8e8e8] text-[#555] hover:border-[#ccc] hover:text-[#0a0a0a] transition-all bg-white">
                  <GithubIcon className="w-3.5 h-3.5" />GitHub
                </a>
                {c?.socialLinks?.slice(0, 2).map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-[#e8e8e8] text-[#555] hover:border-[#ccc] transition-all bg-white">
                    {socialIcon(s.platform)}{s.platform}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top skill score card - 4 col */}
        {topSkills[0] && (
          <div className="col-span-12 md:col-span-4 rounded-3xl p-7 shadow-sm relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)` }}>
            <div className="absolute inset-0 opacity-10"
              style={{ background: `radial-gradient(circle at 80% 20%, ${getScoreColor(topSkills[0].proofScore)}, transparent 60%)` }} />
            <div className="relative">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Top skill</div>
              <div className="text-6xl font-black leading-none mb-2" style={{ color: getScoreColor(topSkills[0].proofScore) }}>
                {topSkills[0].proofScore}
              </div>
              <div className="text-lg font-bold text-white mb-1">{topSkills[0].name}</div>
              <div className="text-xs text-white/40">{getScoreLabel(topSkills[0].proofScore)}</div>
              {profile.cohortPercentile > 0 && (
                <div className="mt-5 pt-5 border-t border-white/10 text-xs text-white/40">
                  Top <span className="font-bold text-white/80">{100 - profile.cohortPercentile}%</span> of verified candidates
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills grid card - 6 col */}
        {showSkills && topSkills.length > 1 && (
          <div className="col-span-12 md:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-[#e8e8e8]">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4" style={{ color: accent }} />
              <span className="text-xs font-bold uppercase tracking-wider text-[#999]">Verified Skills</span>
            </div>
            <div className="space-y-3">
              {topSkills.slice(1).map((skill) => {
                const color = getScoreColor(skill.proofScore)
                return (
                  <div key={skill.name} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-[12px] font-semibold text-[#333] truncate">{skill.name}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${skill.proofScore}%`, background: color }} />
                    </div>
                    <div className="w-7 text-right text-[11px] font-bold font-mono shrink-0" style={{ color }}>{skill.proofScore}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats card - 3 col */}
        <div className="col-span-6 md:col-span-3 rounded-3xl p-6 shadow-sm"
          style={{ background: accent + '10', border: `1px solid ${accent}20` }}>
          <div className="text-4xl font-black mb-1" style={{ color: accent }}>
            {topSkills.length}
          </div>
          <div className="text-sm font-semibold text-[#333] mb-1">Skills verified</div>
          <div className="text-xs text-[#666]">via AI interviews + GitHub</div>
        </div>

        {/* Years card - 3 col */}
        {profile.yearsOfExperience > 0 && (
          <div className="col-span-6 md:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-[#e8e8e8]">
            <div className="text-4xl font-black text-[#0a0a0a] mb-1">{profile.yearsOfExperience}+</div>
            <div className="text-sm font-semibold text-[#333] mb-1">Years of exp.</div>
            <div className="text-xs text-[#999]">{profile.targetRole || 'Engineering'}</div>
          </div>
        )}

        {/* Featured project - 6 col */}
        {showProj && featuredProject && (
          <div className="col-span-12 md:col-span-6 bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e8e8e8]">
            {featuredProject.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featuredProject.images[0]} alt={featuredProject.title}
                className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}05)` }}>
                <div className="text-5xl font-black" style={{ color: accent + '40' }}>{featuredProject.title[0]}</div>
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-bold text-[#0a0a0a]">{featuredProject.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  {featuredProject.githubUrl && (
                    <a href={featuredProject.githubUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[#999] hover:text-[#0a0a0a] transition-colors">
                      <GithubIcon className="w-4 h-4" />
                    </a>
                  )}
                  {featuredProject.liveUrl && (
                    <a href={featuredProject.liveUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                      style={{ background: accent + '15', color: accent }}>
                      Live <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-[13px] text-[#666] leading-relaxed mb-3">{featuredProject.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {featuredProject.techStack.map((t) => (
                  <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-[#f5f5f5] text-[#555]">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other projects - 6 col */}
        {showProj && projects.length > 1 && (
          <div className="col-span-12 md:col-span-6 flex flex-col gap-3">
            {projects.filter((p) => p !== featuredProject).slice(0, 2).map((p, i) => (
              <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-[#e8e8e8] flex-1">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-sm font-bold text-[#0a0a0a]">{p.title}</h3>
                  <div className="flex items-center gap-2">
                    {p.githubUrl && (
                      <a href={p.githubUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[#ccc] hover:text-[#999] transition-colors">
                        <GithubIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {p.liveUrl && (
                      <a href={p.liveUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[#ccc] hover:text-[#999] transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#666] leading-relaxed mb-2 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1">
                  {p.techStack.slice(0, 4).map((t) => (
                    <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#666]">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Experience + Education - 8 col */}
        {(showExp || showEdu) && (
          <div className="col-span-12 md:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-[#e8e8e8]">
            <div className="grid md:grid-cols-2 gap-8">
              {showExp && profile.experiences?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-[#999]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#999]">Experience</span>
                  </div>
                  <div className="space-y-4">
                    {profile.experiences.map((exp, i) => (
                      <div key={i}>
                        <div className="text-[13px] font-semibold text-[#0a0a0a]">{exp.title}</div>
                        <div className="text-xs text-[#666] mt-0.5">{exp.company}</div>
                        {exp.duration && <div className="text-[11px] text-[#999] mt-0.5">{exp.duration}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showEdu && profile.educations?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-4 h-4 text-[#999]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#999]">Education</span>
                  </div>
                  <div className="space-y-4">
                    {profile.educations.map((edu, i) => (
                      <div key={i}>
                        <div className="text-[13px] font-semibold text-[#0a0a0a]">{edu.institution}</div>
                        {edu.degree && <div className="text-xs text-[#666] mt-0.5">{edu.degree}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA card - 4 col */}
        <div className="col-span-12 md:col-span-4 rounded-3xl p-7 flex flex-col items-center justify-center text-center shadow-sm"
          style={{ background: '#0a0a0a' }}>
          <div className="text-xl font-black text-white mb-2 leading-tight">
            Open to<br />opportunities
          </div>
          <p className="text-xs text-white/40 mb-5 leading-relaxed">
            Verified skills · Active on Intervue
          </p>
          <Link href={`/recruiter?contact=${user.username}`}
            className="flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl text-[#0a0a0a] transition-all hover:opacity-90"
            style={{ background: accent }}>
            Get in touch <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      <div className="text-center pb-8 pt-4 text-xs text-[#ccc]">
        Portfolio powered by <Link href="/" className="font-semibold text-[#999] hover:text-[#0a0a0a] transition-colors">intervue</Link>
      </div>
    </div>
  )
}
