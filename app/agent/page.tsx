'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Sparkles, ArrowLeft, Loader2, Check, X, ShieldCheck,
  SlidersHorizontal, MapPin, Zap, Building2, EyeOff, Eye, MessageSquare,
  Send, ChevronDown, ChevronUp, TrendingUp, Target, Pencil,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getScoreColor } from '@/lib/scoring'
import { SkillUnlockPath } from '@/components/atlas/SkillUnlockPath'
import { MarketFeed } from '@/components/atlas/MarketFeed'
import { LearningPath } from '@/components/atlas/LearningPath'
import { MemoryInsights } from '@/components/atlas/MemoryInsights'
import { NegotiationCoach } from '@/components/messages/NegotiationCoach'

/* ── Types ──────────────────────────────────────────────────── */

interface SkillHistory { score: number; at: string }
interface Skill { name: string; proofScore: number; scoreHistory?: SkillHistory[] }

interface CareerGoal {
  targetRole: string
  targetLevel: string
  targetStage: string
  targetLocation: string
  targetSalaryLPA: number
}

interface JdMatchAlert {
  jobTitle: string
  matchScore: number
  topGap: string
  sessionLink: string
}

interface AtlasContext {
  proactiveInsight: { skill: string; score: number; daysIdle: number | null; reason: string; goalContext?: string } | null
  pendingHandshakes: number
  careerGoal?: CareerGoal
  jdMatchAlert?: JdMatchAlert | null
}

interface SkillMatch { skill: string; required: number; candidateScore: number | null; cleared: boolean }
interface Verdict { mutualFit: boolean; score: number; reasoning: string; skillMatches?: SkillMatch[]; techBarCleared?: boolean; compOverlap?: boolean; locationMatch?: boolean; stageMatch?: boolean; dealbreakerHit?: boolean }
interface Handshake {
  _id: string; roleTitle: string; company: string; blind: boolean; status: string
  surfacingMessage: string; verdict: Verdict | null; applicationId: string | null
}

interface ChatMessage { role: 'user' | 'atlas'; content: string }

interface Prefs {
  minCompLpa: number; locations: string[]; stages: string[]; dealbreakers: string[]
}

type RightTab = 'skills' | 'market' | 'learning' | 'negotiate'

/* ── Sub-components ──────────────────────────────────────────── */

function ScoreRingMini({ score, size = 52 }: { score: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const color = getScoreColor(score)
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.1} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={size * 0.1} strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - score / 100) }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

function Sparkline({ history }: { history?: SkillHistory[] }) {
  if (!history || history.length < 2) return null
  const data = history.slice(-8).map((h) => ({ v: h.score }))
  return (
    <ResponsiveContainer width={44} height={18}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke="#2DE2C5" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function SkillCheckRow({ match, delay }: { match: SkillMatch; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const color = match.cleared ? '#2DE2C5' : '#f43f5e'
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={visible ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 text-xs"
    >
      {visible ? (
        match.cleared
          ? <Check className="w-3.5 h-3.5 shrink-0" style={{ color }} />
          : <X className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      ) : (
        <Loader2 className="w-3.5 h-3.5 shrink-0 text-[#AEB5E0] animate-spin" />
      )}
      <span className="text-[#AEB5E0]">{match.skill}</span>
      <span className="text-[#666] ml-auto font-mono">{match.candidateScore ?? '?'} / {match.required}</span>
      {visible && (
        <span className="font-semibold" style={{ color }}>
          {match.cleared ? 'Cleared' : 'Below bar'}
        </span>
      )}
    </motion.div>
  )
}

/* ── Constants ───────────────────────────────────────────────── */

const STAGES = ['seed', 'seriesA', 'seriesB', 'seriesC+', 'public']
const DISCOVER: { v: 'open' | 'passive' | 'invisible'; label: string; desc: string; icon: typeof Eye }[] = [
  { v: 'open', label: 'Open', desc: 'Actively looking — Atlas surfaces all matches', icon: Eye },
  { v: 'passive', label: 'Passive', desc: 'Only exceptional matches', icon: ShieldCheck },
  { v: 'invisible', label: 'Invisible', desc: 'Not discoverable — Atlas never engages', icon: EyeOff },
]

const RIGHT_TABS: { id: RightTab; label: string }[] = [
  { id: 'skills', label: 'Skill path' },
  { id: 'market', label: 'Market' },
  { id: 'learning', label: 'Learning' },
  { id: 'negotiate', label: 'Negotiate' },
]

/* ── Main Page ───────────────────────────────────────────────── */

export default function AgentPage() {
  const searchParams = useSearchParams()
  const [handshakes, setHandshakes] = useState<Handshake[]>([])
  const [atlasCtx, setAtlasCtx] = useState<AtlasContext | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [jdMatchDismissed, setJdMatchDismissed] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm] = useState({ targetRole: '', targetLevel: '', targetStage: 'Any', targetLocation: 'Any', targetSalaryLPA: '' })
  const [savingGoal, setSavingGoal] = useState(false)
  const [responding, setResponding] = useState<string | null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const [discoverability, setDiscoverability] = useState<'open' | 'passive' | 'invisible'>('open')
  const [prefs, setPrefs] = useState<Prefs>({ minCompLpa: 0, locations: [], stages: [], dealbreakers: [] })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [locInput, setLocInput] = useState('')
  const [dbInput, setDbInput] = useState('')
  const [showHandshakes, setShowHandshakes] = useState(true)
  const [expandedHs, setExpandedHs] = useState<string | null>(null)
  const [learningSkill, setLearningSkill] = useState<string | null>(null)
  const [learningGoal, setLearningGoal] = useState<string>('proficient')
  const [rightTab, setRightTab] = useState<RightTab>('skills')
  const [negotiateOfferId, setNegotiateOfferId] = useState<string | null>(null)
  const [negotiateOfferData, setNegotiateOfferData] = useState<{ role?: string; company?: string } | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [hsRes, meRes, ctxRes] = await Promise.all([
      fetch('/api/handshakes'),
      fetch('/api/me'),
      fetch('/api/atlas/context'),
    ])
    if (hsRes.ok) setHandshakes((await hsRes.json()).handshakes || [])
    if (meRes.ok) {
      const { user, profile } = await meRes.json()
      if (user?.preferences) setPrefs({
        minCompLpa: user.preferences.minCompLpa || 0,
        locations: user.preferences.locations || [],
        stages: user.preferences.stages || [],
        dealbreakers: user.preferences.dealbreakers || [],
      })
      if (user?.discoverability) setDiscoverability(user.discoverability)
      if (profile?.parsedSkills) setSkills(profile.parsedSkills)
    }
    if (ctxRes.ok) {
      const ctx = await ctxRes.json()
      setAtlasCtx(ctx)
      if (ctx?.careerGoal?.targetRole) {
        setGoalForm({
          targetRole: ctx.careerGoal.targetRole,
          targetLevel: ctx.careerGoal.targetLevel,
          targetStage: ctx.careerGoal.targetStage || 'Any',
          targetLocation: ctx.careerGoal.targetLocation || 'Any',
          targetSalaryLPA: String(ctx.careerGoal.targetSalaryLPA || ''),
        })
      }
      if (ctx?.proactiveInsight) {
        const { skill, score, daysIdle, reason, goalContext } = ctx.proactiveInsight
        let msg = ''
        if (reason === 'required_by_match') {
          msg = `A recruiter match needs **${skill}**, but your score is **${score}**. ${daysIdle && daysIdle > 0 ? `You haven't practiced it in ${daysIdle} days. ` : ''}Strengthen this and I'll push you to the top of the shortlist.`
        } else if (goalContext) {
          msg = `You want to be a **${goalContext}**. Your **${skill}** score is **${score}** — that's the blocking gap${daysIdle && daysIdle > 0 ? `, last practiced ${daysIdle} days ago` : ''}. Start a session to move toward your goal?`
        } else {
          msg = `Your **${skill}** score is **${score}**${daysIdle && daysIdle > 0 ? `, last practiced ${daysIdle} days ago` : ''}. One session today would move the needle.`
        }
        setChatMessages([{ role: 'atlas', content: msg }])
      } else if (ctx?.pendingHandshakes > 0) {
        setChatMessages([{ role: 'atlas', content: `You have **${ctx.pendingHandshakes}** opportunit${ctx.pendingHandshakes > 1 ? 'ies' : 'y'} waiting for your review. Want me to summarize any of them?` }])
      } else if (!ctx?.careerGoal?.targetRole) {
        setChatMessages([{ role: 'atlas', content: 'Tell me where you want to go — set your career goal above and I\'ll build your path from here.' }])
      } else {
        setChatMessages([{ role: 'atlas', content: 'Your profile looks solid. What can I help you with — improving a skill score, understanding a match, or something else?' }])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Handle ?tab=negotiate&offerId=xxx URL params
  useEffect(() => {
    const tab = searchParams.get('tab')
    const offerId = searchParams.get('offerId')
    if (tab === 'negotiate') {
      setRightTab('negotiate')
      if (offerId) {
        setNegotiateOfferId(offerId)
        fetch(`/api/applications/${offerId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d) => {
            if (d?.application) {
              const { jobTitle, recruiterInfo } = d.application
              setNegotiateOfferData({ role: jobTitle || '', company: recruiterInfo?.company || '' })
            }
          })
          .catch(() => {})
      }
    }

    const dismissed = localStorage.getItem('jd_match_alert_dismissed')
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      setJdMatchDismissed(true)
    }
  }, [searchParams])

  function dismissJdMatch() {
    setJdMatchDismissed(true)
    localStorage.setItem('jd_match_alert_dismissed', String(Date.now()))
  }

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault()
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/atlas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: chatMessages }),
      })
      const data = await res.json()
      setChatMessages((prev) => [...prev, { role: 'atlas', content: data.reply || 'Something went wrong.' }])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'atlas', content: 'Connection error. Try again.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  async function respond(hsId: string, action: 'accept' | 'decline') {
    setResponding(hsId)
    try {
      const res = await fetch(`/api/handshakes/${hsId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(action === 'accept' ? 'Connected! The recruiter has been notified.' : 'Declined — Atlas closed it.')
        await load()
      } else {
        toast.error(data.error || 'Failed')
      }
    } finally {
      setResponding(null)
    }
  }

  async function savePrefs() {
    setSavingPrefs(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs, discoverability }),
      })
      if (res.ok) { toast.success('Atlas updated — these now guide every inquiry'); setShowPrefs(false) }
      else toast.error('Failed to save')
    } finally {
      setSavingPrefs(false)
    }
  }

  async function saveGoal() {
    if (!goalForm.targetRole.trim() || !goalForm.targetLevel.trim()) {
      toast.error('Role and level are required')
      return
    }
    setSavingGoal(true)
    try {
      const res = await fetch('/api/me/career-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...goalForm,
          targetSalaryLPA: Number(goalForm.targetSalaryLPA) || 0,
        }),
      })
      if (res.ok) {
        toast.success('Career goal saved — Atlas is updating your path')
        setShowGoalForm(false)
        await load()
      } else {
        toast.error('Failed to save goal')
      }
    } finally {
      setSavingGoal(false)
    }
  }

  const pending = handshakes.filter((h) => h.status === 'surfaced_to_candidate')
  const resolved = handshakes.filter((h) => h.status !== 'surfaced_to_candidate')

  return (
    <div className="h-screen flex overflow-hidden bg-[#05060F] text-white">

      {/* ── LEFT PANEL — Chat (full on mobile, 42% on desktop) ── */}
      <div className="flex-1 lg:flex-none lg:w-[42%] flex flex-col border-r border-white/[0.05]">

        {/* Header */}
        <div className="shrink-0 h-14 px-5 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[#AEB5E0] hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">Dashboard</span>
            </Link>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#2DE2C5] flex items-center justify-center shadow-[0_0_10px_rgba(45,226,197,0.3)]">
                <Code2 className="w-3.5 h-3.5 text-[#05060F]" />
              </div>
              <span className="text-sm font-semibold">Atlas</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Discoverability pill */}
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${discoverability === 'open' ? 'bg-[#2DE2C5] animate-pulse' : discoverability === 'passive' ? 'bg-[#f59e0b]' : 'bg-[#555]'}`} />
              <span className="text-[11px] text-[#AEB5E0] capitalize hidden sm:inline">{discoverability}</span>
            </div>
            <button onClick={() => setShowPrefs(true)} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-[#AEB5E0] hover:text-white">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {/* JD match alert */}
          {atlasCtx?.jdMatchAlert && !jdMatchDismissed && (
            <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.04] p-4 relative">
              <button onClick={dismissJdMatch} className="absolute top-3 right-3 text-[#888FC0] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm leading-relaxed">
                    You recently generated a resume for{' '}
                    <strong className="text-white">{atlasCtx.jdMatchAlert.jobTitle}</strong>. Your match score is{' '}
                    <strong className="text-[#f59e0b]">{atlasCtx.jdMatchAlert.matchScore}%</strong>. The biggest gap is{' '}
                    <strong className="text-white">{atlasCtx.jdMatchAlert.topGap}</strong>.
                  </p>
                  <a href={atlasCtx.jdMatchAlert.sessionLink}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#2DE2C5] hover:text-[#1fb89e] transition-colors">
                    Practice it now <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </a>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'atlas' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2DE2C5] to-[#3FC5F0] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#05060F]" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2DE2C5]/15 text-white border border-[#2DE2C5]/20 rounded-tr-sm'
                    : 'bg-[#0D1020] border border-white/[0.06] rounded-tl-sm'
                }`}>
                  {msg.content.split('**').map((part, j) =>
                    j % 2 === 1
                      ? <strong key={j} className="font-semibold text-[#2DE2C5]">{part}</strong>
                      : <span key={j}>{part}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {chatLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2DE2C5] to-[#3FC5F0] flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#05060F]" />
              </div>
              <div className="bg-[#0D1020] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#2DE2C5]/50"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="shrink-0 border-t border-white/[0.05] px-4 py-3">
          <form onSubmit={sendChat} className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Atlas anything about your profile…"
              disabled={chatLoading}
              className="flex-1 bg-[#0D1020] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="w-9 h-9 rounded-xl bg-[#2DE2C5] text-[#05060F] flex items-center justify-center shrink-0 hover:bg-[#1fb89e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Opportunities section (collapsible) */}
        <div className="shrink-0 border-t border-white/[0.05] bg-[#080A18] max-h-[42vh] overflow-y-auto">
          <button
            onClick={() => setShowHandshakes(!showHandshakes)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider">Opportunities</span>
              {pending.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 font-semibold">
                  {pending.length} pending
                </span>
              )}
            </div>
            {showHandshakes ? <ChevronDown className="w-4 h-4 text-[#888FC0]" /> : <ChevronUp className="w-4 h-4 text-[#888FC0]" />}
          </button>

          {showHandshakes && (
            <div className="px-4 pb-4 space-y-3">
              {loading ? (
                <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/[0.03]" />)}</div>
              ) : pending.length === 0 && resolved.length === 0 ? (
                <div className="py-5 text-center">
                  <ShieldCheck className="w-7 h-7 text-[#2DE2C5]/30 mx-auto mb-2" />
                  <p className="text-xs text-[#AEB5E0]">No opportunities yet — Atlas is watching for genuine matches.</p>
                </div>
              ) : (
                <>
                  {pending.map((h) => (
                    <motion.div key={h._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/[0.08] bg-[#0D1020] overflow-hidden">
                      <div
                        className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => setExpandedHs(expandedHs === h._id ? null : h._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold">{h.roleTitle}</h3>
                              {h.blind ? (
                                <Badge className="bg-[#8B7CF8]/10 text-[#8B7CF8] border-[#8B7CF8]/20 text-[9px]">Company hidden</Badge>
                              ) : h.company ? (
                                <span className="text-xs text-[#AEB5E0]">@ {h.company}</span>
                              ) : null}
                            </div>
                            {h.surfacingMessage && (
                              <p className="text-xs text-[#AEB5E0] mt-0.5 italic line-clamp-1">{h.surfacingMessage}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {h.verdict && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20">
                                <Sparkles className="w-2.5 h-2.5 text-[#2DE2C5]" />
                                <span className="text-xs font-mono text-[#2DE2C5]">{h.verdict.score}%</span>
                              </div>
                            )}
                            {expandedHs === h._id ? <ChevronUp className="w-3.5 h-3.5 text-[#888FC0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#888FC0]" />}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedHs === h._id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-white/[0.05]"
                          >
                            <div className="p-3.5 space-y-3">
                              {h.surfacingMessage && (
                                <div className="flex gap-2 p-2.5 rounded-lg bg-[#2DE2C5]/[0.04] border border-[#2DE2C5]/10">
                                  <Sparkles className="w-3 h-3 text-[#2DE2C5] shrink-0 mt-0.5" />
                                  <p className="text-xs text-[#ECF0FF] leading-relaxed">{h.surfacingMessage}</p>
                                </div>
                              )}
                              {h.verdict?.skillMatches && h.verdict.skillMatches.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold mb-1">Atlas checked</div>
                                  {h.verdict.skillMatches.map((m, idx) => (
                                    <SkillCheckRow key={m.skill} match={m} delay={idx * 150} />
                                  ))}
                                </div>
                              )}
                              {(!h.verdict?.skillMatches || h.verdict.skillMatches.length === 0) && h.verdict && (
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { label: 'Tech bar', ok: h.verdict.techBarCleared },
                                    { label: 'Comp range', ok: h.verdict.compOverlap },
                                    { label: 'Location', ok: h.verdict.locationMatch },
                                    { label: 'Stage', ok: h.verdict.stageMatch },
                                  ].map(({ label, ok }) => (
                                    <div key={label} className="flex items-center gap-1.5 text-xs">
                                      {ok ? <Check className="w-3 h-3 text-[#2DE2C5]" /> : <X className="w-3 h-3 text-[#f43f5e]" />}
                                      <span className="text-[#AEB5E0]">{label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 pt-1">
                                <Button
                                  onClick={() => respond(h._id, 'accept')}
                                  disabled={responding === h._id}
                                  className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold h-8 text-xs"
                                >
                                  {responding === h._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Interested</>}
                                </Button>
                                <Button
                                  onClick={() => respond(h._id, 'decline')}
                                  disabled={responding === h._id}
                                  variant="outline"
                                  className="flex-1 border-white/[0.08] text-[#AEB5E0] hover:text-white h-8 text-xs"
                                >
                                  <X className="w-3 h-3 mr-1" /> Pass
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {resolved.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold px-1">History</div>
                      {resolved.map((h) => (
                        <div key={h._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium">{h.roleTitle}</span>
                            {h.company && <span className="text-[11px] text-[#AEB5E0]"> @ {h.company}</span>}
                          </div>
                          {h.status === 'connected' && h.applicationId ? (
                            <Link href={`/messages/${h.applicationId}`}>
                              <Button size="sm" className="h-6 text-[10px] bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 hover:bg-[#2DE2C5]/20 px-2">
                                <MessageSquare className="w-2.5 h-2.5 mr-1" /> Thread
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-[10px] text-[#888FC0] capitalize">{h.status.replace(/_/g, ' ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Skills & tools (desktop only) ── */}
      <div className="hidden lg:flex flex-col flex-1 overflow-hidden">

        {/* Career goal card */}
        <div className="shrink-0 px-6 py-3 border-b border-white/[0.05]">
          {atlasCtx?.careerGoal?.targetRole && !showGoalForm ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[#2DE2C5] shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-[#2DE2C5]">{atlasCtx.careerGoal.targetLevel} {atlasCtx.careerGoal.targetRole}</span>
                  {atlasCtx.careerGoal.targetStage && atlasCtx.careerGoal.targetStage !== 'Any' && (
                    <span className="text-[11px] text-[#888FC0] ml-1.5">· {atlasCtx.careerGoal.targetStage}</span>
                  )}
                  {atlasCtx.careerGoal.targetSalaryLPA > 0 && (
                    <span className="text-[11px] text-[#888FC0] ml-1.5">· ₹{atlasCtx.careerGoal.targetSalaryLPA}L</span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowGoalForm(true)} className="p-1 rounded-md text-[#888FC0] hover:text-white hover:bg-white/[0.05] transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ) : showGoalForm ? (
            <div className="space-y-2">
              <div className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold">Set career goal</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={goalForm.targetRole}
                  onChange={(e) => setGoalForm({ ...goalForm, targetRole: e.target.value })}
                  placeholder="Target role (e.g. Frontend Engineer)"
                  className="col-span-2 bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                />
                <input
                  value={goalForm.targetLevel}
                  onChange={(e) => setGoalForm({ ...goalForm, targetLevel: e.target.value })}
                  placeholder="Level (e.g. L4, Senior, Staff)"
                  className="bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                />
                <input
                  value={goalForm.targetStage}
                  onChange={(e) => setGoalForm({ ...goalForm, targetStage: e.target.value })}
                  placeholder="Stage (e.g. Series B, Any)"
                  className="bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                />
                <input
                  value={goalForm.targetLocation}
                  onChange={(e) => setGoalForm({ ...goalForm, targetLocation: e.target.value })}
                  placeholder="Location / Remote"
                  className="bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                />
                <input
                  type="number"
                  value={goalForm.targetSalaryLPA}
                  onChange={(e) => setGoalForm({ ...goalForm, targetSalaryLPA: e.target.value })}
                  placeholder="Salary LPA (₹)"
                  className="bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveGoal} disabled={savingGoal} className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold h-7 text-xs">
                  {savingGoal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save goal'}
                </Button>
                {atlasCtx?.careerGoal?.targetRole && (
                  <Button onClick={() => setShowGoalForm(false)} variant="outline" className="border-white/[0.08] text-[#AEB5E0] h-7 text-xs">
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowGoalForm(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-dashed border-[#2DE2C5]/20 hover:border-[#2DE2C5]/40 hover:bg-[#2DE2C5]/[0.03] transition-all text-left"
            >
              <Target className="w-4 h-4 text-[#2DE2C5]/50 shrink-0" />
              <div>
                <div className="text-xs font-medium text-[#2DE2C5]/70">Set your career goal</div>
                <div className="text-[11px] text-[#888FC0]">Tell Atlas where you want to go — it will build your path</div>
              </div>
            </button>
          )}
        </div>

        {/* Skill rings row */}
        <div className="shrink-0 px-6 py-4 border-b border-white/[0.05]">
          <div className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold mb-3">Top skills</div>
          {loading ? (
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-28 rounded-xl bg-white/[0.03]" />)}
            </div>
          ) : skills.length === 0 ? (
            <p className="text-xs text-[#888FC0]">No skills yet — complete an interview session to see your scores here.</p>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {skills.map((skill) => {
                const color = getScoreColor(skill.proofScore)
                return (
                  <div key={skill.name} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors min-w-0">
                    <div className="relative shrink-0">
                      <ScoreRingMini score={skill.proofScore} size={44} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold font-mono" style={{ color }}>{skill.proofScore}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate max-w-[72px]">{skill.name}</div>
                      {skill.scoreHistory && skill.scoreHistory.length >= 2 && (
                        <Sparkline history={skill.scoreHistory} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-white/[0.05]">
          {RIGHT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                rightTab === tab.id
                  ? 'text-[#2DE2C5] border-[#2DE2C5]'
                  : 'text-[#AEB5E0] border-transparent hover:text-white hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className={rightTab === 'skills' ? '' : 'hidden'}>
            <SkillUnlockPath
              onStartSession={(skill, format) => {
                setLearningSkill(skill)
                window.location.href = `/interview/new?skill=${encodeURIComponent(skill)}&format=${format}`
              }}
            />
            <MemoryInsights />
            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <Link
                href="/briefs"
                className="flex items-center gap-2 text-xs text-white/30 hover:text-[#8B7CF8] transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF8]/50" />
                View weekly brief archive
              </Link>
            </div>
          </div>

          <div className={rightTab === 'market' ? '' : 'hidden'}>
            <MarketFeed />
          </div>

          <div className={rightTab === 'learning' ? '' : 'hidden'}>
            {skills.length === 0 ? (
              <p className="text-xs text-[#888FC0]">Complete an interview session to unlock learning paths.</p>
            ) : (
              <div className="space-y-4">
                {/* Skill picker — all skills */}
                <div>
                  <div className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold mb-2">Choose a skill</div>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <button key={s.name} onClick={() => setLearningSkill(s.name)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          learningSkill === s.name
                            ? 'border-[#A78BFA]/50 bg-[#A78BFA]/10 text-[#A78BFA]'
                            : 'border-white/[0.08] text-[#AEB5E0] hover:border-[#2DE2C5]/40 hover:text-[#2DE2C5]'
                        }`}>
                        {s.name}
                        <span className="ml-1.5 font-mono opacity-60">{s.proofScore}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal selector */}
                <div>
                  <div className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold mb-2">Target goal</div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'proficient', label: 'Proficient (70+)' },
                      { id: 'expert', label: 'Expert (85+)' },
                      { id: 'faang', label: 'FAANG-ready' },
                    ].map((g) => (
                      <button key={g.id} onClick={() => setLearningGoal(g.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          learningGoal === g.id
                            ? 'border-[#2DE2C5]/50 bg-[#2DE2C5]/10 text-[#2DE2C5]'
                            : 'border-white/[0.08] text-[#AEB5E0] hover:border-white/20'
                        }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {learningSkill ? (
                  <LearningPath skill={learningSkill} goal={learningGoal} />
                ) : (
                  <p className="text-xs text-[#888FC0]">Select a skill above to generate your learning plan.</p>
                )}
              </div>
            )}
          </div>

          <div className={rightTab === 'negotiate' ? '' : 'hidden'}>
            {negotiateOfferData && (
              <div className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#2DE2C5]" />
                  <span className="text-xs font-semibold text-[#2DE2C5]">Offer detected</span>
                </div>
                <p className="text-sm text-[#AEB5E0] leading-relaxed">
                  I can see you have an offer for{' '}
                  {negotiateOfferData.role && <strong className="text-white">{negotiateOfferData.role}</strong>}
                  {negotiateOfferData.company && <> at <strong className="text-white">{negotiateOfferData.company}</strong></>}.
                  {' '}Tell me the offered salary and I&apos;ll help you evaluate it and prepare your counter.
                </p>
              </div>
            )}
            <NegotiationCoach />
          </div>
        </div>
      </div>

      {/* Mobile: skills button to open right panel as drawer */}
      <div className="lg:hidden fixed bottom-20 right-4">
        <button
          onClick={() => setRightTab(rightTab === 'skills' ? 'market' : 'skills')}
          className="w-12 h-12 rounded-full bg-[#2DE2C5] text-[#05060F] flex items-center justify-center shadow-lg"
        >
          <TrendingUp className="w-5 h-5" />
        </button>
      </div>

      {/* ── Preferences drawer ───────────────────────────────── */}
      <AnimatePresence>
        {showPrefs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowPrefs(false)}>
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D1020] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#2DE2C5]" /> What Atlas enforces
                </h3>
                <button onClick={() => setShowPrefs(false)} className="text-[#AEB5E0] hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="mb-5">
                <label className="text-xs text-[#AEB5E0] mb-2 block">Discoverability</label>
                <div className="space-y-1.5">
                  {DISCOVER.map(({ v, label, desc, icon: Icon }) => (
                    <button key={v} onClick={() => setDiscoverability(v)}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${discoverability === v ? 'border-[#2DE2C5]/40 bg-[#2DE2C5]/5' : 'border-white/[0.06] hover:border-white/[0.12]'}`}>
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${discoverability === v ? 'text-[#2DE2C5]' : 'text-[#AEB5E0]'}`} />
                      <div>
                        <div className={`text-sm font-medium ${discoverability === v ? 'text-[#2DE2C5]' : 'text-white'}`}>{label}</div>
                        <div className="text-[11px] text-[#AEB5E0]">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs text-[#AEB5E0] mb-2 flex items-center gap-1.5 block">
                  <Zap className="w-3.5 h-3.5 text-[#2DE2C5]" /> Minimum comp (₹ LPA)
                </label>
                <input type="number" value={prefs.minCompLpa || ''} onChange={(e) => setPrefs({ ...prefs, minCompLpa: Number(e.target.value) })}
                  placeholder="e.g. 45" className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40" />
              </div>

              <div className="mb-5">
                <label className="text-xs text-[#AEB5E0] mb-2 flex items-center gap-1.5 block">
                  <MapPin className="w-3.5 h-3.5 text-[#3FC5F0]" /> Acceptable locations
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {prefs.locations.map((l) => (
                    <span key={l} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#3FC5F0]/10 text-[#3FC5F0] border border-[#3FC5F0]/20">
                      {l}<button onClick={() => setPrefs({ ...prefs, locations: prefs.locations.filter((x) => x !== l) })}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <input value={locInput} onChange={(e) => setLocInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && locInput.trim()) { setPrefs({ ...prefs, locations: [...prefs.locations, locInput.trim()] }); setLocInput('') } }}
                  placeholder="Bangalore, remote… (Enter to add)" className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40" />
              </div>

              <div className="mb-5">
                <label className="text-xs text-[#AEB5E0] mb-2 flex items-center gap-1.5 block">
                  <Building2 className="w-3.5 h-3.5 text-[#8B7CF8]" /> Company stages
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((s) => {
                    const on = prefs.stages.includes(s)
                    return (
                      <button key={s} onClick={() => setPrefs({ ...prefs, stages: on ? prefs.stages.filter((x) => x !== s) : [...prefs.stages, s] })}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${on ? 'border-[#8B7CF8]/40 bg-[#8B7CF8]/10 text-[#8B7CF8]' : 'border-white/[0.08] text-[#AEB5E0] hover:text-white'}`}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs text-[#AEB5E0] mb-2 block">Dealbreakers</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {prefs.dealbreakers.map((d) => (
                    <span key={d} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20">
                      {d}<button onClick={() => setPrefs({ ...prefs, dealbreakers: prefs.dealbreakers.filter((x) => x !== d) })}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <input value={dbInput} onChange={(e) => setDbInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && dbInput.trim()) { setPrefs({ ...prefs, dealbreakers: [...prefs.dealbreakers, dbInput.trim()] }); setDbInput('') } }}
                  placeholder="crypto, heavy on-call… (Enter to add)" className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40" />
              </div>

              <Button onClick={savePrefs} disabled={savingPrefs} className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
                {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save — Atlas will enforce these'}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
