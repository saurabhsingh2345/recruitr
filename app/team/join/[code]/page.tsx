'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users, Loader2, CheckCircle2 } from 'lucide-react'

export default function JoinTeamPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining')
  const [errorMsg, setErrorMsg] = useState('')
  const [teamId, setTeamId] = useState('')

  useEffect(() => {
    if (!code) return
    fetch('/api/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: code }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.teamId) {
          setTeamId(d.teamId)
          setStatus('success')
          setTimeout(() => router.push(`/teams/${d.teamId}`), 1500)
        } else {
          setErrorMsg(d.error || 'Failed to join team')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('Network error')
        setStatus('error')
      })
  }, [code, router])

  return (
    <div className="min-h-screen bg-[#04050e] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {status === 'joining' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#2DE2C5] mx-auto mb-5" />
            <h1 className="text-lg font-semibold mb-2">Joining team…</h1>
            <p className="text-white/40 text-sm">Fetching your skills and adding you to the team.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-[#2DE2C5] mx-auto mb-5" />
            <h1 className="text-lg font-semibold mb-2">You&apos;re in!</h1>
            <p className="text-white/40 text-sm">Redirecting to the team page…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-10 h-10 rounded-full bg-[#FB7185]/10 flex items-center justify-center mx-auto mb-5">
              <Users className="w-5 h-5 text-[#FB7185]" />
            </div>
            <h1 className="text-lg font-semibold mb-2">Couldn&apos;t join</h1>
            <p className="text-white/40 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-sm text-white/60 hover:bg-white/[0.1] transition-colors"
            >
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
