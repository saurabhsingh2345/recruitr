import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/mongodb'
import { VerifiedCard } from '@/lib/models/VerifiedCard'
import { User } from '@/lib/models/User'
import { VerifiedCardShare } from '@/components/verified-card/VerifiedCardShare'

interface TopSkill { name: string; score: number; percentile: number }

interface CardData {
  targetRole: string
  targetLevel: string
  topSkills: TopSkill[]
  sessionCount: number
  issuedAt: string
  cardToken: string
}

interface UserData {
  name: string
  username: string
  avatarUrl: string
}

async function getCard(token: string): Promise<{ card: CardData; user: UserData } | null> {
  await connectDB()
  const card = await VerifiedCard.findOne({ cardToken: token }).lean() as (CardData & { userId: string }) | null
  if (!card) return null
  const user = await User.findById(card.userId).select('name username avatarUrl').lean() as UserData | null
  if (!user) return null
  return {
    card: {
      ...card,
      issuedAt: new Date(card.issuedAt as unknown as Date).toISOString(),
    },
    user,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const data = await getCard(token)
  if (!data) return { title: 'Verified Card · Intervue' }

  const { card, user } = data
  const roleLabel = [card.targetLevel, card.targetRole].filter(Boolean).join(' ')
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  return {
    title: `${user.name} — Intervue Verified ${roleLabel}`,
    description: `${user.name} is Intervue Verified for ${roleLabel} roles. Top skills: ${card.topSkills.slice(0, 3).map(s => `${s.name} ${s.score}`).join(', ')}. ${card.sessionCount} sessions completed.`,
    openGraph: {
      title: `${user.name} · Intervue Verified ${roleLabel}`,
      description: `${card.sessionCount} sessions · Top skills: ${card.topSkills.slice(0, 3).map(s => s.name).join(', ')}`,
      images: [`${base}/api/verified-card/${token}/og`],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${user.name} · Intervue Verified ${roleLabel}`,
      images: [`${base}/api/verified-card/${token}/og`],
    },
  }
}

export default async function VerifiedCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getCard(token)
  if (!data) notFound()

  const { card, user } = data
  const roleLabel = [card.targetLevel, card.targetRole].filter(Boolean).join(' ')
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cardUrl = `${base}/verified-card/${token}`

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Card */}
      <div className="w-full max-w-lg">
        {/* Top accent */}
        <div className="h-1.5 bg-[#2DE2C5] rounded-t-2xl" />

        <div className="border border-white/[0.08] rounded-b-2xl bg-[#0A0C1A] p-8">
          {/* Verified seal */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center">
                <span className="text-[#050508] font-black text-sm">I</span>
              </div>
              <span className="font-bold text-sm">intervue</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#2DE2C5]/30 bg-[#2DE2C5]/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2DE2C5]" />
              <span className="text-[#2DE2C5] text-xs font-bold tracking-wide">VERIFIED</span>
            </div>
          </div>

          {/* Candidate */}
          <div className="flex items-center gap-3 mb-6">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full border border-white/[0.08]" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#050508] font-bold text-lg">
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-base">{user.name}</div>
              <div className="text-sm text-white/40">@{user.username}</div>
            </div>
          </div>

          {/* Role */}
          <div className="mb-6">
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-1">Verified for</div>
            <div className="text-3xl font-bold tracking-tight">{roleLabel}</div>
          </div>

          {/* Skills */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {card.topSkills.slice(0, 3).map((sk) => (
              <div key={sk.name} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 truncate">{sk.name}</div>
                <div className="text-2xl font-bold font-mono text-[#2DE2C5]">{sk.score}</div>
                <div className="text-[10px] text-white/25 mt-0.5">Top {100 - sk.percentile}%</div>
              </div>
            ))}
          </div>

          {/* More skills */}
          {card.topSkills.length > 3 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {card.topSkills.slice(3).map((sk) => (
                <span key={sk.name} className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50">
                  {sk.name} · {sk.score}
                </span>
              ))}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center justify-between py-4 border-t border-white/[0.06] mb-4">
            <span className="text-xs text-white/30">{card.sessionCount} sessions completed</span>
            <span className="text-xs text-white/30">
              Verified {new Date(card.issuedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Share buttons (client component) */}
          <VerifiedCardShare cardUrl={cardUrl} roleLabel={roleLabel} candidateName={user.name} />

          {/* Hire me CTA */}
          <Link
            href={`/p/${user.username}`}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/60 hover:text-white hover:border-white/[0.16] transition-all"
          >
            View full profile →
          </Link>
        </div>

        {/* Intervue attribution */}
        <p className="text-center text-xs text-white/20 mt-6">
          Verified by{' '}
          <a href={base} className="text-[#2DE2C5]/50 hover:text-[#2DE2C5]">Intervue</a>
          {' '}— rigorous AI-proctored assessments
        </p>
      </div>
    </div>
  )
}
