'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Code2, Shield, Search, Users,
  TrendingUp, CheckCircle2, Zap, Mail, Lock, Building2, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const PROOF_POINTS = [
  { icon: Shield, text: 'Every score backed by real code, real interviews' },
  { icon: Search, text: 'Natural language search — "senior Go engineer, Bangalore"' },
  { icon: Users, text: 'Full pipeline from contact to hire in one place' },
  { icon: TrendingUp, text: 'See how your hires perform — calibrated over time' },
]

const STATS = [
  { value: '340+', label: 'Recruiters on waitlist' },
  { value: '2,400+', label: 'Verified engineers' },
  { value: '94%', label: 'Hire satisfaction' },
]

export default function RecruiterLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Signup failed')
          setLoading(false)
          return
        }
      }
      // Sign in with credentials for both flows
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Invalid email or password')
        setLoading(false)
        return
      }
      // New signups → setup (open roles); returning → dashboard
      router.push(mode === 'signup' ? '/recruiter/setup' : '/recruiter/dashboard')
    } catch {
      toast.error('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center shadow-[0_0_12px_rgba(45,226,197,0.3)]">
            <Code2 className="w-4 h-4 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight">intervue</span>
          <span className="text-xs text-[#2DE2C5] border border-[#2DE2C5]/30 bg-[#2DE2C5]/10 px-1.5 py-0.5 rounded-full">for recruiters</span>
        </Link>
        <Link href="/onboarding" className="text-sm text-[#AEB5E0] hover:text-white transition-colors">
          Looking for a job? →
        </Link>
      </nav>

      <div className="flex-1 flex">
        {/* Left — value prop */}
        <div className="hidden lg:flex flex-col justify-center px-16 w-[55%] border-r border-white/[0.05]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2DE2C5]/20 bg-[#2DE2C5]/5 text-xs text-[#2DE2C5] mb-6">
              <Zap className="w-3 h-3" />
              Hire engineers you can actually trust
            </div>

            <h1 className="text-4xl font-bold leading-tight mb-4">
              Stop guessing.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2DE2C5] to-[#8B7CF8]">
                See proof, not promises.
              </span>
            </h1>

            <p className="text-[#AEB5E0] text-lg leading-relaxed mb-10 max-w-lg">
              Every engineer on Intervue has been evaluated against their actual code —
              not a resume. You see verified skill scores, behavioral signals, and
              interview transcripts before the first call.
            </p>

            <div className="space-y-4 mb-12">
              {PROOF_POINTS.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#2DE2C5]" />
                  </div>
                  <span className="text-sm text-[#C0C4D0]">{text}</span>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <div className="text-2xl font-bold text-white font-mono">{value}</div>
                  <div className="text-xs text-[#888FC0] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right — sign in */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-8">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-xl bg-[#05060F] border border-white/[0.06] mb-6">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === m ? 'bg-[#2DE2C5]/15 text-[#2DE2C5]' : 'text-[#AEB5E0] hover:text-white'
                    }`}
                  >
                    {m === 'signin' ? 'Sign in' : 'Sign up'}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <h2 className="text-xl font-bold mb-1">
                  {mode === 'signin' ? 'Welcome back' : 'Create your recruiter account'}
                </h2>
                <p className="text-sm text-[#AEB5E0]">
                  {mode === 'signin'
                    ? 'Sign in to your hiring dashboard.'
                    : 'Free to start — no GitHub needed.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
                      <input
                        value={form.name} onChange={set('name')} required
                        placeholder="Your name"
                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                      />
                    </div>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
                      <input
                        value={form.company} onChange={set('company')}
                        placeholder="Company (e.g. Razorpay)"
                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                      />
                    </div>
                  </>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
                  <input
                    type="email" value={form.email} onChange={set('email')} required
                    placeholder="work@company.com"
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
                  <input
                    type="password" value={form.password} onChange={set('password')} required
                    placeholder={mode === 'signup' ? 'Create a password (8+ chars)' : 'Password'}
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'signin' ? 'Sign in' : 'Create account')}
                </Button>
              </form>

              {mode === 'signin' && (
                <div className="mt-3 text-center">
                  <Link href="/recruiter/forgot-password" className="text-xs text-[#888FC0] hover:text-[#AEB5E0] transition-colors">
                    Forgot your password?
                  </Link>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-2 mt-5">
                  {[
                    'Access to 2,400+ verified engineers',
                    'Scout sources & screens for you',
                    'Full pipeline management',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-[#AEB5E0]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5] shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-sm text-[#888FC0]">Are you an engineer? </span>
              <Link href="/onboarding" className="text-sm text-[#2DE2C5] hover:text-[#5af0d6] transition-colors">
                Build your verified profile →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
