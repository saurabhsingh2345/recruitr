'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  certUrl: string
  ogImage: string
  token: string
}

export function LinkedInShareButton({ certUrl }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(certUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  return (
    <button
      onClick={copy}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition-all"
    >
      {copied ? (
        <><Check className="w-4 h-4 text-[#2DE2C5]" /> Copied!</>
      ) : (
        <><Copy className="w-4 h-4" /> Copy link</>
      )}
    </button>
  )
}
