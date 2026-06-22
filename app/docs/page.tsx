import { Code2, Globe, ShieldCheck, Zap } from 'lucide-react'

export const metadata = { title: 'Intervue Open API Docs' }

export default function DocsPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://intervue.in'

  return (
    <main className="min-h-screen bg-[#0B0D1A] text-[#AEB5E0] p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[4px] text-[#2DE2C5] mb-3">Intervue · Open API</p>
          <h1 className="text-4xl font-black text-white mb-3">Proof API v1</h1>
          <p className="text-lg text-[#888FC0]">
            Read-only access to verified proof scores. No API key required.
            Rate limited to <strong className="text-white">100 requests / IP / hour</strong>.
          </p>
        </div>

        {/* Callout cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Globe, label: 'Public', desc: 'No auth required' },
            { icon: Zap, label: '100 req/hr', desc: 'Per IP address' },
            { icon: ShieldCheck, label: 'Read-only', desc: 'GET only' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Icon className="w-5 h-5 text-[#2DE2C5] mb-2" />
              <div className="font-semibold text-white">{label}</div>
              <div className="text-xs text-[#555B8A]">{desc}</div>
            </div>
          ))}
        </div>

        {/* Endpoints */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#2DE2C5]" /> Endpoints
          </h2>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {/* GET proof */}
            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20">
                  GET
                </span>
                <code className="text-sm text-white font-mono">/api/v1/proof/:username/:skill</code>
              </div>
              <p className="text-sm text-[#888FC0] mb-4">
                Returns a candidate's verified proof score for a specific skill.
              </p>

              <h4 className="text-xs uppercase tracking-widest text-[#555B8A] mb-2">Parameters</h4>
              <table className="w-full text-sm mb-4">
                <tbody>
                  {[
                    ['username', 'string', 'Intervue username'],
                    ['skill', 'string', 'Skill name (case-insensitive)'],
                  ].map(([p, t, d]) => (
                    <tr key={p} className="border-t border-white/[0.04]">
                      <td className="py-2 pr-4 font-mono text-[#2DE2C5] text-xs">{p}</td>
                      <td className="py-2 pr-4 text-[#555B8A] text-xs">{t}</td>
                      <td className="py-2 text-[#888FC0] text-xs">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="text-xs uppercase tracking-widest text-[#555B8A] mb-2">Example response</h4>
              <pre className="bg-[#090B18] rounded-xl p-4 text-xs font-mono text-[#AEB5E0] overflow-x-auto">
{`{
  "username": "torvalds",
  "skill": "linux",
  "proofScore": 92,
  "label": "Expert",
  "color": "#2DE2C5",
  "evidence": [
    "Maintains linux/linux with 3M+ commits",
    "...
  ],
  "scoreHistory": [
    { "score": 88, "source": "github", "at": "2026-01-01T00:00:00Z" },
    { "score": 92, "source": "interview", "at": "2026-06-01T00:00:00Z" }
  ],
  "lastUpdated": "2026-06-01T00:00:00Z",
  "proofUrl": "${base}/proof/torvalds/linux"
}`}
              </pre>
            </div>

            {/* Rate limit headers */}
            <div className="p-6">
              <h4 className="text-xs uppercase tracking-widest text-[#555B8A] mb-3">Rate limit headers</h4>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['X-RateLimit-Limit', '100'],
                    ['X-RateLimit-Remaining', 'Requests left in current window'],
                    ['Retry-After', 'Seconds to wait on 429'],
                  ].map(([h, v]) => (
                    <tr key={h} className="border-t border-white/[0.04]">
                      <td className="py-2 pr-4 font-mono text-[#2DE2C5] text-xs">{h}</td>
                      <td className="py-2 text-[#888FC0] text-xs">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Error codes */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Error codes</h2>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {[
              ['404', 'User or skill not found (also returned for invisible profiles)'],
              ['429', 'Rate limit exceeded — slow down requests'],
            ].map(([code, desc]) => (
              <div key={code} className="flex items-start gap-4 p-4 border-b border-white/[0.04] last:border-0">
                <span className="font-mono font-bold text-rose-400 text-sm w-10 flex-shrink-0">{code}</span>
                <span className="text-sm text-[#888FC0]">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Try it */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Try it</h2>
          <pre className="bg-[#090B18] rounded-xl p-4 text-xs font-mono text-[#AEB5E0] overflow-x-auto">
{`curl "${base}/api/v1/proof/{{username}}/{{skill}}"`}
          </pre>
        </section>
      </div>
    </main>
  )
}
