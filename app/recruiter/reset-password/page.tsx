'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Code2, Lock, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) router.replace('/recruiter/forgot-password')
  }, [token, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/recruiter/login'), 2500)
      } else {
        toast.error(data.error || 'Reset failed')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-8">
      {done ? (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#2DE2C5]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-[#2DE2C5]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Password updated</h2>
          <p className="text-sm text-[#AEB5E0]">Redirecting you to sign in…</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1">Set a new password</h2>
            <p className="text-sm text-[#AEB5E0]">Must be at least 8 characters.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="New password"
                className="w-full h-11 pl-9 pr-10 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888FC0] hover:text-white transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Confirm new password"
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
              />
              {confirm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {password === confirm
                    ? <CheckCircle2 className="w-4 h-4 text-[#2DE2C5]" />
                    : <XCircle className="w-4 h-4 text-[#f59e0b]" />}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirm || password !== confirm}
              className="w-full h-11 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/recruiter/login" className="text-sm text-[#AEB5E0] hover:text-white transition-colors">
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col">
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center shadow-[0_0_12px_rgba(45,226,197,0.3)]">
            <Code2 className="w-4 h-4 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight">intervue</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
