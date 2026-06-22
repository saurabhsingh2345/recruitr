'use client'

import { Fragment } from 'react'

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic text-[#AEB5E0]">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[11px] bg-[#05060F] border border-[#1A1E3A] text-[#2DE2C5] px-1 py-0.5 rounded">{part.slice(1, -1)}</code>
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let k = 0  // independent key counter — avoids collisions when i reuses values after list/block collection

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={k++} className="bg-[#05060F] border border-[#1A1E3A] rounded-lg p-3 my-2 overflow-x-auto">
          {lang && <div className="text-[10px] text-[#888FC0] uppercase tracking-wider mb-2 font-mono">{lang}</div>}
          <code className="text-xs text-[#2DE2C5] font-mono leading-relaxed whitespace-pre">
            {codeLines.join('\n')}
          </code>
        </pre>
      )
      i++
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={k++} className="text-sm font-semibold text-white mt-3 mb-1">{inlineFormat(line.slice(4))}</h3>)
      i++; continue
    }

    if (line.startsWith('## ')) {
      elements.push(<h3 key={k++} className="text-sm font-semibold text-[#2DE2C5] mt-3 mb-1">{inlineFormat(line.slice(3))}</h3>)
      i++; continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={k++} className="list-decimal list-outside pl-5 space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="text-sm leading-relaxed">{inlineFormat(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i++
      }
      elements.push(
        <ul key={k++} className="list-disc list-outside pl-5 space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="text-sm leading-relaxed">{inlineFormat(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={k++} className="h-1.5" />)
      i++; continue
    }

    elements.push(<p key={k++} className="text-sm leading-relaxed">{inlineFormat(line)}</p>)
    i++
  }

  return <>{elements}</>
}
