'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

export function ShareBadgeButton({ username, skillName }: { username: string; skillName: string }) {
  const [copied, setCopied] = useState(false)

  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    const origin = window.location.origin
    const badgeUrl = `${origin}/api/badge/${username}/${encodeURIComponent(skillName)}`
    const proofUrl = `${origin}/proof/${username}/${encodeURIComponent(skillName)}`
    // Linked image markdown — clicking the badge in a README goes to the proof page
    const markdown = `[![${skillName}](${badgeUrl})](${proofUrl})`
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      toast.success('Badge markdown copied')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={copy}
      title="Copy badge markdown"
      className="ml-auto flex items-center gap-1 text-[10px] text-[#888FC0] hover:text-[#2DE2C5] transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check className="w-3 h-3 text-[#2DE2C5]" /> : <Share2 className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Badge'}
    </button>
  )
}
