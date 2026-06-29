'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Clock, Users, BarChart2, ChevronRight, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AssessmentCredits } from '@/components/recruiter/AssessmentCredits'

interface Assessment {
  _id: string
  title: string
  role: string
  candidateCount: number
  deadline: string
  status: 'draft' | 'active' | 'closed'
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20',
  closed: 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20',
  draft: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
}

export default function AssessmentsListPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recruiter/assessments')
      .then((r) => r.json())
      .then((d) => setAssessments(d.assessments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Assessments</h1>
            <p className="text-sm text-[#888FC0]">Send structured multi-round assessments to external candidates</p>
          </div>
          <Link href="/recruiter/assessments/new">
            <Button className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold gap-2">
              <Plus className="w-4 h-4" /> Create assessment
            </Button>
          </Link>
        </div>

        <AssessmentCredits />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-16 text-center">
            <BarChart2 className="w-10 h-10 text-[#888FC0] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">No assessments yet</h3>
            <p className="text-sm text-[#888FC0] mb-6 max-w-sm mx-auto">
              Create your first assessment to send structured multi-round interviews to candidates without requiring an Intervue account.
            </p>
            <Link href="/recruiter/assessments/new">
              <Button className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
                Create first assessment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => (
              <Link key={a._id} href={`/recruiter/assessments/${a._id}`}
                className="flex items-center gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold truncate">{a.title}</span>
                    <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[a.status] || STATUS_COLORS.draft}`}>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#888FC0]">
                    <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{a.role}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.candidateCount} candidate{a.candidateCount !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due {new Date(a.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#888FC0] group-hover:text-white transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
