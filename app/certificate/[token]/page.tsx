import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/mongodb'
import { Certificate } from '@/lib/models/Certificate'
import { User } from '@/lib/models/User'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { Metadata } from 'next'
import { LinkedInShareButton } from './LinkedInShareButton'
import { ShieldCheck, ExternalLink } from 'lucide-react'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return {
    title: `Intervue Certificate`,
    openGraph: {
      images: [`${base}/api/certificate/${token}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`${base}/api/certificate/${token}`],
    },
  }
}

export default async function CertificatePage({ params }: PageProps) {
  const { token } = await params
  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cert = await Certificate.findOne({ token }).lean<any>()
  if (!cert) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(cert.userId).select('name username avatarUrl').lean<any>()

  const label = getScoreLabel(cert.scoreAtIssuance)
  const color = getScoreColor(cert.scoreAtIssuance)
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const certUrl = `${base}/certificate/${token}`
  const ogImage = `${base}/api/certificate/${token}`

  // LinkedIn share URL
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}`

  return (
    <main className="min-h-screen bg-[#0B0D1A] flex flex-col items-center justify-center p-6">
      {/* Certificate card */}
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${color}30`, background: '#12152A' }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        <div className="p-10 text-center">
          {/* Issuer */}
          <p className="text-[10px] tracking-[4px] text-[#555B8A] uppercase mb-6">
            Intervue · Proof of Skill
          </p>

          {/* Milestone badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-1.5 mb-6 text-sm font-bold tracking-widest uppercase"
            style={{ background: `${color}15`, border: `1px solid ${color}40`, color }}
          >
            <ShieldCheck className="w-4 h-4" />
            {label} · Score {cert.scoreAtIssuance}
          </div>

          {/* Skill name */}
          <h1 className="text-5xl font-black text-white mb-2 capitalize">{cert.skill}</h1>

          {/* Recipient */}
          <p className="text-[#AEB5E0] text-lg mb-8">
            Certified · {user?.name || user?.username || 'Verified Developer'}
          </p>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-8" />

          {/* Meta row */}
          <div className="flex items-center justify-center gap-6 text-xs text-[#555B8A] mb-8">
            <span>Issued {issuedDate}</span>
            <span>·</span>
            <a
              href={`/p/${user?.username}`}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              View full profile <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Evidence list */}
          {cert.evidence?.length > 0 && (
            <div className="mb-8 text-left">
              <p className="text-[10px] uppercase tracking-widest text-[#555B8A] mb-3">
                Supporting evidence
              </p>
              <ul className="space-y-1">
                {cert.evidence.map((e: string, i: number) => (
                  <li key={i} className="text-xs text-[#AEB5E0] flex items-start gap-2">
                    <span style={{ color }} className="mt-0.5 flex-shrink-0">·</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Share actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: '#0A66C2', color: '#fff' }}
            >
              Share on LinkedIn
            </a>
            <LinkedInShareButton certUrl={certUrl} ogImage={ogImage} token={token} />
          </div>
        </div>
      </div>

      {/* OG image preview hint */}
      <p className="mt-6 text-xs text-[#555B8A] text-center">
        This certificate has a shareable preview image · {certUrl}
      </p>
    </main>
  )
}
