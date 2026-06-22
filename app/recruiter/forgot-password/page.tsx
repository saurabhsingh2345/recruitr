'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Code2, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Something went wrong')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

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
          <div className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-8">
            {sent ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#2DE2C5]/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-[#2DE2C5]" />
                </div>
                <h2 className="text-xl font-bold mb-2">Check your email</h2>
                <p className="text-sm text-[#AEB5E0] mb-6">
                  If an account exists for <span className="text-white font-medium">{email}</span>, we&apos;ve sent a reset link. It expires in 1 hour.
                </p>
                <Link href="/recruiter/login">
                  <Button variant="outline" className="w-full border-white/[0.08] text-[#AEB5E0] hover:text-white">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1">Forgot your password?</h2>
                  <p className="text-sm text-[#AEB5E0]">Enter your work email and we&apos;ll send a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888FC0]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="work@company.com"
                      className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#05060F] border border-white/[0.08] text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-11 bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <Link href="/recruiter/login" className="text-sm text-[#AEB5E0] hover:text-white transition-colors flex items-center justify-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
