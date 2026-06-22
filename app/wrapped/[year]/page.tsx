'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Share2, Download, ArrowLeft, Loader2 } from 'lucide-react'
import { CandidateNav } from '@/components/CandidateNav'

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Session',
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface WrappedData {
  year: number
  name: string
  username: string
  totalSessions: number
  avgScore: number
  topSkill: string | null
  bestScore: { skill: string; score: number; at: string | null }
  topFormat: string | null
  maxStreak: number
  byMonth: number[]
  topCurrentScore: number
  targetRole: string
  empty?: boolean
}

export default function WrappedPage() {
  const { year } = useParams<{ year: string }>()
  const [data, setData] = useState<WrappedData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/wrapped/${year}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const imageUrl = data
    ? `/api/wrapped/${year}/image?name=${encodeURIComponent(data.name)}&sessions=${data.totalSessions}&avg=${data.avgScore}&skill=${encodeURIComponent(data.topSkill || 'General')}&streak=${data.maxStreak}`
    : ''

  function tweetShare() {
    const text = `My ${year} in technical interviews:\n${data?.totalSessions} sessions · avg score ${data?.avgScore} · top skill: ${data?.topSkill}\n\n${shareUrl}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04050e] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2DE2C5]" />
      </div>
    )
  }

  if (!data || data.empty) {
    return (
      <div className="min-h-screen bg-[#04050e] text-white">
        <CandidateNav />
        <div className="max-w-xl mx-auto px-4 py-32 text-center">
          <div className="text-5xl mb-6">📭</div>
          <h1 className="text-2xl font-semibold mb-3">No sessions in {year}</h1>
          <p className="text-white/40 mb-8">Complete interviews in {year} to generate your wrapped card.</p>
          <Link href="/dashboard" className="text-[#2DE2C5] text-sm hover:underline">← Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const maxMonth = Math.max(...data.byMonth, 1)

  return (
    <div className="min-h-screen bg-[#04050e] text-white">
      <CandidateNav />
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Back */}
        <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-xs text-[#2DE2C5] uppercase tracking-widest mb-3">Year in Review</div>
          <h1 className="text-4xl font-bold mb-2">{data.year}</h1>
          <p className="text-white/40">{data.name} · {data.targetRole}</p>
        </div>

        {/* Big stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Sessions', value: data.totalSessions.toString(), color: '#2DE2C5' },
            { label: 'Avg Score', value: data.avgScore.toString(), color: '#3FC5F0' },
            { label: 'Best Streak', value: `${data.maxStreak}d`, color: '#8B7CF8' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <div className="text-4xl font-bold mb-1.5" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-white/35 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {data.topSkill && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Top skill</div>
              <div className="text-xl font-semibold text-[#2DE2C5]">{data.topSkill}</div>
            </div>
          )}
          {data.topFormat && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Favourite format</div>
              <div className="text-xl font-semibold">{FORMAT_LABELS[data.topFormat] || data.topFormat}</div>
            </div>
          )}
          {data.bestScore.score > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Best session</div>
              <div className="text-xl font-bold text-[#2DE2C5]">{data.bestScore.score}<span className="text-sm font-normal text-white/30">/100</span></div>
              <div className="text-xs text-white/40 mt-0.5">{data.bestScore.skill}</div>
            </div>
          )}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Peak proof score</div>
            <div className="text-xl font-bold" style={{ color: data.topCurrentScore >= 85 ? '#2DE2C5' : data.topCurrentScore >= 60 ? '#3FC5F0' : '#8B7CF8' }}>
              {data.topCurrentScore}<span className="text-sm font-normal text-white/30">/100</span>
            </div>
          </div>
        </div>

        {/* Monthly activity */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 mb-8">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Monthly activity</div>
          <div className="flex items-end gap-1.5 h-20">
            {data.byMonth.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: count > 0 ? `${Math.max(4, Math.round((count / maxMonth) * 64))}px` : '2px',
                    backgroundColor: count > 0 ? '#2DE2C5' : 'rgba(255,255,255,0.06)',
                  }}
                />
                <span className="text-[8px] text-white/20">{MONTH_SHORT[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={tweetShare}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] text-sm hover:bg-[#1DA1F2]/20 transition-colors"
          >
            𝕏 Share on X
          </button>
          <a
            href={imageUrl}
            download={`intervue-${year}-wrapped.png`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.08] transition-colors"
          >
            <Download className="w-4 h-4" /> Save image
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.08] transition-colors"
          >
            <Share2 className="w-4 h-4" /> Copy link
          </button>
        </div>
      </div>
    </div>
  )
}
