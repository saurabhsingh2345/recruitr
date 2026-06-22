import Link from 'next/link'
import { MapPin, ExternalLink, Shield, ArrowUpRight } from 'lucide-react'
import type { PortfolioData } from './types'
import { getScoreColor } from '@/lib/scoring'
import { socialIcon, GithubIcon } from './SocialIcons'

export function ThemeMagazine({ user, profile }: PortfolioData) {
  const c = profile.portfolioCustomization
  const accent = c?.accentColor || '#2DE2C5'
  const topSkills = (profile.parsedSkills || []).sort((a, b) => b.proofScore - a.proofScore).slice(0, 5)
  const projects = profile.portfolioProjects?.length ? profile.portfolioProjects : []
  const showSkills = c?.showSkills !== false
  const showExp = c?.showExperience !== false
  const showProj = c?.showProjects !== false
  const showEdu = c?.showEducation !== false

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a]">

      {/* Full-bleed hero header */}
      <header className="relative bg-[#0a0a0a] overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)' }}
        />

        <div className="relative max-w-6xl mx-auto px-8 pt-10 pb-14">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-16">
            <Link href="/" className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
                <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[13px] font-bold text-white">intervue</span>
            </Link>
            <div className="flex items-center gap-4">
              {c?.socialLinks?.slice(0, 3).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors">
                  {socialIcon(s.platform)}
                </a>
              ))}
              <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors">
                <GithubIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Hero name */}
          <div className="space-y-6">
            <div className="overflow-hidden">
              <h1 className="font-black leading-[0.9] tracking-[-0.04em] text-white"
                style={{ fontSize: 'clamp(3.5rem, 9vw, 7rem)' }}>
                {user.name}
              </h1>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <span className="text-xl font-medium text-white/60">
                {c?.customTitle || profile.targetRole || 'Software Engineer'}
              </span>
              {profile.location && (
                <div className="flex items-center gap-1.5 text-sm text-white/35">
                  <MapPin className="w-3.5 h-3.5" />{profile.location}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ color: accent, borderColor: accent + '40', background: accent + '10' }}>
                <Shield className="w-3 h-3" />Verified by Intervue
              </div>
            </div>

            {profile.bio && (
              <p className="text-[15px] text-white/45 leading-relaxed max-w-2xl">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Skill scores strip — horizontal scroll */}
        {showSkills && topSkills.length > 0 && (
          <div className="border-t border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-8">
              <div className="flex divide-x divide-white/[0.06]">
                {topSkills.map((skill) => {
                  const color = getScoreColor(skill.proofScore)
                  return (
                    <div key={skill.name} className="flex-1 px-6 py-5">
                      <div className="text-3xl font-black leading-none mb-1" style={{ color }}>{skill.proofScore}</div>
                      <div className="text-xs text-white/50 font-medium">{skill.name}</div>
                    </div>
                  )
                })}
                {profile.cohortPercentile > 0 && (
                  <div className="flex-1 px-6 py-5">
                    <div className="text-3xl font-black leading-none mb-1 text-white/90">#{100 - profile.cohortPercentile}</div>
                    <div className="text-xs text-white/50 font-medium">Cohort rank</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-16">

        {/* Projects */}
        {showProj && projects.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#999]">Selected Work</h2>
              <div className="h-px flex-1 bg-[#e8e8e8] mx-6" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {projects.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).map((p, i) => (
                <div key={i} className={`group rounded-2xl overflow-hidden border border-[#e8e8e8] bg-white ${p.featured && i === 0 ? 'md:col-span-2' : ''}`}>
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.title}
                      className={`w-full object-cover ${p.featured && i === 0 ? 'h-80' : 'h-52'}`} />
                  ) : (
                    <div className={`w-full flex items-center justify-center ${p.featured && i === 0 ? 'h-80' : 'h-52'}`}
                      style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}05)` }}>
                      <div className="text-5xl font-black" style={{ color: accent + '30' }}>{p.title[0]}</div>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#0a0a0a]">{p.title}</h3>
                        {p.featured && <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Featured</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {p.githubUrl && (
                          <a href={p.githubUrl} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-[#f5f5f5] text-[#999] hover:text-[#0a0a0a] transition-colors">
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                        {p.liveUrl && (
                          <a href={p.liveUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: accent + '15', color: accent }}>
                            Live site <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[#666] leading-relaxed mb-4">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.techStack.map((t) => (
                        <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f5f5f5] text-[#555]">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience & Education two-col */}
        {(showExp || showEdu) && (
          <section className="grid md:grid-cols-2 gap-16 mb-20">
            {showExp && profile.experiences?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#999]">Experience</h2>
                  <div className="h-px flex-1 bg-[#e8e8e8] ml-4" />
                </div>
                <div className="space-y-6">
                  {profile.experiences.map((exp, i) => (
                    <div key={i}>
                      <div className="text-sm font-bold text-[#0a0a0a]">{exp.title}</div>
                      <div className="text-sm text-[#666] mt-0.5">{exp.company}</div>
                      {exp.duration && <div className="text-xs text-[#999] mt-1">{exp.duration}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showEdu && profile.educations?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#999]">Education</h2>
                  <div className="h-px flex-1 bg-[#e8e8e8] ml-4" />
                </div>
                <div className="space-y-5">
                  {profile.educations.map((edu, i) => (
                    <div key={i}>
                      <div className="text-sm font-bold text-[#0a0a0a]">{edu.institution}</div>
                      {edu.degree && <div className="text-xs text-[#666] mt-0.5">{edu.degree}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Footer CTA */}
        <div className="border-t border-[#e8e8e8] pt-12 flex items-center justify-between flex-wrap gap-6">
          <div>
            <div className="text-2xl font-black text-[#0a0a0a] mb-1">Let&apos;s work together.</div>
            <div className="text-sm text-[#999]">Open to opportunities · Verified skills</div>
          </div>
          <div className="flex items-center gap-3">
            <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#0a0a0a] border border-[#e8e8e8] hover:border-[#ccc] transition-all">
              <GithubIcon className="w-4 h-4" />GitHub
            </a>
            <Link href={`/recruiter?contact=${user.username}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#0a0a0a' }}>
              Hire me <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
