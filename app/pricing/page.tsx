'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Code2, Check, Sparkles, ArrowRight, Loader2,
  GitBranch, Shield, Zap, Users, TrendingUp, Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const FREE_FEATURES = [
  { icon: Zap,         text: '3 AI interview sessions per month' },
  { icon: GitBranch,   text: 'GitHub profile analysis' },
  { icon: Shield,      text: 'Public profile + badges + proof pages' },
  { icon: Sparkles,    text: 'Atlas proactive skill insights' },
  { icon: Code2,       text: 'Badge embeds for READMEs' },
]

const PRO_FEATURES = [
  { text: 'Everything in Free', highlight: false },
  { text: 'All data sources — LinkedIn, StackOverflow, DevTo', highlight: true },
  { text: 'Score history sparklines', highlight: true },
  { text: 'Score-change email alerts', highlight: true },
  { text: 'Priority ranking in recruiter search', highlight: true },
  { text: 'Full interview report share links', highlight: false },
]

const FAQS = [
  {
    q: 'Can I cancel any time?',
    a: 'Yes — cancel from the Billing tab in Settings. Your Pro access stays until the end of the billing period.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'All major cards, UPI, and net banking via Stripe. No subscription data is stored on our servers.',
  },
  {
    q: 'Is the free tier really unlimited?',
    a: 'Free includes 3 AI interview sessions per month, plus your public profile, badges, proof pages, and Atlas coaching. Upgrade to Pro for unlimited sessions and all data sources.',
  },
  {
    q: 'Why upgrade to Pro?',
    a: 'Pro is for candidates who want unlimited sessions, all data sources (LinkedIn, StackOverflow, DevTo), score-change alerts, and priority placement in recruiter search.',
  },
]

export default function PricingPage() {
  const [checkingOut, setCheckingOut] = useState(false)

  async function handleUpgrade() {
    setCheckingOut(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else if (res.status === 401) {
        window.location.href = '/onboarding'
      } else {
        toast.error(data.error || 'Failed to start checkout')
        setCheckingOut(false)
      }
    } catch {
      toast.error('Something went wrong')
      setCheckingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-4 h-4 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight">intervue</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/onboarding" className="text-sm text-[#AEB5E0] hover:text-white transition-colors">Sign in</Link>
          <Link href="/onboarding">
            <Button size="sm" className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold text-xs h-8">
              Get started free
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2DE2C5]/20 bg-[#2DE2C5]/5 text-xs text-[#2DE2C5] mb-6">
            <Sparkles className="w-3 h-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Start free.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2DE2C5] to-[#8B7CF8]">
              Go Pro when you&apos;re ready.
            </span>
          </h1>
          <p className="text-[#AEB5E0] text-lg max-w-xl mx-auto">
            The core product is free forever. Pro unlocks more data sources,
            priority placement, and the signals that make your profile irresistible to the right recruiters.
          </p>
        </motion.div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-8"
          >
            <div className="mb-6">
              <div className="text-xs text-[#AEB5E0] uppercase tracking-widest font-semibold mb-2">Free</div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-[#AEB5E0] mb-1">/month</span>
              </div>
              <p className="text-sm text-[#AEB5E0]">No credit card required. Free forever.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
                    <Icon className="w-2.5 h-2.5 text-[#AEB5E0]" />
                  </div>
                  <span className="text-[#C0C4D0]">{text}</span>
                </li>
              ))}
            </ul>

            <Link href="/onboarding">
              <Button variant="outline" className="w-full border-white/[0.1] text-[#AEB5E0] hover:text-white font-semibold">
                Get started free
              </Button>
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-[#2DE2C5]/30 bg-[#080A18] p-8 relative overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#2DE2C5]/[0.05] to-transparent pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-[#2DE2C5] uppercase tracking-widest font-semibold">Pro</div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20">
                  <Sparkles className="w-2.5 h-2.5 text-[#2DE2C5]" />
                  <span className="text-[10px] text-[#2DE2C5] font-semibold">Most popular</span>
                </div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold text-white">₹399</span>
                <span className="text-[#AEB5E0] mb-1">/month</span>
              </div>
              <p className="text-sm text-[#AEB5E0] mb-6">Cancel any time. No lock-in.</p>

              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map(({ text, highlight }) => (
                  <li key={text} className="flex items-start gap-3 text-sm">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${highlight ? 'text-[#2DE2C5]' : 'text-white/40'}`} />
                    <span className={highlight ? 'text-white' : 'text-[#C0C4D0]'}>{text}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleUpgrade}
                disabled={checkingOut}
                className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold h-11"
              >
                {checkingOut
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting…</>
                  : <>Upgrade to Pro <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-6 mb-20"
        >
          {[
            { icon: Users,       value: '2,400+', label: 'Engineers building proof' },
            { icon: TrendingUp,  value: '94%',    label: 'Interview pass rate' },
            { icon: Bell,        value: '340+',   label: 'Recruiters using Intervue' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-[#080A18] p-6 text-center">
              <div className="w-9 h-9 rounded-xl bg-[#2DE2C5]/10 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-4 h-4 text-[#2DE2C5]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#2DE2C5]">{value}</div>
              <div className="text-xs text-[#888FC0] mt-1">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/[0.06] bg-[#080A18] p-5">
                <div className="text-sm font-semibold mb-2">{q}</div>
                <div className="text-sm text-[#AEB5E0] leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
