'use client'

import { useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Pack {
  id: string
  name: string
  credits: number
  priceInr: number
  perUnit: number
  available: boolean
}

export function AssessmentCredits() {
  const [credits, setCredits] = useState<number | null>(null)
  const [packs, setPacks] = useState<Pack[]>([])
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/recruiter/billing/credits')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.credits === 'number') setCredits(d.credits)
        setPacks(d.packs || [])
      })
      .catch(() => {})
  }, [])

  async function buy(packId: string) {
    setBuying(packId)
    try {
      const res = await fetch('/api/recruiter/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start checkout')
      setBuying(null)
    }
  }

  if (credits === null) return null

  const low = credits <= 2

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0c1a] p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${low ? 'bg-[#f59e0b]/15' : 'bg-[#2DE2C5]/15'}`}>
            <Coins className={`w-4.5 h-4.5 ${low ? 'text-[#f59e0b]' : 'text-[#2DE2C5]'}`} />
          </div>
          <div>
            <div className="text-sm font-semibold">
              {credits} assessment credit{credits !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-[#888FC0]">1 credit = 1 candidate assessed{low ? ' · running low' : ''}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              disabled={!p.available || buying !== null}
              title={p.available ? `₹${p.priceInr} · ₹${p.perUnit}/candidate` : 'Not configured'}
              className="flex flex-col items-center px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-[#2DE2C5]/40 hover:bg-white/[0.02] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {buying === p.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2DE2C5]" />
              ) : (
                <>
                  <span className="text-xs font-semibold text-white">+{p.credits}</span>
                  <span className="text-[10px] text-[#888FC0]">₹{p.priceInr.toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
