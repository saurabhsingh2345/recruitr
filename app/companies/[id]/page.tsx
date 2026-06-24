import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ArrowRight, Clock, Layers, Target, Zap } from 'lucide-react'
import { getTrackById, COMPANY_TRACKS } from '@/lib/data/companyTracks'
import { CompaniesAuthCTA } from '../CompaniesAuthCTA'

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Analysis',
  pm_case: 'PM Case',
  design_critique: 'Design Critique',
  ops_case: 'Ops Case',
  sales_discovery: 'Sales Discovery',
}

const FORMAT_COLORS: Record<string, string> = {
  coding: '#2DE2C5',
  system_design: '#8B7CF8',
  project_deepdive: '#3FC5F0',
  behavioural: '#f59e0b',
  pm_case: '#f43f5e',
  design_critique: '#ec4899',
  ops_case: '#10b981',
  sales_discovery: '#f97316',
}

export async function generateStaticParams() {
  return COMPANY_TRACKS.map(t => ({ id: t.id }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const track = getTrackById(id)
  if (!track) return { title: 'Company not found | Intervue' }
  return {
    title: `${track.name} Interview Track | Intervue`,
    description: track.interviewStyle,
  }
}

export default async function CompanyDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const track = getTrackById(id)
  if (!track) notFound()

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-[#05060f]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/companies" className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm">
              <ChevronLeft className="w-3.5 h-3.5" />
              All companies
            </Link>
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none" className="shrink-0">
                <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
                <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-bold text-sm text-white">intervue</span>
            </div>
          </div>
          <CompaniesAuthCTA />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-5 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#8B7CF8]/10 border border-[#8B7CF8]/20 flex items-center justify-center">
              <span className="text-[#8B7CF8] font-bold text-lg">{track.logo}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{track.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.06]">
                  {track.stage}
                </span>
                <span className="text-xs text-white/30">{track.rounds.length} rounds</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-white/50 leading-relaxed max-w-2xl">{track.interviewStyle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rounds list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-4 h-4 text-[#2DE2C5]" />
              <h2 className="font-semibold text-sm">Interview Rounds</h2>
            </div>
            {track.rounds.map((round, idx) => {
              const color = FORMAT_COLORS[round.format] || '#2DE2C5'
              return (
                <div key={round.order}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.1] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ backgroundColor: `${color}15`, color }}>
                      {round.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold">{round.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: `${color}15`, color }}>
                          {FORMAT_LABELS[round.format] || round.format}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed mb-3">{round.focus}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-white/30">
                          <Clock className="w-3 h-3" />
                          {round.durationMinutes} min
                        </div>
                        <Link
                          href={`/interview/new?companyTrackId=${track.id}&roundIndex=${idx}&format=${round.format}&skill=${encodeURIComponent(track.targetSkills[0] || '')}`}
                          className="flex items-center gap-1 text-xs font-semibold transition-colors"
                          style={{ color }}
                        >
                          Start this round <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Start track CTA */}
            <div className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-[#2DE2C5]" />
                <span className="text-xs font-semibold text-[#2DE2C5]">Start Track</span>
              </div>
              <p className="text-xs text-white/45 mb-4 leading-relaxed">
                Begin Round 1 of the {track.name} track. Your progress is saved — complete rounds in order.
              </p>
              <Link
                href={`/interview/new?companyTrackId=${track.id}&roundIndex=0&format=${track.rounds[0].format}&skill=${encodeURIComponent(track.targetSkills[0] || '')}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#2DE2C5] text-[#05060f] text-sm font-semibold hover:bg-[#1fb89e] transition-colors"
              >
                Start Round 1 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Target skills */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-3.5 h-3.5 text-[#8B7CF8]" />
                <span className="text-xs font-semibold text-white/60">Skills Assessed</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {track.targetSkills.map(skill => (
                  <span key={skill}
                    className="text-[11px] px-2 py-1 rounded-lg bg-[#8B7CF8]/10 text-[#8B7CF8] border border-[#8B7CF8]/15">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Auth CTA */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-xs text-white/40 mb-3">Sign in to track your progress across rounds</p>
              <CompaniesAuthCTA />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
