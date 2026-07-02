'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Shield,
  ExternalLink,
  Award,
  Loader2,
  Users,
  MessageSquare,
  X,
  Clock,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getScoreColor } from '@/lib/scoring'
import { RecruiterNav } from '@/components/RecruiterNav'

interface Candidate {
  _id: string
  githubUsername: string
  targetRole: string
  yearsOfExperience: number
  bio: string
  cohortPercentile: number
  location: string
  topSkills: Array<{ name: string; proofScore: number }>
  user: { name: string; username: string; avatarUrl: string; openToWork: boolean; lastSessionDate: string | null }
}

const SKILL_FILTERS = [
  'Go', 'Python', 'TypeScript', 'Java', 'Rust',
  'System Design', 'Distributed Systems', 'AWS', 'Kubernetes',
  'React', 'PostgreSQL', 'Redis', 'GraphQL',
]

const ROLE_FILTERS = [
  'Backend Engineer', 'Full Stack Engineer', 'Frontend Engineer',
  'AI/ML Engineer', 'DevOps Engineer',
]


function ContactModal({
  candidate,
  onClose,
  onSent,
}: {
  candidate: Candidate
  onClose: () => void
  onSent: (appId: string) => void
}) {
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!message.trim()) { toast.error('Write a message first'); return }
    setSending(true)
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateUsername: candidate.user.username,
        message: message.trim(),
        company,
        title,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      toast.success('Message sent!')
      onSent(data.applicationId)
    } else if (res.status === 401) {
      toast.error('Sign in to contact candidates')
    } else {
      toast.error('Failed to send')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="node-panel p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Contact {candidate.user.name}</h3>
          <button onClick={onClose} className="text-[#AEB5E0] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#AEB5E0] mb-1 block">Your company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Razorpay, Zepto..."
                className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#AEB5E0] mb-1 block">Your title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Hiring Manager..."
                className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#AEB5E0] mb-1 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${candidate.user.name.split(' ')[0]}, I came across your Intervue profile and was impressed by your ${candidate.topSkills[0]?.name || 'work'}...`}
              rows={4}
              className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] resize-none focus:outline-none focus:border-[#2DE2C5]/40"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[#1A1E3A] text-[#AEB5E0] hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={send}
            disabled={sending || !message.trim()}
            className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e]"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send message'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function lastActiveLabel(date: string | null): string | null {
  if (!date) return null
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'Active today'
  if (days === 1) return 'Active yesterday'
  if (days < 30) return `Active ${days}d ago`
  if (days < 365) return `Active ${Math.floor(days / 30)}mo ago`
  return null
}

function CandidateCard({ candidate, onContact }: { candidate: Candidate; onContact: (c: Candidate) => void }) {
  const lastActive = lastActiveLabel(candidate.user.lastSessionDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 node-panel node-panel-hover flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          {candidate.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.user.avatarUrl} alt={candidate.user.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#3FC5F0] flex items-center justify-center text-[#05060F] font-bold text-sm">
              {candidate.user.name?.[0] || 'U'}
            </div>
          )}
          {candidate.user.openToWork && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#2DE2C5] border-2 border-[#07091a]"
              title="Open to work"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm leading-none">{candidate.user.name}</span>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#2DE2C5]" />
              <span className="text-[10px] text-[#2DE2C5]">Verified</span>
            </div>
            {candidate.cohortPercentile > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 text-[#2DE2C5] font-medium">
                Top {100 - candidate.cohortPercentile}%
              </span>
            )}
          </div>
          <div className="text-xs text-[#AEB5E0] flex items-center gap-1 flex-wrap mt-0.5">
            <span>{candidate.targetRole}</span>
            {candidate.yearsOfExperience > 0 && <><span>·</span><span>{candidate.yearsOfExperience}+ yrs</span></>}
            {candidate.location && (
              <><span>·</span><MapPin className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{candidate.location}</span></>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {candidate.bio && (
        <p className="text-xs text-[#888FC0] leading-relaxed mb-3 line-clamp-2">{candidate.bio}</p>
      )}

      {/* Skill chips — click to proof page */}
      <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
        {candidate.topSkills.slice(0, 4).map((skill) => {
          const c = getScoreColor(skill.proofScore)
          return (
            <Link
              key={skill.name}
              href={`/proof/${candidate.user.username}/${encodeURIComponent(skill.name)}`}
              target="_blank"
              className="group flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border font-medium transition-all hover:brightness-125"
              style={{ color: c, borderColor: c + '35', background: c + '12' }}
              title={`View ${skill.name} proof →`}
            >
              <span>{skill.name}</span>
              <span className="font-mono">{Math.round(skill.proofScore)}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-70 transition-opacity shrink-0" />
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-[#888FC0]">
          {lastActive && <><Clock className="w-2.5 h-2.5" /><span>{lastActive}</span></>}
        </div>
        <div className="flex gap-2">
          <Link href={`/recruiter/candidates/${candidate.user.username}`}>
            <Button variant="outline" size="sm" className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs h-7 w-7 p-0" title="Trust view">
              <Shield className="w-3 h-3" />
            </Button>
          </Link>
          <Link href={`/p/${candidate.user.username}`} target="_blank">
            <Button variant="outline" size="sm" className="border-[#1A1E3A] text-[#AEB5E0] hover:text-white text-xs h-7 w-7 p-0">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] text-xs h-7 px-3 font-semibold"
            onClick={() => onContact(candidate)}
          >
            Contact
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export default function RecruiterPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [contactTarget, setContactTarget] = useState<Candidate | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const contactUsername = params.get('contact')
    if (!contactUsername) return
    fetch(`/api/profile/${contactUsername}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) return
        setContactTarget({
          _id: data.user._id || contactUsername,
          githubUsername: data.user.username,
          targetRole: data.profile?.targetRole || 'Engineer',
          yearsOfExperience: data.profile?.yearsOfExperience || 0,
          bio: data.profile?.bio || '',
          cohortPercentile: data.profile?.cohortPercentile || 0,
          location: data.profile?.location || '',
          topSkills: (data.profile?.parsedSkills || []).slice(0, 4).map(
            (s: { name: string; proofScore: number }) => ({ name: s.name, proofScore: s.proofScore })
          ),
          user: { name: data.user.name, username: data.user.username, avatarUrl: data.user.avatarUrl || '', openToWork: false, lastSessionDate: null },
        })
      })
      .catch(() => {})
  }, [])

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  async function handleSearch() {
    setIsSearching(true)
    setHasSearched(true)
    try {
      const res = await fetch('/api/recruiter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          skills: selectedSkills,
          minScore,
          targetRole: selectedRole,
        }),
      })
      if (res.ok) {
        const { candidates: results } = await res.json()
        setCandidates(results || [])
      } else {
        setCandidates([])
      }
    } catch {
      setCandidates([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <RecruiterNav />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-[#04050e]/90 backdrop-blur px-8 h-[56px] flex items-center justify-between">
          <span className="text-sm font-medium">Search</span>
        </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by skill, role, or technology..."
              className="pl-9 bg-[#0a0c1a] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:ring-[#2DE2C5]/30"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="btn-supernova px-6 font-semibold"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <div className="lg:col-span-1 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Filter className="w-3.5 h-3.5 text-[#AEB5E0]" />
                Filter by skill
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_FILTERS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`text-xs px-2 py-1 rounded-md border transition-all ${
                      selectedSkills.includes(skill)
                        ? 'bg-[#2DE2C5]/10 border-[#2DE2C5]/30 text-[#2DE2C5]'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.1]'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-3">Target role</div>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedRole('')}
                  className={`w-full text-left text-xs px-2.5 py-2 rounded-lg transition-all ${
                    !selectedRole
                      ? 'bg-[#2DE2C5]/10 text-[#2DE2C5]'
                      : 'text-white/40 hover:text-white/75 hover:bg-white/[0.03]'
                  }`}
                >
                  All roles
                </button>
                {ROLE_FILTERS.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left text-xs px-2.5 py-2 rounded-lg transition-all ${
                      selectedRole === role
                        ? 'bg-[#2DE2C5]/10 text-[#2DE2C5]'
                        : 'text-white/40 hover:text-white/75 hover:bg-white/[0.03]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-3">Min. proof score: {minScore}</div>
              <input
                type="range"
                min={0}
                max={90}
                step={10}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-[#2DE2C5]"
              />
              <div className="flex justify-between text-[10px] text-[#AEB5E0] mt-1">
                <span>0</span>
                <span>90</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-[#AEB5E0]">
                <Users className="w-4 h-4" />
                <span>
                  <span className="text-white font-medium">{candidates.length}</span> candidates
                  {hasSearched ? ' matched' : ' available'}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {candidates.map((candidate) => (
                <CandidateCard key={candidate._id} candidate={candidate} onContact={setContactTarget} />
              ))}
            </div>

            {candidates.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/[0.06] p-12 text-center">
                <Search className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <div className="text-sm font-medium mb-1">{hasSearched ? 'No candidates found' : 'Search to find candidates'}</div>
                <div className="text-xs text-white/35">{hasSearched ? 'Try adjusting your filters' : 'Use filters to narrow by skill, role, or score'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {contactTarget && (
        <ContactModal
          candidate={contactTarget}
          onClose={() => setContactTarget(null)}
          onSent={(appId) => {
            setContactTarget(null)
            router.push(`/messages/${appId}`)
          }}
        />
      )}
      </main>
    </div>
  )
}
