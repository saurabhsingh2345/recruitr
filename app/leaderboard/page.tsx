import Link from 'next/link'
import type { Metadata } from 'next'
import type { PipelineStage } from 'mongoose'
import { Code2, Trophy, Medal, Award, ArrowRight, Shield } from 'lucide-react'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LeaderRow {
  rank: number
  username: string
  name: string
  avatarUrl: string
  score: number
  cohortPercentile: number
  vouchedBadge: boolean
  location: string
}

interface SearchParams {
  skill?: string
  city?: string
}

async function getLeaderboard(skill?: string, city?: string): Promise<LeaderRow[]> {
  await connectDB()
  const limit = 20

  const pipeline: PipelineStage[] = [
    { $match: { isPublic: { $ne: false }, discoverability: { $ne: 'invisible' } } },
  ]

  if (skill) {
    pipeline.push({
      $match: { parsedSkills: { $elemMatch: { name: { $regex: skill, $options: 'i' } } } },
    })
  }
  if (city) {
    pipeline.push({ $match: { location: { $regex: city, $options: 'i' } } })
  }

  pipeline.push(
    {
      $addFields: {
        sortScore: skill
          ? {
              $let: {
                vars: {
                  sk: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$parsedSkills',
                          as: 's',
                          cond: { $regexMatch: { input: '$$s.name', regex: skill, options: 'i' } },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: '$$sk.proofScore',
              },
            }
          : { $avg: '$parsedSkills.proofScore' },
      },
    },
    { $match: { sortScore: { $gt: 0 } } },
    { $sort: { sortScore: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        username: '$user.username',
        name: '$user.name',
        avatarUrl: '$user.avatarUrl',
        score: '$sortScore',
        cohortPercentile: 1,
        vouchedBadge: 1,
        location: 1,
      },
    }
  )

  const results = await Profile.aggregate(pipeline)
  return results.map((r, i) => ({ ...r, rank: i + 1, score: Math.round(r.score || 0) }))
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const { skill, city } = await searchParams
  const skillLabel = skill || 'all skills'
  const cityLabel = city || 'India'
  return {
    title: `Top ${skillLabel} engineers in ${cityLabel} — Intervue`,
    description: `Verified proof scores for the best ${skillLabel} engineers in ${cityLabel}. Powered by Intervue.`,
    openGraph: {
      title: `Top ${skillLabel} engineers in ${cityLabel} — Intervue`,
      description: `Verified proof scores for the best ${skillLabel} engineers in ${cityLabel}.`,
    },
  }
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-[#ffd700]" />
  if (rank === 2) return <Medal className="w-4 h-4 text-[#c0c0c0]" />
  if (rank === 3) return <Award className="w-4 h-4 text-[#cd7f32]" />
  return <span className="text-xs font-mono text-[#888FC0] w-4 text-center">{rank}</span>
}

// Common skills + cities for quick filter chips
const SKILL_CHIPS = ['Go', 'TypeScript', 'Python', 'Rust', 'React', 'Node.js', 'Kubernetes']
const CITY_CHIPS = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Remote']

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { skill, city } = await searchParams
  let rows: LeaderRow[] = []
  try {
    rows = await getLeaderboard(skill, city)
  } catch {
    rows = []
  }

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  function filterUrl(s?: string, c?: string) {
    const params = new URLSearchParams()
    if (s) params.set('skill', s)
    if (c) params.set('city', c)
    const q = params.toString()
    return `/leaderboard${q ? `?${q}` : ''}`
  }

  return (
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight">intervue</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/recruiter">
            <Button size="sm" variant="outline" className="border-white/[0.08] text-[#AEB5E0] hover:text-white text-xs">
              Recruiter search
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] text-xs">
              My dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-[#ffd700]" />
            <span className="text-xs text-[#888FC0] uppercase tracking-wider">India top engineers</span>
          </div>
          <h1 className="h-display text-4xl font-bold mb-1 text-foreground">Leaderboard</h1>
          <p className="text-sm text-[#888FC0]">
            Ranked by verified proof scores — {skill ? `${skill} skill` : 'composite average'}{city ? ` in ${city}` : ' across India'}.
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-8">
          {/* Skill chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#888FC0] uppercase tracking-wider">Skill</span>
            <Link href={filterUrl(undefined, city)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${!skill ? 'border-[#2DE2C5]/40 bg-[#2DE2C5]/10 text-[#2DE2C5]' : 'border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/[0.15]'}`}>
              All
            </Link>
            {SKILL_CHIPS.map((s) => (
              <Link key={s} href={filterUrl(s, city)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${skill === s ? 'border-[#2DE2C5]/40 bg-[#2DE2C5]/10 text-[#2DE2C5]' : 'border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/[0.15]'}`}>
                {s}
              </Link>
            ))}
          </div>
          {/* City chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#888FC0] uppercase tracking-wider">City</span>
            <Link href={filterUrl(skill, undefined)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${!city ? 'border-[#3FC5F0]/40 bg-[#3FC5F0]/10 text-[#3FC5F0]' : 'border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/[0.15]'}`}>
              All India
            </Link>
            {CITY_CHIPS.map((c) => (
              <Link key={c} href={filterUrl(skill, c)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${city === c ? 'border-[#3FC5F0]/40 bg-[#3FC5F0]/10 text-[#3FC5F0]' : 'border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/[0.15]'}`}>
                {c}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-[#AEB5E0]">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <div className="font-medium mb-2">No results</div>
            <p className="text-sm">
              {skill || city
                ? 'No engineers match this filter yet — try a different combination.'
                : 'Complete interviews to appear on the leaderboard.'}
            </p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 mb-10">
                {top3[1] && (
                  <div className="flex flex-col items-center gap-2">
                    <Link href={`/p/${top3[1].username}`} className="flex flex-col items-center gap-1.5 group">
                      {top3[1].avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={top3[1].avatarUrl} alt={top3[1].name} className="w-14 h-14 rounded-full border-2 border-[#c0c0c0]/40 group-hover:border-[#c0c0c0] transition-colors" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c0c0c0]/30 to-[#8B7CF8] border-2 border-[#c0c0c0]/40 flex items-center justify-center text-white font-bold">
                          {top3[1].name[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium group-hover:text-white transition-colors">{top3[1].name.split(' ')[0]}</span>
                      <span className="font-mono text-xs text-[#c0c0c0]">{top3[1].score}</span>
                    </Link>
                    <div className="w-20 h-20 bg-[#c0c0c0]/10 border border-[#c0c0c0]/20 rounded-t-xl flex items-end justify-center pb-2">
                      <span className="text-2xl font-bold text-[#c0c0c0]">2</span>
                    </div>
                  </div>
                )}
                {top3[0] && (
                  <div className="flex flex-col items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#ffd700] mb-1" />
                    <Link href={`/p/${top3[0].username}`} className="flex flex-col items-center gap-1.5 group">
                      {top3[0].avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={top3[0].avatarUrl} alt={top3[0].name} className="w-16 h-16 rounded-full border-2 border-[#ffd700]/60 group-hover:border-[#ffd700] transition-colors shadow-[0_0_16px_rgba(255,215,0,0.2)]" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffd700]/30 to-[#f59e0b] border-2 border-[#ffd700]/60 flex items-center justify-center text-white font-bold text-lg">
                          {top3[0].name[0]}
                        </div>
                      )}
                      <span className="text-sm font-semibold group-hover:text-white transition-colors">{top3[0].name.split(' ')[0]}</span>
                      <span className="font-mono text-xs text-[#ffd700]">{top3[0].score}</span>
                    </Link>
                    <div className="w-20 h-28 bg-[#ffd700]/10 border border-[#ffd700]/20 rounded-t-xl flex items-end justify-center pb-2">
                      <span className="text-2xl font-bold text-[#ffd700]">1</span>
                    </div>
                  </div>
                )}
                {top3[2] && (
                  <div className="flex flex-col items-center gap-2">
                    <Link href={`/p/${top3[2].username}`} className="flex flex-col items-center gap-1.5 group">
                      {top3[2].avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={top3[2].avatarUrl} alt={top3[2].name} className="w-12 h-12 rounded-full border-2 border-[#cd7f32]/40 group-hover:border-[#cd7f32] transition-colors" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#cd7f32]/30 to-[#8B7CF8] border-2 border-[#cd7f32]/40 flex items-center justify-center text-white font-bold">
                          {top3[2].name[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium group-hover:text-white transition-colors">{top3[2].name.split(' ')[0]}</span>
                      <span className="font-mono text-xs text-[#cd7f32]">{top3[2].score}</span>
                    </Link>
                    <div className="w-20 h-14 bg-[#cd7f32]/10 border border-[#cd7f32]/20 rounded-t-xl flex items-end justify-center pb-2">
                      <span className="text-2xl font-bold text-[#cd7f32]">3</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="hidden sm:grid grid-cols-[40px_1fr_100px_80px_100px] gap-4 px-5 py-3 bg-[#080A18] border-b border-white/[0.04] text-[10px] text-[#888FC0] uppercase tracking-wider font-semibold">
                <div>#</div>
                <div>Engineer</div>
                <div>Location</div>
                <div>Score</div>
                <div className="text-right">Percentile</div>
              </div>

              {[...top3, ...rest].map((row) => (
                <Link
                  key={row.username}
                  href={`/p/${row.username}`}
                  className="flex sm:grid sm:grid-cols-[40px_1fr_100px_80px_100px] gap-3 sm:gap-4 items-center px-4 sm:px-5 py-3.5 border-b border-white/[0.04] last:border-0 bg-[#080A18] hover:bg-[#0d1117] transition-colors group"
                >
                  <div className="flex items-center justify-center">
                    <RankIcon rank={row.rank} />
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatarUrl} alt={row.name} className="w-7 h-7 rounded-full shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-[10px] shrink-0">
                        {row.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-[#2DE2C5] transition-colors flex items-center gap-1.5">
                        {row.name}
                        {row.vouchedBadge && <Shield className="w-3 h-3 text-[#8B7CF8] shrink-0" />}
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-xs text-[#888FC0] truncate">{row.location || '—'}</div>
                  <div className="font-mono text-sm font-bold text-[#2DE2C5] ml-auto sm:ml-0">
                    {row.score || '—'}
                  </div>
                  <div className="hidden sm:block text-right">
                    {row.cohortPercentile > 0 ? (
                      <Badge className="text-[10px] px-1.5 h-5 bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20">
                        top {100 - row.cohortPercentile}%
                      </Badge>
                    ) : <span className="text-[#888FC0] text-xs">—</span>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-[#AEB5E0] mb-4">Want to climb the leaderboard?</p>
          <Link href="/interview/new">
            <Button className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e]">
              Start an interview
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
