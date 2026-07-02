'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Code2, ChevronLeft, Loader2, ArrowRight, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { getTrackById } from '@/lib/data/companyTracks'

const FORMATS = [
  {
    id: 'coding',
    label: 'Live Coding',
    icon: '⌨️',
    desc: 'Monaco editor + AI pair programmer. Code challenges based on your actual repos.',
    duration: '30–45 min',
    color: '#2DE2C5',
    group: 'engineering',
  },
  {
    id: 'system_design',
    label: 'System Design',
    icon: '🏗️',
    desc: 'Design complex systems with AI dialogue. Whiteboard canvas + guided discussion.',
    duration: '45–60 min',
    color: '#3FC5F0',
    group: 'engineering',
  },
  {
    id: 'project_deepdive',
    label: 'Project Deep-dive',
    icon: '🔍',
    desc: 'Walk through your GitHub projects. The AI asks progressively deeper questions.',
    duration: '20–30 min',
    color: '#8B7CF8',
    group: 'engineering',
  },
  {
    id: 'behavioural',
    label: 'Behavioural',
    icon: '💬',
    desc: 'STAR-based situational questions. Stories from your actual experience.',
    duration: '20–30 min',
    color: '#f59e0b',
    group: 'all',
  },
  {
    id: 'gap',
    label: 'Gap Session',
    icon: '⚡',
    desc: '10-minute focused drill on one skill gap. Quick, targeted, effective.',
    duration: '10 min',
    color: '#f43f5e',
    group: 'all',
  },
  {
    id: 'pm_case',
    label: 'PM Case Study',
    icon: '📊',
    desc: 'Product scenario + structured case. Assessed on problem framing, prioritisation, metrics, and communication.',
    duration: '30–45 min',
    color: '#34d399',
    group: 'non-engineering',
  },
  {
    id: 'design_critique',
    label: 'Design Critique',
    icon: '🎨',
    desc: 'Real UX scenario reviewed with AI. Assessed on reasoning, accessibility, systems thinking, and communication.',
    duration: '25–35 min',
    color: '#f472b6',
    group: 'non-engineering',
  },
  {
    id: 'ops_case',
    label: 'Ops / Program Mgmt',
    icon: '⚙️',
    desc: 'Operational challenge: process design, resource allocation, risk and stakeholder management.',
    duration: '25–35 min',
    color: '#fb923c',
    group: 'non-engineering',
  },
  {
    id: 'sales_discovery',
    label: 'Sales Discovery',
    icon: '🤝',
    desc: 'Live discovery roleplay. Assessed on questioning, objection handling, value articulation, and closing.',
    duration: '20–30 min',
    color: '#a78bfa',
    group: 'non-engineering',
  },
]

const COMMON_SKILLS = [
  'Go', 'Python', 'TypeScript', 'Java', 'Rust',
  'System Design', 'Distributed Systems', 'PostgreSQL', 'Redis',
  'Kubernetes', 'AWS', 'Microservices', 'API Design',
  'Data Structures', 'Algorithms',
]

function NewInterviewInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedFormat, setSelectedFormat] = useState('')
  const [targetSkill, setTargetSkill] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [companyTrackId, setCompanyTrackId] = useState<string | null>(null)
  const [roundIndex, setRoundIndex] = useState<number | null>(null)

  useEffect(() => {
    const format = searchParams.get('format')
    const skill = searchParams.get('skill')
    const trackId = searchParams.get('companyTrackId')
    const rIdx = searchParams.get('roundIndex')

    if (format) setSelectedFormat(format)
    if (skill) setTargetSkill(skill)
    if (trackId) setCompanyTrackId(trackId)
    if (rIdx !== null) setRoundIndex(Number(rIdx))
  }, [searchParams])

  const track = companyTrackId ? getTrackById(companyTrackId) : null
  const trackRound = track && roundIndex !== null ? track.rounds[roundIndex] : null

  async function handleStart() {
    if (!selectedFormat) {
      toast.error('Please select an interview format')
      return
    }
    if (!targetSkill.trim()) {
      toast.error('Please enter a target skill')
      return
    }

    setIsStarting(true)
    try {
      const body: Record<string, unknown> = {
        format: selectedFormat,
        targetSkill: targetSkill.trim(),
      }
      if (companyTrackId !== null) body.companyTrackId = companyTrackId
      if (roundIndex !== null) body.roundIndex = roundIndex

      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const { sessionId } = await res.json()
        router.push(`/interview/${sessionId}`)
      } else {
        toast.error('Failed to start interview. Please try again.')
      }
    } catch {
      toast.error('Failed to start interview')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-[#1A1E3A] px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#AEB5E0] hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-3 h-3 text-[#05060F]" />
          </div>
          <span className="font-bold text-sm">intervue</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {track && trackRound ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8B7CF8]/10 border border-[#8B7CF8]/20 text-[#8B7CF8] text-xs">
                  <Layers className="w-3 h-3" />
                  Round {trackRound.order} of {track.rounds.length} · {track.name} track
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-1">{trackRound.title}</h1>
              <p className="text-[#AEB5E0] text-sm">{trackRound.focus}</p>
            </>
          ) : (
            <>
              <h1 className="h-display text-3xl font-bold mb-2">Start an interview session</h1>
              <p className="text-[#AEB5E0] text-sm">Choose a format and we&apos;ll generate questions from your actual profile.</p>
            </>
          )}
        </motion.div>

        {/* Format selection */}
        <div className="space-y-6 mb-8">
          {(['engineering', 'non-engineering'] as const).map((group) => (
            <div key={group}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#AEB5E0] mb-2.5 px-0.5">
                {group === 'engineering' ? 'Engineering roles' : 'Non-engineering roles'}
              </div>
              <div className="space-y-2">
                {FORMATS.filter((f) => f.group === group || f.group === 'all').map((format, i) => (
                  <motion.button
                    key={format.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedFormat === format.id
                        ? 'bg-[#0B0E1C]'
                        : 'border-[#1A1E3A] bg-[#0B0E1C] hover:border-[#2a2f52]'
                    }`}
                    style={selectedFormat === format.id ? { borderColor: format.color + '60', background: format.color + '08' } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{format.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{format.label}</span>
                          <span className="text-[10px] text-[#AEB5E0] bg-[#11142a] px-1.5 py-0.5 rounded">
                            {format.duration}
                          </span>
                        </div>
                        <p className="text-xs text-[#AEB5E0] mt-0.5">{format.desc}</p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 transition-all shrink-0"
                        style={selectedFormat === format.id
                          ? { borderColor: format.color, backgroundColor: format.color }
                          : { borderColor: '#1A1E3A', backgroundColor: 'transparent' }
                        }
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Skill selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Label className="text-sm text-[#AEB5E0] mb-2 block">Target skill</Label>
          <Input
            value={targetSkill}
            onChange={(e) => setTargetSkill(e.target.value)}
            placeholder="e.g. Go, System Design, PostgreSQL..."
            className="bg-[#0B0E1C] border-[#1A1E3A] text-white placeholder:text-[#AEB5E0] mb-3 focus-visible:ring-[#2DE2C5]/30"
          />
          <div className="flex flex-wrap gap-2">
            {COMMON_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => setTargetSkill(skill)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  targetSkill === skill
                    ? 'border-[#2DE2C5]/50 bg-[#2DE2C5]/10 text-[#2DE2C5]'
                    : 'border-[#1A1E3A] text-[#AEB5E0] hover:border-[#2a2f52] hover:text-white'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </motion.div>

        <Button
          onClick={handleStart}
          disabled={isStarting || !selectedFormat || !targetSkill}
          className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] h-11 font-medium"
        >
          {isStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Starting session...
            </>
          ) : (
            <>
              Start interview
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function NewInterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05060F] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" /></div>}>
      <NewInterviewInner />
    </Suspense>
  )
}
