'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, FileText, Code2, Loader2, Download,
  CheckCircle2, Sparkles, Trash2, ChevronDown, Copy, Check,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'


interface ResumeData {
  name: string
  headline: string
  summary: string
  skills: string[]
  experience: { title: string; company: string; duration: string; bullets: string[] }[]
  projects: { name: string; description: string; tech: string[] }[]
  education: { degree: string; school: string; year: string }[]
}

interface SavedResume {
  _id: string
  jobTitle: string
  createdAt: string
  resume: { headline: string }
}

function ResumePreview({ data }: { data: ResumeData }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const [pdfLib, { ResumePDF }, React] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/resume/ResumePDF'),
        import('react'),
      ])
      const element = React.createElement(ResumePDF, { data })
      // @react-pdf/renderer types are strict; the element is a valid Document tree
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdfLib.pdf(element as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(data.name || 'resume').replace(/\s+/g, '-').toLowerCase()}-resume.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF generation failed')
    } finally {
      setDownloading(false)
    }
  }

  function toAtsText() {
    return [
      data.name, data.headline, '',
      'SUMMARY', data.summary, '',
      'SKILLS', data.skills.join(', '), '',
      'EXPERIENCE',
      ...(data.experience || []).flatMap((e) => [
        `${e.title} — ${e.company} (${e.duration})`,
        ...(e.bullets || []).map((b) => `• ${b}`), '',
      ]),
      'PROJECTS',
      ...(data.projects || []).flatMap((p) => [
        `${p.name}: ${p.description}`,
        `Tech: ${(p.tech || []).join(', ')}`, '',
      ]),
      'EDUCATION',
      ...(data.education || []).map((e) => `${e.degree} — ${e.school} (${e.year})`),
    ].join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(toAtsText())
    setCopied(true)
    toast.success('ATS text copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#080A18] overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider">Preview</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-[#AEB5E0] hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-[#2DE2C5]" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy ATS text'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 text-[#2DE2C5] hover:bg-[#2DE2C5]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] text-sm">
        <div>
          <h2 className="text-xl font-bold">{data.name}</h2>
          <p className="text-[#2DE2C5] text-sm mt-0.5">{data.headline}</p>
        </div>

        {data.summary && (
          <div>
            <h3 className="text-[10px] font-semibold text-[#888FC0] uppercase tracking-widest mb-2">Summary</h3>
            <p className="text-[#AEB5E0] text-xs leading-relaxed">{data.summary}</p>
          </div>
        )}

        {data.skills?.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-[#888FC0] uppercase tracking-widest mb-2">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[#AEB5E0]">{s}</span>
              ))}
            </div>
          </div>
        )}

        {data.experience?.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-[#888FC0] uppercase tracking-widest mb-3">Experience</h3>
            <div className="space-y-4">
              {data.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm">{exp.title}</span>
                    <span className="text-[11px] text-[#888FC0] shrink-0">{exp.duration}</span>
                  </div>
                  <div className="text-xs text-[#2DE2C5] mb-1.5">{exp.company}</div>
                  <ul className="space-y-1">
                    {(exp.bullets || []).map((b, j) => (
                      <li key={j} className="text-xs text-[#AEB5E0] flex gap-2">
                        <span className="text-[#2DE2C5]/50 shrink-0 mt-0.5">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.projects?.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-[#888FC0] uppercase tracking-widest mb-3">Projects</h3>
            <div className="space-y-3">
              {data.projects.map((p, i) => (
                <div key={i}>
                  <span className="font-semibold text-xs text-[#2DE2C5]">{p.name}</span>
                  <p className="text-xs text-[#AEB5E0] mt-0.5 leading-relaxed">{p.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(p.tech || []).map((t) => (
                      <span key={t} className="text-[10px] text-[#888FC0] bg-white/[0.03] px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.education?.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-[#888FC0] uppercase tracking-widest mb-2">Education</h3>
            {data.education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between text-xs">
                <span>{e.degree} — {e.school}</span>
                <span className="text-[#888FC0]">{e.year}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResumesPage() {
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [showJd, setShowJd] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null)
  const [currentTitle, setCurrentTitle] = useState('')
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/resume/saved')
      .then((r) => r.ok ? r.json() : { resumes: [] })
      .then((d) => setSavedResumes(d.resumes || []))
      .finally(() => setLoadingList(false))
  }, [])

  async function handleGenerate() {
    if (!jobTitle.trim()) {
      toast.error('Enter a job title first')
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: jobTitle.trim(), jobDescription }),
      })
      const data = await res.json()
      if (res.ok && data.resume) {
        setCurrentResume(data.resume)
        setCurrentTitle(jobTitle.trim())
        toast.success('Resume generated and saved!')
        // Refresh list
        const listRes = await fetch('/api/resume/saved')
        if (listRes.ok) {
          const listData = await listRes.json()
          setSavedResumes(listData.resumes || [])
        }
        setJobTitle('')
        setJobDescription('')
        setShowJd(false)
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch {
      toast.error('Failed to generate resume')
    } finally {
      setIsGenerating(false)
    }
  }

  async function loadResume(id: string) {
    const res = await fetch(`/api/resume/saved/${id}`)
    if (res.ok) {
      const { resume } = await res.json()
      setCurrentResume(resume.resume)
      setCurrentTitle(resume.jobTitle)
    }
  }

  async function deleteResume(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/resume/saved/${id}`, { method: 'DELETE' })
      setSavedResumes((prev) => prev.filter((r) => r._id !== id))
      if (currentTitle === savedResumes.find((r) => r._id === id)?.jobTitle) {
        setCurrentResume(null)
        setCurrentTitle('')
      }
      toast.success('Deleted')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#AEB5E0] hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-3 h-3 text-[#05060F]" />
          </div>
          <span className="font-bold text-sm">intervue</span>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-56px)]">

        {/* ── Left panel: saved resumes ──────────────────────── */}
        <aside className="w-72 shrink-0 border-r border-white/[0.05] bg-[#080A18] flex flex-col">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-sm font-semibold">Resume library</h2>
            <p className="text-[11px] text-[#888FC0] mt-0.5">All versions saved automatically</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-5 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : savedResumes.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-xs text-[#888FC0]">No saved resumes yet.<br />Generate your first one →</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {savedResumes.map((r) => (
                  <div
                    key={r._id}
                    onClick={() => loadResume(r._id)}
                    className={`group w-full text-left px-3 py-3 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      currentTitle === r.jobTitle
                        ? 'bg-[#2DE2C5]/10 border border-[#2DE2C5]/20'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{r.jobTitle}</div>
                      <div className="text-[10px] text-[#888FC0] mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteResume(r._id) }}
                      disabled={deletingId === r._id}
                      className="opacity-0 group-hover:opacity-100 text-[#888FC0] hover:text-[#f43f5e] transition-all shrink-0 mt-0.5 disabled:opacity-30"
                    >
                      {deletingId === r._id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main area ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">

            {/* Generator card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0C1A] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-[#2DE2C5]" />
                </div>
                <div>
                  <h1 className="text-base font-bold">Generate tailored resume</h1>
                  <p className="text-xs text-[#888FC0]">From your verified skills, projects, and experience</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Job title (primary input) */}
                <div>
                  <label className="text-xs text-[#AEB5E0] mb-1.5 block font-medium">
                    Job title <span className="text-[#f43f5e]">*</span>
                  </label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                    placeholder="e.g. Senior Backend Engineer, SDE-2, ML Engineer…"
                    className="w-full bg-[#05060F] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40 transition-colors"
                  />
                </div>

                {/* Optional JD toggle */}
                <button
                  onClick={() => setShowJd(!showJd)}
                  className="flex items-center gap-1.5 text-xs text-[#888FC0] hover:text-[#AEB5E0] transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showJd ? 'rotate-180' : ''}`} />
                  {showJd ? 'Hide' : 'Add'} job description for better tailoring (optional)
                </button>

                <AnimatePresence>
                  {showJd && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the full job description here…"
                        rows={5}
                        className="w-full bg-[#05060F] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40 resize-none font-mono transition-colors"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !jobTitle.trim()}
                  className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold h-11"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate &amp; save</>
                  )}
                </Button>
              </div>

              {/* How it works */}
              <div className="mt-5 pt-5 border-t border-white/[0.05] grid grid-cols-2 gap-2">
                {[
                  'Uses your verified Intervue skill scores',
                  'Pulls in your GitHub projects automatically',
                  'Adapts bullet points to match the role',
                  'Saved to your library — access any version',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-[11px] text-[#888FC0]">
                    <CheckCircle2 className="w-3 h-3 text-[#2DE2C5] shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <AnimatePresence mode="wait">
              {currentResume ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20 text-[10px]">
                      {currentTitle}
                    </Badge>
                  </div>
                  <ResumePreview data={currentResume} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-dashed border-white/[0.06] py-16 text-center"
                >
                  <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-[#888FC0]">
                    {savedResumes.length > 0
                      ? 'Select a resume from the library or generate a new one'
                      : 'Enter a job title and generate your first tailored resume'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
