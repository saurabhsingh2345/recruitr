'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Inbox, Calendar, CheckCircle2, GripVertical,
} from 'lucide-react'
import { CandidateNav } from '@/components/CandidateNav'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

/* ── Types ─────────────────────────────────────────────────── */

interface Thread {
  _id: string
  status: string
  unreadCount: number
  updatedAt: string
  recruiterInfo: { name: string; company: string; title: string; avatarUrl: string; username: string }
  candidateInfo: { name: string; username: string; avatarUrl: string; targetRole: string }
  jobTitle?: string
  lastMessage: { content: string; senderName: string; type: string } | null
  recruiterId: string
  candidateId: string
}

/* ── Columns config ─────────────────────────────────────────── */

const COLUMNS: { id: string; label: string; color: string; statuses: string[] }[] = [
  { id: 'contacted',  label: 'Contacted',  color: '#AEB5E0', statuses: ['active'] },
  { id: 'screening',  label: 'Screening',  color: '#8B7CF8', statuses: ['screening'] },
  { id: 'scheduled',  label: 'Scheduled',  color: '#f59e0b', statuses: ['interview_scheduled'] },
  { id: 'offer',      label: 'Offer',      color: '#3FC5F0', statuses: ['offer_extended'] },
  { id: 'closed',     label: 'Closed',     color: '#2DE2C5', statuses: ['hired', 'rejected', 'withdrawn'] },
]

const STATUS_FOR_COLUMN: Record<string, string> = {
  contacted: 'active',
  screening:  'screening',
  scheduled:  'interview_scheduled',
  offer:      'offer_extended',
  closed:     'hired',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Contacted', screening: 'Screening', interview_scheduled: 'Scheduled',
  offer_extended: 'Offer', hired: 'Hired 🎉', rejected: 'Closed', withdrawn: 'Withdrawn',
}

/* ── Thread card ───────────────────────────────────────────── */

function ThreadCard({
  thread,
  isRecruiter,
  colColor,
  index,
}: {
  thread: Thread
  isRecruiter: boolean
  colColor: string
  index: number
}) {
  const router = useRouter()
  const other = isRecruiter ? thread.candidateInfo : thread.recruiterInfo

  return (
    <Draggable draggableId={thread._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => router.push(`/messages/${thread._id}`)}
          className={`group relative rounded-xl border cursor-grab active:cursor-grabbing select-none overflow-hidden ${
            snapshot.isDragging
              ? 'shadow-2xl shadow-black/50 opacity-95'
              : 'hover:shadow-md hover:shadow-black/10'
          }`}
          style={{
            ...provided.draggableProps.style,
            background: 'var(--panel-bg)',
            borderColor: snapshot.isDragging ? `${colColor}70` : 'var(--panel-border)',
            transition: snapshot.isDragging
              ? 'box-shadow 0.15s ease, opacity 0.15s ease'
              : 'box-shadow 0.2s ease, border-color 0.2s ease',
          }}
        >
          {/* colored top accent bar */}
          <div className="h-[3px]" style={{ background: colColor }} />

          <div className="p-3.5 pt-3">
            {/* drag handle indicator — visual only */}
            <div className="absolute top-4 right-3 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
              <GripVertical className="w-3.5 h-3.5 text-white/40" />
            </div>

            {/* Person */}
            <div className="flex items-start gap-2.5 pr-6 mb-2.5">
              {other.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatarUrl} alt={other.name} className="w-8 h-8 rounded-full border border-white/[0.08] shrink-0" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ background: `linear-gradient(135deg, ${colColor}88, ${colColor}44)`, border: `1px solid ${colColor}30` }}
                >
                  {other.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[13px] font-semibold leading-tight truncate">{other.name}</span>
                  {thread.unreadCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: colColor }} />
                  )}
                </div>
                {!isRecruiter && thread.recruiterInfo.company && (
                  <span className="text-[11px] text-white/40 truncate block">{thread.recruiterInfo.company}</span>
                )}
                {isRecruiter && thread.candidateInfo.targetRole && (
                  <span className="text-[11px] text-white/40 truncate block">{thread.candidateInfo.targetRole}</span>
                )}
              </div>
            </div>

            {/* Job title */}
            {thread.jobTitle && (
              <div
                className="text-[10px] font-medium px-2 py-0.5 rounded border inline-block mb-2 max-w-full truncate"
                style={{ color: colColor, borderColor: `${colColor}30`, background: `${colColor}0d` }}
              >
                {thread.jobTitle}
              </div>
            )}

            {/* Message preview */}
            {thread.lastMessage && (
              <p className="text-[11px] text-white/35 line-clamp-2 leading-relaxed mb-2.5">
                {thread.lastMessage.type === 'schedule_invite' && (
                  <Calendar className="w-3 h-3 inline mr-1 text-[#f59e0b] shrink-0" />
                )}
                {thread.lastMessage.type === 'schedule_confirmed' && (
                  <CheckCircle2 className="w-3 h-3 inline mr-1 text-[#2DE2C5] shrink-0" />
                )}
                <span className="text-white/55 font-medium">{thread.lastMessage.senderName?.split(' ')[0]}:</span>{' '}
                {thread.lastMessage.content}
              </p>
            )}

            {/* Timestamp */}
            <div className="text-[10px] text-white/25 font-medium">
              {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [role, setRole] = useState('candidate')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const totalUnread = threads.reduce((s, t) => s + t.unreadCount, 0)

  useEffect(() => {
    async function load() {
      const [appsRes, meRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/me'),
      ])
      if (appsRes.ok) setThreads((await appsRes.json()).applications || [])
      if (meRes.ok) {
        const me = await meRes.json()
        setCurrentUserId(String(me.user._id))
        setRole(me.user.role || 'candidate')
      }
      setLoading(false)
    }
    load()
  }, [])

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStatus = STATUS_FOR_COLUMN[destination.droppableId]
    if (!newStatus) return

    setThreads((prev) =>
      prev.map((t) => t._id === draggableId ? { ...t, status: newStatus } : t)
    )

    const res = await fetch(`/api/applications/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      toast.error('Failed to update status')
      const appsRes = await fetch('/api/applications')
      if (appsRes.ok) setThreads((await appsRes.json()).applications || [])
    }
  }, [])

  const isRecruiter = (t: Thread) => t.recruiterId === currentUserId

  if (loading) {
    return (
      <div className="h-screen flex">
        <aside className="w-56 shrink-0 border-r border-white/[0.05] bg-sidebar" />
        <main className="flex-1 p-8 space-y-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {role === 'recruiter'
        ? <RecruiterNav unread={totalUnread} />
        : <CandidateNav unread={totalUnread} />
      }

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top bar */}
        <div className="shrink-0 border-b border-white/[0.05] bg-[#04050e]/90 backdrop-blur px-8 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold">Pipeline</span>
            {totalUnread > 0 && (
              <span className="text-[10px] font-bold bg-[#2DE2C5] text-[#05060F] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{totalUnread}</span>
            )}
            <span className="text-xs text-white/25">{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            {(['kanban', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-[#2DE2C5]/15 text-[#2DE2C5]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {mode === 'kanban' ? 'Board' : 'List'}
              </button>
            ))}
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <div className="font-semibold mb-1">No threads yet</div>
              <div className="text-sm text-white/35 max-w-xs">
                When a recruiter contacts you or you reach out via the recruiter dashboard, threads will appear here.
              </div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* ── List view ── */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-1.5">
              {threads.map((thread) => {
                const rec = isRecruiter(thread)
                const other = rec ? thread.candidateInfo : thread.recruiterInfo
                const col = COLUMNS.find((c) => c.statuses.includes(thread.status))
                return (
                  <Link key={thread._id} href={`/messages/${thread._id}`}>
                    <div className="p-4 rounded-xl border hover:border-white/[0.12] transition-all" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                      <div className="flex items-center gap-3">
                        {other.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={other.avatarUrl} alt={other.name} className="w-9 h-9 rounded-full border border-white/[0.08]" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-sm shrink-0">
                            {other.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm">{other.name}</span>
                            {thread.unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-[#2DE2C5]" />}
                            <span className="ml-auto text-[10px] text-white/30">
                              {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/35 truncate flex-1">{thread.lastMessage?.content}</span>
                            {col && (
                              <span
                                className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                                style={{ color: col.color, background: `${col.color}15`, border: `1px solid ${col.color}25` }}
                              >
                                {col.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Kanban board ── */
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="h-full flex gap-4 p-6" style={{ minWidth: `${COLUMNS.length * 272 + 64}px` }}>
                {COLUMNS.map((col) => {
                  const colThreads = threads.filter((t) => col.statuses.includes(t.status))
                  return (
                    <div key={col.id} className="h-full w-64 shrink-0 flex flex-col">
                      {/* Column header */}
                      <div className="flex items-center gap-2 mb-3 px-0.5 shrink-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60">{col.label}</span>
                        </div>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center shrink-0"
                          style={{ color: colThreads.length ? col.color : 'rgba(255,255,255,0.2)', background: colThreads.length ? `${col.color}15` : 'rgba(255,255,255,0.04)' }}
                        >
                          {colThreads.length}
                        </span>
                      </div>

                      {/* Drop zone */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex-1 min-h-0 overflow-y-auto space-y-2.5 rounded-xl p-1.5"
                            style={{
                              background: snapshot.isDraggingOver ? `${col.color}08` : 'transparent',
                              border: snapshot.isDraggingOver ? `1.5px dashed ${col.color}40` : '1.5px solid transparent',
                              transition: 'background 0.15s ease, border-color 0.15s ease',
                            }}
                          >
                            {colThreads.map((thread, index) => (
                              <ThreadCard
                                key={thread._id}
                                thread={thread}
                                isRecruiter={isRecruiter(thread)}
                                colColor={col.color}
                                index={index}
                              />
                            ))}
                            {provided.placeholder}
                            {colThreads.length === 0 && !snapshot.isDraggingOver && (
                              <div
                                className="rounded-xl border border-dashed flex flex-col items-center justify-center py-8 gap-2"
                                style={{ borderColor: `${col.color}18` }}
                              >
                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${col.color}12` }}>
                                  <div className="w-2 h-2 rounded-full" style={{ background: `${col.color}50` }} />
                                </div>
                                <span className="text-[10px] text-white/20 font-medium">No {col.label.toLowerCase()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )
                })}
              </div>
            </DragDropContext>
          </div>
        )}
      </main>
    </div>
  )
}
