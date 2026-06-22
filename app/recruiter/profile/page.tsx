'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Save, Loader2, Briefcase, Users } from 'lucide-react'
import { RecruiterNav } from '@/components/RecruiterNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface RecruiterProfile {
  name: string
  company: string
  jobTitle: string
  companySize: string
  openRoles: string
}

export default function RecruiterProfilePage() {
  const [form, setForm] = useState<RecruiterProfile>({
    name: '', company: '', jobTitle: '', companySize: '', openRoles: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((data) => {
      if (data?.user) {
        setForm({
          name: data.user.name || '',
          company: data.user.company || '',
          jobTitle: data.user.jobTitle || '',
          companySize: data.user.companySize || '',
          openRoles: data.user.openRoles || '',
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) toast.success('Profile saved!')
    else toast.error('Failed to save')
  }

  const field = (key: keyof RecruiterProfile) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="h-screen flex overflow-hidden">
      <RecruiterNav />
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Recruiter profile</h1>
          <p className="text-[#AEB5E0] text-sm">
            This information appears on your messages and is shown to candidates you contact.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Identity */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#080A18] p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-[#AEB5E0]" />
                Your details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Full name</Label>
                  <Input {...field('name')} className="bg-[#05060F] border-white/[0.08] text-white focus-visible:ring-[#2DE2C5]/30 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Your title</Label>
                  <Input {...field('jobTitle')} placeholder="Hiring Manager, Tech Lead..." className="bg-[#05060F] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30 text-sm" />
                </div>
              </div>
            </div>

            {/* Company */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#080A18] p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-[#AEB5E0]" />
                Company
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Company name</Label>
                  <Input {...field('company')} placeholder="Razorpay, Zepto..." className="bg-[#05060F] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Company size</Label>
                  <Input {...field('companySize')} placeholder="1–10, 11–50, 51–200..." className="bg-[#05060F] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Open roles (shown to candidates)</Label>
                <Textarea {...field('openRoles')} placeholder="Senior Backend Engineer, Full Stack Lead, ML Engineer..." rows={3} className="bg-[#05060F] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30 text-sm resize-none" />
              </div>
            </div>

            {/* Preview */}
            {form.company && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#080A18] p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#AEB5E0]" />
                  How candidates see you
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold text-sm">
                    {form.name[0] || 'R'}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{form.name || 'Your name'}</div>
                    <div className="text-xs text-[#AEB5E0]">
                      {[form.jobTitle, form.company].filter(Boolean).join(' · ') || 'Title · Company'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="btn-supernova text-[#05060F] font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </motion.div>
        )}
      </div>
      </main>
    </div>
  )
}
