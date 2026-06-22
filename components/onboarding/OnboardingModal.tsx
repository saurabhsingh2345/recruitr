'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, GitBranch } from 'lucide-react'

interface Skill { name: string; proofScore: number }
interface TopRepo { name: string; language?: string }

interface Props {
  username: string
  topRepo: TopRepo | null
  topLanguage: string | null
  parsedSkills: Skill[]
  initialStep?: number
  onDismiss?: () => void
}

const STEPS = ['Connect', 'First session', 'Your proof']

export function OnboardingModal({ username, topRepo, topLanguage, parsedSkills, initialStep = 0, onDismiss }: Props) {
  const [step, setStep] = useState(initialStep)
  const [starting, setStarting] = useState(false)
  const router = useRouter()

  async function handleSkip() {
    await fetch('/api/onboarding/skip', { method: 'POST' })
    onDismiss?.()
  }

  async function handleStartSession() {
    setStarting(true)
    const format = topLanguage ? 'coding' : 'project_deepdive'
    const skill = topLanguage || 'General'

    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, targetSkill: skill, isOnboarding: true }),
    })

    if (res.ok) {
      const { sessionId } = await res.json()
      await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2 }),
      })
      router.push(`/interview/${sessionId}`)
    } else {
      setStarting(false)
    }
  }

  async function handleDone() {
    await fetch('/api/onboarding/skip', { method: 'POST' })
    onDismiss?.()
    router.push(`/p/${username}`)
  }

  const progressWidth = `${Math.round(((step + 1) / STEPS.length) * 100)}%`

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)' }}
      className="flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[480px] rounded-2xl border border-white/[0.08] bg-[#0a0c1a] p-8">

        {/* Progress bar */}
        <div className="h-0.5 bg-white/[0.06] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-[#2DE2C5] rounded-full transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        {step === 0 && (
          <StepGitHub onNext={() => setStep(1)} onSkip={handleSkip} topRepo={topRepo} />
        )}
        {step === 1 && (
          <StepStartSession
            onStart={handleStartSession}
            starting={starting}
            topLanguage={topLanguage}
          />
        )}
        {step === 2 && (
          <StepProofReady parsedSkills={parsedSkills} onDone={handleDone} />
        )}
      </div>
    </div>
  )
}

function StepGitHub({
  onNext, onSkip, topRepo,
}: { onNext: () => void; onSkip: () => void; topRepo: TopRepo | null }) {
  return (
    <div>
      <div className="w-11 h-11 rounded-xl bg-[#2DE2C5]/10 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-5 h-5 text-[#2DE2C5]" />
      </div>
      <h2 className="text-lg font-semibold mb-2">GitHub connected</h2>
      <p className="text-sm text-white/45 mb-4 leading-relaxed">
        We found your repositories. Your proof scores will be built from your actual code — not self-reported skills.
      </p>
      {topRepo && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] rounded-lg mb-6 text-sm text-white/50">
          <GitBranch className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <span className="truncate">{topRepo.name}</span>
          {topRepo.language && <span className="text-white/25 shrink-0">· {topRepo.language}</span>}
        </div>
      )}
      {!topRepo && <div className="mb-6" />}
      <button
        onClick={onNext}
        className="w-full bg-[#2DE2C5] text-[#04050e] font-semibold rounded-lg py-2.5 text-sm mb-3 hover:bg-[#2DE2C5]/90 transition-colors"
      >
        See what we found →
      </button>
      <button
        onClick={onSkip}
        className="w-full text-xs text-white/25 hover:text-white/45 transition-colors py-1"
      >
        Skip for now
      </button>
    </div>
  )
}

function StepStartSession({
  onStart, starting, topLanguage,
}: { onStart: () => void; starting: boolean; topLanguage: string | null }) {
  const format = topLanguage ? 'coding' : 'project_deepdive'
  const label = format === 'coding' ? `${topLanguage} coding interview` : 'Project deep-dive'

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Your first interview</h2>
      <p className="text-sm text-white/45 mb-6 leading-relaxed">
        Based on your GitHub, we&apos;ve prepared a {label}. It will ask about your actual
        projects — not generic trivia questions.
      </p>
      <div className="border border-white/[0.08] rounded-xl p-4 mb-6 bg-white/[0.02]">
        <div className="text-sm font-medium mb-1">{label}</div>
        <div className="text-xs text-white/35">
          ~15 minutes · Adaptive difficulty · Your repos as context
        </div>
      </div>
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full bg-[#2DE2C5] text-[#04050e] font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50 hover:bg-[#2DE2C5]/90 transition-colors flex items-center justify-center gap-2"
      >
        {starting ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Starting…</>
        ) : (
          'Start interview →'
        )}
      </button>
    </div>
  )
}

function StepProofReady({
  parsedSkills, onDone,
}: { parsedSkills: Skill[]; onDone: () => void }) {
  const top = parsedSkills.slice(0, 4)

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Your first proof scores</h2>
      <p className="text-sm text-white/45 mb-6 leading-relaxed">
        These are not self-reported. Every score is backed by evidence from your actual work.
      </p>
      <div className="space-y-3 mb-6">
        {top.map(skill => {
          const pct = Math.max(4, skill.proofScore)
          const color =
            skill.proofScore >= 85 ? '#2DE2C5' :
            skill.proofScore >= 70 ? '#3FC5F0' :
            skill.proofScore >= 50 ? '#8B7CF8' :
            skill.proofScore >= 30 ? '#C77DFF' : '#FB7185'
          return (
            <div key={skill.name} className="flex items-center gap-3">
              <div className="w-28 text-sm text-white/70 truncate shrink-0">{skill.name}</div>
              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="font-mono text-sm w-7 text-right shrink-0" style={{ color }}>
                {skill.proofScore}
              </div>
            </div>
          )
        })}
      </div>
      <button
        onClick={onDone}
        className="w-full bg-[#2DE2C5] text-[#04050e] font-semibold rounded-lg py-2.5 text-sm hover:bg-[#2DE2C5]/90 transition-colors"
      >
        View your profile →
      </button>
    </div>
  )
}
