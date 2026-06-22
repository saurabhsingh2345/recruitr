'use client'

import { useState } from 'react'
import { Building2, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Props {
  onJDChange: (jd: string | null) => void
}

export function CompanyModeToggle({ onJDChange }: Props) {
  const [open, setOpen] = useState(false)
  const [jd, setJD] = useState('')

  function handleToggle() {
    if (open) {
      setJD('')
      onJDChange(null)
    }
    setOpen(v => !v)
  }

  function handleChange(val: string) {
    setJD(val)
    onJDChange(val.trim().length > 20 ? val : null)
  }

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/[0.03] transition-colors"
      >
        <Building2 className="w-4 h-4 text-[#8B7CF8] shrink-0" />
        <span className="flex-1 text-left text-white/60">Company mode</span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/30" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/30" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">
          <p className="text-xs text-white/35 mb-3 leading-relaxed">
            Paste a job description and the AI will mirror that company&apos;s interview style — technical depth, focus areas, and culture signals.
          </p>
          <div className="relative">
            <textarea
              value={jd}
              onChange={e => handleChange(e.target.value)}
              placeholder="Paste job description here…"
              rows={5}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-[#8B7CF8]/40 transition-colors"
            />
            {jd.length > 0 && (
              <button
                onClick={() => handleChange('')}
                className="absolute top-2 right-2 text-white/20 hover:text-white/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {jd.trim().length > 20 && (
            <p className="text-xs text-[#8B7CF8] mt-2 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              Company mode active — interview will mirror this role
            </p>
          )}
        </div>
      )}
    </div>
  )
}
