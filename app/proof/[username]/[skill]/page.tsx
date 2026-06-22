import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Shield, GitBranch, MapPin, ExternalLink, Award, MessageSquare } from 'lucide-react'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { BadgeEvent } from '@/lib/models/BadgeEvent'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyBadgeButton } from './CopyBadgeButton'

interface Params {
  params: Promise<{ username: string; skill: string }>
}

async function getProofData(username: string, rawSkill: string) {
  const skill = decodeURIComponent(rawSkill)

  await connectDB()

  const user = await User.findOne({ username }).lean() as {
    _id: unknown; name: string; username: string; avatarUrl: string
  } | null
  if (!user) return null

  const profile = await Profile.findOne({ userId: user._id, isPublic: true })
    .select('parsedSkills targetRole yearsOfExperience location cohortPercentile bio projects')
    .lean() as {
    parsedSkills: { name: string; proofScore: number; evidence: string[]; scoreHistory?: { score: number; source: string; at: Date }[] }[]
    targetRole: string; yearsOfExperience: number; location: string
    cohortPercentile: number; bio: string
    projects: { repoName: string; techStack: string[]; githubUrl: string; stars: number }[]
  } | null
  if (!profile) return null

  const skillData = (profile.parsedSkills || []).find(
    s => s.name.toLowerCase() === skill.toLowerCase()
  )
  if (!skillData) return null

  // Find the most recent completed interview session for this skill
  const latestSession = await InterviewSession.findOne({
    userId: user._id,
    targetSkill: { $regex: skill, $options: 'i' },
    status: 'completed',
  })
    .select('scores insightReport completedAt format messages')
    .sort({ completedAt: -1 })
    .lean() as {
    scores: { overall: number; breakdown: Record<string, number> }
    insightReport: { strengths: string[]; gaps: string[] }
    completedAt: Date; format: string
    messages: { role: string; content: string }[]
  } | null

  // Find GitHub repos that use this skill
  const relatedRepos = (profile.projects || []).filter(p =>
    p.techStack?.some(t => t.toLowerCase().includes(skill.toLowerCase()))
  ).slice(0, 4)

  // Parse evidence sources from scoreHistory
  const sources: { label: string; count: number; icon: 'github' | 'interview' | 'external' }[] = []

  const githubCount = relatedRepos.length
  if (githubCount > 0) sources.push({ label: `${githubCount} GitHub repo${githubCount > 1 ? 's' : ''}`, count: githubCount, icon: 'github' })

  const interviewCount = (skillData.scoreHistory || []).filter(h => h.source === 'interview').length
  if (interviewCount > 0) sources.push({ label: `${interviewCount} interview session${interviewCount > 1 ? 's' : ''}`, count: interviewCount, icon: 'interview' })

  const externalCount = (skillData.evidence || []).filter(e =>
    e.toLowerCase().includes('devto') || e.toLowerCase().includes('stack overflow') || e.toLowerCase().includes('article')
  ).length
  if (externalCount > 0) sources.push({ label: `${externalCount} external article${externalCount > 1 ? 's' : ''}`, count: externalCount, icon: 'external' })

  return { user, profile, skillData, latestSession, relatedRepos, sources, decodedSkill: skill }
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  )
}

function SourceIcon({ icon }: { icon: 'github' | 'interview' | 'external' }) {
  if (icon === 'github') return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
  if (icon === 'interview') return <MessageSquare className="w-3.5 h-3.5" />
  return <ExternalLink className="w-3.5 h-3.5" />
}

export default async function ProofPage({ params }: Params) {
  const { username, skill: rawSkill } = await params
  const data = await getProofData(username, rawSkill)
  if (!data) notFound()

  const { user, profile, skillData, latestSession, relatedRepos, sources, decodedSkill } = data
  const color = getScoreColor(skillData.proofScore)
  const label = getScoreLabel(skillData.proofScore)
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const badgeUrl = `${origin}/api/badge/${username}/${encodeURIComponent(decodedSkill)}`
  const proofUrl = `${origin}/proof/${username}/${encodeURIComponent(decodedSkill)}`
  // Linked badge markdown — clicking the badge in a README goes here
  const markdown = `[![${decodedSkill} ${skillData.proofScore}](${badgeUrl})](${proofUrl})`

  // Fire-and-forget proof page visit tracking
  BadgeEvent.create({ type: 'proof_visit', username, skill: decodedSkill, at: new Date() }).catch(() => {})

  // Get a meaningful excerpt from the interview (the first AI question that isn't a greeting)
  const interviewExcerpt = latestSession?.messages
    ?.filter((m: { role: string; content: string }) =>
      m.role === 'ai' && m.content.length > 80 && m.content.includes('?')
    )
    .slice(1, 2)  // skip the intro question
    .map((m: { content: string }) => {
      const sentences = m.content.split(/\n/).filter(Boolean)
      return sentences[0]?.slice(0, 240)
    })[0] || null

  return (
    <div className="min-h-screen text-foreground">
      {/* Minimal nav */}
      <nav className="border-b border-foreground/[0.06] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
            <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
            <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold text-sm">intervue</span>
        </Link>
        <Link href={`/onboarding?ref=proof&skill=${encodeURIComponent(decodedSkill)}&from=${username}`}>
          <Button size="sm" className="btn-supernova font-semibold text-xs h-8 px-4">
            Build yours free
          </Button>
        </Link>
      </nav>

      {/* Hero glow */}
      <div className="absolute inset-x-0 top-14 h-72 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${color}0D, transparent 70%)` }} />

      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-20">

        {/* Identity */}
        <div className="flex items-center gap-4 mb-10">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name}
              className="w-14 h-14 rounded-full border-2 shrink-0" style={{ borderColor: color + '40' }} />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ backgroundColor: color + '20', color }}>
              {user.name?.[0] || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold">{user.name}</h1>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/25 text-[10px] text-[#2DE2C5] font-semibold">
                <Shield className="w-2.5 h-2.5" />Verified
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {profile.targetRole && (
                <span className="text-sm text-foreground/50">{profile.targetRole}</span>
              )}
              {profile.location && (
                <div className="flex items-center gap-1 text-xs text-foreground/35">
                  <MapPin className="w-3 h-3" />{profile.location}
                </div>
              )}
              <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-foreground/35 hover:text-[#2DE2C5] transition-colors">
                <GitBranch className="w-3 h-3" />@{username}
              </a>
            </div>
          </div>
          {profile.cohortPercentile > 0 && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 shrink-0">
              <Award className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b] font-semibold">Top {100 - profile.cohortPercentile}%</span>
            </div>
          )}
        </div>

        {/* Skill hero */}
        <div className="flex items-center gap-8 mb-10 p-7 rounded-2xl border"
          style={{ borderColor: color + '25', backgroundColor: color + '06' }}>
          <div className="relative shrink-0">
            <ScoreRing score={skillData.proofScore} color={color} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono" style={{ color }}>{skillData.proofScore}</span>
              <span className="text-xs text-foreground/35">/100</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold mb-2">{decodedSkill}</h2>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="text-xs font-semibold px-2.5 py-1"
                style={{ backgroundColor: color + '15', color, borderColor: color + '30' }}>
                {label}
              </Badge>
              <span className="text-sm text-foreground/35">· Proof-of-skill verified by Intervue</span>
            </div>
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/45 bg-foreground/[0.04] px-2.5 py-1 rounded-lg border border-foreground/[0.06]">
                    <SourceIcon icon={s.icon} />
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* How this score was built */}
        {skillData.evidence && skillData.evidence.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/30 mb-3">How this score was built</h3>
            <div className="space-y-2">
              {skillData.evidence.slice(0, 5).map((e, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/50">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color + '80' }} />
                  {e}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related GitHub repos */}
        {relatedRepos.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/30 mb-3">Projects using {decodedSkill}</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {relatedRepos.map((repo) => (
                <a key={repo.repoName} href={repo.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] hover:border-foreground/15 transition-colors group">
                  <span className="font-mono text-sm text-foreground/60 group-hover:text-foreground/80 truncate transition-colors">{repo.repoName}</span>
                  <ExternalLink className="w-3 h-3 text-foreground/25 shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Interview performance */}
        {latestSession && (
          <section className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/30 mb-3">
              Live interview performance · {latestSession.format?.replace('_', ' ')} ·{' '}
              {new Date(latestSession.completedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </h3>
            <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.02] p-5 space-y-4">
              {/* Score breakdown */}
              {latestSession.scores?.breakdown && Object.keys(latestSession.scores.breakdown).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(latestSession.scores.breakdown).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="text-xs text-foreground/35 w-28 capitalize">{key.replace(/_/g, ' ')}</div>
                      <div className="flex-1 h-1.5 bg-foreground/[0.05] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: getScoreColor(val) }} />
                      </div>
                      <span className="text-xs font-mono w-8 text-right" style={{ color: getScoreColor(val) }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths from report */}
              {latestSession.insightReport?.strengths?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-foreground/[0.05]">
                  {latestSession.insightReport.strengths.slice(0, 2).map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-foreground/50">
                      <span className="mt-1 shrink-0" style={{ color }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Interview excerpt */}
              {interviewExcerpt && (
                <div className="pt-2 border-t border-foreground/[0.05]">
                  <div className="text-[10px] text-foreground/25 uppercase tracking-wider mb-1.5">From the session</div>
                  <blockquote className="text-sm text-foreground/40 italic leading-relaxed border-l-2 pl-3"
                    style={{ borderColor: color + '40' }}>
                    "{interviewExcerpt}…"
                  </blockquote>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Badge copy */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/30 mb-3">GitHub README badge</h3>
          <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.02] p-4 space-y-3">
            {/* Live badge preview */}
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeUrl} alt={`${decodedSkill} ${skillData.proofScore}`} className="h-7" />
              <span className="text-xs text-foreground/30">· Updates automatically as the score changes</span>
            </div>
            {/* Markdown */}
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-foreground/40 bg-foreground/[0.04] px-3 py-2 rounded-lg truncate border border-foreground/[0.05]">
                {markdown}
              </code>
              <CopyBadgeButton text={markdown} />
            </div>
          </div>
        </section>

        {/* Embed snippet */}
        <section className="mb-10">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/30 mb-3">Embed this skill</h3>
          <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.02] p-4 space-y-3">
            <p className="text-xs text-foreground/35">Drop into any blog, Notion page, or portfolio with a single line of HTML.</p>
            {/* iframe snippet */}
            {(() => {
              const iframeSnippet = `<iframe src="${origin}/embed/${username}/${encodeURIComponent(decodedSkill)}" width="320" height="80" frameborder="0" style="border:none"></iframe>`
              const htmlSnippet = `<a href="${proofUrl}"><img src="${badgeUrl}" alt="${decodedSkill} ${skillData.proofScore} - Verified by Intervue" height="28"></a>`
              return (
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-foreground/25 uppercase tracking-wider mb-1">iframe (rich widget)</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] font-mono text-foreground/40 bg-foreground/[0.04] px-3 py-2 rounded-lg truncate border border-foreground/[0.05]">
                        {iframeSnippet}
                      </code>
                      <CopyBadgeButton text={iframeSnippet} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foreground/25 uppercase tracking-wider mb-1">HTML (image badge)</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] font-mono text-foreground/40 bg-foreground/[0.04] px-3 py-2 rounded-lg truncate border border-foreground/[0.05]">
                        {htmlSnippet}
                      </code>
                      <CopyBadgeButton text={htmlSnippet} />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* CTAs */}
        <div className="flex gap-3">
          <Link href={`/p/${username}`} className="flex-1">
            <Button variant="outline" className="w-full border-foreground/[0.1] text-foreground/50 hover:text-foreground text-sm h-11">
              Full profile
            </Button>
          </Link>
          <Link href="/onboarding" className="flex-1">
            <Button className="w-full btn-supernova font-semibold text-sm h-11">
              Build yours free <ExternalLink className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Params) {
  const { username, skill } = await params
  const decodedSkill = decodeURIComponent(skill)
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const badgeUrl = `${origin}/api/badge/${username}/${skill}`
  return {
    title: `${decodedSkill} · ${username} · Intervue`,
    description: `Verified proof-of-skill score for ${decodedSkill} — see the GitHub evidence, interview performance, and score breakdown for @${username}.`,
    openGraph: {
      title: `@${username}'s ${decodedSkill} proof score`,
      description: `Verified via AI interview + GitHub analysis on Intervue`,
      images: [{ url: badgeUrl, width: 400, height: 80, alt: `${decodedSkill} badge` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `@${username}'s ${decodedSkill} proof score`,
      description: `Verified via AI interview + GitHub analysis on Intervue`,
      images: [badgeUrl],
    },
  }
}
