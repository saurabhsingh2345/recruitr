'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Shield, Award, ExternalLink, MessageSquare, TrendingUp, Loader2, ChevronLeft,
} from 'lucide-react'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getScoreColor } from '@/lib/scoring'
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/assessment'

interface TrustData {
  user: { name: string; username: string; avatarUrl: string; openToWork: boolean }
  profile: { targetRole: string; location: string; cohortPercentile: number; bio: string; vouchedBadge: boolean }
  topSkills: { name: string; proofScore: number }[]
  verifiedCard: { cardToken: string; targetRole: string; topSkills: { name: string; score: number }[] } | null
  sessionCount: number
  latestAssessment: { compositeScore: number; verdict: string; verdictReason: string } | null
  benchmarks: { platformHireRate: number | null; avgProofScoreAtHire: number | null; verifiedCardUsers: number }
}

export default function RecruiterCandidateTrustPage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()
  const [data, setData] = useState<TrustData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/recruiter/candidates/${username}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json()
          throw new Error(j.error || 'Failed to load')
        }
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060F] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#05060F] text-white">
        <RecruiterNav />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-[#888FC0] mb-4">{error || 'Candidate not found'}</p>
          <Button onClick={() => router.back()} variant="outline" className="border-white/10">Go back</Button>
        </div>
      </div>
    )
  }

  const { user, profile, topSkills, verifiedCard, latestAssessment, benchmarks } = data

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <RecruiterNav />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/recruiter/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#888FC0] hover:text-white mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-2xl font-bold text-[#05060F]">
              {user.name[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {profile.vouchedBadge && (
                <Badge className="bg-[#8B7CF8]/15 text-[#8B7CF8] border-[#8B7CF8]/30">Vouched</Badge>
              )}
              {user.openToWork && (
                <Badge className="bg-[#2DE2C5]/15 text-[#2DE2C5] border-[#2DE2C5]/30">Open to work</Badge>
              )}
            </div>
            <p className="text-[#888FC0] text-sm mt-1">
              {profile.targetRole}
              {profile.location && ` · ${profile.location}`}
              {(profile.cohortPercentile ?? 0) > 0 && (
                <span className="text-[#2DE2C5] font-mono ml-2">top {100 - profile.cohortPercentile}%</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/p/${user.username}`} target="_blank">
              <Button size="sm" variant="outline" className="border-white/10 text-xs gap-1">
                Public profile <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
            <Link href="/messages">
              <Button size="sm" className="bg-[#2DE2C5]/15 text-[#2DE2C5] border border-[#2DE2C5]/30 text-xs gap-1">
                <MessageSquare className="w-3 h-3" /> Contact
              </Button>
            </Link>
          </div>
        </div>

        {/* Verified Card hero */}
        {verifiedCard ? (
          <section className="mb-8 rounded-2xl border border-[#2DE2C5]/30 bg-gradient-to-br from-[#2DE2C5]/10 to-[#8B7CF8]/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-[#2DE2C5]" />
              <span className="font-semibold text-[#2DE2C5]">Verified Card issued</span>
            </div>
            <p className="text-sm text-[#AEB5E0] mb-4">
              Target: {verifiedCard.targetRole} · {data.sessionCount} verified sessions
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {verifiedCard.topSkills.map((s) => (
                <span key={s.name} className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
                  {s.name} {s.score}
                </span>
              ))}
            </div>
            <Link href={`/verified-card/${verifiedCard.cardToken}`} target="_blank">
              <Button size="sm" className="btn-supernova text-xs">View Verified Card</Button>
            </Link>
          </section>
        ) : (
          <section className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#888FC0]" />
            <div>
              <div className="text-sm font-medium">No Verified Card yet</div>
              <div className="text-xs text-[#888FC0]">{data.sessionCount} sessions completed — card issued at 5 sessions + score ≥70</div>
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Proof skills */}
          <section className="rounded-xl border border-white/[0.06] bg-[#080A18] p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2DE2C5]" /> Verified skills
            </h2>
            <div className="space-y-2">
              {topSkills.map((skill) => {
                const col = getScoreColor(skill.proofScore)
                return (
                  <Link
                    key={skill.name}
                    href={`/proof/${user.username}/${encodeURIComponent(skill.name)}`}
                    target="_blank"
                    className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-colors group"
                  >
                    <span className="text-sm">{skill.name}</span>
                    <span className="font-mono font-bold text-sm group-hover:underline" style={{ color: col }}>
                      {Math.round(skill.proofScore)} <ExternalLink className="w-3 h-3 inline opacity-0 group-hover:opacity-60" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Benchmarks + assessment */}
          <section className="space-y-4">
            {benchmarks.platformHireRate != null && (
              <div className="rounded-xl border border-white/[0.06] bg-[#080A18] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#3FC5F0]" />
                  <span className="text-sm font-semibold">Platform benchmark</span>
                </div>
                <div className="text-3xl font-black text-[#2DE2C5] font-mono">{benchmarks.platformHireRate}%</div>
                <p className="text-xs text-[#888FC0] mt-1">
                  of Verified Card holders logged a hire signal
                  {benchmarks.avgProofScoreAtHire != null && (
                    <> · avg proof at hire: {benchmarks.avgProofScoreAtHire}</>
                  )}
                </p>
              </div>
            )}

            {latestAssessment && (
              <div className="rounded-xl border border-white/[0.06] bg-[#080A18] p-5">
                <div className="text-sm font-semibold mb-2">Latest assessment</div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold">{latestAssessment.compositeScore}</span>
                  {latestAssessment.verdict && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border font-semibold"
                      style={{
                        color: VERDICT_COLORS[latestAssessment.verdict as keyof typeof VERDICT_COLORS],
                        borderColor: VERDICT_COLORS[latestAssessment.verdict as keyof typeof VERDICT_COLORS] + '40',
                      }}
                    >
                      {VERDICT_LABELS[latestAssessment.verdict as keyof typeof VERDICT_LABELS]}
                    </span>
                  )}
                </div>
                {latestAssessment.verdictReason && (
                  <p className="text-xs text-[#888FC0] mt-2">{latestAssessment.verdictReason}</p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
