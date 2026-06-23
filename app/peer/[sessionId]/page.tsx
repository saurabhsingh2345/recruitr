'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, Bot, Loader2, Star } from 'lucide-react'
import { CandidateNav } from '@/components/CandidateNav'

interface PeerMessage {
  senderName: string
  role: 'interviewer' | 'candidate' | 'ai_moderator'
  content: string
  at: string
}

interface Participant {
  name: string
  username: string
  role: 'interviewer' | 'candidate'
  isMe: boolean
}

const ROLE_COLOR: Record<string, string> = {
  interviewer: '#3FC5F0',
  candidate: '#2DE2C5',
  ai_moderator: '#8B7CF8',
}

export default function PeerSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<PeerMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [status, setStatus] = useState<string>('waiting')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [ending, setEnding] = useState(false)
  const [score, setScore] = useState(70)
  const [showEndModal, setShowEndModal] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const totalRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const myParticipant = participants.find(p => p.isMe)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/peer/${sessionId}?after=${totalRef.current}`)
      if (!res.ok) return
      const data = await res.json()
      setStatus(data.status)
      setParticipants(data.participants || [])
      if (data.messages?.length > 0) {
        setMessages(prev => [...prev, ...data.messages])
        totalRef.current += data.messages.length
      }
    } catch {
      // ignore
    }
  }, [sessionId])

  // Initial load + polling
  useEffect(() => {
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [poll])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      await fetch(`/api/peer/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      await poll()
    } finally {
      setSending(false)
    }
  }

  async function endSession() {
    setEnding(true)
    try {
      const res = await fetch(`/api/peer/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewerScore: score }),
      })
      const data = await res.json()
      if (data.aiSummary) setAiSummary(data.aiSummary)
      setStatus('completed')
    } finally {
      setEnding(false)
      setShowEndModal(false)
    }
  }

  if (status === 'completed' && aiSummary) {
    return (
      <div className="min-h-screen bg-[#04050e] text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-2xl border border-white/[0.08] bg-[#0a0c1a] p-8 text-center">
          <div className="text-4xl mb-5">🎉</div>
          <h1 className="text-xl font-semibold mb-2">Session complete</h1>
          <p className="text-sm text-white/40 mb-6">AI summary</p>
          <div className="text-sm text-white/65 leading-relaxed bg-white/[0.03] rounded-xl p-4 mb-6 text-left">
            {aiSummary}
          </div>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-2.5 rounded-xl bg-[#2DE2C5] text-[#04050e] font-semibold text-sm hover:bg-[#2DE2C5]/90 transition-colors">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#04050e] text-white">
      <CandidateNav />

      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {participants.map(p => (
            <div key={p.username || p.name} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ROLE_COLOR[p.role] }}
              />
              <span className="text-xs" style={{ color: p.isMe ? 'white' : 'rgba(255,255,255,0.5)' }}>
                {p.name || p.username}
                <span className="text-white/25 ml-1">({p.role})</span>
              </span>
            </div>
          ))}
          {status === 'waiting' && (
            <span className="text-xs text-[#8B7CF8] flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for peer…
            </span>
          )}
        </div>
        <button
          onClick={() => setShowEndModal(true)}
          className="text-xs text-white/30 hover:text-white/60 border border-white/[0.06] px-3 py-1.5 rounded-lg transition-colors"
        >
          End session
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => {
          const isAI = msg.role === 'ai_moderator'
          const color = ROLE_COLOR[msg.role] || '#fff'
          return (
            <div key={i} className={`flex gap-3 ${isAI ? 'items-start' : ''}`}>
              {isAI && (
                <div className="w-7 h-7 rounded-full bg-[#8B7CF8]/15 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#8B7CF8]" />
                </div>
              )}
              <div className={`max-w-[80%] ${isAI ? '' : ''}`}>
                <div className="text-[10px] mb-1" style={{ color: color + '99' }}>
                  {isAI ? 'AI Moderator' : msg.senderName}
                  <span className="text-white/20 ml-2">{msg.role}</span>
                </div>
                <div
                  className={`text-sm rounded-xl px-4 py-2.5 leading-relaxed ${
                    isAI
                      ? 'bg-[#8B7CF8]/[0.08] border border-[#8B7CF8]/20 text-white/70'
                      : 'bg-white/[0.04] border border-white/[0.06]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && status === 'active' && (
          <p className="text-sm text-white/30 text-center mt-8">Session is active. Start the interview!</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {status === 'active' && (
        <div className="border-t border-white/[0.06] px-4 py-4 shrink-0">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={myParticipant?.role === 'interviewer' ? 'Ask your question…' : 'Your answer…'}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-white/[0.16] transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#2DE2C5] text-[#04050e] font-semibold disabled:opacity-40 hover:bg-[#2DE2C5]/90 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* End modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0c1a] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">End session?</h2>
            {myParticipant?.role === 'interviewer' && (
              <div className="mb-4">
                <label className="text-xs text-white/40 mb-2 block">Score the candidate (0–100)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} value={score}
                    onChange={e => setScore(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 text-sm font-mono text-[#2DE2C5]">
                    <Star className="w-3.5 h-3.5" /> {score}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={endSession}
                disabled={ending}
                className="flex-1 py-2 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/20 text-[#FB7185] text-sm hover:bg-[#FB7185]/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                End & summarise
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
