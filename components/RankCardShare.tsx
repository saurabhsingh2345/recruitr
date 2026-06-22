'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

interface Props {
  username: string
  percentile: number
}

export function RankCardShare({ username, percentile }: Props) {
  const [copied, setCopied] = useState(false)

  const profileUrl = `https://intervue.in/p/${username}`
  const rank = 100 - percentile
  const tweetText = percentile > 0
    ? `Top ${rank}% on Intervue — verified proof of what I've actually built.`
    : `My verified engineering profile on Intervue.`

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-1.5 flex-wrap justify-end">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(profileUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] border border-white/[0.08] px-2.5 py-1 rounded hover:bg-white/[0.04] transition-colors text-white/40 hover:text-white/70"
      >
        Share on X
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] border border-white/[0.08] px-2.5 py-1 rounded hover:bg-white/[0.04] transition-colors text-white/40 hover:text-white/70"
      >
        LinkedIn
      </a>
      <button
        onClick={handleCopy}
        className="text-[11px] border border-white/[0.08] px-2.5 py-1 rounded hover:bg-white/[0.04] transition-colors text-white/40 hover:text-white/70 flex items-center gap-1"
      >
        {copied ? <><Check className="w-2.5 h-2.5 text-[#2DE2C5]" /> Copied</> : 'Copy link'}
      </button>
    </div>
  )
}
