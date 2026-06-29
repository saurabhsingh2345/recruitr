'use client'

import { useState } from 'react'
import { X, Loader2, Users, Check, GitBranch, AlertTriangle, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/assessment'

export interface PanelBriefData {
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire'
  consensus: string[]
  divergence: string[]
  risks: string[]
  debriefQuestions: string[]
  summary: string
  humanNotes?: string
}

export function PanelModal({
  assessmentId,
  token,
  candidateName,
  initialBrief,
  onClose,
  onSaved,
}: {
  assessmentId: string
  token: string
  candidateName: string
  initialBrief?: PanelBriefData | null
  onClose: () => void
  onSaved?: (brief: PanelBriefData) => void
}) {
  const [brief, setBrief] = useState<PanelBriefData | null>(initialBrief || null)
  const [humanNotes, setHumanNotes] = useState(initialBrief?.humanNotes || '')
  const [loading, setLoading] = useState(false)

  async function convene() {
    setLoading(true)
    try {
      const res = await fetch(`/api/recruiter/assessments/${assessmentId}/panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, humanNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setBrief(data.panelBrief)
      onSaved?.(data.panelBrief)
      toast.success('Panel brief ready')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to convene panel')
    } finally {
      setLoading(false)
    }
  }

  const recColor = brief ? VERDICT_COLORS[brief.recommendation] : '#888FC0'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a0c1a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2DE2C5]" />
            <h2 className="text-lg font-bold text-white">Hiring panel</h2>
          </div>
          <button onClick={onClose} className="text-[#888FC0] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-[#888FC0] mb-5">
          Synthesizes every round + your notes into a committee brief for {candidateName}.
        </p>

        {/* Human notes */}
        <label className="block text-xs font-medium text-[#AEB5E0] mb-1.5">
          Human interviewer notes (optional)
        </label>
        <textarea
          value={humanNotes}
          onChange={(e) => setHumanNotes(e.target.value)}
          placeholder="What did the live interviewer observe? Conflicting signal? Culture read?"
          className="w-full h-20 rounded-lg bg-[#080A18] border border-white/[0.08] p-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#2DE2C5]/40 resize-none"
        />
        <button
          onClick={convene}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2DE2C5] text-[#05060F] font-semibold text-sm hover:bg-[#2DE2C5]/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          {brief ? 'Re-convene panel' : 'Convene panel'}
        </button>

        {/* Brief */}
        {brief && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border p-4" style={{ borderColor: `${recColor}40`, background: `${recColor}0d` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wide text-[#888FC0]">Committee recommendation</span>
                <span className="text-sm font-bold" style={{ color: recColor }}>
                  {VERDICT_LABELS[brief.recommendation]}
                </span>
              </div>
              <p className="text-sm text-[#E5E9FF]">{brief.summary}</p>
            </div>

            <Section icon={<Check className="w-4 h-4 text-[#2DE2C5]" />} title="Consensus" items={brief.consensus} />
            <Section icon={<GitBranch className="w-4 h-4 text-[#f59e0b]" />} title="Divergence — debrief these" items={brief.divergence} />
            <Section icon={<AlertTriangle className="w-4 h-4 text-[#f43f5e]" />} title="Risks" items={brief.risks} />
            <Section icon={<HelpCircle className="w-4 h-4 text-[#3FC5F0]" />} title="Questions for the live debrief" items={brief.debriefQuestions} />
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-[#AEB5E0] flex gap-2">
            <span className="text-[#555] mt-0.5">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
