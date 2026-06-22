import Link from 'next/link'
import { Shield, ExternalLink, MapPin } from 'lucide-react'
import type { PortfolioData } from './types'
import { getScoreColor } from '@/lib/scoring'
import { socialIcon, GithubIcon } from './SocialIcons'

export function ThemeTerminal({ user, profile }: PortfolioData) {
  const c = profile.portfolioCustomization
  const accent = c?.accentColor || '#2DE2C5'
  const topSkills = (profile.parsedSkills || []).sort((a, b) => b.proofScore - a.proofScore).slice(0, 8)
  const projects = profile.portfolioProjects?.length ? profile.portfolioProjects : []
  const showSkills = c?.showSkills !== false
  const showExp = c?.showExperience !== false
  const showProj = c?.showProjects !== false
  const showEdu = c?.showEducation !== false

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#e6edf3] font-mono">

      {/* Terminal nav bar */}
      <nav className="sticky top-0 z-50 bg-[#161b22] border-b border-[#30363d]">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-[11px] text-[#8b949e] ml-2">
              portfolio/{user.username}.sh
            </span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            intervue
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* whoami block */}
        <div>
          <div className="text-[#8b949e] text-sm mb-3">
            <span style={{ color: accent }}>❯</span> whoami
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
            <div className="flex items-start gap-5">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name}
                  className="w-16 h-16 rounded-lg shrink-0 grayscale hover:grayscale-0 transition-all" />
              ) : (
                <div className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold shrink-0"
                  style={{ background: accent + '20', color: accent }}>
                  {user.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold mb-1" style={{ color: accent }}>{user.name}</div>
                <div className="text-[#8b949e] text-sm mb-2">
                  {c?.customTitle || profile.targetRole || 'Software Engineer'}
                  {profile.yearsOfExperience > 0 && (
                    <span className="text-[#484f58]"> · {profile.yearsOfExperience}yr exp</span>
                  )}
                </div>
                {profile.location && (
                  <div className="flex items-center gap-1.5 text-xs text-[#484f58] mb-3">
                    <MapPin className="w-3 h-3" />{profile.location}
                  </div>
                )}
                {profile.bio && (
                  <p className="text-[13px] text-[#8b949e] leading-relaxed">{profile.bio}</p>
                )}
                <div className="flex items-center gap-3 mt-4">
                  <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                    <GithubIcon className="w-3.5 h-3.5" />@{user.username}
                  </a>
                  {c?.socialLinks?.slice(0, 3).map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                      {socialIcon(s.platform, 'w-3.5 h-3.5')}
                    </a>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border" style={{ color: accent, borderColor: accent + '40', background: accent + '10' }}>
                    <Shield className="w-2.5 h-2.5" />intervue verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        {showSkills && topSkills.length > 0 && (
          <div>
            <div className="text-[#8b949e] text-sm mb-3">
              <span style={{ color: accent }}>❯</span> cat skills.json
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
              <div className="text-[#484f58] text-xs mb-3">{'{'}</div>
              <div className="space-y-1 pl-4">
                {topSkills.map((skill, i) => {
                  const color = getScoreColor(skill.proofScore)
                  return (
                    <div key={skill.name} className="flex items-center gap-3 text-sm">
                      <span className="text-[#79c0ff]">&quot;{skill.name}&quot;</span>
                      <span className="text-[#484f58]">:</span>
                      <span className="font-bold" style={{ color }}>{skill.proofScore}</span>
                      {i < topSkills.length - 1 && <span className="text-[#484f58]">,</span>}
                      <span className="text-[#484f58] text-xs ml-auto">// {
                        skill.proofScore >= 85 ? 'expert' :
                        skill.proofScore >= 70 ? 'proficient' :
                        skill.proofScore >= 50 ? 'intermediate' : 'developing'
                      }</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-[#484f58] text-xs mt-3">{'}'}</div>
            </div>
          </div>
        )}

        {/* Projects */}
        {showProj && projects.length > 0 && (
          <div>
            <div className="text-[#8b949e] text-sm mb-3">
              <span style={{ color: accent }}>❯</span> ls projects/
            </div>
            <div className="space-y-3">
              {projects.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).map((p, i) => (
                <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden hover:border-[#8b949e] transition-colors">
                  {p.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.title} className="w-full h-40 object-cover opacity-70 hover:opacity-100 transition-opacity" />
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[#484f58] text-sm">./projects/</span>
                        <span className="text-sm font-bold" style={{ color: accent }}>{p.title}</span>
                        {p.featured && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#ffbd2e]/20 text-[#ffbd2e]">featured</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.githubUrl && (
                          <a href={p.githubUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[#484f58] hover:text-[#e6edf3] transition-colors">
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                        {p.liveUrl && (
                          <a href={p.liveUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[#484f58] hover:text-[#e6edf3] transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#8b949e] leading-relaxed mb-3">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.techStack.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f2937] text-[#79c0ff] border border-[#30363d]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {showExp && profile.experiences?.length > 0 && (
          <div>
            <div className="text-[#8b949e] text-sm mb-3">
              <span style={{ color: accent }}>❯</span> cat experience.log
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 space-y-4">
              {profile.experiences.map((exp, i) => (
                <div key={i} className="flex gap-4 text-sm">
                  <span className="text-[#484f58] shrink-0">[{String(i + 1).padStart(2, '0')}]</span>
                  <div>
                    <span style={{ color: accent }}>{exp.title}</span>
                    <span className="text-[#8b949e]"> at {exp.company}</span>
                    {exp.duration && <div className="text-[#484f58] text-xs mt-0.5">{exp.duration}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {showEdu && profile.educations?.length > 0 && (
          <div>
            <div className="text-[#8b949e] text-sm mb-3">
              <span style={{ color: accent }}>❯</span> cat education.log
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 space-y-3">
              {profile.educations.map((edu, i) => (
                <div key={i} className="flex gap-4 text-sm">
                  <span className="text-[#484f58] shrink-0">[{String(i + 1).padStart(2, '0')}]</span>
                  <div>
                    <span style={{ color: '#79c0ff' }}>{edu.institution}</span>
                    {edu.degree && <div className="text-[#8b949e] text-xs mt-0.5">{edu.degree}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompt */}
        <div className="flex items-center gap-2 text-sm text-[#8b949e] pb-4">
          <span style={{ color: accent }}>❯</span>
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  )
}
