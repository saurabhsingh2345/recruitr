'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CandidateNav } from '@/components/CandidateNav'
import {
  GitBranch, Upload, Save, Loader2, Eye, EyeOff, User, Bell, Shield,
  RefreshCw, Link as LinkIcon, CheckCircle2, AlertCircle, Layout,
  Plus, Trash2, GripVertical, ExternalLink, Image as ImageIcon, Video,
  X as XIcon, Palette, Copy, Check, Zap, RotateCcw, CreditCard, Sparkles, ArrowRight,
  Code2,
} from 'lucide-react'
import { ReadmeSnippetGenerator } from '@/components/profile/ReadmeSnippetGenerator'
import { GithubIcon, LinkedinIcon } from '@/components/portfolio/SocialIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

/* ── Types ──────────────────────────────────────────────────── */

interface ProfileSettings {
  name: string; bio: string; location: string; targetRole: string
  yearsOfExperience: number; isPublic: boolean; username: string; githubUsername: string
  onboardingComplete: boolean
}

interface PortfolioProject {
  title: string; description: string; techStack: string[]
  images: string[]; videoUrl: string; liveUrl: string
  githubUrl: string; featured: boolean; order: number
}

interface PortfolioCustomization {
  customTitle: string; accentColor: string
  socialLinks: { platform: string; url: string }[]
  showSkills: boolean; showExperience: boolean; showProjects: boolean; showEducation: boolean
}

type PortfolioTheme = 'minimal' | 'terminal' | 'magazine' | 'bento'

const TABS = [
  { id: 'profile',         label: 'Profile',         icon: User },
  { id: 'portfolio',       label: 'Portfolio',       icon: Layout },
  { id: 'specializations', label: 'Specializations', icon: Zap },
  { id: 'connections',     label: 'Connections',     icon: LinkIcon },
  { id: 'privacy',         label: 'Privacy',         icon: Shield },
  { id: 'notifications',   label: 'Notifications',   icon: Bell },
  { id: 'billing',         label: 'Billing',         icon: CreditCard },
]

const THEMES: { id: PortfolioTheme; label: string; desc: string; bg: string }[] = [
  { id: 'minimal',  label: 'Minimal',  desc: 'Clean, editorial, lots of white space',    bg: 'bg-white' },
  { id: 'terminal', label: 'Terminal', desc: 'Dark, code-first, monospace aesthetic',    bg: 'bg-[#0D1117]' },
  { id: 'magazine', label: 'Magazine', desc: 'Bold editorial with full-bleed hero',      bg: 'bg-[#0a0a0a]' },
  { id: 'bento',    label: 'Bento',    desc: 'Modern Apple-style grid layout',           bg: 'bg-[#f2f2f2]' },
]

const THEME_ACCENTS: Record<PortfolioTheme, string> = {
  minimal: '#0a0a0a', terminal: '#2DE2C5', magazine: '#2DE2C5', bento: '#2DE2C5',
}

const SOCIAL_PLATFORMS = ['GitHub', 'Twitter', 'LinkedIn', 'Website', 'YouTube', 'Dribbble']

/* ── Cloudinary upload ──────────────────────────────────────── */

async function uploadToCloudinary(file: File, resourceType: 'image' | 'video' = 'image'): Promise<string> {
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_type: resourceType }),
  })
  if (!signRes.ok) throw new Error('Failed to get upload signature')
  const { signature, timestamp, folder, cloudName, apiKey } = await signRes.json()
  const fd = new FormData()
  fd.append('file', file); fd.append('timestamp', String(timestamp))
  fd.append('signature', signature); fd.append('folder', folder); fd.append('api_key', apiKey)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Cloudinary upload failed')
  return (await res.json()).secure_url as string
}

/* ── Section wrapper ─────────────────────────────────────────── */

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-8 py-8 border-b border-foreground/[0.05] last:border-0">
      <div className="w-52 shrink-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {desc && <div className="text-xs text-foreground/40 mt-1 leading-relaxed">{desc}</div>}
      </div>
      <div className="flex-1 min-w-0 space-y-4">{children}</div>
    </div>
  )
}

/* ── Project editor ─────────────────────────────────────────── */

function ProjectEditor({ project, onChange, onDelete }: {
  project: PortfolioProject
  onChange: (p: PortfolioProject) => void
  onDelete: () => void
}) {
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)

  function addTag(tag: string) {
    const t = tag.trim()
    if (!t || project.techStack.includes(t)) return
    onChange({ ...project, techStack: [...project.techStack, t] })
    setTagInput('')
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(
        Array.from(files).slice(0, 4 - project.images.length).map(f => uploadToCloudinary(f, 'image'))
      )
      onChange({ ...project, images: [...project.images, ...urls] })
      toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded`)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  async function handleVideoUpload(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'video')
      onChange({ ...project, videoUrl: url })
      toast.success('Video uploaded')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  return (
    <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-foreground/[0.06]">
        <GripVertical className="w-3.5 h-3.5 text-foreground/20 cursor-grab shrink-0" />
        <input
          value={project.title}
          onChange={e => onChange({ ...project, title: e.target.value })}
          placeholder="Project title"
          className="flex-1 bg-transparent text-sm font-semibold placeholder:text-foreground/25 outline-none"
        />
        <button
          onClick={() => onChange({ ...project, featured: !project.featured })}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
            project.featured ? 'bg-[#2DE2C5]/12 text-[#2DE2C5]' : 'text-foreground/30 hover:text-foreground/60'
          }`}
        >
          {project.featured ? '★ Featured' : '☆ Feature'}
        </button>
        <button onClick={onDelete} className="text-foreground/20 hover:text-red-400 transition-colors p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <Textarea
          value={project.description}
          onChange={e => onChange({ ...project, description: e.target.value })}
          placeholder="What does this project do?"
          className="bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/25 text-sm resize-none"
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] text-foreground/35 mb-1 block">Live URL</Label>
            <Input value={project.liveUrl} onChange={e => onChange({ ...project, liveUrl: e.target.value })}
              placeholder="https://…" className="h-8 bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-foreground/35 mb-1 block">GitHub URL</Label>
            <Input value={project.githubUrl} onChange={e => onChange({ ...project, githubUrl: e.target.value })}
              placeholder="https://github.com/…" className="h-8 bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-xs" />
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <Label className="text-[11px] text-foreground/35 mb-1.5 block">Tech stack</Label>
          <div className="flex flex-wrap gap-1 mb-2">
            {project.techStack.map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/65">
                {t}
                <button onClick={() => onChange({ ...project, techStack: project.techStack.filter(x => x !== t) })}
                  className="text-foreground/30 hover:text-foreground/60">
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
            placeholder="React, TypeScript… (Enter to add)"
            className="h-8 bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-xs" />
        </div>

        {/* Screenshots */}
        <div>
          <Label className="text-[11px] text-foreground/35 mb-1.5 block">Screenshots ({project.images.length}/4)</Label>
          <div className="flex gap-2 flex-wrap">
            {project.images.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-20 h-14 object-cover rounded-lg border border-foreground/[0.08]" />
                <button onClick={() => onChange({ ...project, images: project.images.filter((_, j) => j !== i) })}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <XIcon className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            {project.images.length < 4 && (
              <label className="w-20 h-14 rounded-lg border border-dashed border-foreground/[0.12] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground/30 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-foreground/30" /> : (
                  <><ImageIcon className="w-4 h-4 text-foreground/25" /><span className="text-[9px] text-foreground/25">Add</span></>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        {/* Video */}
        <div>
          {project.videoUrl ? (
            <div className="flex items-center gap-2 text-xs">
              <Video className="w-3.5 h-3.5 text-[#2DE2C5] shrink-0" />
              <span className="text-foreground/50 truncate flex-1">{project.videoUrl}</span>
              <button onClick={() => onChange({ ...project, videoUrl: '' })} className="text-foreground/25 hover:text-red-400">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 text-xs text-foreground/35 cursor-pointer hover:text-foreground/55 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
              Upload demo video
              <input type="file" accept="video/*" className="hidden" onChange={e => handleVideoUpload(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Theme card ─────────────────────────────────────────────── */

function ThemeCard({ theme, selected, onClick }: {
  theme: typeof THEMES[0]; selected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`relative rounded-xl overflow-hidden text-left transition-all border-2 ${
        selected
          ? 'border-[#2DE2C5] shadow-[0_0_0_3px_rgba(45,226,197,0.12)]'
          : 'border-foreground/[0.07] hover:border-foreground/20'
      }`}
    >
      {/* Mini thumbnail */}
      <div className={`h-28 ${theme.bg} relative overflow-hidden`}>
        {theme.id === 'minimal' && (
          <div className="p-4 space-y-2">
            <div className="h-2.5 w-24 bg-black/20 rounded-full" />
            <div className="h-1.5 w-36 bg-black/10 rounded-full" />
            <div className="h-1.5 w-28 bg-black/08 rounded-full" />
            <div className="flex gap-2 mt-2"><div className="h-5 w-16 bg-black/12 rounded-lg" /><div className="h-5 w-20 bg-black/06 rounded-lg border border-black/10" /></div>
          </div>
        )}
        {theme.id === 'terminal' && (
          <div className="p-3 font-mono">
            <div className="flex gap-1 mb-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" /><div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" /><div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" /></div>
            <div className="space-y-1.5">
              <div className="flex gap-1.5"><span className="text-[#2DE2C5] text-[8px]">❯</span><div className="h-1.5 w-12 bg-[#2DE2C5]/50 rounded" /></div>
              <div className="h-1.5 w-32 bg-white/15 rounded" />
              <div className="h-1.5 w-20 bg-white/10 rounded" />
              <div className="flex gap-1.5 mt-1"><span className="text-[#2DE2C5] text-[8px]">❯</span><div className="h-1.5 w-16 bg-[#2DE2C5]/40 rounded" /></div>
            </div>
          </div>
        )}
        {theme.id === 'magazine' && (
          <div className="p-4">
            <div className="h-5 w-32 bg-white/15 rounded mb-2" />
            <div className="h-3 w-28 bg-white/08 rounded mb-3" />
            <div className="flex gap-1.5">
              {['#2DE2C5','#8B7CF8','#3FC5F0'].map(c => (
                <div key={c} className="flex-1 h-6 rounded-lg opacity-60" style={{ background: c }} />
              ))}
            </div>
          </div>
        )}
        {theme.id === 'bento' && (
          <div className="p-3 grid grid-cols-3 gap-1.5 h-full">
            <div className="col-span-2 bg-white rounded-xl" />
            <div className="bg-black/12 rounded-xl" />
            <div className="bg-white/70 rounded-xl" />
            <div className="col-span-2 bg-white/85 rounded-xl" />
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2DE2C5] flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-3 h-3 text-[#04050e]" />
          </div>
        )}
      </div>
      <div className="px-3 py-2.5 bg-foreground/[0.015]">
        <div className="text-[12px] font-semibold mb-0.5">{theme.label}</div>
        <div className="text-[10px] text-foreground/35 leading-relaxed">{theme.desc}</div>
      </div>
    </button>
  )
}

/* ── Live preview ────────────────────────────────────────────── */

const FRAME_W = 1440

function PreviewPanel({ username, theme }: { username: string; theme: string }) {
  const [key, setKey] = useState(0)
  useEffect(() => { setKey(k => k + 1) }, [theme])
  const url = username ? `/p/${username}?theme=${theme}` : null

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 h-10 px-4 flex items-center justify-between border-b border-foreground/[0.06] bg-foreground/[0.01]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2DE2C5] animate-pulse" />
          <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">Preview</span>
          <span className="text-[11px] text-foreground/25 capitalize">· {theme}</span>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors">
            <ExternalLink className="w-3 h-3" />Open
          </a>
        )}
      </div>
      <div className="flex-1 overflow-hidden bg-foreground/[0.01]">
        {url ? (
          <IframeScaled key={key} src={url} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-foreground/20">
            <Layout className="w-10 h-10 opacity-20" />
            <p className="text-sm">No username to preview</p>
          </div>
        )}
      </div>
    </div>
  )
}

function IframeScaled({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.45)

  useEffect(() => {
    function measure() {
      if (ref.current) setScale(ref.current.clientWidth / FRAME_W)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const fh = scale > 0 ? Math.ceil((typeof window !== 'undefined' ? window.innerHeight : 900) / scale) : 2000

  return (
    <div ref={ref} className="w-full h-full overflow-hidden">
      <div style={{ width: FRAME_W, height: fh, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <iframe src={src} title="Portfolio preview" style={{ width: FRAME_W, height: fh, border: 'none', display: 'block' }} />
      </div>
    </div>
  )
}

/* ── Toggle switch ───────────────────────────────────────────── */

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-[#2DE2C5]' : 'bg-foreground/[0.12]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  )
}

/* ── Main page ───────────────────────────────────────────────── */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [settings, setSettings] = useState<ProfileSettings>({
    name: '', bio: '', location: '', targetRole: '',
    yearsOfExperience: 0, isPublic: true, username: '', githubUsername: '',
    onboardingComplete: false,
  })
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([])
  const [portfolioTheme, setPortfolioTheme] = useState<PortfolioTheme>('minimal')
  const [customization, setCustomization] = useState<PortfolioCustomization>({
    customTitle: '', accentColor: '',
    socialLinks: [],
    showSkills: true, showExperience: true, showProjects: true, showEducation: true,
  })
  const [emailBriefEnabled, setEmailBriefEnabled] = useState(true)
  const [notifReminders, setNotifReminders] = useState(true)
  const [notifRecruiterViews, setNotifRecruiterViews] = useState(true)
  const [notifScoreMilestones, setNotifScoreMilestones] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingProfile, setGeneratingProfile] = useState(false)
  const [gitlabHandle, setGitlabHandle] = useState('')
  const [gitlabStatus, setGitlabStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [gitlabMsg, setGitlabMsg] = useState('')
  const [twitterHandle, setTwitterHandle] = useState('')
  const [twitterStatus, setTwitterStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [twitterMsg, setTwitterMsg] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [linkedinStatus, setLinkedinStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [linkedinMsg, setLinkedinMsg] = useState('')
  const [newSocialPlatform, setNewSocialPlatform] = useState('')
  const [newSocialUrl, setNewSocialUrl] = useState('')
  const [syncToken, setSyncToken] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedYaml, setCopiedYaml] = useState(false)
  const [regeneratingToken, setRegeneratingToken] = useState(false)
  const [billingTier, setBillingTier] = useState<'free' | 'pro'>('free')
  const [billingStatus, setBillingStatus] = useState('')
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwChanging, setPwChanging] = useState(false)
  const [authProvider, setAuthProvider] = useState<'github' | 'credentials' | 'twitter'>('github')
  const [specializations, setSpecializations] = useState<Array<{
    name: string; skill: string; score: number; confirmedByUser: boolean
  }>>([])
  const [specLoading, setSpecLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const { user, profile } = await res.json()
          setSettings({
            name: user?.name || '', bio: profile?.bio || '',
            location: profile?.location || '', targetRole: profile?.targetRole || '',
            yearsOfExperience: profile?.yearsOfExperience || 0,
            isPublic: profile?.isPublic ?? true,
            username: user?.username || '', githubUsername: user?.username || '',
            onboardingComplete: profile?.onboardingComplete === true,
          })
          if (typeof user?.emailBriefEnabled === 'boolean') setEmailBriefEnabled(user.emailBriefEnabled)
          if (typeof user?.notifReminders === 'boolean') setNotifReminders(user.notifReminders)
          if (typeof user?.notifRecruiterViews === 'boolean') setNotifRecruiterViews(user.notifRecruiterViews)
          if (typeof user?.notifScoreMilestones === 'boolean') setNotifScoreMilestones(user.notifScoreMilestones)
          if (profile?.portfolioProjects?.length) setPortfolioProjects(profile.portfolioProjects)
          if (profile?.portfolioTheme) setPortfolioTheme(profile.portfolioTheme)
          if (profile?.portfolioCustomization) setCustomization(c => ({ ...c, ...profile.portfolioCustomization }))
          const li = (user?.connections || []).find((c: { source: string }) => c.source === 'linkedin')
          if (li?.handle) { setLinkedinUrl(li.handle); setLinkedinStatus('ok'); setLinkedinMsg(li.summary || 'Previously synced') }
          const gl = (user?.connections || []).find((c: { source: string }) => c.source === 'gitlab')
          if (gl?.handle) { setGitlabHandle(gl.handle); setGitlabStatus('ok'); setGitlabMsg(gl.summary || 'Previously synced') }
          const tw = (user?.connections || []).find((c: { source: string }) => c.source === 'twitter')
          if (tw?.handle) { setTwitterHandle(tw.handle); setTwitterStatus('ok'); setTwitterMsg(tw.summary || 'Previously synced') }
          if (user?.lastSyncAt) setLastSyncAt(user.lastSyncAt)
          if (user?.authProvider) setAuthProvider(user.authProvider)
        }
        // Load sync token separately — only fetched when on connections tab
        const tokenRes = await fetch('/api/me/sync-token')
        if (tokenRes.ok) {
          const { token, lastSyncAt: lsa } = await tokenRes.json()
          setSyncToken(token || '')
          if (lsa) setLastSyncAt(lsa)
        }
        // Load billing status
        const billRes = await fetch('/api/billing/status')
        if (billRes.ok) {
          const b = await billRes.json()
          setBillingTier(b.tier || 'free')
          setBillingStatus(b.status || '')
          setBillingPeriodEnd(b.currentPeriodEnd || null)
          // Handle successful checkout redirect
          const params = new URLSearchParams(window.location.search)
          if (params.get('checkout') === 'success') {
            toast.success('Welcome to Intervue Pro!')
            window.history.replaceState({}, '', '/settings?tab=billing')
          }
        }
        // Load specializations
        const specRes = await fetch('/api/profile/specializations')
        if (specRes.ok) {
          const { specializations: specs } = await specRes.json()
          setSpecializations(specs || [])
        }
      } catch { toast.error('Failed to load settings') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name, bio: settings.bio, location: settings.location,
          targetRole: settings.targetRole, yearsOfExperience: settings.yearsOfExperience,
          isPublic: settings.isPublic, portfolioTheme, portfolioProjects,
          portfolioCustomization: customization,
        }),
      })
      if (res.ok) toast.success('Saved successfully')
      else toast.error('Save failed')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  async function handleSpecAction(action: 'confirm' | 'remove', name: string, skill: string) {
    setSpecLoading(true)
    try {
      const res = await fetch('/api/profile/specializations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, skill }),
      })
      if (res.ok) {
        const { specializations: updated } = await res.json()
        setSpecializations(updated)
        toast.success(action === 'confirm' ? 'Specialization confirmed' : 'Specialization removed')
      }
    } catch { toast.error('Failed to update specialization') }
    finally { setSpecLoading(false) }
  }

  async function handleUpgrade() {
    setCheckingOut(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to start checkout')
        setCheckingOut(false)
      }
    } catch { toast.error('Failed to start checkout'); setCheckingOut(false) }
  }

  async function handleManageBilling() {
    setOpeningPortal(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to open billing portal')
        setOpeningPortal(false)
      }
    } catch { toast.error('Failed to open billing portal'); setOpeningPortal(false) }
  }

  async function handleLinkedInSync() {
    if (!linkedinUrl.includes('linkedin.com/in/')) { toast.error('Enter a valid LinkedIn URL'); return }
    setLinkedinStatus('syncing')
    const meRes = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ connection: { source: 'linkedin', handle: linkedinUrl } }) })
    if (!meRes.ok) {
      const meData = await meRes.json()
      if (meData.code === 'UPGRADE_REQUIRED') {
        setLinkedinStatus('error')
        setLinkedinMsg('Requires Intervue Pro')
        toast.error('LinkedIn sync requires Pro — upgrade in the Billing tab')
      } else {
        setLinkedinStatus('error')
        setLinkedinMsg(meData.error || 'Failed to save LinkedIn URL')
        toast.error(meData.error || 'Failed to save LinkedIn URL')
      }
      return
    }
    try {
      const res = await fetch('/api/profile/sync/linkedin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileUrl: linkedinUrl }) })
      const data = await res.json()
      if (res.ok) { setLinkedinStatus('ok'); setLinkedinMsg(`Synced — ${data.skillsAdded} skills added`); toast.success('LinkedIn synced!') }
      else { setLinkedinStatus('error'); setLinkedinMsg(data.error || 'Sync failed'); toast.error(data.error || 'Sync failed') }
    } catch { setLinkedinStatus('error'); setLinkedinMsg('Network error') }
  }

  async function handleGitLabSync() {
    if (!gitlabHandle.trim()) { toast.error('Enter a GitLab username'); return }
    setGitlabStatus('syncing')
    try {
      const res = await fetch('/api/profile/sync/gitlab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitlabUsername: gitlabHandle.trim().replace(/^@/, '') }),
      })
      const data = await res.json()
      if (res.ok) {
        setGitlabStatus('ok')
        setGitlabMsg(`Synced — ${data.skillsAdded} skills added`)
        toast.success('GitLab synced!')
      } else {
        setGitlabStatus('error')
        setGitlabMsg(data.error || 'Sync failed')
        toast.error(data.error || 'GitLab sync failed')
      }
    } catch { setGitlabStatus('error'); setGitlabMsg('Network error') }
  }

  async function handleTwitterSync() {
    if (!twitterHandle.trim()) { toast.error('Enter your X/Twitter handle'); return }
    setTwitterStatus('syncing')
    try {
      const res = await fetch('/api/profile/sync/twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: twitterHandle.trim().replace(/^@/, '') }),
      })
      const data = await res.json()
      if (res.ok) {
        setTwitterStatus('ok')
        setTwitterMsg(`Synced — ${data.skillsAdded} skills extracted`)
        toast.success('X/Twitter synced!')
      } else if (data.code === 'TWITTER_NOT_CONFIGURED') {
        setTwitterStatus('error')
        setTwitterMsg('Not configured — TWITTER_BEARER_TOKEN required')
        toast.message('X/Twitter sync not available', { description: 'Set TWITTER_BEARER_TOKEN to enable.' })
      } else {
        setTwitterStatus('error')
        setTwitterMsg(data.error || 'Sync failed')
        toast.error(data.error || 'X/Twitter sync failed')
      }
    } catch { setTwitterStatus('error'); setTwitterMsg('Network error') }
  }

  async function handleChangePassword() {
    if (pwNew !== pwConfirm) { toast.error('New passwords do not match'); return }
    if (pwNew.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setPwChanging(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password updated')
        setPwCurrent(''); setPwNew(''); setPwConfirm('')
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch { toast.error('Failed to change password') }
    finally { setPwChanging(false) }
  }

  async function handleRegenerateProfile() {
    setGeneratingProfile(true)
    try {
      const res = await fetch('/api/profile/generate', { method: 'POST' })
      if (res.ok) toast.success('Profile regenerated from GitHub!')
      else toast.error('Regeneration failed')
    } catch { toast.error('Regeneration failed') }
    finally { setGeneratingProfile(false) }
  }

  async function handleRegenerateToken() {
    setRegeneratingToken(true)
    try {
      const res = await fetch('/api/me/sync-token', { method: 'POST' })
      if (res.ok) {
        const { token } = await res.json()
        setSyncToken(token)
        toast.success('Token regenerated — update your GitHub workflow secret')
      } else toast.error('Failed to regenerate token')
    } catch { toast.error('Failed to regenerate token') }
    finally { setRegeneratingToken(false) }
  }

  function copyToken() {
    navigator.clipboard.writeText(syncToken)
    setCopiedToken(true)
    toast.success('Token copied')
    setTimeout(() => setCopiedToken(false), 2000)
  }

  function copyYaml() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
    const yaml = `name: Sync Intervue profile\non: [push]\njobs:\n  sync:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Sync to Intervue\n        run: |\n          curl -s -X POST ${origin}/api/connections/sync \\\n            -H "Authorization: Bearer \${{ secrets.INTERVUE_SYNC_TOKEN }}"`
    navigator.clipboard.writeText(yaml)
    setCopiedYaml(true)
    toast.success('Workflow YAML copied')
    setTimeout(() => setCopiedYaml(false), 2000)
  }

  function addProject() {
    setPortfolioProjects(p => [...p, { title: '', description: '', techStack: [], images: [], videoUrl: '', liveUrl: '', githubUrl: '', featured: false, order: p.length }])
  }

  function addSocialLink() {
    if (!newSocialPlatform || !newSocialUrl) return
    setCustomization(c => ({ ...c, socialLinks: [...(c.socialLinks || []), { platform: newSocialPlatform, url: newSocialUrl }] }))
    setNewSocialPlatform(''); setNewSocialUrl('')
  }

  const isPortfolioTab = activeTab === 'portfolio'

  return (
    <div className="h-screen flex overflow-hidden">
      <CandidateNav username={settings.username} />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">

        {/* ── Top bar ── */}
        <div className="shrink-0 h-14 px-8 flex items-center justify-between border-b border-foreground/[0.06] bg-background/95 backdrop-blur">
          <h1 className="text-[15px] font-semibold">Settings</h1>
          <div className="flex items-center gap-3">
            {settings.username && (
              <a href={`/p/${settings.username}`} target="_blank"
                className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />View portfolio
              </a>
            )}
            <Button onClick={handleSave} disabled={saving} size="sm"
              className="btn-supernova font-semibold text-xs h-8 px-5 gap-1.5">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save changes
            </Button>
          </div>
        </div>

        {/* ── Horizontal tab bar ── */}
        <div className="shrink-0 border-b border-foreground/[0.06] px-8">
          <div className="flex gap-0 -mb-px">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-[#2DE2C5] text-foreground'
                    : 'border-transparent text-foreground/40 hover:text-foreground/70 hover:border-foreground/20'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 shrink-0 ${activeTab === tab.id ? 'text-[#2DE2C5]' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#2DE2C5] animate-spin" />
          </div>
        ) : isPortfolioTab ? (

          /* Portfolio: split layout */
          <div className="flex-1 overflow-hidden flex">

            {/* Left: form */}
            <div className="w-[600px] shrink-0 overflow-y-auto border-r border-foreground/[0.06]">
              <div className="px-8 pt-2">

                {/* Theme picker */}
                <Section title="Theme" desc="Choose how your public portfolio looks to visitors.">
                  <div className="grid grid-cols-2 gap-3">
                    {THEMES.map(t => (
                      <ThemeCard key={t.id} theme={t} selected={portfolioTheme === t.id} onClick={() => setPortfolioTheme(t.id)} />
                    ))}
                  </div>
                </Section>

                {/* Customization */}
                <Section title="Customization" desc="Fine-tune colors, headline, and visible sections.">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-foreground/40 mb-1.5 block">Custom headline</Label>
                      <Input value={customization.customTitle}
                        onChange={e => setCustomization(c => ({ ...c, customTitle: e.target.value }))}
                        placeholder="Full-stack engineer…"
                        className="bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-foreground/40 mb-1.5 block">Accent color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color"
                          value={customization.accentColor || THEME_ACCENTS[portfolioTheme]}
                          onChange={e => setCustomization(c => ({ ...c, accentColor: e.target.value }))}
                          className="w-9 h-9 rounded-lg border border-foreground/[0.08] cursor-pointer p-0.5 bg-transparent" />
                        <Input value={customization.accentColor || THEME_ACCENTS[portfolioTheme]}
                          onChange={e => setCustomization(c => ({ ...c, accentColor: e.target.value }))}
                          className="flex-1 bg-foreground/[0.03] border-foreground/[0.08] text-foreground font-mono text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-foreground/40 mb-2 block">Visible sections</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([['showSkills','Skills'],['showProjects','Projects'],['showExperience','Experience'],['showEducation','Education']] as [keyof PortfolioCustomization, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.05]">
                          <span className="text-sm">{label}</span>
                          <Toggle on={!!customization[key]} onToggle={() => setCustomization(c => ({ ...c, [key]: !c[key] }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-foreground/40 mb-2 block">Social links</Label>
                    <div className="space-y-2 mb-3">
                      {(customization.socialLinks || []).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.03] border border-foreground/[0.05] text-sm">
                          <span className="w-20 shrink-0 text-foreground/50 capitalize text-xs">{s.platform}</span>
                          <span className="flex-1 text-foreground/40 text-xs truncate">{s.url}</span>
                          <button onClick={() => setCustomization(c => ({ ...c, socialLinks: (c.socialLinks||[]).filter((_,j)=>j!==i) }))}
                            className="text-foreground/20 hover:text-red-400 transition-colors">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select value={newSocialPlatform} onChange={e => setNewSocialPlatform(e.target.value)}
                        className="bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg px-3 py-2 text-xs text-foreground w-32 shrink-0">
                        <option value="">Platform</option>
                        {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <Input value={newSocialUrl} onChange={e => setNewSocialUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addSocialLink() }}
                        placeholder="https://…"
                        className="flex-1 bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-xs" />
                      <Button size="sm" onClick={addSocialLink} disabled={!newSocialPlatform || !newSocialUrl}
                        className="shrink-0 bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground border border-foreground/[0.08]">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Section>

                {/* Projects */}
                <Section title="Projects" desc="Showcase work with screenshots, links, and videos.">
                  {portfolioProjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-foreground/[0.1] py-12 text-center">
                      <Layout className="w-8 h-8 mx-auto mb-3 text-foreground/20" />
                      <p className="text-sm text-foreground/40 mb-1">No projects yet</p>
                      <p className="text-xs text-foreground/25 mb-4">Add projects to show on your portfolio</p>
                      <Button size="sm" onClick={addProject} className="btn-supernova font-semibold text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />Add first project
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {portfolioProjects.map((p, i) => (
                        <ProjectEditor key={i} project={p}
                          onChange={updated => { const next = [...portfolioProjects]; next[i] = updated; setPortfolioProjects(next) }}
                          onDelete={() => setPortfolioProjects(portfolioProjects.filter((_, j) => j !== i))} />
                      ))}
                      <Button variant="outline" size="sm" onClick={addProject}
                        className="w-full border-dashed border-foreground/[0.1] text-foreground/40 hover:text-foreground/70 hover:border-foreground/25 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />Add another project
                      </Button>
                    </div>
                  )}
                </Section>

              </div>
            </div>

            {/* Right: live preview */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <PreviewPanel username={settings.username} theme={portfolioTheme} />
            </div>
          </div>

        ) : (

          /* Other tabs: centered single column */
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto px-8 pb-16">

                {/* ── Profile ── */}
                {activeTab === 'profile' && (
                  <>
                    {!settings.onboardingComplete && (
                      <div className="mt-6 mb-2 rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2DE2C5]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-4 h-4 text-[#2DE2C5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground mb-0.5">Complete your profile</div>
                          <p className="text-xs text-foreground/50 leading-relaxed">
                            Take your first interview session to build verified proof scores from your actual code — not self-reported skills. Takes about 10 minutes.
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <a
                              href="/interview/new"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#2DE2C5] text-[#04050e] hover:bg-[#1fb89e] transition-colors"
                            >
                              Start first interview →
                            </a>
                            <button
                              onClick={async () => {
                                await fetch('/api/onboarding/skip', { method: 'POST' })
                                setSettings(s => ({ ...s, onboardingComplete: true }))
                                if (settings.username) localStorage.setItem(`ob_skip_${settings.username}`, '1')
                              }}
                              className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <Section title="Basic info" desc="Your name, role, and where you're based.">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-foreground/40 mb-1.5 block">Full name</Label>
                          <Input value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                            className="bg-foreground/[0.03] border-foreground/[0.08] text-foreground text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground/40 mb-1.5 block">Location</Label>
                          <Input value={settings.location} onChange={e => setSettings(s => ({ ...s, location: e.target.value }))}
                            placeholder="Bangalore, India"
                            className="bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground/40 mb-1.5 block">Target role</Label>
                          <Input value={settings.targetRole} onChange={e => setSettings(s => ({ ...s, targetRole: e.target.value }))}
                            placeholder="Backend Engineer"
                            className="bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground/40 mb-1.5 block">Years of experience</Label>
                          <Input type="number" value={settings.yearsOfExperience} min={0} max={40}
                            onChange={e => setSettings(s => ({ ...s, yearsOfExperience: Number(e.target.value) }))}
                            className="bg-foreground/[0.03] border-foreground/[0.08] text-foreground text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-foreground/40 mb-1.5 block">Bio</Label>
                        <Textarea value={settings.bio} onChange={e => setSettings(s => ({ ...s, bio: e.target.value }))}
                          placeholder="A short professional bio that appears on your portfolio…"
                          className="bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm resize-none" rows={3} />
                      </div>
                    </Section>

                    <Section title="GitHub" desc="Sync repositories and languages to your profile.">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06]">
                        <div className="w-8 h-8 rounded-lg bg-[#2DE2C5]/10 flex items-center justify-center shrink-0">
                          <GitBranch className="w-4 h-4 text-[#2DE2C5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            GitHub
                            <span className="flex items-center gap-1 text-[11px] text-[#2DE2C5]"><CheckCircle2 className="w-3 h-3" />Connected</span>
                          </div>
                          <div className="text-xs text-foreground/40 mt-0.5">Signed in as <span className="font-mono text-foreground/60">@{settings.githubUsername}</span></div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRegenerateProfile} disabled={generatingProfile}
                          className="border-foreground/[0.08] text-foreground/50 hover:text-foreground text-xs shrink-0">
                          {generatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                          Re-sync repos
                        </Button>
                      </div>
                    </Section>

                    <Section title="Resume" desc="Upload a PDF to re-parse skills and experience.">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06]">
                        <div className="w-8 h-8 rounded-lg bg-foreground/[0.06] flex items-center justify-center shrink-0">
                          <Upload className="w-4 h-4 text-foreground/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Upload resume</div>
                          <div className="text-xs text-foreground/40 mt-0.5">PDF format · Skills will be extracted automatically</div>
                        </div>
                        <Button variant="outline" size="sm" className="border-foreground/[0.08] text-foreground/50 hover:text-foreground text-xs shrink-0"
                          onClick={() => document.getElementById('resume-upload')?.click()}>
                          <Upload className="w-3.5 h-3.5 mr-1" />Choose file
                        </Button>
                        <input id="resume-upload" type="file" accept=".pdf" className="hidden"
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const fd = new FormData(); fd.append('resume', file)
                            const res = await fetch('/api/resume/upload', { method: 'POST', body: fd })
                            if (res.ok) toast.success('Resume uploaded!'); else toast.error('Upload failed')
                          }} />
                      </div>
                    </Section>
                  </>
                )}

                {/* ── Connections ── */}
                {activeTab === 'connections' && (
                  <>
                    <Section title="LinkedIn" desc="Extract roles, skills, and education from your LinkedIn profile.">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/12 flex items-center justify-center shrink-0">
                            <LinkedinIcon className="w-4 h-4 text-[#0A66C2]" />
                          </div>
                          <div className="text-sm font-medium">LinkedIn profile URL</div>
                        </div>
                        <div className="flex gap-2">
                          <Input value={linkedinUrl}
                            onChange={e => { setLinkedinUrl(e.target.value); setLinkedinStatus('idle') }}
                            placeholder="https://www.linkedin.com/in/your-username"
                            className="flex-1 bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm" />
                          <Button onClick={handleLinkedInSync} disabled={linkedinStatus === 'syncing' || !linkedinUrl}
                            className="btn-supernova font-semibold shrink-0">
                            {linkedinStatus === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                            {linkedinStatus === 'syncing' ? 'Syncing…' : 'Sync'}
                          </Button>
                        </div>
                        {linkedinStatus !== 'idle' && linkedinMsg && (
                          <div className={`flex items-center gap-2 text-xs ${linkedinStatus === 'ok' ? 'text-[#2DE2C5]' : 'text-[#FB7185]'}`}>
                            {linkedinStatus === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                            {linkedinMsg}
                          </div>
                        )}
                      </div>
                    </Section>

                    <Section title="GitLab" desc="Public repos analysed via GitLab REST API — no OAuth required.">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[11px] font-mono font-bold" style={{ background: '#E24329' }}>GL</div>
                          <div className="text-sm font-medium">GitLab username</div>
                          {gitlabStatus === 'ok' && <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-[#2DE2C5]/10 text-[#2DE2C5] font-semibold">Connected</span>}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={gitlabHandle}
                            onChange={e => { setGitlabHandle(e.target.value); setGitlabStatus('idle') }}
                            placeholder="your-gitlab-username"
                            onKeyDown={e => e.key === 'Enter' && handleGitLabSync()}
                            className="flex-1 bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm"
                          />
                          <Button onClick={handleGitLabSync} disabled={gitlabStatus === 'syncing' || !gitlabHandle.trim()}
                            className="btn-supernova font-semibold shrink-0">
                            {gitlabStatus === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                            {gitlabStatus === 'syncing' ? 'Syncing…' : 'Sync'}
                          </Button>
                        </div>
                        {gitlabStatus !== 'idle' && gitlabMsg && (
                          <div className={`flex items-center gap-2 text-xs ${gitlabStatus === 'ok' ? 'text-[#2DE2C5]' : 'text-[#FB7185]'}`}>
                            {gitlabStatus === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                            {gitlabMsg}
                          </div>
                        )}
                      </div>
                    </Section>

                    <Section title="X / Twitter" desc="Extract technical skills from your bio and recent tweets via Twitter API v2.">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1DA1F2' + '20' }}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1DA1F2">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </div>
                          <div className="text-sm font-medium">X / Twitter handle</div>
                          {twitterStatus === 'ok' && <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-[#2DE2C5]/10 text-[#2DE2C5] font-semibold">Connected</span>}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={twitterHandle}
                            onChange={e => { setTwitterHandle(e.target.value); setTwitterStatus('idle') }}
                            placeholder="@yourhandle"
                            onKeyDown={e => e.key === 'Enter' && handleTwitterSync()}
                            className="flex-1 bg-foreground/[0.03] border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm"
                          />
                          <Button onClick={handleTwitterSync} disabled={twitterStatus === 'syncing' || !twitterHandle.trim()}
                            className="btn-supernova font-semibold shrink-0">
                            {twitterStatus === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                            {twitterStatus === 'syncing' ? 'Syncing…' : 'Sync'}
                          </Button>
                        </div>
                        {twitterStatus !== 'idle' && twitterMsg && (
                          <div className={`flex items-center gap-2 text-xs ${twitterStatus === 'ok' ? 'text-[#2DE2C5]' : 'text-[#FB7185]'}`}>
                            {twitterStatus === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                            {twitterMsg}
                          </div>
                        )}
                      </div>
                    </Section>

                    <Section title="GitHub" desc="Your primary GitHub account, synced at sign-in.">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06]">
                        <div className="w-8 h-8 rounded-lg bg-[#2DE2C5]/10 flex items-center justify-center shrink-0">
                          <GitBranch className="w-4 h-4 text-[#2DE2C5]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            GitHub <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5]" /><span className="text-[#2DE2C5] font-normal text-xs">Connected</span>
                          </div>
                          <div className="text-xs text-foreground/40 mt-0.5">@{settings.githubUsername} · repos and languages synced</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRegenerateProfile} disabled={generatingProfile}
                          className="border-foreground/[0.08] text-foreground/50 hover:text-foreground text-xs shrink-0">
                          {generatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                          Re-sync
                        </Button>
                      </div>
                    </Section>

                    <Section title="Auto-sync on push" desc="Your profile updates automatically every time you push to GitHub. Free — always.">
                      <div className="space-y-4">

                        {/* Status row */}
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2DE2C5]/[0.04] border border-[#2DE2C5]/20">
                          <Zap className="w-4 h-4 text-[#2DE2C5] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">GitHub Action sync</div>
                            <div className="text-xs text-foreground/40 mt-0.5">
                              {lastSyncAt
                                ? `Last synced ${new Date(lastSyncAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                : 'Not yet triggered — add the workflow to any repo'}
                            </div>
                          </div>
                        </div>

                        {/* Token */}
                        <div>
                          <Label className="text-xs text-foreground/40 mb-1.5 block">Sync token</Label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.08] font-mono text-xs min-w-0">
                              <span className="flex-1 truncate text-foreground/50">
                                {tokenVisible ? syncToken : syncToken ? '••••••••••••••••••••••••••••••••' : 'Loading…'}
                              </span>
                              <button onClick={() => setTokenVisible(v => !v)}
                                className="text-foreground/25 hover:text-foreground/50 shrink-0">
                                {tokenVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <Button size="sm" variant="outline" onClick={copyToken} disabled={!syncToken}
                              className="border-foreground/[0.08] text-foreground/50 hover:text-foreground shrink-0 text-xs">
                              {copiedToken ? <Check className="w-3.5 h-3.5 text-[#2DE2C5]" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleRegenerateToken} disabled={regeneratingToken}
                              className="border-foreground/[0.08] text-foreground/50 hover:text-foreground shrink-0 text-xs"
                              title="Regenerate token">
                              {regeneratingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                          <p className="text-[11px] text-foreground/30 mt-1.5">
                            Add as <span className="font-mono text-foreground/45">INTERVUE_SYNC_TOKEN</span> in your repo → Settings → Secrets → Actions
                          </p>
                        </div>

                        {/* YAML snippet */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-xs text-foreground/40">GitHub Actions workflow</Label>
                            <button onClick={copyYaml}
                              className="flex items-center gap-1 text-xs text-foreground/35 hover:text-foreground/60 transition-colors">
                              {copiedYaml ? <Check className="w-3 h-3 text-[#2DE2C5]" /> : <Copy className="w-3 h-3" />}
                              {copiedYaml ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-foreground/40 bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg p-3 leading-relaxed overflow-x-auto whitespace-pre">{`name: Sync Intervue profile
on: [push]
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync to Intervue
        run: |
          curl -s -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/connections/sync \\
            -H "Authorization: Bearer \${{ secrets.INTERVUE_SYNC_TOKEN }}"`}</pre>
                          <p className="text-[11px] text-foreground/25 mt-1.5">
                            Save as <span className="font-mono">.github/workflows/intervue.yml</span> in any repo
                          </p>
                        </div>
                      </div>
                    </Section>

                    <Section title="README badge" desc="Drop your top-3 proof scores into any GitHub README — one line of Markdown.">
                      <ReadmeSnippetGenerator
                        username={settings.username || settings.githubUsername}
                        origin={typeof window !== 'undefined' ? window.location.origin : 'https://intervue.in'}
                      />
                    </Section>
                  </>
                )}

                {/* ── Specializations ── */}
                {activeTab === 'specializations' && (
                  <Section
                    title="Specializations"
                    desc="AI-inferred from your session patterns. Confirm or remove specializations that appear on your public profile."
                  >
                    {specializations.length === 0 ? (
                      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-8 text-center">
                        <Zap className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-foreground/40 mb-1">No specializations yet</p>
                        <p className="text-xs text-foreground/30">
                          Complete 5+ interview sessions and we&apos;ll infer your specializations automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {specializations.map((spec) => (
                          <div key={`${spec.skill}-${spec.name}`}
                            className="flex items-center gap-4 p-4 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{spec.name}</span>
                                <span className="text-xs text-foreground/40">· {spec.skill}</span>
                                {spec.confirmedByUser && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5]" />
                                )}
                              </div>
                              <div className="text-xs text-foreground/40 mt-0.5">
                                Score: <span className="font-mono text-foreground/60">{spec.score}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!spec.confirmedByUser && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSpecAction('confirm', spec.name, spec.skill)}
                                  disabled={specLoading}
                                  className="h-7 px-3 text-xs bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20 hover:bg-[#2DE2C5]/20"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSpecAction('remove', spec.name, spec.skill)}
                                disabled={specLoading}
                                className="h-7 px-3 text-xs text-foreground/40 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-foreground/30 leading-relaxed">
                      Specializations are re-inferred weekly as you complete more sessions.
                      Confirmed specializations are protected from being overwritten.
                    </p>
                  </Section>
                )}

                {/* ── Privacy ── */}
                {activeTab === 'privacy' && (
                  <>
                  <Section title="Visibility" desc="Control what's visible on your public profile.">
                    <div className="space-y-2">
                      {[
                        { key: 'isPublic', label: 'Public profile', desc: `Visible at /p/${settings.username}`, onToggle: () => setSettings(s => ({ ...s, isPublic: !s.isPublic })), on: settings.isPublic },
                        { key: 'scores',   label: 'Show interview scores',   desc: 'Display proof scores on public profile',            onToggle: () => {}, on: true },
                        { key: 'projects', label: 'Show project analysis',   desc: 'Show GitHub repo insights on your profile',         onToggle: () => {}, on: true },
                        { key: 'contact',  label: 'Allow recruiter contact', desc: 'Let verified recruiters send interview requests',   onToggle: () => {}, on: true },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05]">
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs text-foreground/40 mt-0.5">{item.desc}</div>
                          </div>
                          <Toggle on={item.on} onToggle={item.onToggle} />
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Password" desc="Change your account password.">
                    {authProvider === 'github' || authProvider === 'twitter' ? (
                      <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05] text-sm text-foreground/50">
                        Your account uses {authProvider === 'twitter' ? 'X/Twitter' : 'GitHub'} login — no password is set.
                      </div>
                    ) : (
                      <div className="space-y-3 max-w-sm">
                        <div>
                          <Label className="text-xs text-foreground/50 mb-1 block">Current password</Label>
                          <Input
                            type="password"
                            value={pwCurrent}
                            onChange={e => setPwCurrent(e.target.value)}
                            placeholder="••••••••"
                            className="bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground/50 mb-1 block">New password</Label>
                          <Input
                            type="password"
                            value={pwNew}
                            onChange={e => setPwNew(e.target.value)}
                            placeholder="Min. 8 characters"
                            className="bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground/50 mb-1 block">Confirm new password</Label>
                          <Input
                            type="password"
                            value={pwConfirm}
                            onChange={e => setPwConfirm(e.target.value)}
                            placeholder="••••••••"
                            className="bg-transparent border-foreground/[0.08] text-foreground placeholder:text-foreground/20 text-sm"
                          />
                        </div>
                        <Button
                          onClick={handleChangePassword}
                          disabled={pwChanging || !pwCurrent || !pwNew || !pwConfirm}
                          size="sm"
                          className="bg-[#2DE2C5] text-[#04050e] hover:bg-[#2DE2C5]/90 font-semibold"
                        >
                          {pwChanging ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Changing…</> : 'Change password'}
                        </Button>
                      </div>
                    )}
                  </Section>
                  </>
                )}

                {/* ── Notifications ── */}
                {activeTab === 'notifications' && (
                  <Section title="Email notifications" desc="Choose what Intervue emails you about.">
                    <div className="space-y-2">
                      {[
                        { key: 'reminders',      label: 'Interview reminders', desc: "Reminder when you haven't practised in 7 days", value: notifReminders,      setter: setNotifReminders,      field: 'notifReminders' },
                        { key: 'recruiterViews', label: 'Recruiter views',     desc: 'When a recruiter views your profile',           value: notifRecruiterViews, setter: setNotifRecruiterViews, field: 'notifRecruiterViews' },
                        { key: 'scores',         label: 'Score milestones',    desc: 'When your proof scores hit new highs',           value: notifScoreMilestones, setter: setNotifScoreMilestones, field: 'notifScoreMilestones' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05]">
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs text-foreground/40 mt-0.5">{item.desc}</div>
                          </div>
                          <Toggle on={item.value} onToggle={async () => {
                            const next = !item.value
                            item.setter(next)
                            try {
                              await fetch('/api/me', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ [item.field]: next }),
                              })
                              toast.success(next ? `${item.label} enabled` : `${item.label} disabled`)
                            } catch {
                              item.setter(!next)
                              toast.error('Failed to update preference')
                            }
                          }} />
                        </div>
                      ))}

                      {/* Weekly Atlas brief — live-saved */}
                      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05]">
                        <div>
                          <div className="text-sm font-medium">Weekly Atlas brief</div>
                          <div className="text-xs text-foreground/40 mt-0.5">
                            Personalised career summary from Atlas every Monday morning
                          </div>
                        </div>
                        <Toggle
                          on={emailBriefEnabled}
                          onToggle={async () => {
                            const next = !emailBriefEnabled
                            setEmailBriefEnabled(next)
                            try {
                              await fetch('/api/me', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ emailBriefEnabled: next }),
                              })
                              toast.success(next ? 'Weekly brief enabled' : 'Weekly brief disabled')
                            } catch {
                              setEmailBriefEnabled(!next)
                              toast.error('Failed to update preference')
                            }
                          }}
                        />
                      </div>
                    </div>
                  </Section>
                )}

                {/* ── Billing ── */}
                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    {/* Current plan */}
                    <Section title="Your plan" desc="Manage your Intervue subscription.">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Free */}
                        <div className={`rounded-2xl border p-5 transition-all ${billingTier === 'free' ? 'border-foreground/[0.15] bg-foreground/[0.03]' : 'border-foreground/[0.06]'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold">Free</span>
                            {billingTier === 'free' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/[0.08] text-foreground/60 font-medium">Current</span>
                            )}
                          </div>
                          <div className="text-2xl font-bold mb-4">₹0 <span className="text-sm font-normal text-foreground/40">/mo</span></div>
                          <ul className="space-y-2">
                            {['Unlimited AI interviews', 'GitHub source', 'Public profile + badges + proof pages', 'Atlas skill insights'].map(f => (
                              <li key={f} className="flex items-start gap-2 text-xs text-foreground/60">
                                <CheckCircle2 className="w-3.5 h-3.5 text-foreground/30 shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Pro */}
                        <div className={`rounded-2xl border p-5 transition-all ${billingTier === 'pro' ? 'border-[#2DE2C5]/40 bg-[#2DE2C5]/[0.04]' : 'border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.02]'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#2DE2C5]" />
                              <span className="text-sm font-semibold text-[#2DE2C5]">Pro</span>
                            </div>
                            {billingTier === 'pro' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2DE2C5]/15 text-[#2DE2C5] font-semibold border border-[#2DE2C5]/20">Active</span>
                            )}
                          </div>
                          <div className="text-2xl font-bold mb-4">₹399 <span className="text-sm font-normal text-foreground/40">/mo</span></div>
                          <ul className="space-y-2">
                            {['Everything in Free', 'All data sources (LinkedIn, StackOverflow…)', 'Score history sparklines', 'Score-change email alerts', 'Priority in recruiter search', 'Full report share links'].map(f => (
                              <li key={f} className="flex items-start gap-2 text-xs text-foreground/70">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5] shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Section>

                    {/* CTA */}
                    <Section title="" desc="">
                      {billingTier === 'pro' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#2DE2C5]/[0.05] border border-[#2DE2C5]/20">
                            <div>
                              <div className="text-sm font-medium text-[#2DE2C5]">Intervue Pro</div>
                              <div className="text-xs text-foreground/50 mt-0.5">
                                {billingStatus === 'active' && billingPeriodEnd
                                  ? `Renews ${new Date(billingPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                  : billingStatus === 'past_due'
                                    ? 'Payment past due — update payment method'
                                    : 'Subscription active'}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleManageBilling}
                              disabled={openingPortal}
                              className="border-foreground/[0.08] text-foreground/60 hover:text-foreground text-xs"
                            >
                              {openingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Manage'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="px-5 py-4 rounded-2xl bg-gradient-to-r from-[#2DE2C5]/[0.08] to-[#8B7CF8]/[0.08] border border-[#2DE2C5]/20">
                            <p className="text-sm text-foreground/80 mb-3">
                              Unlock all data sources, sparklines, and priority placement in recruiter search. Cancel any time.
                            </p>
                            <Button
                              onClick={handleUpgrade}
                              disabled={checkingOut}
                              className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold text-sm h-10 px-5"
                            >
                              {checkingOut
                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting…</>
                                : <><Sparkles className="w-4 h-4 mr-2" />Upgrade to Pro — ₹399/month<ArrowRight className="w-4 h-4 ml-2" /></>}
                            </Button>
                          </div>
                          <p className="text-xs text-foreground/30 text-center">
                            Secure payment via Stripe. Cancel any time from the billing portal.
                          </p>
                        </div>
                      )}
                    </Section>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        )}

      </main>
    </div>
  )
}
