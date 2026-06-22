'use client'

import { useState } from 'react'
import { DollarSign, Loader2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'

interface NegotiationAdvice {
  assessment: string
  askAmount: number | null
  talkingPoints: string[]
  riskLevel: 'low' | 'medium' | 'high'
  tactics: string[]
}

export function NegotiationCoach() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    offeredCompLpa: '',
    companyName: '',
    roleTitle: '',
    location: '',
  })
  const [loading, setLoading] = useState(false)
  const [advice, setAdvice] = useState<NegotiationAdvice | null>(null)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setAdvice(null)

    try {
      const res = await fetch('/api/atlas/negotiation-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          offeredCompLpa: Number(form.offeredCompLpa),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAdvice(data.advice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const riskColor = advice?.riskLevel === 'low'
    ? '#34d399'
    : advice?.riskLevel === 'medium'
    ? '#f59e0b'
    : '#f87171'

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#34d399]" />
          <span className="text-sm font-semibold text-white">Negotiation coach</span>
          <span className="text-[10px] text-[#555B8A] ml-1">Atlas-powered</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#555B8A]" /> : <ChevronDown className="w-4 h-4 text-[#555B8A]" />}
      </button>

      {open && (
        <div className="border-t border-white/[0.06] p-4">
          {!advice ? (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#555B8A] block mb-1">
                    Offered (LPA)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 18"
                    value={form.offeredCompLpa}
                    onChange={(e) => setForm((f) => ({ ...f, offeredCompLpa: e.target.value }))}
                    className="w-full bg-[#090B18] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555B8A] focus:outline-none focus:border-[#2DE2C5]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#555B8A] block mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe"
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    className="w-full bg-[#090B18] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555B8A] focus:outline-none focus:border-[#2DE2C5]/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#555B8A] block mb-1">
                    Role title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior SWE"
                    value={form.roleTitle}
                    onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
                    className="w-full bg-[#090B18] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555B8A] focus:outline-none focus:border-[#2DE2C5]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#555B8A] block mb-1">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full bg-[#090B18] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555B8A] focus:outline-none focus:border-[#2DE2C5]/40"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] text-sm font-semibold hover:bg-[#34d399]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : 'Get coaching →'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Assessment */}
              <p className="text-sm text-[#AEB5E0] leading-relaxed">{advice.assessment}</p>

              {/* Ask amount + risk */}
              <div className="flex items-center gap-4">
                {advice.askAmount && (
                  <div className="p-3 rounded-xl bg-[#34d399]/[0.08] border border-[#34d399]/20 flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-[#34d399] mb-1">Suggest asking</div>
                    <div className="text-2xl font-black text-white">{advice.askAmount} <span className="text-sm font-normal text-[#888FC0]">LPA</span></div>
                  </div>
                )}
                {advice.riskLevel && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-[#555B8A] mb-1">Negotiation risk</div>
                    <div className="text-lg font-bold capitalize" style={{ color: riskColor }}>
                      {advice.riskLevel}
                    </div>
                  </div>
                )}
              </div>

              {/* Talking points */}
              {advice.talkingPoints?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#555B8A] mb-2">
                    <ShieldCheck className="w-3 h-3 inline mr-1" />Talking points
                  </div>
                  <ul className="space-y-2">
                    {advice.talkingPoints.map((pt, i) => (
                      <li key={i} className="text-xs text-[#AEB5E0] flex gap-2">
                        <span className="text-[#34d399] flex-shrink-0">·</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tactics */}
              {advice.tactics?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#555B8A] mb-2">Tactics</div>
                  <ul className="space-y-1">
                    {advice.tactics.map((t, i) => (
                      <li key={i} className="text-xs text-[#888FC0] flex gap-2">
                        <span className="text-[#555B8A]">{i + 1}.</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setAdvice(null)}
                className="text-xs text-[#555B8A] hover:text-white transition-colors"
              >
                ← Analyze another offer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
