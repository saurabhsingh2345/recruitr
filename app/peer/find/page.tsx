'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import { CandidateNav } from '@/components/CandidateNav'

const SKILLS = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'System Design', 'Algorithms', 'SQL', 'DevOps']
const FORMATS = [
  { id: 'peer_coding', label: 'Live Coding', desc: 'Code together and review solutions' },
  { id: 'peer_design', label: 'System Design', desc: 'Design systems, discuss trade-offs' },
  { id: 'peer_behavioural', label: 'Behavioural', desc: 'Practice STAR stories' },
]

export default function FindPeerPage() {
  const router = useRouter()
  const [skill, setSkill] = useState('JavaScript')
  const [format, setFormat] = useState('peer_coding')
  const [role, setRole] = useState<'any' | 'interviewer' | 'candidate'>('any')
  const [joining, setJoining] = useState(false)
  const [waitStatus, setWaitStatus] = useState<string | null>(null)

  async function handleJoin() {
    setJoining(true)
    setWaitStatus(null)
    try {
      const res = await fetch('/api/peer/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, format, preferRole: role }),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        if (data.status === 'matched') {
          router.push(`/peer/${data.sessionId}`)
        } else {
          // Waiting — poll until matched
          setWaitStatus('Waiting for a peer to join…')
          pollForMatch(data.sessionId)
        }
      }
    } catch {
      setJoining(false)
    }
  }

  async function pollForMatch(sessionId: string) {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/peer/${sessionId}`)
        const data = await res.json()
        if (data.status === 'active') {
          clearInterval(interval)
          router.push(`/peer/${sessionId}`)
        }
        if (attempts > 60 || data.status === 'abandoned') {
          clearInterval(interval)
          setWaitStatus('No peer found yet. Your session is saved — come back later.')
          setJoining(false)
        }
      } catch {
        clearInterval(interval)
        setJoining(false)
      }
    }, 5000)
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#04050e] text-white">
      <CandidateNav />
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-12">

        <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#8B7CF8]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#8B7CF8]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Find a peer</h1>
            <p className="text-sm text-white/40">Practice interviewing with another candidate</p>
          </div>
        </div>

        {/* Format */}
        <div className="mb-6">
          <label className="text-xs text-white/30 uppercase tracking-wider block mb-3">Format</label>
          <div className="space-y-2">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  format === f.id
                    ? 'border-[#8B7CF8]/40 bg-[#8B7CF8]/[0.06]'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${format === f.id ? 'bg-[#8B7CF8]' : 'bg-white/20'}`} />
                <div>
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-white/35">{f.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Skill */}
        <div className="mb-6">
          <label className="text-xs text-white/30 uppercase tracking-wider block mb-3">Skill focus</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(s => (
              <button
                key={s}
                onClick={() => setSkill(s)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                  skill === s
                    ? 'bg-[#2DE2C5]/10 border-[#2DE2C5]/30 text-[#2DE2C5]'
                    : 'border-white/[0.06] text-white/40 hover:border-white/[0.12]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Role preference */}
        <div className="mb-8">
          <label className="text-xs text-white/30 uppercase tracking-wider block mb-3">Your role</label>
          <div className="flex gap-2">
            {(['any', 'interviewer', 'candidate'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg text-xs capitalize border transition-all ${
                  role === r
                    ? 'bg-[#2DE2C5]/10 border-[#2DE2C5]/30 text-[#2DE2C5]'
                    : 'border-white/[0.06] text-white/40 hover:border-white/[0.12]'
                }`}
              >
                {r === 'any' ? 'No preference' : r}
              </button>
            ))}
          </div>
        </div>

        {waitStatus && (
          <div className="mb-4 p-4 rounded-xl bg-[#8B7CF8]/[0.06] border border-[#8B7CF8]/20 text-sm text-[#8B7CF8]">
            {waitStatus}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 rounded-xl bg-[#8B7CF8] text-white font-semibold text-sm hover:bg-[#8B7CF8]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {joining ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Finding a peer…</>
          ) : (
            <>Find a peer →</>
          )}
        </button>
      </div>
      </main>
    </div>
  )
}
