'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CandidateNav } from '@/components/CandidateNav'
import { ArrowLeft, Mail, Loader2, ChevronDown } from 'lucide-react'

interface Brief {
  _id: string
  weekOf: string
  sentAt: string
  subject: string
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bodyHtml, setBodyHtml] = useState<Record<string, string>>({})
  const [loadingBody, setLoadingBody] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me/briefs')
      .then(r => r.ok ? r.json() : { briefs: [] })
      .then(d => { setBriefs(d.briefs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function toggleBrief(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (bodyHtml[id]) return
    setLoadingBody(id)
    const r = await fetch(`/api/me/briefs/${id}`)
    if (r.ok) {
      const d = await r.json()
      setBodyHtml(prev => ({ ...prev, [id]: d.bodyHtml || '' }))
    }
    setLoadingBody(null)
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#04050e] text-white">
      <CandidateNav />
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/agent" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Atlas
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#8B7CF8]/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-[#8B7CF8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Weekly brief archive</h1>
            <p className="text-xs text-white/35 mt-0.5">All your Atlas weekly summaries</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B7CF8]" />
          </div>
        ) : briefs.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">No weekly briefs yet.</p>
            <p className="text-xs text-white/20 mt-1">Keep practising — Atlas sends your first brief after your first interview week.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map(b => (
              <div key={b._id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => toggleBrief(b._id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{b.subject}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      Week of {new Date(b.weekOf).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}sent {new Date(b.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 ml-3 transition-transform ${expanded === b._id ? 'rotate-180' : ''}`} />
                </button>

                {expanded === b._id && (
                  <div className="px-5 pb-5 border-t border-white/[0.04]">
                    {loadingBody === b._id ? (
                      <div className="py-6 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                      </div>
                    ) : bodyHtml[b._id] ? (
                      <div
                        className="prose prose-invert prose-sm max-w-none pt-4 text-white/70"
                        dangerouslySetInnerHTML={{ __html: bodyHtml[b._id] }}
                      />
                    ) : (
                      <p className="text-xs text-white/30 pt-4">Content unavailable.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
