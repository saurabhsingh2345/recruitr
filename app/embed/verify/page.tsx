'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Loader2, Shield, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function EmbedVerifyInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const skill = searchParams.get('skill') || 'General'
  const company = searchParams.get('company') || 'Company'

  const [starting, setStarting] = useState(false)
  const [done, setDone] = useState<{ score: number; skill: string } | null>(null)

  const startVerify = useCallback(async () => {
    setStarting(true)
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'gap',
          targetSkill: skill,
          embedMode: { company },
        }),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        router.push(`/interview/${data.sessionId}?embed=1&company=${encodeURIComponent(company)}`)
      } else if (res.status === 401) {
        window.location.href = `/onboarding?ref=embed&skill=${encodeURIComponent(skill)}`
      } else {
        alert(data.message || data.error || 'Could not start session')
        setStarting(false)
      }
    } catch {
      setStarting(false)
    }
  }, [skill, company, router])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'intervue_verify_complete') {
        setDone({ score: e.data.score, skill: e.data.skill })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (done) {
    return (
      <div className="min-h-[420px] bg-[#05060F] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-12 h-12 text-[#2DE2C5] mx-auto mb-4" />
          <div className="text-4xl font-mono font-bold text-[#2DE2C5] mb-1">{done.score}</div>
          <div className="text-sm text-[#888FC0] mb-4">{done.skill} verified by Intervue</div>
          <p className="text-xs text-[#888FC0]">Score sent to {company}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[420px] bg-[#05060F] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-10 h-10 rounded-xl bg-[#2DE2C5] flex items-center justify-center mx-auto mb-4">
          <Shield className="w-5 h-5 text-[#05060F]" />
        </div>
        <h1 className="text-lg font-bold mb-1">Verify your {skill} skills</h1>
        <p className="text-sm text-[#888FC0] mb-6">
          {company} uses Intervue to verify applicants. ~8 minute AI session — no trick questions.
        </p>

        {status === 'loading' ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#2DE2C5]" />
        ) : session?.user ? (
          <Button onClick={startVerify} disabled={starting} className="btn-supernova w-full font-semibold">
            {starting ? 'Starting…' : 'Start verification'}
          </Button>
        ) : (
          <Link href={`/onboarding?ref=embed&skill=${encodeURIComponent(skill)}`}>
            <Button className="btn-supernova w-full font-semibold">Sign in to verify</Button>
          </Link>
        )}

        <p className="text-[10px] text-[#555] mt-6">
          Embed: <code className="text-[#888FC0]">{`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/verify?skill=${skill}&company=${company}" />`}</code>
        </p>
      </div>
    </div>
  )
}

export default function EmbedVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-[420px] bg-[#05060F] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" /></div>}>
      <EmbedVerifyInner />
    </Suspense>
  )
}
