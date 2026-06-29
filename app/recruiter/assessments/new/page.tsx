'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { competenciesForFormat } from '@/lib/assessment-competencies'

const WEIGHTS = [
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Important (2×)' },
  { value: 3, label: 'Critical (3×)' },
]

const FORMATS = [
  { id: 'coding', label: 'Live Coding', group: 'Engineering' },
  { id: 'system_design', label: 'System Design', group: 'Engineering' },
  { id: 'project_deepdive', label: 'Project Deep-dive', group: 'Engineering' },
  { id: 'gap', label: 'Gap Session', group: 'Engineering' },
  { id: 'behavioural', label: 'Behavioural', group: 'All' },
  { id: 'pm_case', label: 'PM Case Study', group: 'Non-engineering' },
  { id: 'design_critique', label: 'Design Critique', group: 'Non-engineering' },
  { id: 'ops_case', label: 'Ops / Program Mgmt', group: 'Non-engineering' },
  { id: 'sales_discovery', label: 'Sales Discovery', group: 'Non-engineering' },
]

const DURATIONS = [15, 30, 45, 60]

interface Round {
  order: number
  format: string
  title: string
  durationMinutes: number
  instructions: string
  weight: number
  mustHaveCompetencies: string[]
}

interface Candidate {
  name: string
  email: string
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [title, setTitle] = useState('')
  const [role, setRole] = useState('')
  const [deadline, setDeadline] = useState('')

  // Step 2
  const [rounds, setRounds] = useState<Round[]>([
    { order: 1, format: 'coding', title: 'Round 1', durationMinutes: 30, instructions: '', weight: 1, mustHaveCompetencies: [] },
  ])

  // Step 3
  const [candidateTab, setCandidateTab] = useState<'individual' | 'csv'>('individual')
  const [candidates, setCandidates] = useState<Candidate[]>([{ name: '', email: '' }])
  const [csvText, setCsvText] = useState('')

  function addRound() {
    if (rounds.length >= 6) return
    const order = rounds.length + 1
    setRounds([...rounds, { order, format: 'behavioural', title: `Round ${order}`, durationMinutes: 30, instructions: '', weight: 1, mustHaveCompetencies: [] }])
  }

  function removeRound(idx: number) {
    const updated = rounds.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i + 1 }))
    setRounds(updated)
  }

  function moveRound(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= rounds.length) return
    const updated = [...rounds]
    ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    setRounds(updated.map((r, i) => ({ ...r, order: i + 1 })))
  }

  function updateRound(idx: number, field: keyof Round, value: string | number) {
    const updated = [...rounds]
    updated[idx] = { ...updated[idx], [field]: value }
    // Competencies differ by format — clear must-haves when format changes.
    if (field === 'format') updated[idx].mustHaveCompetencies = []
    setRounds(updated)
  }

  function toggleMustHave(idx: number, key: string) {
    const updated = [...rounds]
    const current = updated[idx].mustHaveCompetencies
    updated[idx] = {
      ...updated[idx],
      mustHaveCompetencies: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    }
    setRounds(updated)
  }

  function addCandidate() {
    setCandidates([...candidates, { name: '', email: '' }])
  }

  function updateCandidate(idx: number, field: 'name' | 'email', value: string) {
    const updated = [...candidates]
    updated[idx] = { ...updated[idx], [field]: value }
    setCandidates(updated)
  }

  function removeCandidate(idx: number) {
    setCandidates(candidates.filter((_, i) => i !== idx))
  }

  function parsedCandidates(): Candidate[] {
    if (candidateTab === 'individual') {
      return candidates.filter((c) => c.email.trim())
    }
    return csvText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim())
        return { name: parts[0] || '', email: parts[1] || parts[0] || '' }
      })
      .filter((c) => c.email.includes('@'))
  }

  function validateStep1() {
    if (!title.trim()) { toast.error('Title required'); return false }
    if (!role.trim()) { toast.error('Role required'); return false }
    if (!deadline) { toast.error('Deadline required'); return false }
    const min = new Date(Date.now() + 24 * 60 * 60 * 1000)
    if (new Date(deadline) < min) { toast.error('Deadline must be at least 24 hours from now'); return false }
    return true
  }

  function validateStep2() {
    if (rounds.length === 0) { toast.error('Add at least one round'); return false }
    for (const r of rounds) {
      if (!r.format) { toast.error('Each round needs a format'); return false }
    }
    return true
  }

  async function handleSubmit() {
    const parsed = parsedCandidates()
    if (parsed.length === 0) { toast.error('Add at least one candidate'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/recruiter/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, role, deadline, rounds, candidates: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Assessment created — ${data.inviteCount} invite${data.inviteCount !== 1 ? 's' : ''} sent`)
      router.push(`/recruiter/assessments/${data.assessment._id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create assessment')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'bg-[#0B0E1C] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40 w-full'
  const labelCls = 'text-xs text-[#AEB5E0] font-medium mb-1.5 block'

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Create assessment</h1>
          <p className="text-sm text-[#888FC0]">Build a multi-round interview for external candidates</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === s ? 'bg-[#2DE2C5] text-[#05060F]' : step > s ? 'bg-[#2DE2C5]/30 text-[#2DE2C5]' : 'bg-white/[0.06] text-[#888FC0]'
              }`}>
                {s}
              </div>
              <span className={`text-xs ${step === s ? 'text-white font-medium' : 'text-[#888FC0]'}`}>
                {s === 1 ? 'Details' : s === 2 ? 'Rounds' : 'Candidates'}
              </span>
              {s < 3 && <ChevronRight className="w-3 h-3 text-[#333]" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Assessment title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer — Batch 2026" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Frontend Engineer" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                className={inputCls}
              />
            </div>
            <Button
              onClick={() => { if (validateStep1()) setStep(2) }}
              className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold"
            >
              Next: Build rounds <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            {rounds.map((round, idx) => (
              <div key={idx} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Round {round.order}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveRound(idx, -1)} disabled={idx === 0} className="p-1 text-[#888FC0] hover:text-white disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveRound(idx, 1)} disabled={idx === rounds.length - 1} className="p-1 text-[#888FC0] hover:text-white disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {rounds.length > 1 && (
                      <button onClick={() => removeRound(idx)} className="p-1 text-[#f43f5e]/60 hover:text-[#f43f5e]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Round title</label>
                    <input value={round.title} onChange={(e) => updateRound(idx, 'title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Format</label>
                    <select value={round.format} onChange={(e) => updateRound(idx, 'format', e.target.value)} className={inputCls}>
                      {['Engineering', 'Non-engineering', 'All'].map((group) => (
                        <optgroup key={group} label={group}>
                          {FORMATS.filter((f) => f.group === group).map((f) => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Duration</label>
                    <select value={round.durationMinutes} onChange={(e) => updateRound(idx, 'durationMinutes', parseInt(e.target.value, 10))} className={inputCls}>
                      {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Weight</label>
                    <select value={round.weight} onChange={(e) => updateRound(idx, 'weight', parseInt(e.target.value, 10))} className={inputCls}>
                      {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Instructions <span className="text-[#555]">(optional)</span></label>
                    <textarea value={round.instructions} onChange={(e) => updateRound(idx, 'instructions', e.target.value)} placeholder="Shown to candidate before the round…" rows={1} className={`${inputCls} resize-none`} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Must-have competencies <span className="text-[#555]">(below &ldquo;meets bar&rdquo; caps the verdict)</span></label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {competenciesForFormat(round.format).map((c) => {
                        const on = round.mustHaveCompetencies.includes(c.key)
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => toggleMustHave(idx, c.key)}
                            title={c.definition}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${on
                              ? 'bg-[#2DE2C5]/15 text-[#2DE2C5] border-[#2DE2C5]/40'
                              : 'bg-transparent text-[#888FC0] border-[#1A1E3A] hover:border-[#2DE2C5]/30'}`}
                          >
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {rounds.length < 6 && (
              <button onClick={addRound} className="w-full rounded-xl border border-dashed border-[#2DE2C5]/20 hover:border-[#2DE2C5]/40 p-4 text-sm text-[#2DE2C5]/60 hover:text-[#2DE2C5] transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add round
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setStep(1)} variant="outline" className="border-white/[0.08] text-[#AEB5E0]">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => { if (validateStep2()) setStep(3) }} className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
                Next: Add candidates <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit">
              {(['individual', 'csv'] as const).map((t) => (
                <button key={t} onClick={() => setCandidateTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${candidateTab === t ? 'bg-[#2DE2C5]/15 text-[#2DE2C5]' : 'text-[#888FC0] hover:text-white'}`}>
                  {t === 'individual' ? 'Add individually' : 'Paste CSV'}
                </button>
              ))}
            </div>

            {candidateTab === 'individual' ? (
              <div className="space-y-2">
                {candidates.map((c, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input value={c.name} onChange={(e) => updateCandidate(idx, 'name', e.target.value)} placeholder="Name" className={`${inputCls} flex-1`} />
                    <input value={c.email} onChange={(e) => updateCandidate(idx, 'email', e.target.value)} placeholder="email@example.com" type="email" className={`${inputCls} flex-1`} />
                    {candidates.length > 1 && (
                      <button onClick={() => removeCandidate(idx)} className="text-[#f43f5e]/60 hover:text-[#f43f5e] p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addCandidate} className="text-sm text-[#2DE2C5]/60 hover:text-[#2DE2C5] flex items-center gap-1.5 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add another
                </button>
              </div>
            ) : (
              <div>
                <label className={labelCls}>One candidate per line: Name, email@example.com</label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={'Priya Sharma, priya@example.com\nRaj Patel, raj@example.com'}
                  rows={8}
                  className={`${inputCls} resize-none`}
                />
              </div>
            )}

            {/* Preview */}
            {parsedCandidates().length > 0 && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs text-[#888FC0] mb-2 font-semibold">{parsedCandidates().length} candidate{parsedCandidates().length !== 1 ? 's' : ''} will receive an invite</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {parsedCandidates().map((c, i) => (
                    <div key={i} className="text-xs text-[#AEB5E0]">{c.name ? `${c.name} — ` : ''}{c.email}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setStep(2)} variant="outline" className="border-white/[0.08] text-[#AEB5E0]">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & send invites'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
