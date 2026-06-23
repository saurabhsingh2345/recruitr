'use client'

import { useEffect, useState } from 'react'
import { CandidateNav } from '@/components/CandidateNav'
import { Loader2, Users, Activity, Building2, Mail, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface AdminStats {
  users: { total: number; newLast30: number }
  sessions: { total: number; completed: number; last7Days: number; companyMode: number; completionRate: number }
  teams: { total: number }
  briefs: { total: number }
  topSkills: { skill: string; count: number }[]
  dailySessions: { date: string; count: number }[]
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="text-xs text-white/30 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 403) { setForbidden(true); return null }
        return r.ok ? r.json() : null
      })
      .then(d => { if (d) setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#04050e] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#2DE2C5]" />
    </div>
  )

  if (forbidden) return (
    <div className="h-screen flex overflow-hidden bg-[#04050e] text-white">
      <CandidateNav />
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Access denied</h1>
          <p className="text-sm text-white/40">This page is restricted to admins.</p>
        </div>
      </main>
    </div>
  )

  if (!stats) return (
    <div className="h-screen flex overflow-hidden bg-[#04050e] text-white">
      <CandidateNav />
      <main className="flex-1 overflow-y-auto flex items-center justify-center text-white/40">Failed to load stats.</main>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden bg-[#04050e] text-white">
      <CandidateNav />
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Growth dashboard</h1>
          <p className="text-sm text-white/35">Flywheel metrics — live</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total users" value={stats.users.total} sub={`+${stats.users.newLast30} last 30d`} color="#2DE2C5" />
          <StatCard label="Sessions (7d)" value={stats.sessions.last7Days} sub={`${stats.sessions.completionRate}% completion`} color="#3FC5F0" />
          <StatCard label="Company mode" value={stats.sessions.companyMode} sub="sessions with JD" color="#8B7CF8" />
          <StatCard label="Teams" value={stats.teams.total} sub={`${stats.briefs.total} briefs sent`} color="#C77DFF" />
        </div>

        {/* Daily sessions sparkline */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#3FC5F0]" />
            <span className="text-sm font-medium">Sessions — last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.dailySessions} barSize={24}>
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip
                contentStyle={{ background: '#0a0c1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} sessions`]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.dailySessions.map((_, i) => (
                  <Cell key={i} fill={`rgba(63,197,240,${0.4 + i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top skills */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#2DE2C5]" />
              <span className="text-sm font-medium">Top practised skills</span>
            </div>
            <div className="space-y-2">
              {stats.topSkills.slice(0, 8).map((s, i) => {
                const max = stats.topSkills[0]?.count || 1
                const pct = Math.round((s.count / max) * 100)
                return (
                  <div key={s.skill} className="flex items-center gap-3">
                    <div className="w-4 text-[10px] text-white/25 text-right">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white/70 truncate">{s.skill || 'General'}</span>
                        <span className="text-[10px] text-white/30 ml-2 shrink-0">{s.count}</span>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#2DE2C5]/40" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Flywheel summary */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[#8B7CF8]" />
              <span className="text-sm font-medium">Flywheel health</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/40">Session completion</span>
                  <span className="text-white/60">{stats.sessions.completionRate}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2DE2C5]/60 rounded-full" style={{ width: `${stats.sessions.completionRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/40">Company mode adoption</span>
                  <span className="text-white/60">{stats.sessions.total > 0 ? Math.round((stats.sessions.companyMode / stats.sessions.total) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8B7CF8]/60 rounded-full"
                    style={{ width: `${stats.sessions.total > 0 ? Math.round((stats.sessions.companyMode / stats.sessions.total) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <Users className="w-4 h-4 text-[#3FC5F0] mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono text-[#3FC5F0]">{stats.users.total}</div>
                  <div className="text-[10px] text-white/30">total users</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <Mail className="w-4 h-4 text-[#C77DFF] mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono text-[#C77DFF]">{stats.briefs.total}</div>
                  <div className="text-[10px] text-white/30">briefs sent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}
