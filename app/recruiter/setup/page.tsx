'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Building2, Users, ArrowRight, CheckCircle2, Loader2, Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–2000', '2000+']

const ROLE_SUGGESTIONS = [
  'Backend Engineer', 'Full Stack Engineer', 'Frontend Engineer',
  'DevOps / SRE', 'AI / ML Engineer', 'Data Engineer',
  'Mobile Engineer', 'Engineering Manager', 'Staff Engineer',
]

export default function RecruiterSetupPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    company: '',
    jobTitle: '',
    companySize: '',
    openRoles: '',
  })

  // If already a recruiter with company, skip setup
  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/recruiter/login'); return }
    // If already set up, go straight to dashboard
    if (session.user.role === 'recruiter') {
      // Check if they've already filled company info
      fetch('/api/me').then(r => r.json()).then(data => {
        if (data?.user?.company) router.push('/recruiter/dashboard')
      })
    }
  }, [session, status, router])

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  function toggleRole(role: string) {
    const roles = form.openRoles ? form.openRoles.split(',').map(r => r.trim()).filter(Boolean) : []
    const idx = roles.indexOf(role)
    if (idx >= 0) roles.splice(idx, 1)
    else roles.push(role)
    setForm(f => ({ ...f, openRoles: roles.join(', ') }))
  }

  const selectedRoles = form.openRoles ? form.openRoles.split(',').map(r => r.trim()).filter(Boolean) : []

  async function handleFinish() {
    if (!form.company.trim()) { toast.error('Company name is required'); return }
    if (!form.jobTitle.trim()) { toast.error('Your title is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'recruiter',
          company: form.company.trim(),
          jobTitle: form.jobTitle.trim(),
          companySize: form.companySize,
          openRoles: form.openRoles,
        }),
      })

      if (!res.ok) throw new Error()
      await update() // refresh NextAuth session so role updates
      router.push('/recruiter/dashboard')
    } catch {
      toast.error('Something went wrong — please try again')
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
      </div>
    )
  }

  const steps = [
    { label: 'About you', icon: Briefcase },
    { label: 'Open roles', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-[#2DE2C5] flex items-center justify-center shadow-[0_0_12px_rgba(45,226,197,0.3)]">
          <Code2 className="w-4.5 h-4.5 text-[#05060F]" />
        </div>
        <span className="font-bold text-lg">intervue</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i === step
                ? 'bg-[#2DE2C5]/15 text-[#2DE2C5] border border-[#2DE2C5]/30'
                : i < step
                ? 'text-[#2DE2C5]'
                : 'text-[#888FC0]'
            }`}>
              {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${i < step ? 'bg-[#2DE2C5]/40' : 'bg-white/[0.08]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Tell us about yourself</h2>
                <p className="text-sm text-[#AEB5E0]">This appears on your messages to candidates.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Company name <span className="text-[#f43f5e]">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
                    <Input
                      {...field('company')}
                      placeholder="Razorpay, Zepto, Cred..."
                      className="pl-9 bg-[#05060F] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Your title <span className="text-[#f43f5e]">*</span></Label>
                  <Input
                    {...field('jobTitle')}
                    placeholder="Head of Engineering, CTO, Hiring Manager..."
                    className="bg-[#05060F] border-white/[0.08] text-white placeholder:text-[#888FC0] focus-visible:ring-[#2DE2C5]/30"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#AEB5E0] mb-1.5 block">Company size</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, companySize: size }))}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          form.companySize === size
                            ? 'border-[#2DE2C5]/50 bg-[#2DE2C5]/10 text-[#2DE2C5]'
                            : 'border-white/[0.08] text-[#AEB5E0] hover:border-white/[0.16] hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (!form.company.trim()) { toast.error('Company name is required'); return }
                  if (!form.jobTitle.trim()) { toast.error('Your title is required'); return }
                  setStep(1)
                }}
                className="w-full mt-6 btn-supernova text-[#05060F] font-semibold"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">What kind of engineers?</h2>
                <p className="text-sm text-[#AEB5E0]">
                  We&apos;ll show you the most relevant candidates first. You can change this later.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {ROLE_SUGGESTIONS.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      selectedRoles.includes(role)
                        ? 'border-[#2DE2C5]/50 bg-[#2DE2C5]/10 text-[#2DE2C5]'
                        : 'border-white/[0.08] text-[#AEB5E0] hover:border-white/[0.16] hover:text-white'
                    }`}
                  >
                    {selectedRoles.includes(role) && <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />}
                    {role}
                  </button>
                ))}
              </div>

              {selectedRoles.length > 0 && (
                <p className="text-xs text-[#888FC0] mb-4">
                  Selected: {selectedRoles.join(', ')}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="flex-1 border-white/[0.08] text-[#AEB5E0] hover:text-white"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-[2] btn-supernova text-[#05060F] font-semibold"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Setting up...</>
                    : <>Open my dashboard <ArrowRight className="w-4 h-4 ml-2" /></>
                  }
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
