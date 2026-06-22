import { generateText } from 'ai'
import { connectDB } from './mongodb'
import { getModel } from './groq'
import { InterviewSession } from './models/InterviewSession'
import type { Types } from 'mongoose'

interface WeaknessSignal {
  skill: string
  topic: string
  severity: 1 | 2 | 3
}

export async function extractWeaknessSignals(
  sessionId: string,
  gaps: string[],
): Promise<void> {
  if (!gaps || gaps.length === 0) return

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt: `You are an interview analysis assistant. Given these gap areas identified in a technical interview:

${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Extract structured weakness signals. Return ONLY a JSON array (no markdown, no explanation) like:
[{"skill":"JavaScript","topic":"async/await error handling","severity":2},{"skill":"System Design","topic":"database sharding","severity":3}]

severity scale: 1=minor gap, 2=clear weakness, 3=critical gap.
skill must be one of: JavaScript, TypeScript, React, Node.js, Python, System Design, Algorithms, SQL, DevOps, General.
Return empty array [] if no clear weaknesses.`,
      maxOutputTokens: 300,
    })

    let signals: WeaknessSignal[] = []
    try {
      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      signals = JSON.parse(cleaned)
      if (!Array.isArray(signals)) signals = []
    } catch {
      return
    }

    if (signals.length === 0) return

    await connectDB()
    await InterviewSession.findByIdAndUpdate(sessionId, {
      $set: {
        'insightReport.weaknessSignals': signals.map(s => ({
          skill: s.skill,
          topic: s.topic,
          severity: Math.min(3, Math.max(1, s.severity)) as 1 | 2 | 3,
          sessionId,
          at: new Date(),
        })),
      },
    })
  } catch {
    // best-effort — never throws
  }
}

export async function getCandidateMemory(userId: string | Types.ObjectId): Promise<string> {
  try {
    await connectDB()

    const sessions = await InterviewSession.find(
      {
        userId,
        status: 'completed',
        'insightReport.weaknessSignals': { $exists: true, $ne: [] },
      },
      { 'insightReport.weaknessSignals': 1 },
    )
      .sort({ completedAt: -1 })
      .limit(5)
      .lean()

    if (sessions.length === 0) return ''

    // Count occurrences per skill+topic
    const tally = new Map<string, { skill: string; topic: string; severity: number; count: number }>()

    for (const session of sessions) {
      const signals = session.insightReport?.weaknessSignals ?? []
      for (const sig of signals) {
        const key = `${sig.skill}::${sig.topic}`
        const existing = tally.get(key)
        if (existing) {
          existing.count += 1
          existing.severity = Math.max(existing.severity, sig.severity)
        } else {
          tally.set(key, { skill: sig.skill, topic: sig.topic, severity: sig.severity, count: 1 })
        }
      }
    }

    // Keep: appeared in 2+ sessions OR severity 3
    const recurring = Array.from(tally.values()).filter(
      e => e.count >= 2 || e.severity === 3,
    )

    if (recurring.length === 0) return ''

    const lines = recurring
      .sort((a, b) => b.severity - a.severity || b.count - a.count)
      .slice(0, 5)
      .map(e => `- ${e.skill}: ${e.topic} (seen ${e.count}x, severity ${e.severity}/3)`)
      .join('\n')

    return `\n[CANDIDATE MEMORY — recurring weak areas from past sessions]\n${lines}\nFocus questions on these areas to help the candidate improve.`
  } catch {
    return ''
  }
}
