'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Send, Lightbulb, StopCircle, Code2, Play, ChevronDown, Terminal,
  CheckCircle2, Loader2, RotateCcw, Timer, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { FormattedMessage } from '@/components/interview/FormattedMessage'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
]

const DEFAULT_CODE: Record<string, string> = {
  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n',
  typescript: '// Write your solution here\n\nfunction solution(): void {\n  \n}\n',
  python: '# Write your solution here\n\ndef solution():\n    pass\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
}

const NO_EDITOR_FORMATS = ['behavioural', 'pm_case', 'design_critique', 'ops_case', 'sales_discovery']

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding', system_design: 'System Design', project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural', gap: 'Gap Session', pm_case: 'PM Case Study',
  design_critique: 'Design Critique', ops_case: 'Ops / Program Mgmt', sales_discovery: 'Sales Discovery',
}

interface Message { role: 'user' | 'assistant'; content: string }

function CountdownTimer({ endTime, onExpire }: { endTime: Date; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, endTime.getTime() - Date.now()))
  const expiredRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, endTime.getTime() - Date.now())
      setRemaining(left)
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire()
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime, onExpire])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  const isLow = remaining < 5 * 60 * 1000 && remaining > 0

  return (
    <span className={`font-mono text-sm ${isLow ? 'text-[#f43f5e]' : 'text-[#AEB5E0]'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}

export default function AssessRoundPage({ params }: { params: Promise<{ token: string; roundOrder: string }> }) {
  const { token, roundOrder: roundOrderStr } = use(params)
  const roundOrder = parseInt(roundOrderStr, 10)
  const router = useRouter()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [format, setFormat] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(DEFAULT_CODE.javascript)
  const [codeOutput, setCodeOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Pillar 4 — integrity signal capture (tab switches, focus loss, large pastes).
  const tabSwitchesRef = useRef(0)
  const focusLossRef = useRef(0)
  const hiddenAtRef = useRef<number | null>(null)
  const pasteCountRef = useRef(0)
  const pastedCharsRef = useRef(0)

  function trackPaste(text: string) {
    if (text && text.length >= 40) {
      pasteCountRef.current += 1
      pastedCharsRef.current += text.length
    }
  }

  useEffect(() => {
    function onVis() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
      } else if (hiddenAtRef.current) {
        tabSwitchesRef.current += 1
        focusLossRef.current += (Date.now() - hiddenAtRef.current) / 1000
        hiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    fetch(`/api/assess/${token}/round/${roundOrder}/start`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error)
          return
        }
        setSessionId(d.sessionId)
        setFormat(d.format)
        setDurationMinutes(d.durationMinutes || 30)
        if (d.openingMessage) {
          setMessages([{ role: 'assistant', content: d.openingMessage }])
        }
        const now = new Date()
        setStartTime(now)
        setEndTime(new Date(now.getTime() + (d.durationMinutes || 30) * 60 * 1000))
      })
      .catch(() => setError('Failed to start session'))
      .finally(() => setIsStarting(false))
  }, [token, roundOrder])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(
    content: string,
    isHint = false,
    codePayload?: { code: string; codeOutput: string; language: string }
  ) {
    if (!content.trim() && !isHint) return
    if (!sessionId) return

    if (!isHint) {
      setMessages((prev) => [...prev, { role: 'user', content }])
      setInput('')
    }
    setIsLoading(true)

    try {
      const res = await fetch(`/api/assess/${token}/round/${roundOrder}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content, isHint, ...codePayload }),
      })

      if (!res.ok) throw new Error('Response failed')
      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aiContent += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: aiContent }
          return next
        })
      }
    } catch {
      toast.error('Failed to get AI response')
    } finally {
      setIsLoading(false)
    }
  }

  async function completeSession(autoSubmit = false) {
    if (!sessionId) return
    if (!autoSubmit && !confirm('End this round and submit? You cannot continue after submitting.')) return

    setIsCompleting(true)
    try {
      const res = await fetch(`/api/assess/${token}/round/${roundOrder}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          integritySignals: {
            tabSwitches: tabSwitchesRef.current,
            focusLossSeconds: Math.round(focusLossRef.current),
            pasteCount: pasteCountRef.current,
            pastedChars: pastedCharsRef.current,
            durationSeconds: startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0,
          },
        }),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push(`/assess/${token}`), 2000)
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to submit round')
        setIsCompleting(false)
      }
    } catch {
      toast.error('Failed to submit round')
      setIsCompleting(false)
    }
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
      output = data.stdout || data.compile_output || data.stderr || `Status: ${data.status?.description || 'Unknown'}`
    } catch {
      output = 'Error: Failed to execute code'
    } finally {
      setCodeOutput(output)
      setIsRunning(false)
    }
    return output
  }

  // Pillar 3 — submit executed code to the interviewer for a graded evaluation.
  async function submitCode() {
    if (!sessionId || isLoading || isRunning) return
    const output = await runCode()
    await sendMessage('Here is my solution for review.', false, { code, codeOutput: output, language })
  }

  if (isStarting) return (
    <div className="h-screen bg-[#05060F] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin mx-auto mb-3" />
        <div className="text-sm text-white/50">Starting your session…</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="h-screen bg-[#05060F] flex items-center justify-center text-white">
      <div className="text-center">
        <AlertCircle className="w-8 h-8 text-[#f43f5e] mx-auto mb-3" />
        <p className="font-semibold mb-1">Cannot start round</p>
        <p className="text-sm text-[#888FC0] mb-4">{error}</p>
        <Button onClick={() => router.push(`/assess/${token}`)} variant="outline" className="border-white/[0.08]">
          Back to assessment
        </Button>
      </div>
    </div>
  )

  if (done) return (
    <div className="h-screen bg-[#05060F] flex items-center justify-center text-white">
      <div className="text-center">
        <CheckCircle2 className="w-10 h-10 text-[#2DE2C5] mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">Round submitted!</h2>
        <p className="text-[#888FC0] text-sm">Your responses have been scored. Returning to overview…</p>
      </div>
    </div>
  )

  const hideEditor = NO_EDITOR_FORMATS.includes(format)

  return (
    <div className="h-screen flex flex-col bg-[#05060F] text-white">
      {/* Top bar */}
      <div className="h-12 border-b border-[#1A1E3A] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-[#2DE2C5]" />
          <span className="text-sm font-medium">{FORMAT_LABELS[format] || 'Interview'}</span>
          <Badge className="bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20 text-xs">Round {roundOrder}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {endTime && (
            <div className="flex items-center gap-1.5 text-xs text-[#AEB5E0]">
              <Timer className="w-3.5 h-3.5" />
              <CountdownTimer endTime={endTime} onExpire={() => completeSession(true)} />
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[#AEB5E0]">
            <Lightbulb className="w-3.5 h-3.5" />
            {hintsUsed} hint{hintsUsed !== 1 ? 's' : ''}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setHintsUsed((h) => h + 1); sendMessage('[HINT REQUEST]', true) }}
            disabled={isLoading || hintsUsed >= 3}
            className="border-[#1A1E3A] text-[#AEB5E0] hover:text-[#f59e0b] hover:border-[#f59e0b]/30 text-xs h-7"
          >
            <Lightbulb className="w-3.5 h-3.5 mr-1" /> Hint
          </Button>
          <Button
            size="sm"
            onClick={() => completeSession(false)}
            disabled={isCompleting}
            className="bg-[#f43f5e]/10 text-[#f43f5e] hover:bg-[#f43f5e]/20 border border-[#f43f5e]/30 text-xs h-7"
          >
            {isCompleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><StopCircle className="w-3.5 h-3.5 mr-1" />Submit round</>}
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className={`shrink-0 border-r border-[#1A1E3A] flex flex-col ${hideEditor ? 'flex-1' : 'w-[420px]'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#2DE2C5]/20 border border-[#2DE2C5]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Code2 className="w-3.5 h-3.5 text-[#2DE2C5]" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'bg-[#0B0E1C] border border-[#1A1E3A] text-[#F8F9FA]'
                    : 'bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 text-[#F8F9FA]'
                }`}>
                  {msg.content ? (
                    <FormattedMessage content={msg.content} />
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#2DE2C5]/20 border border-[#2DE2C5]/30 flex items-center justify-center shrink-0">
                  <Code2 className="w-3.5 h-3.5 text-[#2DE2C5]" />
                </div>
                <div className="bg-[#0B0E1C] border border-[#1A1E3A] rounded-xl px-3.5 py-3 flex items-center gap-1">
                  <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-[#1A1E3A] p-3">
            <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && !isLoading) sendMessage(input) }} className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => trackPaste(e.clipboardData.getData('text'))}
                placeholder="Type your response…"
                className="flex-1 bg-[#0B0E1C] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] placeholder:text-[#AEB5E0] resize-none outline-none focus:border-[#2DE2C5]/40"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (input.trim() && !isLoading) sendMessage(input)
                  }
                }}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] self-end h-9 w-9 p-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="text-[10px] text-[#AEB5E0] mt-1.5 px-1">Enter to send · Shift+Enter for newline</div>
          </div>
        </div>

        {/* Editor panel */}
        {!hideEditor && (
          <div className="flex-1 flex flex-col">
            <div className="h-10 border-b border-[#1A1E3A] flex items-center gap-3 px-3 shrink-0">
              <Select value={language} onValueChange={(v) => { if (v) { setLanguage(v); setCode(DEFAULT_CODE[v] || '') } }}>
                <SelectTrigger className="h-7 w-36 bg-[#0B0E1C] border-[#1A1E3A] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0E1C] border-[#1A1E3A]">
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCode(DEFAULT_CODE[language] || '')} className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs h-7">
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
                <Button size="sm" variant="outline" onClick={runCode} disabled={isRunning || isLoading} className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs h-7">
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  Run
                </Button>
                <Button size="sm" onClick={submitCode} disabled={isRunning || isLoading} className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] text-xs h-7" title="Run your code and send it to the interviewer for evaluation">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Submit
                </Button>
              </div>
            </div>
            <div className={showOutput ? 'flex-none' : 'flex-1'} style={showOutput ? { height: '60%' } : {}}>
              <MonacoEditor
                height="100%"
                language={language}
                value={code}
                onChange={(v) => setCode(v || '')}
                onMount={(editor) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  editor.onDidPaste((e: any) => {
                    const model = editor.getModel()
                    if (model) trackPaste(model.getValueInRange(e.range))
                  })
                }}
                theme="vs-dark"
                options={{ fontSize: 14, fontFamily: 'Geist Mono, Fira Code, monospace', minimap: { enabled: false }, padding: { top: 12 }, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true }}
              />
            </div>
            <div className={`border-t border-[#1A1E3A] transition-all ${showOutput ? 'flex-1' : 'h-9'}`}>
              <button onClick={() => setShowOutput((s) => !s)} className="w-full h-9 flex items-center gap-2 px-3 text-xs text-[#AEB5E0] hover:text-white transition-colors border-b border-[#1A1E3A]">
                <Terminal className="w-3.5 h-3.5" /> Output
                <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showOutput ? 'rotate-180' : ''}`} />
              </button>
              {showOutput && (
                <div className="p-3 h-[calc(100%-36px)] overflow-y-auto">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-xs text-[#AEB5E0]"><Loader2 className="w-3.5 h-3.5 animate-spin" />Executing…</div>
                  ) : codeOutput ? (
                    <pre className="text-xs font-mono text-[#F8F9FA] whitespace-pre-wrap">{codeOutput}</pre>
                  ) : (
                    <div className="text-xs text-[#AEB5E0]">Run your code to see output</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
