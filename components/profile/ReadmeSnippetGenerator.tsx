'use client'

import { useState } from 'react'
import { Copy, Check, Code2 } from 'lucide-react'

interface ReadmeSnippetGeneratorProps {
  username: string
  origin: string
}

export function ReadmeSnippetGenerator({ username, origin }: ReadmeSnippetGeneratorProps) {
  const [tab, setTab] = useState<'markdown' | 'action'>('markdown')
  const [copied, setCopied] = useState(false)

  const summaryBadgeUrl = `${origin}/api/badge/${username}/summary`
  const profileUrl = `${origin}/p/${username}`

  const markdown = `[![Intervue Skills](${summaryBadgeUrl})](${profileUrl})`

  const actionYaml = `name: Update Intervue proof scores
on:
  schedule:
    - cron: '0 0 * * 1'
  workflow_dispatch:
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Bump badge cache-bust param in README
        run: |
          sed -i 's|summary?v=[0-9]*|summary?v='$(date +%s)'|g' README.md || true
          grep -q 'summary' README.md || echo "" >> README.md
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update Intervue proof scores"`

  const content = tab === 'markdown' ? markdown : actionYaml

  async function copy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-foreground/[0.06]">
        {(['markdown', 'action'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-[#2DE2C5] border-b-2 border-[#2DE2C5] -mb-px'
                : 'text-foreground/40 hover:text-foreground/70'
            }`}
          >
            <Code2 className="w-3 h-3" />
            {t === 'markdown' ? 'Markdown snippet' : 'GitHub Action'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Badge preview */}
        {tab === 'markdown' && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={summaryBadgeUrl} alt="Intervue skills badge" className="h-8" />
            <span className="text-xs text-foreground/30">Live preview · updates hourly</span>
          </div>
        )}

        {tab === 'action' && (
          <p className="text-xs text-foreground/40">
            Add to <code className="bg-foreground/[0.06] px-1 py-0.5 rounded text-[11px]">.github/workflows/update-intervue.yml</code>.
            Runs every Monday to keep your README badge fresh.
          </p>
        )}

        {/* Code block */}
        <div className="flex items-start gap-2">
          <code className={`flex-1 text-[11px] font-mono text-foreground/50 bg-foreground/[0.04] px-3 py-2.5 rounded-lg border border-foreground/[0.05] overflow-x-auto ${tab === 'action' ? 'whitespace-pre' : 'truncate'}`}>
            {content}
          </code>
          <button
            onClick={copy}
            className="shrink-0 p-2 rounded-lg border border-foreground/[0.08] hover:border-foreground/20 text-foreground/40 hover:text-foreground transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#2DE2C5]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
