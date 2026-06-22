'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, HeartOff, Bell, BellOff, Loader2, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Link from 'next/link'

interface SkillAlert { skill: string; alertAtScore: number; alertedAt: string | null }
interface WatchEntry {
  _id: string
  candidateId: string
  skillAlerts: SkillAlert[]
  notes: string
  addedAt: string
  candidate: { name: string; username: string; avatarUrl: string; discoverability: string } | null
  profile: { parsedSkills: { name: string; proofScore: number }[]; cohortPercentile: number; targetRole: string } | null
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [alertModal, setAlertModal] = useState<WatchEntry | null>(null)
  const [newAlertSkill, setNewAlertSkill] = useState('')
  const [newAlertScore, setNewAlertScore] = useState(80)
  const [savingAlert, setSavingAlert] = useState(false)

  async function load() {
    const res = await fetch('/api/recruiter/watchlist')
    if (res.ok) {
      const data = await res.json()
      setEntries(data.watchlist || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function remove(entry: WatchEntry) {
    setRemoving(entry._id)
    await fetch(`/api/recruiter/watchlist?candidateId=${entry.candidateId}`, { method: 'DELETE' })
    setEntries((prev) => prev.filter((e) => e._id !== entry._id))
    setRemoving(null)
    toast.success('Removed from watchlist')
  }

  async function saveAlert() {
    if (!alertModal || !newAlertSkill.trim()) return
    setSavingAlert(true)
    const updatedAlerts = [
      ...alertModal.skillAlerts,
      { skill: newAlertSkill.trim(), alertAtScore: newAlertScore, alertedAt: null },
    ]
    const res = await fetch(`/api/recruiter/watchlist/${alertModal._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillAlerts: updatedAlerts }),
    })
    if (res.ok) {
      toast.success(`Alert set — you'll be notified when ${newAlertSkill} reaches ${newAlertScore}`)
      setAlertModal(null)
      setNewAlertSkill('')
      setNewAlertScore(80)
      load()
    }
    setSavingAlert(false)
  }

  return (
    <div className="h-screen flex overflow-hidden text-white">
      <RecruiterNav />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Talent watchlist</h1>
            <p className="text-sm text-[#AEB5E0]">
              Get alerted when saved candidates reach a skill threshold or go open-to-work.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl bg-[#0B0E1C]" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="node-panel p-12 text-center">
              <Heart className="w-10 h-10 text-[#2DE2C5]/30 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No candidates saved yet</h3>
              <p className="text-sm text-[#AEB5E0] max-w-sm mx-auto">
                Save candidates from Scout results to track them and set score alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <motion.div key={entry._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="node-panel p-5">
                  <div className="flex items-start gap-4">
                    {entry.candidate?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.candidate.avatarUrl} alt={entry.candidate.name}
                        className="w-10 h-10 rounded-full border border-white/[0.08] shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#2DE2C5]/20 flex items-center justify-center text-sm font-bold text-[#2DE2C5] shrink-0">
                        {entry.candidate?.name?.[0] || '?'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{entry.candidate?.name || 'Unknown'}</span>
                        {entry.candidate?.discoverability === 'open' && (
                          <Badge className="bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20 text-[9px]">Open to work</Badge>
                        )}
                        {entry.profile?.targetRole && (
                          <span className="text-xs text-[#AEB5E0]">· {entry.profile.targetRole}</span>
                        )}
                      </div>

                      {/* Top skills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(entry.profile?.parsedSkills || [])
                          .sort((a, b) => b.proofScore - a.proofScore)
                          .slice(0, 4)
                          .map((s) => (
                            <span key={s.name} className="text-[10px] px-1.5 py-0.5 rounded-md border border-white/[0.08] bg-white/[0.03] text-[#AEB5E0]">
                              {s.name} {s.proofScore}
                            </span>
                          ))}
                      </div>

                      {/* Skill alerts */}
                      {entry.skillAlerts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {entry.skillAlerts.map((a, i) => (
                            <div key={i} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border ${
                              a.alertedAt
                                ? 'border-[#2DE2C5]/30 bg-[#2DE2C5]/5 text-[#2DE2C5]'
                                : 'border-white/[0.08] bg-white/[0.02] text-[#AEB5E0]'
                            }`}>
                              {a.alertedAt ? <Bell className="w-2.5 h-2.5" /> : <BellOff className="w-2.5 h-2.5" />}
                              {a.skill} → {a.alertAtScore}
                              {a.alertedAt && ' ✓'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/p/${entry.candidate?.username}`} target="_blank">
                        <button className="p-1.5 rounded-lg border border-white/[0.08] text-[#AEB5E0] hover:text-white hover:border-white/20 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => { setAlertModal(entry); setNewAlertSkill('') }}
                        className="p-1.5 rounded-lg border border-[#2DE2C5]/20 bg-[#2DE2C5]/5 text-[#2DE2C5] hover:bg-[#2DE2C5]/10 transition-colors"
                        title="Set skill alert"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(entry)}
                        disabled={removing === entry._id}
                        className="p-1.5 rounded-lg border border-white/[0.08] text-[#AEB5E0] hover:text-[#f43f5e] hover:border-[#f43f5e]/30 transition-colors"
                      >
                        {removing === entry._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <HeartOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Alert modal */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setAlertModal(null)}>
          <div className="node-panel w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2DE2C5]" />
              Set score alert for {alertModal.candidate?.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#AEB5E0] mb-1.5 block">Skill</label>
                <input
                  value={newAlertSkill}
                  onChange={(e) => setNewAlertSkill(e.target.value)}
                  placeholder="e.g. Go, React, Kubernetes"
                  className="w-full bg-[#05060F] border border-[#1A1E3A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[#AEB5E0] mb-1.5 block">Alert when score reaches: {newAlertScore}</label>
                <input
                  type="range" min={50} max={100} value={newAlertScore}
                  onChange={(e) => setNewAlertScore(Number(e.target.value))}
                  className="w-full accent-[#2DE2C5]"
                />
                <div className="flex justify-between text-[10px] text-[#888FC0] mt-0.5">
                  <span>50</span><span>100</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setAlertModal(null)} className="flex-1 border-[#1A1E3A] text-[#AEB5E0]">
                  Cancel
                </Button>
                <Button onClick={saveAlert} disabled={savingAlert || !newAlertSkill.trim()} className="flex-1 bg-[#2DE2C5] text-[#05060F] font-semibold">
                  {savingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save alert'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
