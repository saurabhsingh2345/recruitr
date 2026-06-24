import { Metadata } from 'next'
import Link from 'next/link'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Building2, ArrowRight, Zap, ChevronLeft } from 'lucide-react'
import { CompaniesAuthCTA } from './CompaniesAuthCTA'
import { COMPANY_TRACKS } from '@/lib/data/companyTracks'

export const metadata: Metadata = {
  title: 'Company Interview Styles | Intervue',
  description:
    'Practice interview questions tailored to specific companies. See how Google, Amazon, Stripe and more run their technical interviews.',
}

interface CompanyEntry {
  name: string
  sessionCount: number
  avgScore: number | null
  style: string | null
}

async function getCompanies(): Promise<CompanyEntry[]> {
  try {
    await connectDB()
    const agg = await InterviewSession.aggregate([
      { $match: { 'companyMode.company': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$companyMode.company',
          sessionCount: { $sum: 1 },
          avgScore: { $avg: '$scores.overall' },
          styles: { $addToSet: '$companyMode.style' },
        },
      },
      { $sort: { sessionCount: -1 } },
      { $limit: 60 },
    ])
    return agg.map((c: { _id: string; sessionCount: number; avgScore: number; styles: string[] }) => ({
      name: c._id,
      sessionCount: c.sessionCount,
      avgScore: c.avgScore ? Math.round(c.avgScore) : null,
      style: c.styles.find((s: string) => s) || null,
    }))
  } catch {
    return []
  }
}

const SEED: CompanyEntry[] = [
  { name: 'Google', sessionCount: 0, avgScore: null, style: 'Emphasises systems design, Googleyness, and structured behavioural questions. Expect 2–3 rounds of LeetCode-medium/hard.' },
  { name: 'Amazon', sessionCount: 0, avgScore: null, style: 'Heavy Leadership Principles focus. Every answer — even technical ones — should map to an LP with a concrete STAR example.' },
  { name: 'Meta', sessionCount: 0, avgScore: null, style: 'Product sense + execution. Coding rounds lean on graph and DP problems. System design at E5+ is product-scale.' },
  { name: 'Stripe', sessionCount: 0, avgScore: null, style: 'Deep technical curiosity expected. Expect open-ended debugging, API design, and reliability trade-offs.' },
  { name: 'Atlassian', sessionCount: 0, avgScore: null, style: 'Values-driven. Ship it, team, customers — frame every behavioural answer through that lens.' },
  { name: 'Flipkart', sessionCount: 0, avgScore: null, style: 'Strong DSA bar. Coding rounds are LeetCode-hard. LLD heavy in system design.' },
  { name: 'Razorpay', sessionCount: 0, avgScore: null, style: 'Payments domain context expected. Backend-heavy with reliability and fault-tolerance questions.' },
  { name: 'Zepto', sessionCount: 0, avgScore: null, style: 'Fast-paced. Values scrappiness and execution under ambiguity. Expect case-style problem solving.' },
  { name: 'Swiggy', sessionCount: 0, avgScore: null, style: 'Real-time systems focus. Delivery routing, surge pricing design. Strong on HLD with operational trade-offs.' },
  { name: 'Meesho', sessionCount: 0, avgScore: null, style: 'Product thinking + backend scale. Growth metrics, recommendation systems, and tier-2 India use cases.' },
  { name: 'CRED', sessionCount: 0, avgScore: null, style: 'High bar on product craft and code quality. Expect design reviews and past project deep-dives.' },
  { name: 'PhonePe', sessionCount: 0, avgScore: null, style: 'Payments and distributed systems. High availability design, consistency vs. availability trade-offs.' },
]

export default async function CompaniesPage() {
  const companies = await getCompanies()
  const display: CompanyEntry[] = companies.length >= 5 ? companies : [...SEED, ...companies]

  return (
    <div className="min-h-screen bg-[#05060f] text-white">

      {/* ── Nav ── */}
      <nav className="border-b border-white/[0.06] bg-[#05060f]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
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

      <div className="max-w-5xl mx-auto px-5 py-14">

        {/* ── Hero ── */}
        <div className="mb-14 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2DE2C5]/20 text-[#2DE2C5] text-xs mb-5">
            <Zap className="w-3.5 h-3.5" />
            Company-mode interviews
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            Practice interviews tailored<br className="hidden sm:block" /> to specific companies
          </h1>
          <p className="text-white/45 text-base leading-relaxed mb-6">
            Paste any job description. Intervue AI reads the company&apos;s signals —
            technical bar, culture, focus areas — and runs the entire session to match
            how that company actually interviews.
          </p>
          <CompaniesAuthCTA hero />
        </div>

        {/* ── Company grid ── */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold">
            {companies.length >= 5 ? `${companies.length} companies practised` : 'Popular companies'}
          </h2>
          <span className="text-[10px] text-white/20">Community-sourced data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          {/* Curated tracks first */}
          {COMPANY_TRACKS.map((track) => {
            const dbEntry = companies.find(c => c.name.toLowerCase() === track.name.toLowerCase())
            return (
              <Link
                key={track.id}
                href={`/companies/${track.id}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-[#2DE2C5]/30 hover:bg-white/[0.03] transition-all group block"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#8B7CF8]/10 border border-[#8B7CF8]/15 flex items-center justify-center shrink-0">
                    <span className="text-[#8B7CF8] font-bold text-xs">{track.logo}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate flex items-center gap-2">
                      {track.name}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/15 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {track.rounds.length} rounds
                      </span>
                    </div>
                    <div className="text-[10px] text-white/25 mt-0.5">
                      {dbEntry && dbEntry.sessionCount > 0
                        ? `${dbEntry.sessionCount} session${dbEntry.sessionCount !== 1 ? 's' : ''}${dbEntry.avgScore ? ` · avg ${dbEntry.avgScore}/100` : ''}`
                        : track.stage}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/40 leading-relaxed line-clamp-2 mb-3">{track.interviewStyle}</p>
                <div className="flex items-center gap-1 text-[11px] text-[#2DE2C5] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  View track <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            )
          })}
          {/* DB-only companies (no matching track) */}
          {display.filter(c => !COMPANY_TRACKS.some(t => t.name.toLowerCase() === c.name.toLowerCase())).map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] hover:bg-white/[0.03] transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#8B7CF8]/10 border border-[#8B7CF8]/15 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#8B7CF8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{c.name}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">
                    {c.sessionCount > 0
                      ? `${c.sessionCount} practice session${c.sessionCount !== 1 ? 's' : ''}`
                      : 'Be the first to practice'}
                    {c.avgScore ? ` · avg ${c.avgScore}/100` : ''}
                  </div>
                </div>
              </div>
              {c.style && (
                <p className="text-xs text-white/40 leading-relaxed line-clamp-3">{c.style}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="rounded-2xl border border-[#2DE2C5]/15 bg-[#2DE2C5]/[0.04] p-8 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Your company not listed?</h2>
          <p className="text-sm text-white/40 mb-6 max-w-md mx-auto leading-relaxed">
            Paste any JD — Intervue AI infers the company&apos;s interview style and
            simulates a full tailored round in under 60 seconds.
          </p>
          <CompaniesAuthCTA hero />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-6 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-xs text-white">intervue</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/25">
            <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
            <Link href="/leaderboard" className="hover:text-white/50 transition-colors">Leaderboard</Link>
            <Link href="/recruiter/login" className="hover:text-white/50 transition-colors">Recruiters</Link>
            <span>© 2026 Intervue</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
