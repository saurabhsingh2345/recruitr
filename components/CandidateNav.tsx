'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Sparkles, Link2, Video,
  MessageSquare, FileText, Settings, LogOut,
  ExternalLink, Building2,
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'

const MAIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard',      exact: true },
  { icon: Sparkles,        label: 'Atlas',        href: '/agent' },
  { icon: Video,           label: 'Interviews',   href: '/interview/new' },
]

const TOOLS_NAV = [
  { icon: Building2,       label: 'Companies',    href: '/companies' },
  { icon: Link2,           label: 'Connections',  href: '/connections' },
  { icon: MessageSquare,   label: 'Messages',     href: '/messages',       badge: true },
  { icon: FileText,        label: 'Resumes',      href: '/resumes' },
]

const ACCOUNT_NAV = [
  { icon: Settings,        label: 'Settings',     href: '/settings' },
]

interface CandidateNavProps {
  username?: string
  unread?: number
  footer?: React.ReactNode
}

function NavItem({
  icon: Icon,
  label,
  href,
  exact,
  badge,
  unread,
}: {
  icon: React.ElementType
  label: string
  href: string
  exact?: boolean
  badge?: boolean
  unread?: number
}) {
  const path = usePathname()
  const active = exact ? path === href : path.startsWith(href)

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
        active
          ? 'bg-[#2DE2C5]/[0.10] text-foreground shadow-[0_0_24px_-8px_rgba(45,226,197,0.45)]'
          : 'text-foreground/45 hover:text-foreground/85 hover:bg-white/[0.04]'
      }`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full bg-[#2DE2C5] shadow-[0_0_10px_rgba(45,226,197,0.8)]" />}
      <Icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          active ? 'text-[#2DE2C5]' : 'text-foreground/40 group-hover:text-foreground/70'
        }`}
      />
      <span className="flex-1">{label}</span>
      {badge && unread != null && unread > 0 && (
        <span className="text-[10px] font-bold bg-[#2DE2C5] text-[#04050e] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

function Divider() {
  return <div className="my-1 border-t border-foreground/[0.05]" />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-foreground/25">
        {children}
      </span>
    </div>
  )
}

export function CandidateNav({ username, unread = 0, footer }: CandidateNavProps) {
  const { data: session } = useSession()

  const displayName = session?.user?.name || username || 'You'
  const avatarUrl = session?.user?.image || null
  const initial = (displayName[0] || 'U').toUpperCase()

  return (
    <aside className="w-[232px] shrink-0 h-screen flex flex-col bg-sidebar backdrop-blur-2xl border-r border-sidebar-border relative z-10">

      {/* Wordmark */}
      <div className="h-[56px] flex items-center px-4 shrink-0 border-b border-sidebar-border/60">
        <Link href="/dashboard" className="flex items-center gap-2.5 group flex-1">
          <div className="w-[22px] h-[22px] shrink-0 rounded-[6px] shadow-[0_0_16px_-2px_rgba(45,226,197,0.6)]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="#2DE2C5"/>
              <path d="M7 15L11 7L15 15" stroke="#05060F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-[15px] tracking-[-0.03em] text-sidebar-foreground">intervue</span>
        </Link>
        <NotificationBell />
      </div>

      {/* User context */}
      <div className="px-3 py-3 border-b border-sidebar-border/60">
        <div className="flex items-center gap-2.5 px-1">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full shrink-0 ring-1 ring-foreground/10" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2DE2C5]/25 to-[#8B7CF8]/20 border border-[#2DE2C5]/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-[#2DE2C5]">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight">{displayName}</div>
            <div className="text-[10px] text-sidebar-foreground/35 truncate leading-tight mt-0.5">
              {username ? `@${username}` : 'Candidate'}
            </div>
          </div>
          {username && (
            <Link
              href={`/p/${username}`}
              target="_blank"
              className="shrink-0 p-1 rounded text-sidebar-foreground/25 hover:text-sidebar-foreground/60 hover:bg-foreground/[0.04] transition-colors"
              title="View public profile"
            >
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {MAIN_NAV.map(({ icon, label, href, exact }) => (
          <NavItem key={href} icon={icon} label={label} href={href} exact={exact} />
        ))}

        <SectionLabel>Tools</SectionLabel>

        {TOOLS_NAV.map(({ icon, label, href, badge }) => (
          <NavItem key={href} icon={icon} label={label} href={href} badge={badge} unread={badge ? unread : 0} />
        ))}

        <SectionLabel>Account</SectionLabel>

        {ACCOUNT_NAV.map(({ icon, label, href }) => (
          <NavItem key={href} icon={icon} label={label} href={href} />
        ))}
      </nav>

      {footer && <div className="px-2 pb-1">{footer}</div>}

      {/* Footer */}
      <div className="px-2 py-2 border-t border-sidebar-border/60">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-foreground/30 hover:text-foreground/60 hover:bg-white/[0.04] transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
