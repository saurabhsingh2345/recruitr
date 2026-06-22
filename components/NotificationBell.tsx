'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface InboxNotification {
  _id: string
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, string> = {
  interview_complete: '🎯',
  score_milestone: '🏆',
  leaderboard_entry: '⚡',
  certificate_issued: '🎓',
  handshake_surfaced: '🤝',
  weekly_brief: '📊',
  recruiter_viewed: '👁',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<InboxNotification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchInbox()
    const interval = setInterval(fetchInbox, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function fetchInbox() {
    try {
      const res = await fetch('/api/notifications/inbox')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnread(data.unread || 0)
    } catch { /* best-effort */ }
  }

  async function handleOpen() {
    setOpen(v => !v)
    if (!open && unread > 0) {
      try {
        await fetch('/api/notifications/inbox', { method: 'PATCH' })
        setUnread(0)
        setNotifications(ns => ns.map(n => ({ ...n, read: true })))
      } catch { /* ignore */ }
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-md text-foreground/35 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold bg-[#2DE2C5] text-[#04050e] rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-sidebar border border-sidebar-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-sidebar-border/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground/50 tracking-wider uppercase">Notifications</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-foreground/30">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const inner = (
                  <div className={`flex gap-3 px-3 py-2.5 hover:bg-foreground/[0.04] transition-colors border-b border-foreground/[0.03] last:border-0 ${!n.read ? 'bg-[#2DE2C5]/[0.03]' : ''}`}>
                    <span className="text-[18px] leading-none mt-0.5 shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium truncate ${!n.read ? 'text-foreground' : 'text-foreground/65'}`}>{n.title}</div>
                      {n.body && <div className="text-[11px] text-foreground/40 mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-foreground/25 mt-0.5">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#2DE2C5] mt-1.5 shrink-0" />}
                  </div>
                )
                return n.link ? (
                  <Link key={n._id} href={n.link} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n._id}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
