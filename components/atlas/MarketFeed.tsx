'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'

interface FeedItem {
  skill: string
  demandScore: number
  demandDelta: number
  activeRoles: number
  avgProofScore: number
  candidateCount: number
}

export function MarketFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/atlas/market-feed?limit=12')
      .then((r) => r.json())
      .then((d) => setFeed(d.feed || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#888FC0] py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading market data…
      </div>
    )
  }

  if (feed.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <TrendingUp className="w-3.5 h-3.5 text-[#f59e0b]" />
        <span className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold">
          Market intelligence
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {feed.map((item) => (
            <FeedCard key={item.skill} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  const deltaPositive = item.demandDelta > 0
  const deltaNeutral = item.demandDelta === 0
  const DeltaIcon = deltaNeutral ? Minus : deltaPositive ? TrendingUp : TrendingDown
  const deltaColor = deltaNeutral ? '#888FC0' : deltaPositive ? '#2DE2C5' : '#f87171'

  // Demand bar color
  const barColor =
    item.demandScore >= 70 ? '#2DE2C5' : item.demandScore >= 40 ? '#f59e0b' : '#f87171'

  return (
    <div className="w-44 flex-shrink-0 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white capitalize truncate mr-1">{item.skill}</span>
        <div className="flex items-center gap-0.5" style={{ color: deltaColor }}>
          <DeltaIcon className="w-3 h-3" />
          {!deltaNeutral && (
            <span className="text-[9px] font-bold">
              {deltaPositive ? '+' : ''}{item.demandDelta}
            </span>
          )}
        </div>
      </div>

      {/* Demand bar */}
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${item.demandScore}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex items-center justify-between text-[9px] text-[#555B8A]">
        <span>{item.activeRoles} role{item.activeRoles !== 1 ? 's' : ''}</span>
        <span>{item.candidateCount} verified</span>
      </div>
    </div>
  )
}
