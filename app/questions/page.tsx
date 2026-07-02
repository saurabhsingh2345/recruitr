import Link from 'next/link'
import type { Metadata } from 'next'
import { Code2, ArrowRight } from 'lucide-react'
import { QUESTION_TOPICS } from '@/lib/data/interviewQuestions'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Interview Questions Bank · Intervue',
  description: 'Curated interview questions by topic. Practice with AI and build a verified proof score.',
}

export default function QuestionsIndexPage() {
  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Code2 className="w-5 h-5 text-[#2DE2C5]" /> intervue
        </Link>
        <Link href="/onboarding">
          <Button size="sm" className="btn-supernova text-xs h-8">Practice free</Button>
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Interview question bank</h1>
        <p className="text-[#888FC0] max-w-2xl mb-12">
          Real questions grouped by skill and format. Pick a topic, then practice with AI — your session updates your verified proof score.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUESTION_TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={`/questions/${topic.slug}`}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-[#2DE2C5]/30 hover:bg-[#2DE2C5]/5 transition-all"
            >
              <h2 className="font-semibold mb-2 group-hover:text-[#2DE2C5] transition-colors">{topic.title}</h2>
              <p className="text-xs text-[#888FC0] leading-relaxed mb-4 line-clamp-2">{topic.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#888FC0]">{topic.questions.length} questions</span>
                <span className="text-[#2DE2C5] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
