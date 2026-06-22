import { Metadata } from 'next'
import Link from 'next/link'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { CandidateNav } from '@/components/CandidateNav'
import { Building2, ArrowRight, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Company Interview Styles | Intervue',
  description: 'Practice interview questions tailored to specific companies. See how Google, Amazon, Stripe and more run their technical interviews.',
}

interface CompanyEntry {
  name: string
  sessionCount: number
  avgScore: number | null
  style: string | null
}

async function getCompanies(): Promise<CompanyEntry[]> {
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
}

export default async function CompaniesPage() {
  const companies = await getCompanies()

  // Fallback seed companies for SEO even if no real data yet
  const display: CompanyEntry[] = companies.length >= 5 ? companies : [
    { name: 'Google', sessionCount: 0, avgScore: null, style: 'Emphasises systems design, Googleyness, and structured behavioural questions.' },
    { name: 'Amazon', sessionCount: 0, avgScore: null, style: 'Heavy leadership principles focus. Every answer should map to an LP.' },
    { name: 'Meta', sessionCount: 0, avgScore: null, style: 'Product sense + execution. Coding rounds lean on graph/DP problems.' },
    { name: 'Stripe', sessionCount: 0, avgScore: null, style: 'Deep technical curiosity. Expect open-ended debugging and system design.' },
    { name: 'Atlassian', sessionCount: 0, avgScore: null, style: 'Values-driven. Ship it, team, customers — answer behavioural with that lens.' },
    { name: 'Flipkart', sessionCount: 0, avgScore: null, style: 'Strong DSA bar. Coding rounds are LeetCode-hard. LLD in system design.' },
    { name: 'Razorpay', sessionCount: 0, avgScore: null, style: 'Payments domain context expected. Backend-heavy with reliability questions.' },
    { name: 'Zepto', sessionCount: 0, avgScore: null, style: 'Fast-paced problem solving. Values scrappiness + execution under ambiguity.' },
    ...companies,
  ]

  return (
    <div className="min-h-screen bg-[#04050e] text-white">
      <CandidateNav />

      <div className="max-w-4xl mx-auto px-4 py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2DE2C5]/20 text-[#2DE2C5] text-xs mb-5">
            <Zap className="w-3.5 h-3.5" />
            Company-mode interviews
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Practice for specific companies
          </h1>
          <p className="text-white/45 text-base max-w-xl mx-auto leading-relaxed">
            Paste a job description from any company. Intervue AI tailors the interview style —
            questions, tone, and focus areas — to match how that company actually interviews.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-[#2DE2C5] text-[#04050e] text-sm font-semibold hover:bg-[#25c9ae] transition-colors"
          >
            Start a company-mode interview <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Company grid */}
        {display.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {display.map((c) => (
              <div key={c.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-colors group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#8B7CF8]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-[#8B7CF8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.name}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {c.sessionCount > 0 ? `${c.sessionCount} practice sessions` : 'Be the first to practice'}
                      {c.avgScore ? ` · avg ${c.avgScore}/100` : ''}
                    </div>
                  </div>
                </div>
                {c.style && (
                  <p className="text-xs text-white/45 leading-relaxed line-clamp-3">{c.style}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No company sessions yet. Be the first to practice with a JD.</p>
          </div>
        )}

        {/* CTA footer */}
        <div className="mt-12 rounded-2xl border border-[#2DE2C5]/15 bg-[#2DE2C5]/[0.04] p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Your company not listed?</h2>
          <p className="text-sm text-white/40 mb-5">
            Paste any job description and Intervue AI will analyse the company&apos;s interview style
            and simulate a tailored round in seconds.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2DE2C5] text-[#04050e] text-sm font-semibold hover:bg-[#25c9ae] transition-colors"
          >
            Try company mode <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
