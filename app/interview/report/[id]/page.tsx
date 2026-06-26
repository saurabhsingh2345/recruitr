'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, AlertCircle, BookOpen, TrendingUp, ArrowRight,
  Code2, ChevronLeft, Loader2, MessageSquare, BarChart2, Bot, User,
  Copy, Check, ExternalLink, Sparkles, ChevronDown, Share2,
  Target, Zap, BarChart, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { toast } from 'sonner'
import { FormattedMessage } from '@/components/interview/FormattedMessage'
import { getTrackById } from '@/lib/data/companyTracks'

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

interface GapWithStep {
  gap: string
  nextStep: string
}

interface NextSessionRec {
  format: string
  skill: string
  reason: string
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
    gapsWithNextSteps?: GapWithStep[]
    studyRecommendations: string[]
    idealAnswers: Array<{ question: string; answer: string }>
    aiVerdict?: string
    nextSessionRec?: NextSessionRec | null
    progressionSignal?: string
    specializationImpact?: string
    linkedInDraft?: string
    generatedAt: string
  }
  completedAt: string
  scoreUpdate: ScoreUpdate | null
  companyMode?: { company: string; jdSnippet: string; style: string } | null
  metadata?: { companyTrackId?: string; roundIndex?: number } | null
  messages?: Message[]
  cohortPercentile?: number
  codeSubmissions?: Array<{ language: string; code: string; judge0Output: string; codeScore: number | null; timestamp: string }>
}

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Analysis',
  pm_case: 'PM Case Study',
  design_critique: 'Design Critique',
  ops_case: 'Ops / Program Mgmt',
  sales_discovery: 'Sales Discovery',
}

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
  const markdown = `[![${skill} ${score}](${badgeUrl})](${proofUrl})`
  const particles = Array.from({ length: 12 }, (_, i) => i)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-hidden"
    >
      {particles.map((i) => (
        <motion.div key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color + '60', left: `${8 + i * 7.5}%`, top: '100%' }}
          animate={{ top: '-5%', opacity: [0, 0.8, 0] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
        />
      ))}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}10, transparent 70%)` }} />
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-6">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-1 rounded-full border mb-8"
          style={{ borderColor: color + '40', backgroundColor: color + '10' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color }}>First score unlocked</span>
        </motion.div>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
          className="relative mb-6">
          <ScoreRing score={score} size={160} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold font-mono" style={{ color }}>{score}</span>
            <span className="text-sm text-foreground/40 font-medium">/100</span>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h1 className="text-2xl font-bold mb-1">{skill}</h1>
          <p className="text-foreground/50 text-sm mb-1">
            <span className="font-semibold" style={{ color }}>{label}</span>
            {' '}· Proof-of-skill verified by Intervue
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="w-full mt-8 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] p-4">
          <div className="text-xs text-foreground/35 font-semibold uppercase tracking-wider mb-3 text-left">
            Your badge — paste it anywhere
          </div>
          <div className="flex items-center justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt={`${skill} ${score}`} className="h-8" />
          </div>
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
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          onClick={onDismiss}
          className="mt-6 flex items-center gap-1.5 text-sm text-foreground/35 hover:text-foreground/60 transition-colors">
          View full report <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

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
  const [linkedInDraft, setLinkedInDraft] = useState('')
  const [linkedInDismissed, setLinkedInDismissed] = useState(false)
  const [linkedInCopied, setLinkedInCopied] = useState(false)
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
          if (data.scoreUpdate?.isFirstScore && data.scoreUpdate?.after >= 60) {
            setShowFirstScore(true)
          }
          if (data.insightReport?.linkedInDraft) {
            setLinkedInDraft(data.insightReport.linkedInDraft)
          }
        }
      } catch {
        setReport({
          format: 'system_design', targetSkill: 'Go', username: 'dev',
          scores: {
            overall: 88,
            breakdown: { technical_depth: 92, problem_solving: 85, communication: 88, code_quality: 87 },
            delta: { Go: 4 },
          },
          insightReport: {
            strengths: [
              'Strong distributed system thinking — decomposed the problem clearly',
              'Handled back-pressure and queue overflow well',
              'Good instinct for trade-offs under constraints',
            ],
            gaps: ['Cost optimization & trade-off communication', 'Database scaling patterns'],
            gapsWithNextSteps: [
              {
                gap: 'Cost optimization & trade-off communication',
                nextStep: 'Practice a System Design session focused on cost trade-offs and capacity planning.',
              },
              {
                gap: 'Database scaling patterns',
                nextStep: 'Take a Project Deep-dive session centred on database design.',
              },
            ],
            studyRecommendations: ['Study cost-aware system design', 'Practice horizontal vs vertical scaling trade-offs'],
            idealAnswers: [
              {
                question: 'How would you handle 10× traffic spike?',
                answer: 'Horizontal scaling with load balancing, auto-scaling groups, and queue-based decoupling. Key: identify the bottleneck first — usually the database. Read replicas + connection pooling + Redis cache buys you the most headroom fastest.',
              },
            ],
            aiVerdict: 'Strong distributed systems thinking with clear decomposition ability.',
            nextSessionRec: {
              format: 'project_deepdive',
              skill: 'Go',
              reason: 'Strong performance. Project Deep-dive pairs with System Design to demonstrate full-stack depth for Go roles.',
            },
            progressionSignal: 'Improving 6 pts/session — faster than 85%+ of users',
            specializationImpact: 'This session raised your Go proof score by +4 points (84 → 88). Next gap to close: Cost optimization & trade-off communication.',
            generatedAt: new Date().toISOString(),
          },
          completedAt: new Date().toISOString(),
          scoreUpdate: { skill: 'Go', before: 84, after: 88, delta: 4, isFirstScore: false },
          cohortPercentile: 82,
          messages: [],
        })
        setShowFirstScore(false)
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
  const codeSubmissions = report.codeSubmissions || []
  const scoredSubmissions = codeSubmissions.filter(s => s.codeScore !== null)
  const avgCodeScore = scoredSubmissions.length > 0
    ? Math.round((scoredSubmissions.reduce((sum, s) => sum + (s.codeScore ?? 0), 0) / scoredSubmissions.length) * 10) / 10
    : null
  const idealAnswers = report.insightReport?.idealAnswers || []
  const isFirstSessionBelow60 = report.scoreUpdate?.isFirstScore && report.scoreUpdate?.after < 60
  const gapsWithSteps = report.insightReport?.gapsWithNextSteps || []
  const nextRec = report.insightReport?.nextSessionRec
  const progressionSignal = report.insightReport?.progressionSignal
  const specializationImpact = report.insightReport?.specializationImpact

  return (
    <>
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

        <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/[0.08] bg-foreground/[0.03] text-xs text-foreground/40 mb-4">
              Session complete
            </div>
            <h1 className="text-3xl font-bold mb-2">Interview Report</h1>
            <p className="text-foreground/40 text-sm">
              {FORMAT_LABELS[report.format] || report.format} · {report.targetSkill} ·{' '}
              {new Date(report.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {report.companyMode?.company && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[#8B7CF8]/10 border border-[#8B7CF8]/20 text-[#8B7CF8] text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Company mode · {report.companyMode.company}
              </div>
            )}
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
            <div className="space-y-5">
              {/* Score update banner */}
              {report.scoreUpdate && !report.scoreUpdate.isFirstScore && (
                <ScoreUpdateBanner update={report.scoreUpdate} />
              )}
              {isFirstSessionBelow60 && (
                <NearlyThereCard score={report.scoreUpdate!.after} skill={report.targetSkill} />
              )}

              {/* 1. Session Overview */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="node-panel p-6 flex items-center gap-8">
                <div className="relative w-24 h-24 shrink-0">
                  <ScoreRing score={overall} size={96} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>{overall}</span>
                    <span className="text-[10px] text-foreground/40">/100</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold mb-1">{getScoreLabel(overall)}</div>
                  <p className="text-sm text-foreground/40 mb-3">
                    {FORMAT_LABELS[report.format] || report.format} · {report.targetSkill}
                  </p>
                  {report.insightReport?.aiVerdict && (
                    <p className="text-sm text-foreground/60 italic leading-relaxed mb-3">
                      &ldquo;{report.insightReport.aiVerdict}&rdquo;
                    </p>
                  )}
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

              {/* 2. Specialization Impact */}
              {specializationImpact && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
                  className="node-panel p-5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2DE2C5]/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[#2DE2C5]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-1">Specialization Impact</div>
                    <p className="text-sm text-foreground/55 leading-relaxed">{specializationImpact}</p>
                  </div>
                </motion.div>
              )}

              {/* 3. Progression Signal */}
              {progressionSignal && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="node-panel p-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#8B7CF8]/10 flex items-center justify-center shrink-0">
                    <BarChart className="w-4 h-4 text-[#8B7CF8]" />
                  </div>
                  <div>
                    <div className="text-xs text-[#888FC0] uppercase tracking-wider mb-0.5">Your pace</div>
                    <div className="text-sm font-medium">{progressionSignal}</div>
                  </div>
                </motion.div>
              )}

              {/* 4. Score Breakdown */}
              {breakdown.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
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

              {/* 5. Code Submissions */}
              {codeSubmissions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
                  className="node-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#8B7CF8]" />
                      <h2 className="font-semibold">Code Submissions</h2>
                    </div>
                    {avgCodeScore !== null && (
                      <span className="text-xs font-mono px-2 py-1 rounded-md bg-[#8B7CF8]/10 text-[#8B7CF8] border border-[#8B7CF8]/20">
                        Avg correctness: {avgCodeScore}/10
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {codeSubmissions.map((sub, i) => (
                      <div key={i} className="rounded-xl border border-foreground/[0.06] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-foreground/[0.03] border-b border-foreground/[0.06]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-foreground/40">#{i + 1}</span>
                            <span className="text-xs font-mono text-foreground/60 capitalize">{sub.language}</span>
                          </div>
                          {sub.codeScore !== null && (
                            <span className="text-xs font-mono" style={{ color: getScoreColor(sub.codeScore * 10) }}>
                              Correctness: {sub.codeScore}/10
                            </span>
                          )}
                        </div>
                        <pre className="text-xs font-mono text-foreground/70 p-4 overflow-x-auto bg-[#05060F] leading-relaxed max-h-48 overflow-y-auto">{sub.code}</pre>
                        {sub.judge0Output && (
                          <div className="px-4 py-2 border-t border-foreground/[0.06] bg-foreground/[0.02]">
                            <span className="text-[10px] text-foreground/30 uppercase tracking-widest mr-2">Output</span>
                            <span className="text-xs font-mono text-foreground/50">{sub.judge0Output.slice(0, 200)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 6. Strengths */}
              {report.insightReport?.strengths?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="node-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-[#2DE2C5]" />
                    <h2 className="font-semibold">Your Strengths</h2>
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

              {/* 6. Gaps with Next Steps */}
              {(gapsWithSteps.length > 0 || report.insightReport?.gaps?.length > 0) && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="node-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                    <h2 className="font-semibold">Gaps & Next Steps</h2>
                  </div>
                  <div className="space-y-4">
                    {gapsWithSteps.length > 0
                      ? gapsWithSteps.map(({ gap, nextStep }, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="text-[#f59e0b] mt-0.5 shrink-0 text-sm">·</span>
                            <span className="text-sm text-foreground/70 font-medium">{gap}</span>
                          </div>
                          <div className="ml-4 flex items-start gap-2 text-xs text-foreground/45 leading-relaxed">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#2DE2C5]" />
                            <span>{nextStep}</span>
                          </div>
                        </div>
                      ))
                      : report.insightReport.gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/55">
                          <span className="text-[#f59e0b] mt-0.5 shrink-0">·</span>{g}
                        </div>
                      ))
                    }
                  </div>
                </motion.div>
              )}

              {/* 7. What an expert would say */}
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
                          <p className="text-sm text-foreground/55 italic leading-relaxed">&ldquo;{question}&rdquo;</p>
                        </div>
                        <div className="ml-9 p-3 rounded-lg bg-[#8B7CF8]/[0.04] border border-[#8B7CF8]/10">
                          <p className="text-sm text-foreground/70 leading-relaxed">{answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 8. Study Recommendations */}
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

              {/* 9. Next Session Recommendation */}
              {nextRec && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                  className="node-panel p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-[#2DE2C5]" />
                    <h2 className="font-semibold">Next Session Recommendation</h2>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-[#2DE2C5]">
                          {FORMAT_LABELS[nextRec.format] || nextRec.format}
                        </span>
                        <span className="text-xs text-[#888FC0]">· {nextRec.skill}</span>
                      </div>
                      <p className="text-sm text-foreground/55 leading-relaxed">{nextRec.reason}</p>
                    </div>
                    <Link
                      href={`/interview/new?skill=${encodeURIComponent(nextRec.skill)}&format=${nextRec.format}`}
                      className="shrink-0"
                    >
                      <Button size="sm" className="btn-supernova font-semibold text-xs h-8 px-4">
                        Start <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* 10. How You Compare */}
              {report.cohortPercentile !== undefined && report.cohortPercentile > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="node-panel p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart className="w-4 h-4 text-[#8B7CF8]" />
                    <h2 className="font-semibold">How You Compare</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/55">Your score this session</span>
                      <span className="font-mono font-bold" style={{ color: scoreColor }}>{overall}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/55">Your {report.targetSkill} profile rank</span>
                      <span className="font-mono font-medium text-[#2DE2C5]">
                        Top {100 - report.cohortPercentile}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Badge CTA */}
              {!showFirstScore && report.username && overall >= 60 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
                  className="node-panel p-5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#2DE2C5]/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#2DE2C5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-0.5">Share your {report.targetSkill} score</div>
                    <div className="font-mono text-[11px] text-foreground/35 truncate">
                      Add your badge to GitHub README or LinkedIn
                    </div>
                  </div>
                  <CopyButton
                    text={`[![${report.targetSkill} ${overall}](${typeof window !== 'undefined' ? window.location.origin : ''}/api/badge/${report.username}/${encodeURIComponent(report.targetSkill)})](${typeof window !== 'undefined' ? window.location.origin : ''}/proof/${report.username}/${encodeURIComponent(report.targetSkill)})`}
                    label="Copy badge"
                  />
                </motion.div>
              )}

              {/* LinkedIn share card (milestone reached) */}
              {linkedInDraft && !linkedInDismissed && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
                  className="node-panel p-5 relative">
                  <button
                    onClick={() => setLinkedInDismissed(true)}
                    className="absolute top-4 right-4 text-foreground/30 hover:text-foreground/60 transition-colors text-lg leading-none"
                    aria-label="Dismiss"
                  >×</button>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/15 flex items-center justify-center shrink-0">
                      <Share2 className="w-4 h-4 text-[#0A66C2]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Share your win</div>
                      <div className="text-xs text-foreground/40">You hit a milestone — let your network know</div>
                    </div>
                  </div>
                  <textarea
                    value={linkedInDraft}
                    onChange={e => setLinkedInDraft(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg bg-foreground/[0.04] border border-foreground/[0.08] text-sm text-foreground/70 p-3 resize-none focus:outline-none focus:border-[#0A66C2]/40 transition-colors leading-relaxed"
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(linkedInDraft)
                        setLinkedInCopied(true)
                        setTimeout(() => setLinkedInCopied(false), 2000)
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground/50 hover:text-foreground transition-all font-medium"
                    >
                      {linkedInCopied ? <Check className="w-3.5 h-3.5 text-[#2DE2C5]" /> : <Copy className="w-3.5 h-3.5" />}
                      {linkedInCopied ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 text-[#0A66C2] transition-all font-semibold border border-[#0A66C2]/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Post to LinkedIn
                    </a>
                  </div>
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

          {/* Company track CTA */}
          {(() => {
            const trackId = report.metadata?.companyTrackId
            const rIdx = report.metadata?.roundIndex ?? 0
            if (!trackId) return null
            const track = getTrackById(trackId)
            if (!track) return null
            const nextRound = track.rounds[rIdx + 1]
            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
                className="node-panel p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#8B7CF8]/10 flex items-center justify-center shrink-0">
                    <span className="text-[#8B7CF8] font-bold text-xs">{track.logo}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{track.name} Track</div>
                    <div className="text-xs text-foreground/40">Round {rIdx + 1} of {track.rounds.length} complete</div>
                  </div>
                </div>
                {nextRound ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-foreground/40 mb-0.5">Next</div>
                      <div className="text-sm font-medium">{nextRound.title}</div>
                    </div>
                    <Link href={`/interview/new?companyTrackId=${trackId}&roundIndex=${rIdx + 1}&format=${nextRound.format}&skill=${encodeURIComponent(track.targetSkills[0] || '')}`}>
                      <Button size="sm" className="btn-supernova font-semibold text-xs h-8 px-4 shrink-0">
                        Continue <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2DE2C5]" />
                    <span className="text-sm text-[#2DE2C5] font-semibold">Track complete — all {track.rounds.length} rounds done!</span>
                  </div>
                )}
              </motion.div>
            )
          })()}

          {/* Footer CTAs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full border-foreground/[0.1] text-foreground/40 hover:text-foreground">
                Back to dashboard
              </Button>
            </Link>
            {nextRec ? (
              <Link href={`/interview/new?skill=${encodeURIComponent(nextRec.skill)}&format=${nextRec.format}`}
                className="flex-1">
                <Button className="w-full btn-supernova font-semibold">
                  {FORMAT_LABELS[nextRec.format] || 'Next session'} <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <Link href={`/interview/new${report.targetSkill ? `?skill=${encodeURIComponent(report.targetSkill)}` : ''}`}
                className="flex-1">
                <Button className="w-full btn-supernova font-semibold">
                  Practice again <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}
