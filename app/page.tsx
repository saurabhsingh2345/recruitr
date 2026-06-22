'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  GitBranch,
  ArrowRight,
  Shield,
  FileText,
  Brain,
  CheckCircle2,
  TrendingUp,
  Users,
  MessageCircle,
  ChevronRight,
  Cpu,
  Code2,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { SkillConstellation } from '@/components/SkillConstellation'

function NavAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="w-20 h-8 rounded-md bg-white/[0.04] animate-pulse" />
  }

  if (session?.user) {
    const isRecruiter = session.user.role === 'recruiter'
    const home = isRecruiter ? '/recruiter/dashboard' : '/dashboard'
    const initial = (session.user.name || session.user.username || '?')[0]?.toUpperCase()
    return (
      <div className="flex items-center gap-3">
        <Link href={home}>
          <Button size="sm" className="btn-supernova font-semibold h-8 px-4 text-xs">
            {isRecruiter ? 'Recruiter dashboard' : 'Dashboard'}
          </Button>
        </Link>
        <div className="hidden sm:flex items-center gap-2">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#2DE2C5] flex items-center justify-center text-[#05060F] font-bold text-xs">
              {initial}
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/recruiter/login">
        <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-xs">
          Sign in
        </Button>
      </Link>
      <Link href="/onboarding">
        <Button size="sm" className="btn-supernova font-semibold text-xs h-8 px-4">
          Get started free
        </Button>
      </Link>
    </div>
  )
}

const SKILLS_MOCK = [
  { name: 'Go', proofScore: 84, evidence: ['a', 'b', 'c'] },
  { name: 'System Design', proofScore: 76, evidence: ['a', 'b'] },
  { name: 'PostgreSQL', proofScore: 68, evidence: ['a', 'b'] },
  { name: 'Distributed Sys', proofScore: 71, evidence: ['a'] },
  { name: 'Kubernetes', proofScore: 64, evidence: ['a', 'b'] },
]

const COMPARISON = [
  { feature: 'Verified proof-of-skill scores',    i: true,  n: false, l: false },
  { feature: 'AI interviews on your actual code',  i: true,  n: false, l: false },
  { feature: 'GitHub-backed evidence per skill',   i: true,  n: false, l: false },
  { feature: 'Adaptive to your projects',          i: true,  n: false, l: false },
  { feature: 'Tailored resume per JD',             i: true,  n: false, l: false },
  { feature: 'Cohort percentile ranking',          i: true,  n: false, l: false },
]

const STEPS = [
  {
    n: '01',
    icon: <GitBranch className="w-5 h-5" />,
    title: 'Connect GitHub',
    desc: "We analyse your repos, READMEs, and commit history to build a precise picture of what you've actually shipped.",
    color: '#2DE2C5',
  },
  {
    n: '02',
    icon: <Cpu className="w-5 h-5" />,
    title: 'Complete AI Interviews',
    desc: 'Adaptive sessions in 5 formats — live coding, system design, project deep-dive, behavioural, and gap analysis.',
    color: '#8B7CF8',
  },
  {
    n: '03',
    icon: <Shield className="w-5 h-5" />,
    title: 'Share Verified Profile',
    desc: 'One link. Recruiter sees proof scores, evidence links, and session history — tied to your identity.',
    color: '#3FC5F0',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#05060f] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#05060f]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
              <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold tracking-tight text-white">intervue</span>
            <span className="ml-0.5 text-[9px] font-semibold bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 rounded px-1.5 py-0.5">BETA</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[13px] text-white/45">
            {[
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Features', href: '#features' },
              { label: 'Leaderboard', href: '/leaderboard' },
              { label: 'For Recruiters', href: '/recruiter/login' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </div>

          <NavAuth />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-0 px-6 overflow-hidden">
        {/* Very subtle gradient at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2DE2C5]/20 to-transparent" />

        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 mb-10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2DE2C5] animate-pulse" />
            India-first verified engineering identity
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-[3.5rem] md:text-[5.5rem] lg:text-[7rem] font-black leading-[0.92] tracking-[-0.03em] mb-8"
          >
            <span className="text-white">Stop listing</span>
            <br />
            <span className="text-white">skills.</span>
            <br />
            <span className="text-[#2DE2C5]">Prove them.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-base md:text-lg text-white/40 leading-relaxed mb-10 max-w-xl mx-auto"
          >
            AI interviews on your actual GitHub code. Verified skill scores.
            One link that replaces the keyword resume.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <Link href="/onboarding">
              <Button className="btn-supernova font-bold h-12 px-8 text-sm">
                Build my profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                variant="outline"
                className="border-white/[0.1] text-white/50 hover:text-white hover:border-white/25 h-12 px-7 text-sm bg-transparent"
              >
                How it works
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 text-xs text-white/25 mb-16"
          >
            {['Free forever', 'No credit card', '5 min setup'].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/10">·</span>}
                {t}
              </span>
            ))}
          </motion.div>

          {/* Product preview card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.7, ease: [0.21, 1.11, 0.81, 0.99] }}
            className="relative mx-auto max-w-xl"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c1a] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
              {/* Card chrome bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                </div>
                <span className="text-[11px] text-white/25 font-mono mx-auto">intervue · proof-network</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20">
                  <Shield className="w-2.5 h-2.5 text-[#2DE2C5]" />
                  <span className="text-[9px] text-[#2DE2C5] font-semibold">Verified</span>
                </div>
              </div>

              {/* Constellation */}
              <div className="flex items-center justify-center py-2">
                <SkillConstellation skills={SKILLS_MOCK} centerLabel="AK" size={300} />
              </div>

              {/* Footer stat */}
              <div className="mx-4 mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#2DE2C5]/[0.07] border border-[#2DE2C5]/[0.12]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#2DE2C5]" />
                  <span className="text-xs text-white/60">Cohort rank</span>
                </div>
                <span className="text-sm font-bold text-[#2DE2C5]">Top 14% Go · India</span>
              </div>
            </div>

            {/* Floating stat chips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="absolute -right-6 top-16 rounded-xl border border-white/[0.08] bg-[#0a0c1a] px-3.5 py-2.5 shadow-xl"
            >
              <div className="text-[10px] text-white/35 mb-0.5">Proof score</div>
              <div className="text-lg font-bold font-mono text-[#2DE2C5]">84</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 }}
              className="absolute -left-6 bottom-20 rounded-xl border border-white/[0.08] bg-[#0a0c1a] px-3.5 py-2.5 shadow-xl"
            >
              <div className="text-[10px] text-white/35 mb-0.5">Sessions</div>
              <div className="text-lg font-bold font-mono text-[#8B7CF8]">12</div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade into next section */}
        <div className="h-32 bg-gradient-to-b from-transparent to-[#05060f] -mt-8 relative z-10" />
      </section>

      {/* ── Social proof strip ── */}
      <div className="border-y border-white/[0.05] py-5 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-8 flex-wrap">
          {[
            { value: '2,400+', label: 'Engineers verified' },
            { value: '18,000+', label: 'AI sessions run' },
            { value: '340+', label: 'Recruiters on platform' },
          ].map((stat) => (
            <div key={stat.label} className="text-center flex-1 min-w-[120px]">
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs text-white/35 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-4">How it works</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">From zero to verified in minutes</h2>
            <p className="text-white/40 max-w-md">Connect once. The network sharpens with every session you complete.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-[#05060f]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: step.color + '15', border: `1px solid ${step.color}25`, color: step.color }}
                >
                  {step.icon}
                </div>
                <div className="text-[10px] font-semibold tracking-widest text-white/20 mb-2">{step.n}</div>
                <h3 className="font-semibold text-[15px] mb-2">{step.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-4">Features</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Built for engineers who ship</h2>
            <p className="text-white/40">Not a job board. Not an ATS. A verified engineering identity layer.</p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4">
            {/* Large: AI Engine */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-3 p-8 rounded-2xl border border-white/[0.07] bg-[#0a0c1a]"
            >
              <div className="w-10 h-10 rounded-xl icon-teal flex items-center justify-center mb-5">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2">Interviews rooted in your actual code</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                The AI reads your repos before the session starts. It asks about the rate-limiter you actually built,
                the DB schema you actually designed — not generic LeetCode.
              </p>

              <div className="rounded-xl border border-white/[0.06] bg-[#05060f] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.015]">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
                    <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
                    <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
                  </div>
                  <span className="ml-2 text-[10px] text-white/25 font-mono">interview session · live</span>
                </div>
                <div className="p-4 font-mono text-xs space-y-2.5">
                  <div>
                    <span className="text-[#2DE2C5]">AI:</span>
                    <span className="text-white/50"> I see you built a rate limiter in </span>
                    <span className="text-[#8B7CF8]">api-gateway</span>
                  </div>
                  <div className="text-white/30">
                    Walk me through the token bucket implementation and how you handled distributed state across pods.
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-white/25">You:</span>
                    <span className="w-1 h-3.5 bg-[#2DE2C5] animate-pulse ml-1 rounded-sm" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Small cards column */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className="flex-1 p-7 rounded-2xl border border-white/[0.07] bg-[#0a0c1a]"
              >
                <div className="w-10 h-10 rounded-xl icon-blue flex items-center justify-center mb-5">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-semibold mb-2 text-[15px]">Auditable evidence</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Every score tied to a specific repo, commit, or session transcript. Recruiters can inspect, not just see a number.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 }}
                className="flex-1 p-7 rounded-2xl border border-white/[0.07] bg-[#0a0c1a]"
              >
                <div className="w-10 h-10 rounded-xl icon-purple flex items-center justify-center mb-5">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold mb-2 text-[15px]">Resume in 30 seconds</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Paste any JD. We extract what they want, match your verified scores, generate an ATS-optimised resume.
                </p>
              </motion.div>
            </div>

            {/* Wide bottom card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.16 }}
              className="md:col-span-5 p-7 rounded-2xl border border-white/[0.07] bg-[#0a0c1a]"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-10 h-10 rounded-xl icon-amber flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px]">Know exactly where you stand</h3>
                    <p className="text-sm text-white/40 mt-0.5 max-w-lg">
                      Percentile vs. engineers targeting the same roles. Gaps shown with precision — System Design is your weakest verified skill for Senior SWE at a Series B.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:ml-auto shrink-0">
                  {[
                    { pct: 'Top 14%', skill: 'Go', color: '#2DE2C5' },
                    { pct: 'Top 31%', skill: 'System Design', color: '#8B7CF8' },
                  ].map((item) => (
                    <div key={item.skill} className="px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] text-center">
                      <div className="text-sm font-mono font-bold" style={{ color: item.color }}>{item.pct}</div>
                      <div className="text-[10px] text-white/35 mt-0.5">{item.skill}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <div className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-4">Why not LinkedIn or Naukri?</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">They show you. We verify you.</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.07] bg-[#0a0c1a] overflow-hidden"
          >
            <div className="grid grid-cols-4 px-6 py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
              <div className="text-xs font-medium text-white/40">Feature</div>
              <div className="flex justify-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20">
                  <svg width="10" height="10" viewBox="0 0 22 22" fill="none">
                    <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
                    <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[10px] text-[#2DE2C5] font-semibold">Intervue</span>
                </div>
              </div>
              <div className="text-center text-xs text-white/30 flex items-center justify-center">Naukri</div>
              <div className="text-center text-xs text-white/30 flex items-center justify-center">LinkedIn</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 px-6 py-3.5 ${i < COMPARISON.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
              >
                <div className="text-sm text-white/50 flex items-center">{row.feature}</div>
                {[row.i, row.n, row.l].map((val, j) => (
                  <div key={j} className="flex justify-center items-center">
                    {val ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2DE2C5]" />
                    ) : (
                      <span className="w-4 h-0.5 bg-white/[0.08] rounded-full block" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Recruiter section ── */}
      <section className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-6">For hiring teams</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                Hire engineers you can<br />
                actually trust
              </h2>
              <p className="text-white/40 mb-7 leading-relaxed">
                Skip keyword resume screening. Search by verified proof scores,
                message candidates directly, schedule interviews, and track the full pipeline.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: <Shield className="w-3.5 h-3.5" />, text: 'Scores backed by inspectable GitHub evidence' },
                  { icon: <MessageCircle className="w-3.5 h-3.5" />, text: 'Integrated messaging + interview scheduling' },
                  { icon: <TrendingUp className="w-3.5 h-3.5" />, text: 'Full pipeline: contact → schedule → hired' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-sm text-white/50">
                    <span className="text-[#2DE2C5]">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
              <Link href="/recruiter/login">
                <Button className="btn-supernova font-semibold h-11 px-7">
                  Open recruiter dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-white/[0.07] bg-[#0a0c1a] p-5"
            >
              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/25 mb-4">Candidate matches</div>
              <div className="space-y-2">
                {[
                  { name: 'Rahul Mehta', role: 'AI/ML Engineer', score: 92, skill: 'Python', pct: 9 },
                  { name: 'Priya Sharma', role: 'Full Stack', score: 88, skill: 'TypeScript', pct: 11 },
                  { name: 'Sanaya Irani', role: 'DevOps', score: 91, skill: 'Kubernetes', pct: 12 },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-xs shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-white/35">{c.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-[#2DE2C5] font-bold">{c.score}</div>
                      <div className="text-[10px] text-white/30">{c.skill}</div>
                    </div>
                    <div className="text-[10px] bg-[#2DE2C5]/10 text-[#2DE2C5] px-2 py-0.5 rounded-full">
                      Top {c.pct}%
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 py-2.5 text-xs text-white/35 hover:text-white/60 transition-colors border border-white/[0.06] rounded-xl hover:border-white/[0.1]">
                Search 2,400+ engineers →
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[3rem] md:text-[4.5rem] font-black tracking-tight mb-5 leading-[1]">
              Start proving.<br />
              <span className="text-[#2DE2C5]">Not listing.</span>
            </h2>
            <p className="text-white/40 mb-10 leading-relaxed">
              Connect GitHub, complete an AI interview, get your verified profile.
              Recruiters see proof — not keywords.
            </p>
            <Link href="/onboarding">
              <Button className="btn-supernova font-bold h-13 px-12 text-base">
                Build my profile free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-xs text-white/20 mt-5">No credit card · GitHub OAuth · 5 min</p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-sm">intervue</span>
            <span className="text-xs text-white/20">India-first · Built by engineers</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/25">
            <Link href="/onboarding" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/leaderboard" className="hover:text-white/60 transition-colors">Leaderboard</Link>
            <Link href="/recruiter" className="hover:text-white/60 transition-colors">Recruiters</Link>
            <span>© 2026 Intervue</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
