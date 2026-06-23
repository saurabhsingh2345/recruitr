'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { GitBranch, Upload, ArrowRight, Code2, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import { ConstellationField } from '@/components/ConstellationField'

const ROLES = [
  'Backend Engineer',
  'Full Stack Engineer',
  'Frontend Engineer',
  'AI / ML Engineer',
  'DevOps / Platform',
  'Mobile Engineer',
]

function OnboardingPageInner() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const refSentRef = useRef(false)

  // Persist proof-page referrer and referral code to localStorage before GitHub OAuth redirect
  useEffect(() => {
    const ref = searchParams.get('ref')
    const skill = searchParams.get('skill')
    const from = searchParams.get('from')
    if (ref === 'proof' && skill) {
      localStorage.setItem('signup_ref', 'proof_page')
      localStorage.setItem('signup_skill', skill)
      localStorage.setItem('signup_from', from || '')
    }
    // Store referral code if present (e.g. ?ref=ABC12345 without skill param)
    if (ref && ref !== 'proof' && ref.length === 8) {
      localStorage.setItem('referral_code', ref)
    }
  }, [searchParams])

  // After OAuth returns, send referrer + referral code to API once
  useEffect(() => {
    if (status !== 'authenticated' || refSentRef.current) return
    refSentRef.current = true

    const ref = localStorage.getItem('signup_ref')
    if (ref) {
      fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupRef: ref,
          signupSkill: localStorage.getItem('signup_skill') || '',
          signupFrom: localStorage.getItem('signup_from') || '',
        }),
      }).then(() => {
        localStorage.removeItem('signup_ref')
        localStorage.removeItem('signup_skill')
        localStorage.removeItem('signup_from')
      }).catch(() => {})
    }

    const referralCode = localStorage.getItem('referral_code')
    if (referralCode) {
      fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralCode }),
      }).then(() => {
        localStorage.removeItem('referral_code')
      }).catch(() => {})
    }
  }, [status])

  // After GitHub OAuth redirects back here, auto-advance to resume step
  useEffect(() => {
    if (status === 'authenticated' && step === 0) setStep(1)
  }, [status, step])

  async function handleGitHubSignIn() {
    setIsLoading(true)
    await signIn('github', { callbackUrl: '/onboarding' })
  }

  async function handleXSignIn() {
    setIsLoading(true)
    await signIn('twitter', { callbackUrl: '/onboarding' })
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') {
      setResumeFile(file)
    } else {
      toast.error('Please upload a PDF file')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file?.type === 'application/pdf') {
      setResumeFile(file)
    } else {
      toast.error('Please upload a PDF file')
    }
  }

  async function handleUploadAndContinue() {
    if (!resumeFile) {
      setStep(2)
      return
    }
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      const res = await fetch('/api/resume/upload', { method: 'POST', body: formData })
      if (res.ok) {
        toast.success('Resume parsed successfully')
        setStep(2)
      } else {
        toast.error('Upload failed — you can add your resume later in settings')
        setStep(2)
      }
    } catch {
      setStep(2)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFinish() {
    if (!selectedRole) {
      toast.error('Please select a target role')
      return
    }
    setIsLoading(true)
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: selectedRole }),
      })
      await fetch('/api/profile/generate', { method: 'POST' })
      window.location.href = '/dashboard'
    } catch {
      window.location.href = '/dashboard'
    }
  }

  const steps = [
    { label: 'Connect', done: step > 0 },
    { label: 'Resume', done: step > 1 },
    { label: 'Role', done: step > 2 },
  ]

  return (
    <div className="min-h-screen flex flex-col relative">
      <ConstellationField density={44} opacity={0.4} className="z-0" />
      {/* Nav */}
      <nav className="relative z-10 border-b border-[#1A1E3A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#2DE2C5] flex items-center justify-center shadow-[0_0_14px_rgba(45,226,197,0.5)]">
            <Code2 className="w-3.5 h-3.5 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight">intervue</span>
        </Link>
        <Link href="/" className="text-xs text-[#AEB5E0] hover:text-white transition-colors">
          ← Back to home
        </Link>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Progress */}
          {step > 0 && (
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, i) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      s.done
                        ? 'bg-[#2DE2C5] text-[#05060F]'
                        : i === step - 1
                        ? 'bg-[#2DE2C5]/20 border border-[#2DE2C5] text-[#2DE2C5]'
                        : 'bg-[#1A1E3A] text-[#AEB5E0]'
                    }`}
                  >
                    {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      i === step - 1 ? 'text-[#F8F9FA]' : 'text-[#AEB5E0]'
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px w-8 ${s.done ? 'bg-[#2DE2C5]/40' : 'bg-[#1A1E3A]'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 0: Initial */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#2DE2C5]/10 border border-[#2DE2C5]/20 flex items-center justify-center mx-auto mb-6">
                  <Code2 className="w-8 h-8 text-[#2DE2C5]" />
                </div>
                <h1 className="text-3xl font-bold mb-3">Build your verified profile</h1>
                <p className="text-[#AEB5E0] mb-8 text-sm leading-relaxed">
                  Connect GitHub or X to let our AI analyze your work and build a proof-based engineering identity.
                </p>

                <div className="rounded-xl border border-[#1A1E3A] bg-[#0B0E1C] p-5 mb-6 text-left space-y-3">
                  {[
                    'We read your public profile (never write)',
                    'Profile auto-generates in ~30 seconds',
                    'You control what&apos;s public on your profile',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#2DE2C5] shrink-0" />
                      <span className="text-[#AEB5E0]" dangerouslySetInnerHTML={{ __html: item }} />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleGitHubSignIn}
                    disabled={isLoading}
                    className="w-full bg-[#F8F9FA] text-[#05060F] hover:bg-white font-medium h-11"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <GitBranch className="w-4 h-4 mr-2" />
                    )}
                    Continue with GitHub
                  </Button>

                  <Button
                    onClick={handleXSignIn}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-[#1A1E3A] bg-[#0B0E1C] text-[#AEB5E0] hover:text-white hover:border-[#AEB5E0]/40 font-medium h-11"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                    Continue with X
                  </Button>
                </div>

                <p className="text-xs text-[#AEB5E0] mt-4">
                  Already have an account?{' '}
                  <button
                    onClick={handleGitHubSignIn}
                    className="text-[#2DE2C5] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

            {/* Step 1: Resume */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold mb-2">Upload your resume</h2>
                <p className="text-[#AEB5E0] text-sm mb-6">
                  Optional but recommended — helps us generate more accurate skill evidence.
                </p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-[#2DE2C5] bg-[#2DE2C5]/5'
                      : resumeFile
                      ? 'border-[#2DE2C5]/40 bg-[#2DE2C5]/5'
                      : 'border-[#1A1E3A] bg-[#0B0E1C] hover:border-[#2a2f52]'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {resumeFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-[#2DE2C5]" />
                      <div className="text-sm font-medium">{resumeFile.name}</div>
                      <div className="text-xs text-[#AEB5E0]">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setResumeFile(null) }}
                        className="mt-1 text-xs text-[#AEB5E0] hover:text-[#f43f5e] transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-[#AEB5E0]" />
                      <div className="text-sm font-medium">Drop your resume here</div>
                      <div className="text-xs text-[#AEB5E0]">PDF only · Max 5MB</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 border-[#1A1E3A] text-[#AEB5E0] hover:text-white"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleUploadAndContinue}
                    disabled={isLoading}
                    className="flex-1 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Role selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold mb-2">What&apos;s your target role?</h2>
                <p className="text-[#AEB5E0] text-sm mb-6">
                  We&apos;ll tailor interview sessions and skill tracking to your focus area.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`p-3.5 rounded-lg border text-sm text-left transition-all ${
                        selectedRole === role
                          ? 'border-[#2DE2C5] bg-[#2DE2C5]/10 text-white'
                          : 'border-[#1A1E3A] bg-[#0B0E1C] text-[#AEB5E0] hover:border-[#2a2f52] hover:text-white'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleFinish}
                  disabled={isLoading || !selectedRole}
                  className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] h-11 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating your profile...
                    </>
                  ) : (
                    <>
                      Build my profile
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-[#AEB5E0] mt-3 text-center">
                  Takes about 30 seconds · You can change this later
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dev shortcut to advance steps */}
          {process.env.NODE_ENV === 'development' && step === 0 && (
            <div className="mt-8 pt-8 border-t border-[#1A1E3A]">
              <p className="text-xs text-[#AEB5E0] mb-3 text-center">Dev — skip to step</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep(1)} className="flex-1 border-[#1A1E3A] text-[#AEB5E0] text-xs">
                  Step 2
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStep(2)} className="flex-1 border-[#1A1E3A] text-[#AEB5E0] text-xs">
                  Step 3
                </Button>
              </div>
              <Badge className="w-full justify-center mt-2 bg-[#11142a] text-[#AEB5E0] border-[#1A1E3A] text-xs">
                Dev mode only
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingPageInner />
    </Suspense>
  )
}
