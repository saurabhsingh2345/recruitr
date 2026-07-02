'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Send,
  Lightbulb,
  StopCircle,
  Timer,
  Code2,
  Play,
  ChevronDown,
  Terminal,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Mic,
  MicOff,
  MessageSquare,
  PhoneOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { VoiceOrb } from '@/components/VoiceOrb'
import { Bot, User } from 'lucide-react'
import { FormattedMessage } from '@/components/interview/FormattedMessage'
import { SystemDesignCanvas } from '@/components/interview/SystemDesignCanvas'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
]

const DEFAULT_CODE: Record<string, string> = {
  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n',
  typescript: '// Write your solution here\n\nfunction solution(): void {\n  \n}\n',
  python: '# Write your solution here\n\ndef solution():\n    pass\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  rust: 'fn main() {\n    println!("Hello, world!");\n}\n',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function SessionTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return (
    <span className="font-mono text-sm text-[#AEB5E0]">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}

interface SessionInfo {
  format: string
  targetSkill: string
  status: string
  messages: Message[]
}

type VoiceStatus = 'idle' | 'connecting' | 'live' | 'error'


export default function InterviewSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(DEFAULT_CODE.javascript)
  const [codeOutput, setCodeOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [receipt, setReceipt] = useState<{ overallScore: number; scoreUpdate: { skill: string; before: number; after: number; delta: number }; aiVerdict: string } | null>(null)
  const [designNotes, setDesignNotes] = useState('')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [startedAt] = useState(new Date())
  const [showOutput, setShowOutput] = useState(false)
  const [mode, setMode] = useState<'text' | 'voice'>('text')

  // Voice state
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [aiLevel, setAiLevel] = useState(0)
  const [userLevel, setUserLevel] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const aiAnimRef = useRef<number | null>(null)
  const voiceActiveRef = useRef(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/interview/${sessionId}/info`)
        if (res.ok) {
          const data = await res.json()
          setSessionInfo(data)
          if (data.messages?.length > 0) {
            setMessages(
              data.messages.map((m: { role: string; content: string }) => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.content,
              }))
            )
          }
        }
      } catch {}
      finally {
        setSessionLoaded(true)
      }
    }
    loadSession()
  }, [sessionId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup voice on unmount
  useEffect(() => {
    return () => stopVoice()
  }, [])

  // Mark session abandoned if user closes/navigates away mid-session
  useEffect(() => {
    const handleUnload = () => {
      if (!receipt) {
        navigator.sendBeacon(`/api/interview/${sessionId}/abandon`)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [sessionId, receipt])

  const handleLanguageChange = useCallback((lang: string | null) => {
    if (!lang) return
    setLanguage(lang)
    setCode(DEFAULT_CODE[lang] || '')
  }, [])

    async function sendMessage(
    messageContent: string,
    isHint = false,
    codeContext?: { code: string; codeOutput: string; language: string }
  ): Promise<string> {
    if (!messageContent.trim() && !isHint) return ''

    const userMsg: Message = { role: 'user', content: messageContent }
    if (!isHint) {
      setMessages((prev) => [...prev, userMsg])
      setInput('')
    }

    setIsLoading(true)
    let aiContent = ''
    const withDesign =
      designNotes.trim() && sessionInfo?.format === 'system_design'
        ? `${messageContent}\n\n[Architecture notes]\n${designNotes.trim()}`
        : messageContent
    try {
      const res = await fetch(`/api/interview/${sessionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: withDesign, isHint, ...codeContext }),
      })

      if (!res.ok) throw new Error('Response failed')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      const aiMsg: Message = { role: 'assistant', content: '' }
      setMessages((prev) => [...prev, aiMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        aiContent += chunk
        setMessages((prev) => {
          const newMsgs = [...prev]
          newMsgs[newMsgs.length - 1] = { role: 'assistant', content: aiContent }
          return newMsgs
        })
      }
    } catch {
      toast.error('Failed to get AI response')
    } finally {
      setIsLoading(false)
    }
    return aiContent
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    await sendMessage(input)
  }

  async function requestHint() {
    setHintsUsed((h) => h + 1)
    await sendMessage('[HINT REQUEST]', true)
  }

  async function runCode(): Promise<string> {
    setIsRunning(true)
    setShowOutput(true)
    let output = ''
    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      })
      const data = await res.json()
      output =
        data.stdout ||
        data.compile_output ||
        data.stderr ||
        `Status: ${data.status?.description || 'Unknown'}`
      setCodeOutput(output)
    } catch {
      output = 'Error: Failed to execute code'
      setCodeOutput(output)
    } finally {
      setIsRunning(false)
    }
    return output
  }

  async function submitCode() {
    if (isLoading || isRunning) return
    let output = codeOutput
    if (!output) {
      output = await runCode()
    }
    await sendMessage(
      `Here is my ${language} solution — please review it.`,
      false,
      { code, codeOutput: output, language }
    )
  }

  async function completeSession() {
    if (!confirm('End this interview session and generate your report?')) return
    setIsCompleting(true)
    if (voiceStatus === 'live') stopVoice()
    try {
      const res = await fetch(`/api/interview/${sessionId}/complete`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setReceipt({
          overallScore: data.scores?.overall ?? 0,
          scoreUpdate: data.scoreUpdate ?? { skill: '', before: 0, after: 0, delta: 0 },
          aiVerdict: data.aiVerdict ?? '',
        })
        if (typeof window !== 'undefined') {
          const embed = new URLSearchParams(window.location.search).get('embed')
          if (embed === '1' && window.parent !== window) {
            window.parent.postMessage(
              {
                type: 'intervue_verify_complete',
                score: data.scores?.overall ?? 0,
                skill: sessionInfo?.targetSkill || '',
              },
              '*'
            )
          }
        }
      } else {
        toast.error('Failed to complete session')
        setIsCompleting(false)
      }
    } catch {
      toast.error('Failed to complete session')
      setIsCompleting(false)
    }
  }

  // ── Voice (browser SpeechRecognition + SpeechSynthesis + Ollama) ──────────

  function stopAiAnimation() {
    if (aiAnimRef.current) cancelAnimationFrame(aiAnimRef.current)
    aiAnimRef.current = null
    setAiLevel(0)
  }

  function startAiAnimation() {
    let phase = 0
    const tick = () => {
      phase += 0.08
      setAiLevel(0.25 + Math.sin(phase) * 0.2 + Math.sin(phase * 2.3) * 0.1)
      aiAnimRef.current = requestAnimationFrame(tick)
    }
    aiAnimRef.current = requestAnimationFrame(tick)
  }

  function stopVoice() {
    voiceActiveRef.current = false
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    stopAiAnimation()
    recognitionRef.current = null
    setAiLevel(0)
    setUserLevel(0)
    setVoiceStatus('idle')
  }

  function speakAiResponse(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !voiceActiveRef.current) return resolve()
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find((v) => v.lang.startsWith('en') && v.localService) ||
        voices.find((v) => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred
      startAiAnimation()
      utterance.onend = () => { stopAiAnimation(); resolve() }
      utterance.onerror = () => { stopAiAnimation(); resolve() }
      window.speechSynthesis.speak(utterance)
    })
  }

  function startListeningCycle() {
    if (!voiceActiveRef.current || !recognitionRef.current) return
    setUserLevel(0.08)
    try { recognitionRef.current.start() } catch {}
  }

  async function startVoice() {
    const SR =
      (typeof window !== 'undefined' && (
        window.SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
      )) || null

    if (!SR) {
      toast.error('Speech recognition not supported — use Chrome or Safari.')
      return
    }

    setVoiceStatus('connecting')

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast.error('Microphone access denied')
      setVoiceStatus('error')
      return
    }

    voiceActiveRef.current = true
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onsoundstart = () => setUserLevel(0.4 + Math.random() * 0.3)
    recognition.onsoundend = () => setUserLevel(0.05)

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      if (last?.isFinal) {
        const transcript = last[0]?.transcript.trim() ?? ''
        setUserLevel(0)
        if (transcript && voiceActiveRef.current) {
          recognition.abort()
          const aiText = await sendMessage(transcript)
          if (aiText && voiceActiveRef.current) await speakAiResponse(aiText)
          if (voiceActiveRef.current) setTimeout(startListeningCycle, 300)
        } else if (voiceActiveRef.current) {
          setTimeout(startListeningCycle, 100)
        }
      } else {
        setUserLevel(0.3 + Math.random() * 0.3)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' && voiceActiveRef.current) {
        setTimeout(startListeningCycle, 100)
      } else if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error)
      }
    }

    setVoiceStatus('live')
    startListeningCycle()
  }

  async function toggleVoiceMode() {
    if (mode === 'voice') {
      stopVoice()
      setMode('text')
    } else {
      setMode('voice')
      await startVoice()
    }
  }

  const aiSpeaking = aiLevel > 0.06 && aiLevel >= userLevel
  const userSpeaking = userLevel > 0.06 && userLevel > aiLevel

  const formatLabel: Record<string, string> = {
    coding: 'Live Coding',
    system_design: 'System Design',
    project_deepdive: 'Project Deep-dive',
    behavioural: 'Behavioural',
    gap: 'Gap Session',
    pm_case: 'PM Case Study',
    design_critique: 'Design Critique',
    ops_case: 'Ops / Program Mgmt',
    sales_discovery: 'Sales Discovery',
  }

  const NO_EDITOR_FORMATS = ['behavioural', 'pm_case', 'design_critique', 'ops_case', 'sales_discovery']
  const hideEditor = sessionInfo ? NO_EDITOR_FORMATS.includes(sessionInfo.format) : false
  const isSystemDesign = sessionInfo?.format === 'system_design'

  // Proof receipt overlay — shown after session completion before navigating to report
  if (receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05060F] p-4">
        <div className="w-full max-w-sm border border-[#27272A] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between">
            <span className="text-[10px] text-[#71717A] uppercase tracking-widest font-mono">
              Intervue · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 rounded font-mono">Verified</span>
          </div>
          {/* Score hero */}
          <div className="px-6 py-8 text-center">
            <div className="font-mono text-7xl font-medium text-white leading-none">{receipt.overallScore}</div>
            <div className="text-[#71717A] text-sm mt-2 font-mono">
              {sessionInfo?.format?.replace(/_/g, ' ')} · {sessionInfo?.targetSkill}
            </div>
          </div>
          {/* Score delta */}
          {receipt.scoreUpdate?.skill && (
            <div className="px-6 py-4 border-t border-[#27272A] flex items-center justify-between">
              <span className="text-sm text-[#A1A1AA] font-mono">{receipt.scoreUpdate.skill}</span>
              <span className="font-mono text-sm text-[#2DE2C5]">
                {receipt.scoreUpdate.before} → {receipt.scoreUpdate.after}
                {receipt.scoreUpdate.delta > 0 && (
                  <span className="text-xs ml-1.5 text-[#2DE2C5]/70">+{receipt.scoreUpdate.delta}</span>
                )}
              </span>
            </div>
          )}
          {/* AI verdict */}
          {receipt.aiVerdict && (
            <div className="px-6 py-3 border-t border-[#27272A]">
              <p className="text-xs text-[#71717A] italic text-center leading-relaxed">
                &ldquo;{receipt.aiVerdict}&rdquo;
              </p>
            </div>
          )}
          {/* Actions */}
          <div className="px-6 py-5 border-t border-[#27272A] flex gap-2">
            <button
              onClick={() => router.push(`/interview/report/${sessionId}`)}
              className="flex-1 bg-[#2DE2C5] text-[#0A0A0B] rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1fb89e] transition-colors"
            >
              View full report
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/interview/report/${sessionId}`)
                toast.success('Report link copied')
              }}
              className="px-4 border border-[#27272A] text-[#A1A1AA] rounded-xl py-2.5 text-sm hover:border-[#3F3F46] transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#05060F]">
      {/* Top bar */}
      <div className="h-12 border-b border-[#1A1E3A] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#2DE2C5]" />
            <span className="text-sm font-medium">
              {formatLabel[sessionInfo?.format || 'coding'] || 'Interview'}
            </span>
          </div>
          {sessionInfo?.targetSkill && (
            <>
              <span className="text-[#1A1E3A]">·</span>
              <Badge className="bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20 text-xs">
                {sessionInfo.targetSkill}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#AEB5E0]">
            <Timer className="w-3.5 h-3.5" />
            <SessionTimer startedAt={startedAt} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#AEB5E0]">
            <Lightbulb className="w-3.5 h-3.5" />
            {hintsUsed} hint{hintsUsed !== 1 ? 's' : ''}
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-[#0B0E1C] border border-[#1A1E3A] rounded-lg p-0.5">
            <button
              onClick={() => { if (mode === 'voice') toggleVoiceMode() }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                mode === 'text'
                  ? 'bg-[#1A1E3A] text-white'
                  : 'text-[#AEB5E0] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Text
            </button>
            <button
              onClick={() => { if (mode === 'text') toggleVoiceMode() }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                mode === 'voice'
                  ? 'bg-[#1A1E3A] text-white'
                  : 'text-[#AEB5E0] hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Voice
            </button>
          </div>

          {mode === 'text' && (
            <Button
              size="sm"
              variant="outline"
              onClick={requestHint}
              disabled={isLoading || hintsUsed >= 3}
              className="border-[#1A1E3A] text-[#AEB5E0] hover:text-[#f59e0b] hover:border-[#f59e0b]/30 text-xs h-7"
            >
              <Lightbulb className="w-3.5 h-3.5 mr-1" />
              Hint
            </Button>
          )}

          <Button
            size="sm"
            onClick={completeSession}
            disabled={isCompleting}
            className="bg-[#f43f5e]/10 text-[#f43f5e] hover:bg-[#f43f5e]/20 border border-[#f43f5e]/30 text-xs h-7"
          >
            {isCompleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <StopCircle className="w-3.5 h-3.5 mr-1" />
            )}
            End session
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: chat or voice — full width when editor is hidden */}
        <div className={`shrink-0 border-r border-[#1A1E3A] flex flex-col ${hideEditor ? 'flex-1' : 'w-[420px]'}`}>
          {mode === 'text' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!sessionLoaded && messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin mx-auto mb-3" />
                      <div className="text-sm text-[#AEB5E0]">Loading your session...</div>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`message-animate flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-[#2DE2C5]/20 border border-[#2DE2C5]/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Code2 className="w-3.5 h-3.5 text-[#2DE2C5]" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'assistant'
                          ? 'bg-[#0B0E1C] border border-[#1A1E3A] text-[#F8F9FA]'
                          : 'bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 text-[#F8F9FA]'
                      }`}
                    >
                      {msg.content === '[HINT REQUEST]' ? (
                        <span className="text-[#f59e0b] italic">Hint requested...</span>
                      ) : msg.content ? (
                        <FormattedMessage content={msg.content} />
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="loading-dot" />
                          <span className="loading-dot" />
                          <span className="loading-dot" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-2.5 message-animate">
                    <div className="w-7 h-7 rounded-full bg-[#2DE2C5]/20 border border-[#2DE2C5]/30 flex items-center justify-center shrink-0">
                      <Code2 className="w-3.5 h-3.5 text-[#2DE2C5]" />
                    </div>
                    <div className="bg-[#0B0E1C] border border-[#1A1E3A] rounded-xl px-3.5 py-3 flex items-center gap-1">
                      <span className="loading-dot" />
                      <span className="loading-dot" />
                      <span className="loading-dot" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-[#1A1E3A] p-3">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-1 bg-[#0B0E1C] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] placeholder:text-[#AEB5E0] resize-none outline-none focus:border-[#2DE2C5]/40 transition-colors"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e as unknown as React.FormEvent)
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] self-end h-9 w-9 p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <div className="text-[10px] text-[#AEB5E0] mt-1.5 px-1">
                  Enter to send · Shift+Enter for newline
                </div>
              </div>
            </>
          ) : (
            /* Voice panel */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              {voiceStatus === 'connecting' ? (
                <div className="flex flex-col items-center gap-3 text-[#AEB5E0]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2DE2C5]" />
                  <p className="text-sm">Setting up voice interview...</p>
                  <p className="text-xs">Requesting microphone access</p>
                </div>
              ) : voiceStatus === 'error' ? (
                <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                  <MicOff className="w-10 h-10 text-[#f43f5e]" />
                  <p className="text-sm font-medium text-[#f43f5e]">Voice session failed</p>
                  <p className="text-xs text-[#AEB5E0]">
                    Make sure microphone access is granted. Voice mode requires Chrome or Safari.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setVoiceStatus('idle'); setMode('text') }}
                    className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white"
                  >
                    Back to text mode
                  </Button>
                </div>
              ) : voiceStatus === 'live' ? (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-[#AEB5E0]">Voice interview live</span>
                  </div>

                  <div className="flex items-center gap-12">
                    <VoiceOrb
                      level={aiLevel}
                      speaking={aiSpeaking}
                      label="Interviewer"
                      sublabel="AI"
                      icon={Bot}
                      accent="indigo"
                    />
                    <VoiceOrb
                      level={userLevel}
                      speaking={userSpeaking}
                      label="You"
                      sublabel="Mic on"
                      icon={User}
                      accent="teal"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleVoiceMode}
                    className="border-[#f43f5e]/30 text-[#f43f5e] hover:bg-[#f43f5e]/10 gap-2"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Leave voice
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 flex items-center justify-center">
                    <Mic className="w-7 h-7 text-[#2DE2C5]" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">Voice interview mode</p>
                    <p className="text-xs text-[#AEB5E0]">
                      Talk directly with the AI interviewer.
                      <br />
                      Speak your answer — AI will respond aloud.
                    </p>
                  </div>
                  <Button
                    onClick={startVoice}
                    className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Start voice session
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Editor panel — hidden for non-coding formats */}
        {!hideEditor && <div className="flex-1 flex flex-col">
          {isSystemDesign ? (
            <SystemDesignCanvas value={designNotes} onChange={setDesignNotes} />
          ) : (
          <>
          <div className="h-10 border-b border-[#1A1E3A] flex items-center gap-3 px-3 shrink-0">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="h-7 w-36 bg-[#0B0E1C] border-[#1A1E3A] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0E1C] border-[#1A1E3A]">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCode(DEFAULT_CODE[language] || '')}
                className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs h-7"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={runCode}
                disabled={isRunning || isLoading}
                className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] text-xs h-7"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Play className="w-3.5 h-3.5 mr-1" />
                )}
                Run
              </Button>
              <Button
                size="sm"
                onClick={submitCode}
                disabled={isRunning || isLoading || !code.trim()}
                className="bg-[#8B7CF8] text-white hover:bg-[#7c6ef0] text-xs h-7"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                )}
                Submit
              </Button>
            </div>
          </div>

          <div className={`${showOutput ? 'flex-none' : 'flex-1'}`} style={showOutput ? { height: '60%' } : {}}>
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={(val) => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: 'Geist Mono, Fira Code, monospace',
                minimap: { enabled: false },
                padding: { top: 12 },
                lineNumbers: 'on',
                folding: true,
                wordWrap: 'off',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          <div className={`border-t border-[#1A1E3A] transition-all ${showOutput ? 'flex-1' : 'h-9'}`}>
            <button
              onClick={() => setShowOutput((s) => !s)}
              className="w-full h-9 flex items-center gap-2 px-3 text-xs text-[#AEB5E0] hover:text-white transition-colors border-b border-[#1A1E3A]"
            >
              <Terminal className="w-3.5 h-3.5" />
              Output
              <ChevronDown
                className={`w-3.5 h-3.5 ml-auto transition-transform ${showOutput ? 'rotate-180' : ''}`}
              />
              {codeOutput && !showOutput && <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5]" />}
            </button>
            {showOutput && (
              <div className="p-3 h-[calc(100%-36px)] overflow-y-auto">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-xs text-[#AEB5E0]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Executing...
                  </div>
                ) : codeOutput ? (
                  <pre className="text-xs font-mono text-[#F8F9FA] whitespace-pre-wrap">{codeOutput}</pre>
                ) : (
                  <div className="text-xs text-[#AEB5E0]">Run your code to see output</div>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </div>}
      </div>
    </div>
  )
}
