import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Code2, ArrowRight } from 'lucide-react'
import { getTopicBySlug, getAllTopicSlugs } from '@/lib/data/interviewQuestions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Params {
  params: Promise<{ topic: string }>
}

export async function generateStaticParams() {
  return getAllTopicSlugs().map((topic) => ({ topic }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { topic: slug } = await params
  const topic = getTopicBySlug(slug)
  if (!topic) return { title: 'Questions · Intervue' }
  return {
    title: `${topic.title} · Intervue`,
    description: topic.description,
  }
}

const DIFF_COLOR = {
  easy: '#2DE2C5',
  medium: '#f59e0b',
  hard: '#f43f5e',
}

export default async function QuestionTopicPage({ params }: Params) {
  const { topic: slug } = await params
  const topic = getTopicBySlug(slug)
  if (!topic) notFound()

  const primarySkill = topic.relatedSkills[0] || topic.title

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/questions" className="flex items-center gap-2 text-sm text-[#888FC0] hover:text-white">
          ← All topics
        </Link>
        <Link href="/" className="flex items-center gap-2 font-bold text-sm">
          <Code2 className="w-4 h-4 text-[#2DE2C5]" /> intervue
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">{topic.title}</h1>
        <p className="text-[#888FC0] mb-6 leading-relaxed">{topic.description}</p>

        <div className="flex flex-wrap gap-2 mb-10">
          {topic.relatedSkills.map((s) => (
            <Badge key={s} variant="outline" className="border-white/10 text-[#AEB5E0]">{s}</Badge>
          ))}
        </div>

        <ol className="space-y-4 mb-12">
          {topic.questions.map((q, i) => (
            <li
              key={q.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-[#888FC0] mt-1">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed mb-2">{q.question}</p>
                  <div className="flex gap-2">
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border"
                      style={{ color: DIFF_COLOR[q.difficulty], borderColor: DIFF_COLOR[q.difficulty] + '40' }}
                    >
                      {q.difficulty}
                    </span>
                    <span className="text-[10px] text-[#888FC0] capitalize">{q.format.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-[#2DE2C5]/25 bg-gradient-to-br from-[#2DE2C5]/10 to-transparent p-8 text-center">
          <h2 className="text-lg font-bold mb-2">Practice these with AI</h2>
          <p className="text-sm text-[#888FC0] mb-6 max-w-md mx-auto">
            Start a free {primarySkill} session — get scored, see ideal answers, and update your verified profile.
          </p>
          <Link
            href={`/onboarding?ref=questions&skill=${encodeURIComponent(primarySkill)}&format=${encodeURIComponent(topic.questions[0]?.format || 'gap')}`}
          >
            <Button className="btn-supernova font-semibold gap-2">
              Practice {primarySkill} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
