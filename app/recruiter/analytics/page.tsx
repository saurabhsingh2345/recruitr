'use client'

import { useEffect, useState } from 'react'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, Clock, Users, Briefcase, Zap } from 'lucide-react'

interface Analytics {
  funnel: { surfaced: number; applied: number; interviewed: number; offered: number }
  assessmentFunnel?: { invited: number; completed: number; strongHire: number; withOutcome: number }
  calibration?: { verifiedHireRate: number | null; sampleSize: number; recommendedCount: number }
  outcomeProof?: { hireSignalsLogged: number; uniqueHiredCandidates: number }
  avgDaysToOffer: number | null
  weeklyData: Array<{ week: string; surfaced: number; applied: number }>
  skillGaps: Array<{ skill: string; count: number }>
  heatmap: number[][]
  activeRoles: number
  totalRoles: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recruiter/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#0B0D1A] text-white">
      <RecruiterNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#2DE2C5]" />
            Hiring velocity
          </h1>
          <p className="text-sm text-[#888FC0] mt-1">Last 12 weeks · all roles</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : data ? (
            [
              { label: 'Surfaced', value: data.funnel.surfaced, icon: Zap, color: '#2DE2C5' },
              { label: 'Applied', value: data.funnel.applied, icon: Users, color: '#22D3EE' },
              { label: 'Interviewed', value: data.funnel.interviewed, icon: Briefcase, color: '#A78BFA' },
              { label: 'Offered', value: data.funnel.offered, icon: TrendingUp, color: '#34d399' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-xs text-[#888FC0]">{label}</span>
                </div>
                <div className="text-3xl font-black" style={{ color }}>{value}</div>
              </div>
            ))
          ) : null}
        </div>

        {/* Avg time to offer */}
        {data?.avgDaysToOffer != null && (
          <div className="mb-8 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
            <Clock className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm text-[#AEB5E0]">
              Average time to offer: <strong className="text-white">{data.avgDaysToOffer} days</strong>
            </span>
          </div>
        )}

        {/* Assessment outcome loop */}
        {data?.assessmentFunnel && data.assessmentFunnel.invited > 0 && (
          <div className="mb-8 p-6 rounded-2xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/5">
            <h2 className="text-sm font-semibold mb-4 text-[#2DE2C5]">Assessment → hire loop</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Invited', value: data.assessmentFunnel.invited },
                { label: 'Completed', value: data.assessmentFunnel.completed },
                { label: 'Hire verdict', value: data.assessmentFunnel.strongHire },
                { label: 'Outcomes logged', value: data.assessmentFunnel.withOutcome },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-2xl font-black font-mono text-white">{value}</div>
                  <div className="text-xs text-[#888FC0]">{label}</div>
                </div>
              ))}
            </div>
            {data.calibration && data.calibration.sampleSize > 0 && (
              <p className="text-xs text-[#AEB5E0]">
                Of Intervue-recommended candidates,{' '}
                <strong className="text-white">
                  {data.calibration.verifiedHireRate != null
                    ? `${Math.round(data.calibration.verifiedHireRate * 100)}%`
                    : '—'}
                </strong>
                {' '}were hired or advanced ({data.calibration.sampleSize} outcomes logged)
              </p>
            )}
            {data.outcomeProof && data.outcomeProof.hireSignalsLogged > 0 && (
              <p className="text-xs text-[#888FC0] mt-2">
                Platform: {data.outcomeProof.uniqueHiredCandidates} candidates with hire signals logged
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly trend chart */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <h2 className="text-sm font-semibold mb-4 text-[#AEB5E0]">Weekly pipeline</h2>
            {loading ? (
              <Skeleton className="h-40" />
            ) : data && data.weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#555B8A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#555B8A' }} />
                  <Tooltip
                    contentStyle={{ background: '#12152A', border: '1px solid #1E2347', borderRadius: 8 }}
                    labelStyle={{ color: '#AEB5E0' }}
                  />
                  <Line type="monotone" dataKey="surfaced" stroke="#2DE2C5" strokeWidth={2} dot={false} name="Surfaced" />
                  <Line type="monotone" dataKey="applied" stroke="#A78BFA" strokeWidth={2} dot={false} name="Applied" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#555B8A] py-10 text-center">No pipeline data yet</p>
            )}
          </div>

          {/* Skill gap chart */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <h2 className="text-sm font-semibold mb-4 text-[#AEB5E0]">Top skill gaps</h2>
            {loading ? (
              <Skeleton className="h-40" />
            ) : data && data.skillGaps.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.skillGaps} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#555B8A' }} />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    tick={{ fontSize: 10, fill: '#AEB5E0' }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ background: '#12152A', border: '1px solid #1E2347', borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="#f87171" radius={[0, 4, 4, 0]} name="Candidates below bar" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#555B8A] py-10 text-center">No skill gap data yet</p>
            )}
          </div>
        </div>

        {/* Activity heatmap */}
        {data?.heatmap && (
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <h2 className="text-sm font-semibold mb-4 text-[#AEB5E0]">Scout activity heatmap (UTC)</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-0.5 mb-1 ml-10">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-4 text-[8px] text-[#555B8A] text-center">{h % 6 === 0 ? h : ''}</div>
                ))}
              </div>
              {data.heatmap.map((dayRow: number[], d: number) => {
                const maxVal = Math.max(...data.heatmap.flat(), 1)
                return (
                  <div key={d} className="flex items-center gap-0.5 mb-0.5">
                    <span className="w-8 text-[9px] text-[#555B8A] text-right pr-2">{DAYS[d]}</span>
                    {dayRow.map((val: number, h: number) => {
                      const intensity = val / maxVal
                      return (
                        <div
                          key={h}
                          className="w-4 h-4 rounded-[2px]"
                          style={{
                            background: val > 0 ? `rgba(45,226,197,${0.1 + intensity * 0.9})` : '#ffffff08',
                          }}
                          title={`${DAYS[d]} ${h}:00 UTC — ${val} events`}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
