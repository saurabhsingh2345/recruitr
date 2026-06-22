'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Send,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  Code2,
  Loader2,
  Shield,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { generateICS } from '@/lib/ics'

interface ThreadMessage {
  _id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  type: string
  timestamp: string
}

interface Application {
  _id: string
  recruiterId: string
  candidateId: string
  status: string
  recruiterInfo: { name: string; company: string; title: string; avatarUrl: string; username: string }
  candidateInfo: { name: string; username: string; avatarUrl: string; targetRole: string }
  jobTitle?: string
  messages: ThreadMessage[]
  interview?: {
    date: string; time: string; timezone: string; type: string; meetLink?: string; notes?: string; status: string
  }
  outcome?: { result: string; notes?: string }
}

const STATUS_COLORS: Record<string, string> = {
  active: '#AEB5E0',
  interview_scheduled: '#f59e0b',
  offer_extended: '#3FC5F0',
  hired: '#2DE2C5',
  rejected: '#f43f5e',
  withdrawn: '#AEB5E0',
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src)
    return <img src={src} alt={name} className="w-8 h-8 rounded-full border border-[#1A1E3A]" />
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#3FC5F0] flex items-center justify-center text-[#05060F] font-bold text-xs shrink-0">
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ScheduleModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: { date: string; time: string; timezone: string; type: string; meetLink: string; notes: string }) => void
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState('video')
  const [meetLink, setMeetLink] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0B0E1C] border border-[#1A1E3A] rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#2DE2C5]" />
          Propose interview time
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#AEB5E0] mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2DE2C5]/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#AEB5E0] mb-1 block">Time (IST)</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2DE2C5]/40"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#AEB5E0] mb-1 block">Interview type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2DE2C5]/40"
            >
              <option value="video">Video call</option>
              <option value="phone">Phone call</option>
              <option value="in_person">In person</option>
            </select>
          </div>
          {type !== 'in_person' && (
            <div>
              <label className="text-xs text-[#AEB5E0] mb-1 block">Meet link (optional)</label>
              <input
                type="url"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#2DE2C5]/40"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-[#AEB5E0] mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What to expect, topics, etc."
              rows={2}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-[#2DE2C5]/40"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[#1A1E3A] text-[#AEB5E0] hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!date || !time) { toast.error('Date and time required'); return }
              onSubmit({ date, time, timezone: 'Asia/Kolkata', type, meetLink, notes })
            }}
            className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e]"
          >
            Send invite
          </Button>
        </div>
      </div>
    </div>
  )
}

function OutcomeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (result: string, notes: string) => void
}) {
  const [result, setResult] = useState('hired')
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0B0E1C] border border-[#1A1E3A] rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-semibold mb-4">Update outcome</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'hired',    label: '🎉 Hired',     color: '#2DE2C5' },
              { value: 'rejected', label: '❌ Rejected',  color: '#f43f5e' },
              { value: 'withdrawn',label: '🔄 Withdraw',  color: '#AEB5E0' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setResult(opt.value)}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  result === opt.value
                    ? 'border-current bg-current/10'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/40'
                }`}
                style={result === opt.value ? { color: opt.color, borderColor: opt.color } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-[#AEB5E0] mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Feedback or reason..."
              rows={2}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-[#2DE2C5]/40"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[#1A1E3A] text-[#AEB5E0] hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(result, notes)}
            className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e]"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [app, setApp] = useState<Application | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showOutcomeModal, setShowOutcomeModal] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const [threadRes, meRes] = await Promise.all([
      fetch(`/api/applications/${id}`),
      fetch('/api/me'),
    ])
    if (threadRes.ok) {
      const data = await threadRes.json()
      setApp(data.application)
    }
    if (meRes.ok) {
      const me = await meRes.json()
      setCurrentUserId(String(me.user._id))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [app?.messages])

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/applications/${id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    })
    if (res.ok) {
      setInput('')
      await load()
    } else {
      toast.error('Failed to send')
    }
    setSending(false)
  }

  async function proposeSchedule(data: {
    date: string; time: string; timezone: string; type: string; meetLink: string; notes: string
  }) {
    const res = await fetch(`/api/applications/${id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowScheduleModal(false)
      toast.success('Interview invite sent')
      await load()
    } else {
      toast.error('Failed to send invite')
    }
  }

  async function respondToSchedule(action: 'confirm' | 'decline') {
    const res = await fetch(`/api/applications/${id}/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success(action === 'confirm' ? 'Interview confirmed!' : 'Declined')
      await load()
    }
  }

  async function markOutcome(result: string, notes: string) {
    const res = await fetch(`/api/applications/${id}/outcome`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, notes }),
    })
    if (res.ok) {
      setShowOutcomeModal(false)
      toast.success('Outcome updated')
      await load()
    }
  }

  function downloadCalendar() {
    if (!app?.interview?.date || !app?.interview?.time) return
    const other = app.recruiterId === currentUserId ? app.candidateInfo.name : app.recruiterInfo.name
    const ics = generateICS({
      title: `Technical Interview — ${other} × Intervue`,
      date: app.interview.date,
      time: app.interview.time,
      timezone: app.interview.timezone,
      meetLink: app.interview.meetLink,
      description: app.interview.notes,
    })
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'interview.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2DE2C5]" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="h-screen flex items-center justify-center text-[#AEB5E0]">
        Thread not found.{' '}
        <Link href="/messages" className="text-[#2DE2C5] ml-1">Back to messages</Link>
      </div>
    )
  }

  const isRecruiter = app.recruiterId === currentUserId
  const other = isRecruiter ? app.candidateInfo : app.recruiterInfo
  const statusColor = STATUS_COLORS[app.status] || '#AEB5E0'
  const canSchedule = isRecruiter && !['hired', 'rejected', 'withdrawn'].includes(app.status)
  const canRespond = !isRecruiter && app.interview?.status === 'proposed'
  const canMarkOutcome = isRecruiter && !['hired', 'rejected', 'withdrawn'].includes(app.status)

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-[#1A1E3A] flex items-center gap-3 px-4 shrink-0">
        <button
          onClick={() => router.push('/messages')}
          className="text-[#AEB5E0] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-6 h-6 rounded bg-[#2DE2C5] flex items-center justify-center">
          <Code2 className="w-3.5 h-3.5 text-[#05060F]" />
        </div>

        {other.avatarUrl ? (
          <img src={other.avatarUrl} alt={other.name} className="w-8 h-8 rounded-full border border-[#1A1E3A]" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#3FC5F0] flex items-center justify-center text-[#05060F] font-bold text-xs">
            {other.name?.[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{other.name}</div>
          {!isRecruiter && (app.recruiterInfo.company || app.recruiterInfo.title) && (
            <div className="text-xs text-[#AEB5E0]">
              {[app.recruiterInfo.title, app.recruiterInfo.company].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className="text-xs px-2"
            style={{ backgroundColor: statusColor + '20', color: statusColor, borderColor: statusColor + '40' }}
          >
            {app.status.replace('_', ' ')}
          </Badge>
          <Link href={`/p/${isRecruiter ? app.candidateInfo.username : app.recruiterInfo.username}`} target="_blank">
            <Button variant="ghost" size="sm" className="text-[#AEB5E0] hover:text-white h-7 px-2">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Interview banner */}
      {app.interview && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl border flex items-center gap-3 ${
            app.interview.status === 'confirmed'
              ? 'border-[#2DE2C5]/30 bg-[#2DE2C5]/5'
              : app.interview.status === 'declined'
              ? 'border-[#f43f5e]/30 bg-[#f43f5e]/5'
              : 'border-[#f59e0b]/30 bg-[#f59e0b]/5'
          }`}
        >
          <Calendar
            className="w-4 h-4 shrink-0"
            style={{
              color:
                app.interview.status === 'confirmed'
                  ? '#2DE2C5'
                  : app.interview.status === 'declined'
                  ? '#f43f5e'
                  : '#f59e0b',
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {app.interview.date && app.interview.time
                ? `${app.interview.date} at ${app.interview.time} IST`
                : 'Time TBD'}
              {app.interview.status === 'confirmed' && ' · Confirmed ✅'}
              {app.interview.status === 'declined' && ' · Declined'}
              {app.interview.status === 'proposed' && ' · Pending confirmation'}
            </div>
            {app.interview.meetLink && (
              <a
                href={app.interview.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3FC5F0] hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Join call
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canRespond && (
              <>
                <Button
                  size="sm"
                  onClick={() => respondToSchedule('confirm')}
                  className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] h-7 text-xs gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondToSchedule('decline')}
                  className="border-[#f43f5e]/40 text-[#f43f5e] hover:bg-[#f43f5e]/10 h-7 text-xs gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Decline
                </Button>
              </>
            )}
            {app.interview.status === 'confirmed' && app.interview.date && app.interview.time && (
              <Button
                size="sm"
                variant="outline"
                onClick={downloadCalendar}
                className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white h-7 text-xs gap-1"
              >
                <Download className="w-3.5 h-3.5" /> .ics
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Outcome banner */}
      {app.outcome && (
        <div
          className={`mx-4 mt-2 p-3 rounded-xl border flex items-center gap-2 text-sm ${
            app.outcome.result === 'hired'
              ? 'border-[#2DE2C5]/30 bg-[#2DE2C5]/5 text-[#2DE2C5]'
              : 'border-[#f43f5e]/30 bg-[#f43f5e]/5 text-[#f43f5e]'
          }`}
        >
          {app.outcome.result === 'hired' ? '🎉' : '❌'}
          <span className="font-medium capitalize">{app.outcome.result}</span>
          {app.outcome.notes && <span className="text-[#AEB5E0] font-normal">— {app.outcome.notes}</span>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {app.messages.map((msg) => {
          const isMine = msg.senderId === currentUserId
          const isSystem = ['schedule_invite', 'schedule_confirmed', 'schedule_declined', 'outcome'].includes(msg.type)

          if (isSystem) {
            return (
              <div key={msg._id} className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#11142a] border border-[#1A1E3A] text-xs text-[#AEB5E0] max-w-md text-center">
                  {msg.type === 'schedule_invite' && <Clock className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />}
                  {msg.type === 'schedule_confirmed' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5] shrink-0" />}
                  {msg.type === 'schedule_declined' && <XCircle className="w-3.5 h-3.5 text-[#f43f5e] shrink-0" />}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              </div>
            )
          }

          return (
            <div key={msg._id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
              {!isMine && <Avatar name={msg.senderName} src={msg.senderAvatar} />}
              <div className="max-w-[75%]">
                {!isMine && (
                  <div className="text-[10px] text-[#AEB5E0] mb-1 ml-1">{msg.senderName}</div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMine
                      ? 'bg-[#2DE2C5] text-[#05060F] rounded-tr-sm'
                      : 'bg-[#0B0E1C] border border-[#1A1E3A] text-[#F8F9FA] rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <div className={`text-[10px] text-[#AEB5E0] mt-0.5 ${isMine ? 'text-right' : ''}`}>
                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Recruiter actions bar */}
      {(canSchedule || canMarkOutcome) && (
        <div className="border-t border-[#1A1E3A] px-4 py-2 flex items-center gap-2 bg-[#07091a]">
          <span className="text-xs text-[#AEB5E0] mr-1">Actions:</span>
          {canSchedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowScheduleModal(true)}
              className="border-[#1A1E3A] text-[#AEB5E0] hover:text-[#f59e0b] hover:border-[#f59e0b]/30 text-xs h-7 gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              {app.interview ? 'Reschedule' : 'Schedule interview'}
            </Button>
          )}
          {canMarkOutcome && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOutcomeModal(true)}
              className="border-[#1A1E3A] text-[#AEB5E0] hover:text-[#2DE2C5] hover:border-[#2DE2C5]/30 text-xs h-7 gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Mark outcome
            </Button>
          )}
        </div>
      )}

      {/* Compose */}
      {!['hired', 'rejected', 'withdrawn'].includes(app.status) && (
        <div className="border-t border-[#1A1E3A] p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className="flex-1 bg-[#0B0E1C] border border-[#1A1E3A] rounded-xl px-3 py-2 text-sm text-[#F8F9FA] placeholder:text-[#AEB5E0] resize-none outline-none focus:border-[#2DE2C5]/40 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              size="sm"
              className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] self-end h-9 w-9 p-0 shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="text-[10px] text-[#AEB5E0] mt-1 px-1">Enter to send · Shift+Enter for newline</div>
        </div>
      )}

      {showScheduleModal && (
        <ScheduleModal onClose={() => setShowScheduleModal(false)} onSubmit={proposeSchedule} />
      )}
      {showOutcomeModal && (
        <OutcomeModal onClose={() => setShowOutcomeModal(false)} onSubmit={markOutcome} />
      )}
    </div>
  )
}
