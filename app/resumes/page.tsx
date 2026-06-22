'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  FileText,
  Code2,
  Loader2,
  Download,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ResumeData {
  name: string
  headline: string
  summary: string
  skills: string[]
  experience: Array<{
    title: string
    company: string
    duration: string
    bullets: string[]
  }>
  projects: Array<{
    name: string
    description: string
    tech: string[]
  }>
  education: Array<{
    degree: string
    school: string
    year: string
  }>
}

export default function ResumesPage() {
  const [jobDescription, setJobDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)

  async function handleGenerate() {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description first')
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      })
      if (res.ok) {
        const { resume } = await res.json()
        setResumeData(resume)
        toast.success('Resume generated!')
      } else {
        toast.error('Generation failed. Please try again.')
      }
    } catch {
      toast.error('Failed to generate resume')
    } finally {
      setIsGenerating(false)
    }
  }

  function copyAtsText() {
    if (!resumeData) return
    const text = [
      resumeData.name,
      resumeData.headline,
      '',
      'SUMMARY',
      resumeData.summary,
      '',
      'SKILLS',
      resumeData.skills.join(', '),
      '',
      'EXPERIENCE',
      ...(resumeData.experience || []).flatMap((exp) => [
        `${exp.title} — ${exp.company} (${exp.duration})`,
        ...(exp.bullets || []).map((b) => `• ${b}`),
        '',
      ]),
      'PROJECTS',
      ...(resumeData.projects || []).flatMap((proj) => [
        `${proj.name}: ${proj.description}`,
        `Tech: ${(proj.tech || []).join(', ')}`,
        '',
      ]),
      'EDUCATION',
      ...(resumeData.education || []).map(
        (edu) => `${edu.degree} — ${edu.school} (${edu.year})`
      ),
    ].join('\n')

    navigator.clipboard.writeText(text)
    toast.success('ATS-friendly text copied!')
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-[#1A1E3A] px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#AEB5E0] hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-3 h-3 text-[#05060F]" />
          </div>
          <span className="font-bold text-sm">intervue</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Multi-Resume Studio</h1>
          <p className="text-[#AEB5E0] text-sm">
            Paste a job description → we generate a tailored resume from your verified profile.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#AEB5E0] mb-2 block">
                Paste job description
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="We are looking for a Senior Backend Engineer with expertise in Go, distributed systems, and..."
                className="bg-[#0B0E1C] border-[#1A1E3A] text-[#F8F9FA] placeholder:text-[#AEB5E0] min-h-[280px] resize-none focus-visible:ring-[#2DE2C5]/30 font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              {resumeData && (
                <Button
                  variant="outline"
                  onClick={() => { setResumeData(null); setJobDescription('') }}
                  className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !jobDescription.trim()}
                className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-medium"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate tailored resume
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border border-[#1A1E3A] bg-[#0B0E1C] p-4">
              <div className="text-xs font-medium text-[#AEB5E0] mb-2">How it works</div>
              <ul className="space-y-1.5">
                {[
                  'We extract key requirements from the JD',
                  'Match them against your verified skill scores',
                  'Generate a tailored, ATS-optimized resume',
                  'Download PDF or copy plain text',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-[#AEB5E0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Preview */}
          <div>
            <AnimatePresence mode="wait">
              {!resumeData ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-[#1A1E3A] h-full min-h-[400px] flex items-center justify-center"
                >
                  <div className="text-center">
                    <FileText className="w-10 h-10 text-[#AEB5E0] mx-auto mb-3" />
                    <div className="text-sm text-[#AEB5E0]">Resume preview will appear here</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="resume"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[#1A1E3A] bg-[#0B0E1C] overflow-hidden"
                >
                  {/* Preview header */}
                  <div className="border-b border-[#1A1E3A] p-4 flex items-center justify-between">
                    <span className="text-sm font-medium">Resume Preview</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyAtsText}
                        className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs h-7"
                      >
                        Copy ATS text
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] text-xs h-7"
                        onClick={() => toast.info('PDF download coming soon!')}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download PDF
                      </Button>
                    </div>
                  </div>

                  {/* Resume content */}
                  <div className="p-6 space-y-5 text-sm overflow-y-auto max-h-[600px]">
                    {/* Header */}
                    <div>
                      <h2 className="text-xl font-bold">{resumeData.name}</h2>
                      <p className="text-[#2DE2C5] text-sm">{resumeData.headline}</p>
                    </div>

                    {/* Summary */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider mb-2">Summary</h3>
                      <p className="text-[#AEB5E0] text-xs leading-relaxed">{resumeData.summary}</p>
                    </div>

                    {/* Skills */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(resumeData.skills || []).map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-[#11142a] text-[#AEB5E0] border-[#1A1E3A] text-[10px] px-2"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Experience */}
                    {(resumeData.experience || []).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider mb-2">Experience</h3>
                        <div className="space-y-4">
                          {resumeData.experience.map((exp, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{exp.title}</span>
                                <span className="text-xs text-[#AEB5E0]">{exp.duration}</span>
                              </div>
                              <div className="text-xs text-[#2DE2C5] mb-1.5">{exp.company}</div>
                              <ul className="space-y-1">
                                {(exp.bullets || []).map((bullet, j) => (
                                  <li key={j} className="text-xs text-[#AEB5E0] flex gap-2">
                                    <span className="text-[#2DE2C5] shrink-0">·</span>
                                    {bullet}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {(resumeData.projects || []).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider mb-2">Projects</h3>
                        <div className="space-y-3">
                          {resumeData.projects.map((proj, i) => (
                            <div key={i}>
                              <span className="font-medium text-xs text-[#2DE2C5]">{proj.name}</span>
                              <p className="text-xs text-[#AEB5E0] mt-0.5">{proj.description}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(proj.tech || []).map((t) => (
                                  <span key={t} className="text-[10px] text-[#AEB5E0] bg-[#11142a] px-1.5 py-0.5 rounded">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {(resumeData.education || []).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-[#AEB5E0] uppercase tracking-wider mb-2">Education</h3>
                        {resumeData.education.map((edu, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span>{edu.degree} — {edu.school}</span>
                            <span className="text-[#AEB5E0]">{edu.year}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
