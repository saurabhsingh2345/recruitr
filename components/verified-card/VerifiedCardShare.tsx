'use client'

import { toast } from 'sonner'

export function VerifiedCardShare({
  cardUrl,
  roleLabel,
  candidateName,
}: {
  cardUrl: string
  roleLabel: string
  candidateName: string
}) {
  const linkedInText = `I'm Intervue Verified for ${roleLabel} roles. ${candidateName} · ${cardUrl}`
  const twitterText = `Just earned my Intervue Verified card for ${roleLabel} 🎯\n\nRigorous AI-proctored assessment. Proof is in the scores.\n\n${cardUrl}`

  function copyLink() {
    navigator.clipboard.writeText(cardUrl)
    toast.success('Link copied!')
  }

  return (
    <div className="flex gap-2">
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}&summary=${encodeURIComponent(linkedInText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#0856a8] transition-colors text-sm font-semibold text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        Share on LinkedIn
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1d1d1d] hover:bg-[#2d2d2d] border border-white/[0.08] transition-colors text-sm font-semibold text-white"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Post on X
      </a>
      <button
        onClick={copyLink}
        className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.16] transition-all text-sm"
        title="Copy link"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
      </button>
    </div>
  )
}
