'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Users, Shield, ShieldCheck, Loader2 } from 'lucide-react'
import { CandidateNav } from '@/components/CandidateNav'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ReferralInfo {
  referralCode: string
  referralUrl: string
  referralCount: number
  completedCount: number
  isVouched: boolean
  vouchedCount: number
  referrals: { userId: string; sessionsCompleted: number; milestoneReached: boolean }[]
}

export default function ReferralsPage() {
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function copyLink() {
    if (!info?.referralUrl) return
    navigator.clipboard.writeText(info.referralUrl)
    setCopied(true)
    toast.success('Referral link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CandidateNav />
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-foreground/50 gap-1.5 -ml-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Settings
            </Button>
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Referrals</h1>
        <p className="text-sm text-foreground/50 mb-8">
          Share your link. When someone you refer completes 3 sessions, you earn a{' '}
          <span className="text-[#2DE2C5] font-semibold">Vouched</span> badge on your profile.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-foreground/30" />
          </div>
        ) : !info ? (
          <p className="text-sm text-foreground/40">Failed to load referral info.</p>
        ) : (
          <div className="space-y-6">
            {/* Vouched status */}
            <div className={`flex items-center gap-4 p-5 rounded-2xl border ${info.isVouched ? 'border-[#2DE2C5]/30 bg-[#2DE2C5]/[0.04]' : 'border-foreground/[0.08] bg-foreground/[0.02]'}`}>
              {info.isVouched
                ? <ShieldCheck className="w-8 h-8 text-[#2DE2C5] shrink-0" />
                : <Shield className="w-8 h-8 text-foreground/25 shrink-0" />
              }
              <div>
                <div className={`font-semibold ${info.isVouched ? 'text-[#2DE2C5]' : 'text-foreground/40'}`}>
                  {info.isVouched ? 'Vouched ✓' : 'Not yet vouched'}
                </div>
                <div className="text-xs text-foreground/40 mt-0.5">
                  {info.isVouched
                    ? `Your profile shows a Vouched badge. You've vouched ${info.vouchedCount} engineer${info.vouchedCount !== 1 ? 's' : ''}.`
                    : 'Earn this badge by referring someone who completes 3 interview sessions.'}
                </div>
              </div>
            </div>

            {/* Referral link */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-foreground/30">Your referral link</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-foreground/[0.03] border border-foreground/[0.08] rounded-xl font-mono text-sm text-foreground/50 truncate">
                  {info.referralUrl}
                </div>
                <Button size="sm" variant="outline" onClick={copyLink} className="border-foreground/[0.08] text-foreground/50 hover:text-foreground shrink-0 gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2DE2C5]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-foreground/30">
                Code: <span className="font-mono text-foreground/50">{info.referralCode}</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-foreground/[0.07] bg-foreground/[0.02] text-center">
                <div className="text-2xl font-bold text-foreground">{info.referralCount}</div>
                <div className="text-xs text-foreground/40 mt-1">Engineers referred</div>
              </div>
              <div className="p-4 rounded-xl border border-foreground/[0.07] bg-foreground/[0.02] text-center">
                <div className="text-2xl font-bold text-[#2DE2C5]">{info.completedCount}</div>
                <div className="text-xs text-foreground/40 mt-1">Completed 3 sessions</div>
              </div>
            </div>

            {/* Progress list */}
            {info.referrals.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-foreground/30 mb-3">
                  <Users className="w-3.5 h-3.5 inline mr-1.5" />Referral progress
                </div>
                {info.referrals.map((r, i) => (
                  <div key={r.userId} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foreground/[0.07] bg-foreground/[0.02]">
                    <div className="w-7 h-7 rounded-full bg-foreground/[0.06] flex items-center justify-center text-xs font-semibold text-foreground/40">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-foreground/60">{r.milestoneReached ? 'Milestone reached' : `${r.sessionsCompleted}/3 sessions`}</div>
                      {!r.milestoneReached && (
                        <div className="mt-1 h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden w-32">
                          <div className="h-full bg-[#2DE2C5] rounded-full transition-all" style={{ width: `${Math.min(100, (r.sessionsCompleted / 3) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    {r.milestoneReached && <ShieldCheck className="w-4 h-4 text-[#2DE2C5]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
