'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus, Sparkles, Loader2, Target, Users, ChevronRight,
  X, Briefcase, MapPin, Building2,
} from 'lucide-react'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface SkillBar { skill: string; minScore: number }
interface Role {
  _id: string
  title: string
  seniority: string
  company: string
  mustHave: SkillBar[]
  niceHave: SkillBar[]
  compMinLpa: number
  compMaxLpa: number
  locations: string[]
  stage: string
  status: string
  blind: boolean
  surfacedCount?: number
  acceptedCount?: number
}

function CreateRoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Role) => void }) {
  const [rawJd, setRawJd] = useState('')
  const [blind, setBlind] = useState(false)
  const [creating, setCreating] = useState(false)

  async function create() {
    if (!rawJd.trim()) { toast.error('Paste a job description or describe the role'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawJd, blind }),
      })
      if (!res.ok) throw new Error()
      const { role } = await res.json()
      toast.success('Scout structured your role')
      onCreated(role)
    } catch {
      toast.error('Failed to create role')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="node-panel w-full max-w-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2DE2C5]" />
            <h3 className="font-semibold">New role — Scout will structure the bar</h3>
          </div>
          <button onClick={onClose} className="text-[#AEB5E0] hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-xs text-[#AEB5E0] mb-3 leading-relaxed">
          Paste a job description or just describe what you need. Scout converts it into a precise
          hiring bar — required skills, minimum proof scores, comp band, location, and stage —
          then sources verified engineers against it.
        </p>

        <textarea
          value={rawJd}
          onChange={(e) => setRawJd(e.target.value)}
          rows={9}
          placeholder={`e.g. "Senior backend engineer, 5+ yrs, strong in Go and distributed systems. We're a Series B fintech in Bangalore (hybrid). Budget 45–65 LPA. Kafka and Postgres a plus. Must have shipped at scale."`}
          className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#888FC0] resize-none focus:outline-none focus:border-[#2DE2C5]/40 leading-relaxed"
        />

        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} className="accent-[#2DE2C5]" />
          <span className="text-xs text-[#AEB5E0]">Blind inquiry — hide company name from candidates until they accept</span>
        </label>

        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[#1A1E3A] text-[#AEB5E0] hover:text-white">
            Cancel
          </Button>
          <Button onClick={create} disabled={creating} className="flex-[2] bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
            {creating
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Scout is structuring…</>
              : <><Sparkles className="w-4 h-4 mr-2" />Create & structure</>}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function RoleCard({ role }: { role: Role }) {
  return (
    <Link href={`/recruiter/roles/${role._id}`}>
      <div className="node-panel p-5 card-hover">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{role.title}</h3>
              {role.blind && <Badge className="bg-[#8B7CF8]/10 text-[#8B7CF8] border-[#8B7CF8]/20 text-[9px]">Blind</Badge>}
            </div>
            <div className="text-xs text-[#AEB5E0] mt-0.5 capitalize">
              {role.seniority} · {role.stage || 'any stage'}
              {role.compMaxLpa > 0 && ` · ${role.compMinLpa || '?'}–${role.compMaxLpa} LPA`}
            </div>
          </div>
          <Badge
            className="text-[9px] shrink-0"
            style={{
              background: role.status === 'active' ? 'rgba(45,226,197,0.1)' : 'rgba(139,146,192,0.1)',
              color: role.status === 'active' ? '#2DE2C5' : '#AEB5E0',
              borderColor: role.status === 'active' ? 'rgba(45,226,197,0.2)' : 'rgba(139,146,192,0.2)',
            }}
          >
            {role.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {role.mustHave.slice(0, 5).map((m) => (
            <span key={m.skill} className="text-[10px] px-1.5 py-0.5 rounded-md border border-[#2DE2C5]/20 bg-[#2DE2C5]/5 text-[#2DE2C5] font-medium">
              {m.skill} ≥{m.minScore}
            </span>
          ))}
          {role.mustHave.length === 0 && (
            <span className="text-[10px] text-[#888FC0]">No bar set — open the role to refine</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-[#AEB5E0]">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-[#2DE2C5]" />
            <span><span className="text-white font-semibold">{role.surfacedCount ?? 0}</span> surfaced</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-[#3FC5F0]" />
            <span><span className="text-white font-semibold">{role.acceptedCount ?? 0}</span> interested</span>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto text-[#888FC0]" />
        </div>
      </div>
    </Link>
  )
}

export default function RolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetch('/api/roles')
      .then((r) => r.ok ? r.json() : { roles: [] })
      .then((d) => setRoles(d.roles || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-screen flex overflow-hidden text-white">
      <RecruiterNav />
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Your roles</h1>
            <p className="text-sm text-[#AEB5E0]">
              Scout sources and screens verified engineers against each role&apos;s bar — autonomously.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> New role
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl bg-[#0B0E1C]" />)}
          </div>
        ) : roles.length === 0 ? (
          <div className="node-panel p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#2DE2C5]/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-6 h-6 text-[#2DE2C5]" />
            </div>
            <h3 className="font-semibold mb-1">No roles yet</h3>
            <p className="text-sm text-[#AEB5E0] max-w-sm mx-auto mb-5">
              Create your first role. Paste a JD and Scout turns it into a precise hiring bar, then
              starts sourcing verified engineers — no manual searching.
            </p>
            <Button onClick={() => setShowCreate(true)} className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
              <Sparkles className="w-4 h-4 mr-1.5" /> Create your first role
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {roles.map((role) => <RoleCard key={role._id} role={role} />)}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={(role) => router.push(`/recruiter/roles/${role._id}`)}
        />
      )}
      </main>
    </div>
  )
}
