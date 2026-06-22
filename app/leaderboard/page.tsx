import Link from 'next/link'
import { Code2, Trophy, Medal, Award, ArrowRight } from 'lucide-react'
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
  topSkill: string
  topScore: number
  cohortPercentile: number
  location: string
  targetRole: string
}

async function getLeaderboard(): Promise<LeaderRow[]> {
  await connectDB()

  const profiles = await Profile.find({ isPublic: { $ne: false } })
    .sort({ cohortPercentile: -1 })
    .limit(50)
    .lean()

  // Batch-load all users in one query instead of N sequential findById calls
  const userIds = profiles.map((p) => p.userId)
  const users = await User.find({ _id: { $in: userIds } })
    .select('username name avatarUrl openToWork')
    .lean()
  const userMap = new Map(users.map((u) => [String(u._id), u]))

  const rows: LeaderRow[] = []

  for (const p of profiles) {
    const user = userMap.get(String(p.userId))
    if (!user) continue

    const skills: { name: string; proofScore: number }[] = p.parsedSkills || []
    const topSkill = [...skills].sort((a, b) => b.proofScore - a.proofScore)[0]

    rows.push({
      rank: rows.length + 1,
      username: user.username || '',
      name: user.name || 'Anonymous',
      avatarUrl: user.avatarUrl || '',
      topSkill: topSkill?.name || '',
      topScore: Math.round(topSkill?.proofScore || 0),
      cohortPercentile: Math.round(p.cohortPercentile || 0),
      location: p.location || '',
      targetRole: p.targetRole || '',
    })
  }

  return rows
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-[#ffd700]" />
  if (rank === 2) return <Medal className="w-4 h-4 text-[#c0c0c0]" />
  if (rank === 3) return <Award className="w-4 h-4 text-[#cd7f32]" />
  return <span className="text-xs font-mono text-[#888FC0] w-4 text-center">{rank}</span>
}

export default async function LeaderboardPage() {
  let rows: LeaderRow[] = []
  try {
    rows = await getLeaderboard()
  } catch {
    rows = []
  }

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <nav className="border-b border-[#1A1E3A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight">intervue</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/recruiter">
            <Button size="sm" variant="outline" className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs">
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

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1A1E3A] bg-[#0B0E1C] text-xs text-[#AEB5E0] mb-4">
            <Trophy className="w-3 h-3 text-[#ffd700]" />
            India top engineers
          </div>
          <h1 className="text-4xl font-bold mb-3">Leaderboard</h1>
          <p className="text-[#AEB5E0] text-sm max-w-md mx-auto">
            Ranked by cohort percentile — a composite of AI interview scores, GitHub activity, and consistency.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-[#AEB5E0]">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <div className="font-medium mb-2">No data yet</div>
            <p className="text-sm">Complete interviews to appear on the leaderboard.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 mb-10">
                {/* 2nd */}
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
                    </Link>
                    <div className="w-20 h-20 bg-[#c0c0c0]/10 border border-[#c0c0c0]/20 rounded-t-xl flex items-end justify-center pb-2">
                      <span className="text-2xl font-bold text-[#c0c0c0]">2</span>
                    </div>
                  </div>
                )}
                {/* 1st */}
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
                    </Link>
                    <div className="w-20 h-28 bg-[#ffd700]/10 border border-[#ffd700]/20 rounded-t-xl flex items-end justify-center pb-2">
                      <span className="text-2xl font-bold text-[#ffd700]">1</span>
                    </div>
                  </div>
                )}
                {/* 3rd */}
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
              <div className="grid grid-cols-[40px_1fr_120px_80px_100px] gap-4 px-5 py-3 bg-[#080A18] border-b border-white/[0.04] text-[10px] text-[#888FC0] uppercase tracking-wider font-semibold">
                <div>#</div>
                <div>Engineer</div>
                <div>Top skill</div>
                <div>Score</div>
                <div className="text-right">Percentile</div>
              </div>

              {[...top3, ...rest].map((row) => (
                <Link
                  key={row.username}
                  href={`/p/${row.username}`}
                  className="grid grid-cols-[40px_1fr_120px_80px_100px] gap-4 items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 bg-[#080A18] hover:bg-[#0d1117] transition-colors group"
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
                      <div className="text-sm font-medium truncate group-hover:text-[#2DE2C5] transition-colors">{row.name}</div>
                      {row.targetRole && (
                        <div className="text-[10px] text-[#888FC0] truncate">{row.targetRole}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-[#AEB5E0] truncate">{row.topSkill || '—'}</div>
                  <div className="text-sm font-mono font-bold" style={{
                    color: row.topScore >= 80 ? '#2DE2C5' : row.topScore >= 60 ? '#8B7CF8' : '#f59e0b'
                  }}>
                    {row.topScore || '—'}
                  </div>
                  <div className="text-right">
                    <Badge className="text-[10px] px-1.5 h-5 bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20">
                      top {100 - row.cohortPercentile}%
                    </Badge>
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
