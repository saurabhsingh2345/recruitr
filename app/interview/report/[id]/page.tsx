'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, AlertCircle, BookOpen, TrendingUp, ArrowRight,
  Code2, ChevronLeft, Loader2, MessageSquare, BarChart2, Bot, User,
  Copy, Check, ExternalLink, Sparkles, ChevronDown, Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { toast } from 'sonner'
import { FormattedMessage } from '@/components/interview/FormattedMessage'

interface Message {
  role: 'ai' | 'user'
  content: string
}

interface ScoreUpdate {
  skill: string
  before: number
  after: number
  delta: number
  isFirstScore: boolean
}

interface Report {
  format: string
  targetSkill: string
  username: string
  scores: {
    overall: number
    breakdown: Record<string, number>
    delta: Record<string, number>
  }
  insightReport: {
    strengths: string[]
    gaps: string[]
    studyRecommendations: string[]
    idealAnswers: Array<{ question: string; answer: string }>
    aiVerdict?: string
    generatedAt: string
  }
  completedAt: string
  scoreUpdate: ScoreUpdate | null
  messages?: Message[]
}

/* ── Score ring ───────────────────────────────────────────── */

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = size * 0.4
  const circ = 2 * Math.PI * r
  const color = getScoreColor(score)
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.07} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - score / 100) }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  )
}

/* ── Copy button ──────────────────────────────────────────── */

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground/60 hover:text-foreground transition-all font-medium">
      {copied ? <Check className="w-3.5 h-3.5 text-[#2DE2C5]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

/* ── First-score activation screen ───────────────────────── */

function FirstScoreScreen({
  skill, score, username, onDismiss,
}: {
  skill: string; score: number; username: string; onDismiss: () => void
}) {
  const color = getScoreColor(score)
  const label = getScoreLabel(score)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const badgeUrl = `${origin}/api/badge/${username}/${encodeURIComponent(skill)}`
  const proofUrl = `${origin}/proof/${username}/${encodeURIComponent(skill)}`
  // Linked image — clicking the badge in a README goes to the proof page
  const markdown = `[![${skill} ${score}](${badgeUrl})](${proofUrl})`

  // Floating particle refs for ambient animation
  const particles = Array.from({ length: 12 }, (_, i) => i)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-hidden"
    >
      {/* Ambient particles */}
      {particles.map((i) => (
        <motion.div key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color + '60', left: `${8 + i * 7.5}%`, top: '100%' }}
          animate={{ top: '-5%', opacity: [0, 0.8, 0] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
        />
      ))}

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}10, transparent 70%)` }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-6">

        {/* Label */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-1 rounded-full border mb-8"
          style={{ borderColor: color + '40', backgroundColor: color + '10' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color }}>First score unlocked</span>
        </motion.div>

        {/* Score ring */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
          className="relative mb-6">
          <ScoreRing score={score} size={160} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold font-mono" style={{ color }}>{score}</span>
            <span className="text-sm text-foreground/40 font-medium">/100</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h1 className="text-2xl font-bold mb-1">{skill}</h1>
          <p className="text-foreground/50 text-sm mb-1">
            <span className="font-semibold" style={{ color }}>{label}</span>
            {' '}· Proof-of-skill verified by Intervue
          </p>
        </motion.div>

        {/* Badge preview + copy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="w-full mt-8 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] p-4">
          <div className="text-xs text-foreground/35 font-semibold uppercase tracking-wider mb-3 text-left">
            Your badge — paste it anywhere
          </div>

          {/* Live badge image */}
          <div className="flex items-center justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt={`${skill} ${score}`} className="h-8" />
          </div>

          {/* Markdown snippet */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-foreground/[0.05] font-mono text-xs text-foreground/50 mb-3">
            <span className="flex-1 truncate">{markdown}</span>
            <CopyButton text={markdown} label="Copy markdown" />
          </div>

          <div className="flex gap-2">
            <a href={proofUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors py-1.5">
              <ExternalLink className="w-3.5 h-3.5" />Proof page
            </a>
            <a href={`/p/${username}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors py-1.5">
              <ExternalLink className="w-3.5 h-3.5" />Full profile
            </a>
          </div>
        </motion.div>

        {/* Dismiss */}
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          onClick={onDismiss}
          className="mt-6 flex items-center gap-1.5 text-sm text-foreground/35 hover:text-foreground/60 transition-colors">
          View full report <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ── "Almost there" nudge (score < 60, first session) ────── */

function NearlyThereCard({ score, skill }: { score: number; skill: string }) {
  const needed = 60 - score
  return (
    <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.04] p-4 flex items-start gap-3 mb-6">
      <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0 mt-0.5">
        <TrendingUp className="w-4 h-4 text-[#f59e0b]" />
      </div>
      <div>
        <div className="text-sm font-semibold mb-0.5">
          {needed} more points unlock your shareable {skill} badge
        </div>
        <p className="text-xs text-foreground/45 leading-relaxed">
          Scores of 60+ are worth putting in a GitHub README. Do one more session —
          the gap analysis below shows exactly what to study.
        </p>
        <Link href={`/interview/new?skill=${encodeURIComponent(skill)}`} className="mt-2 inline-block">
          <Button size="sm" className="btn-supernova font-semibold text-xs h-7 px-3 mt-1">
            Practice again → get to 60
          </Button>
        </Link>
      </div>
    </div>
  )
}

/* ── Score update banner ─────────────────────────────────── */

function ScoreUpdateBanner({ update }: { update: ScoreUpdate }) {
  const color = getScoreColor(update.after)
  if (update.delta <= 0) return null
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-4 flex items-center gap-3 mb-6"
      style={{ borderColor: color + '30', backgroundColor: color + '08' }}>
      <TrendingUp className="w-4 h-4 shrink-0" style={{ color }} />
      <div className="text-sm">
        <span className="font-semibold">{update.skill}</span>
        <span className="text-foreground/50 mx-1.5">ProofScore</span>
        <span className="font-mono text-foreground/50">{update.before}</span>
        <span className="mx-1.5 text-foreground/30">→</span>
        <span className="font-mono font-bold" style={{ color }}>{update.after}</span>
        <span className="ml-1.5 text-xs font-semibold" style={{ color }}>+{update.delta} pts</span>
      </div>
    </motion.div>
  )
}

/* ── Main page ───────────────────────────────────────────── */

export default function InterviewReportPage() {
  const params = useParams()
  const sessionId = params.id as string
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'report' | 'transcript'>('report')
  const [showFirstScore, setShowFirstScore] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [isPro, setIsPro] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch(`/api/interview/${sessionId}/share`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.shareUrl) {
        setShareUrl(data.shareUrl)
        navigator.clipboard.writeText(data.shareUrl).catch(() => {})
        toast.success('Share link copied to clipboard!')
      } else if (res.status === 403) {
        toast.error('Share links require Intervue Pro')
      } else {
        toast.error(data.error || 'Failed to create share link')
      }
    } finally {
      setSharing(false)
    }
  }

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.tier === 'pro' && d?.status === 'active') setIsPro(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/interview/${sessionId}/report`)
        if (res.ok) {
          const data = await res.json()
          setReport(data)
          // Show the celebration if first score ≥ 60
          if (data.scoreUpdate?.isFirstScore && data.scoreUpdate?.after >= 60) {
            setShowFirstScore(true)
          }
        }
      } catch {
        // fallback for dev
        setReport({
          format: 'coding', targetSkill: 'React', username: 'dev',
          scores: {
            overall: 74,
            breakdown: { technical_depth: 78, problem_solving: 72, communication: 76, code_quality: 70 },
            delta: { React: 9 },
          },
          insightReport: {
            strengths: ['Strong understanding of React reconciliation', 'Clear communication of trade-offs', 'Good instinct for edge cases'],
            gaps: ['Could deepen knowledge of React memory model', 'Missed opportunity to discuss context propagation'],
            studyRecommendations: ['Study the React reconciler deep-dive', 'Practice context.useMemo patterns', 'Read the concurrent rendering RFC'],
            idealAnswers: [
              { question: 'What is the React reconciliation algorithm?', answer: 'React uses a fiber architecture to perform diffing in O(n) time by making three heuristic assumptions: elements of different types produce different trees; the developer can hint at stability with keys; and children diffed by key are stable. The fiber represents a unit of work that can be paused and resumed.' },
            ],
            generatedAt: new Date().toISOString(),
          },
          completedAt: new Date().toISOString(),
          scoreUpdate: { skill: 'React', before: 0, after: 74, delta: 74, isFirstScore: true },
          messages: [],
        })
        // Show for dev testing
        setShowFirstScore(true)
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [sessionId])

  function dismissFirstScore() {
    setShowFirstScore(false)
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#2DE2C5] animate-spin mx-auto mb-3" />
          <div className="text-sm text-foreground/40">Generating your insight report…</div>
        </div>
      </div>
    )
  }

  if (!report) return null

  const overall = report.scores?.overall || 0
  const scoreColor = getScoreColor(overall)
  const breakdown = Object.entries(report.scores?.breakdown || {})
  const messages = report.messages || []
  const idealAnswers = report.insightReport?.idealAnswers || []
  const isFirstSessionBelow60 = report.scoreUpdate?.isFirstScore && report.scoreUpdate?.after < 60

  return (
    <>
      {/* First-score celebration overlay */}
      <AnimatePresence>
        {showFirstScore && report.scoreUpdate && report.username && (
          <FirstScoreScreen
            skill={report.scoreUpdate.skill}
            score={report.scoreUpdate.after}
            username={report.username}
            onDismiss={dismissFirstScore}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen" ref={reportRef}>
        <nav className="relative z-10 border-b border-foreground/[0.06] px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            {isPro && (
              shareUrl ? (
                <button
                  onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Copied!') }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 hover:bg-[#2DE2C5]/20 transition-colors"
                >
                  <Check className="w-3 h-3" /> Link copied
                </button>
              ) : (
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground/[0.05] text-foreground/50 hover:text-foreground/80 border border-foreground/[0.08] transition-colors disabled:opacity-50"
                >
                  {sharing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                  Share report
                </button>
              )
            )}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#2DE2C5] flex items-center justify-center">
                <Code2 className="w-3 h-3 text-[#05060F]" />
              </div>
              <span className="font-bold text-sm">intervue</span>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/[0.08] bg-foreground/[0.03] text-xs text-foreground/40 mb-4">
              Session complete
            </div>
            <h1 className="text-3xl font-bold mb-2">Interview Report</h1>
            <p className="text-foreground/40 text-sm">
              {report.format?.replace('_', ' ')} · {report.targetSkill} ·{' '}
              {new Date(report.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] w-fit mx-auto">
            {[
              { id: 'report', label: 'Report', icon: BarChart2 },
              { id: 'transcript', label: 'Transcript', icon: MessageSquare },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id as 'report' | 'transcript')}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id ? 'bg-[#2DE2C5]/15 text-[#2DE2C5]' : 'text-foreground/40 hover:text-foreground/70'
                }`}>
                <Icon className="w-3.5 h-3.5" />{label}
                {id === 'transcript' && messages.length > 0 && (
                  <span className="text-[10px] text-foreground/30 font-mono">{messages.length}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'report' ? (
            <div className="space-y-6">
              {/* Score update banner */}
              {report.scoreUpdate && !report.scoreUpdate.isFirstScore && (
                <ScoreUpdateBanner update={report.scoreUpdate} />
              )}

              {/* "Almost there" nudge for first session below 60 */}
              {isFirstSessionBelow60 && (
                <NearlyThereCard score={report.scoreUpdate!.after} skill={report.targetSkill} />
              )}

              {/* Overall score */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="node-panel p-6 flex items-center gap-8">
                <div className="relative w-24 h-24 shrink-0">
                  <ScoreRing score={overall} size={96} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>{overall}</span>
                    <span className="text-[10px] text-foreground/40">/100</span>
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-1">{getScoreLabel(overall)}</div>
                  <p className="text-sm text-foreground/40 mb-3">Overall score · {report.format?.replace('_', ' ')}</p>
                  {Object.entries(report.scores?.delta || {}).map(([skill, delta]) => (
                    <div key={skill} className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-[#2DE2C5]" />
                      <span className="text-sm">
                        <span className="text-[#2DE2C5] font-medium">+{delta} pts</span>
                        <span className="text-foreground/40"> on {skill} proof score</span>
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Breakdown */}
              {breakdown.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="node-panel p-6">
                  <h2 className="font-semibold mb-4">Score Breakdown</h2>
                  <div className="space-y-3">
                    {breakdown.map(([key, score]) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="text-sm text-foreground/40 w-40 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="flex-1 h-2 bg-foreground/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${score}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full" style={{ backgroundColor: getScoreColor(score) }}
                          />
                        </div>
                        <span className="text-sm font-mono w-10 text-right" style={{ color: getScoreColor(score) }}>{score}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Strengths */}
              {report.insightReport?.strengths?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="node-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-[#2DE2C5]" />
                    <h2 className="font-semibold">What you did well</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {report.insightReport.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/55">
                        <span className="text-[#2DE2C5] mt-0.5 shrink-0">·</span>{s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Gaps */}
              {report.insightReport?.gaps?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="node-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                    <h2 className="font-semibold">Areas to improve</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {report.insightReport.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/55">
                        <span className="text-[#f59e0b] mt-0.5 shrink-0">·</span>{g}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Ideal answers — the most instructive part */}
              {idealAnswers.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="node-panel p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-[#8B7CF8]" />
                    <h2 className="font-semibold">What an expert would say</h2>
                  </div>
                  <p className="text-xs text-foreground/35 mb-4">Model answers for the questions asked in this session</p>
                  <div className="space-y-5">
                    {idealAnswers.map(({ question, answer }, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge className="bg-[#8B7CF8]/10 text-[#8B7CF8] border-[#8B7CF8]/20 text-[10px] shrink-0 mt-0.5">Q{i + 1}</Badge>
                          <p className="text-sm text-foreground/55 italic leading-relaxed">"{question}"</p>
                        </div>
                        <div className="ml-9 p-3 rounded-lg bg-[#8B7CF8]/[0.04] border border-[#8B7CF8]/10">
                          <p className="text-sm text-foreground/70 leading-relaxed">{answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Study recommendations */}
              {report.insightReport?.studyRecommendations?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="node-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-4 h-4 text-[#3FC5F0]" />
                    <h2 className="font-semibold">Study recommendations</h2>
                  </div>
                  <ol className="space-y-2.5">
                    {report.insightReport.studyRecommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/55">
                        <Badge className="bg-[#3FC5F0]/10 text-[#3FC5F0] border-[#3FC5F0]/20 text-[10px] px-1.5 min-w-5 justify-center mt-0.5 shrink-0">
                          {i + 1}
                        </Badge>
                        {r}
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}

              {/* Badge CTA at bottom (for scores ≥ 60, non-first sessions or dismissed overlay) */}
              {!showFirstScore && report.username && overall >= 60 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="node-panel p-5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#2DE2C5]/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#2DE2C5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-0.5">Share your {report.targetSkill} score</div>
                    <div className="font-mono text-[11px] text-foreground/35 truncate">
                      {typeof window !== 'undefined'
                        ? `[![${report.targetSkill} ${overall}](…/badge/…)](…/proof/…)`
                        : ''}
                    </div>
                  </div>
                  <CopyButton
                    text={`[![${report.targetSkill} ${overall}](${typeof window !== 'undefined' ? window.location.origin : ''}/api/badge/${report.username}/${encodeURIComponent(report.targetSkill)})](${typeof window !== 'undefined' ? window.location.origin : ''}/proof/${report.username}/${encodeURIComponent(report.targetSkill)})`}
                    label="Copy badge"
                  />
                </motion.div>
              )}
            </div>
          ) : (
            /* Transcript tab */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-10 text-center">
                  <MessageSquare className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-foreground/40">Transcript not available for this session.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.015] p-5 space-y-4">
                  <div className="text-xs text-foreground/20 text-center">— Start of interview —</div>
                  {messages.map((msg, i) => {
                    const isAI = msg.role === 'ai'
                    return (
                      <div key={i} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
                        <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                          isAI ? 'bg-[#2DE2C5]/15 text-[#2DE2C5]' : 'bg-[#8B7CF8]/15 text-[#8B7CF8]'
                        }`}>
                          {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                          isAI
                            ? 'bg-foreground/[0.04] rounded-tl-sm border border-foreground/[0.06]'
                            : 'bg-[#8B7CF8]/10 rounded-tr-sm border border-[#8B7CF8]/20'
                        }`}>
                          <div className="text-[9px] font-medium mb-1 opacity-40">{isAI ? 'Interviewer' : 'You'}</div>
                          <FormattedMessage content={msg.content} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="text-xs text-foreground/20 text-center">— End of interview —</div>
                </div>
              )}
            </motion.div>
          )}

          {/* Footer CTAs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full border-foreground/[0.1] text-foreground/40 hover:text-foreground">
                Back to dashboard
              </Button>
            </Link>
            <Link href={`/interview/new${report.targetSkill ? `?skill=${encodeURIComponent(report.targetSkill)}` : ''}`}
              className="flex-1">
              <Button className="w-full btn-supernova font-semibold">
                Practice again <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  )
}
