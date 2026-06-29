import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'
import { ReceiptShare } from '@/components/interview/ReceiptShare'

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-Dive',
  behavioural: 'Behavioural',
  gap: 'Gap Session',
  pm_case: 'Product Case',
  design_critique: 'Design Critique',
  ops_case: 'Operations Case',
  sales_discovery: 'Sales Discovery',
}

interface ReceiptData {
  format: string
  targetSkill: string
  overall: number
  breakdown: { k: string; v: number }[]
  proctored: boolean
  completedAt: string | null
  name: string
  username: string | null
}

function scoreColor(s: number): string {
  if (s >= 80) return '#2DE2C5'
  if (s >= 65) return '#3FC5F0'
  if (s >= 50) return '#f59e0b'
  return '#f43f5e'
}

async function getReceipt(id: string): Promise<ReceiptData | null> {
  if (!Types.ObjectId.isValid(id)) return null
  await connectDB()
  const session = (await InterviewSession.findById(id)
    .select('format targetSkill scores status rigorConditions userId completedAt')
    .lean()) as {
    format?: string
    targetSkill?: string
    scores?: { overall?: number; breakdown?: Record<string, number> }
    status?: string
    rigorConditions?: { fullScreenEnforced?: boolean; faceDetectionActive?: boolean }
    userId?: unknown
    completedAt?: Date
  } | null

  if (!session || session.status !== 'completed') return null

  let name = 'A candidate'
  let username: string | null = null
  if (session.userId) {
    const user = (await User.findById(session.userId).select('name username').lean()) as
      | { name?: string; username?: string }
      | null
    name = user?.name || user?.username || name
    username = user?.username || null
  }

  return {
    format: session.format || 'coding',
    targetSkill: session.targetSkill || 'Interview',
    overall: Math.round(session.scores?.overall || 0),
    breakdown: Object.entries(session.scores?.breakdown || {})
      .map(([k, v]) => ({ k, v: Math.round(Number(v) || 0) }))
      .sort((a, b) => b.v - a.v),
    proctored: !!(session.rigorConditions?.fullScreenEnforced || session.rigorConditions?.faceDetectionActive),
    completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    name,
    username,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const r = await getReceipt(id)
  if (!r) return { title: 'Interview Proof · Intervue' }
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const label = FORMAT_LABELS[r.format] || 'Interview'
  const title = `${r.name} — ${r.overall}/100 on a verified ${r.targetSkill} interview`
  return {
    title,
    description: `${label} · scored ${r.overall}/100 on Intervue${r.proctored ? ' (AI-proctored)' : ''}.`,
    openGraph: {
      title,
      description: `${label} · ${r.overall}/100 · Verified by Intervue`,
      images: [`${base}/api/session-receipt/${id}`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [`${base}/api/session-receipt/${id}`],
    },
  }
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await getReceipt(id)
  if (!r) notFound()

  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const receiptUrl = `${base}/interview/receipt/${id}`
  const color = scoreColor(r.overall)
  const label = FORMAT_LABELS[r.format] || 'Interview'

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="h-1.5 rounded-t-2xl" style={{ background: color }} />
        <div className="border border-white/[0.08] rounded-b-2xl bg-[#0A0C1A] p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center">
                <span className="text-[#050508] font-black text-sm">I</span>
              </div>
              <span className="font-bold text-sm">intervue</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#2DE2C5]/30 bg-[#2DE2C5]/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2DE2C5]" />
              <span className="text-[#2DE2C5] text-xs font-bold tracking-wide">VERIFIED PROOF</span>
            </div>
          </div>

          {/* Score ring */}
          <div className="flex items-center gap-6 mb-7">
            <div
              className="w-28 h-28 rounded-full flex flex-col items-center justify-center shrink-0"
              style={{ border: `6px solid ${color}` }}
            >
              <span className="text-4xl font-bold font-mono leading-none">{r.overall}</span>
              <span className="text-xs text-white/40 mt-1">/ 100</span>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest" style={{ color }}>{label}</div>
              <div className="text-2xl font-bold mt-1 leading-tight">{r.targetSkill}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-white/50">{r.name}</span>
                {r.proctored && (
                  <span className="text-[10px] text-[#2DE2C5] border border-[#2DE2C5]/40 rounded px-1.5 py-0.5">PROCTORED</span>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {r.breakdown.length > 0 && (
            <div className="space-y-3 mb-7">
              {r.breakdown.map((b) => (
                <div key={b.k}>
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span className="capitalize">{b.k.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-white/80">{b.v}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.v}%`, background: scoreColor(b.v) }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Share */}
          <ReceiptShare receiptUrl={receiptUrl} skill={r.targetSkill} score={r.overall} />

          {/* CTAs */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/[0.06] text-sm">
            {r.username ? (
              <Link href={`/p/${r.username}`} className="text-[#2DE2C5] hover:underline">
                View full profile →
              </Link>
            ) : <span />}
            <Link href="/interview/new" className="text-white/50 hover:text-white">
              Get your own proof
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
