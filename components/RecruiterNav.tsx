'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  Search, LayoutDashboard, Briefcase,
  MessageSquare, Settings, LogOut, Sun, Moon, Building2,
} from 'lucide-react'

const MAIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/recruiter/dashboard', exact: false },
  { icon: Briefcase,       label: 'Roles',        href: '/recruiter/roles',     exact: false },
  { icon: MessageSquare,   label: 'Outreach',     href: '/messages',            exact: false, badge: true },
]

const TOOLS_NAV = [
  { icon: Search,          label: 'Search',       href: '/recruiter',           exact: true },
]

const ACCOUNT_NAV = [
  { icon: Settings,        label: 'Profile',      href: '/recruiter/profile',   exact: false },
]

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
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-100 ${
        active
          ? 'bg-foreground/[0.07] text-foreground'
          : 'text-foreground/40 hover:text-foreground/75 hover:bg-foreground/[0.04]'
      }`}
    >
      <Icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          active ? 'text-[#2DE2C5]' : 'text-foreground/35 group-hover:text-foreground/60'
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

export function RecruiterNav({ unread = 0 }: { unread?: number }) {
  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = resolvedTheme === 'dark'

  const displayName = session?.user?.name || 'Recruiter'
  const initial = (displayName[0] || 'R').toUpperCase()

  return (
    <aside className="w-[232px] shrink-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border relative z-10">

      {/* Wordmark */}
      <div className="h-[56px] flex items-center px-4 shrink-0 border-b border-sidebar-border/60">
        <Link href="/recruiter/dashboard" className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
            <rect width="22" height="22" rx="5" fill="#2DE2C5"/>
            <path d="M7 15L11 7L15 15" stroke="#04050e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold text-[14px] tracking-[-0.02em] text-sidebar-foreground">intervue</span>
        </Link>
      </div>

      {/* User context */}
      <div className="px-3 py-3 border-b border-sidebar-border/60">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-md bg-[#8B7CF8]/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-[#8B7CF8]">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight">{displayName}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="w-2.5 h-2.5 text-sidebar-foreground/25 shrink-0" />
              <span className="text-[10px] text-sidebar-foreground/35 truncate leading-tight">Recruiter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {MAIN_NAV.map(({ icon, label, href, exact, badge }) => (
          <NavItem key={href} icon={icon} label={label} href={href} exact={exact} badge={badge} unread={badge ? unread : 0} />
        ))}

        <Divider />

        {TOOLS_NAV.map(({ icon, label, href, exact }) => (
          <NavItem key={href} icon={icon} label={label} href={href} exact={exact} />
        ))}

        <Divider />

        {ACCOUNT_NAV.map(({ icon, label, href }) => (
          <NavItem key={href} icon={icon} label={label} href={href} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-sidebar-border/60 space-y-0.5">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-foreground/35 hover:text-foreground/65 hover:bg-foreground/[0.04] transition-colors"
        >
          {mounted && (isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />)}
          {mounted ? (isDark ? 'Light mode' : 'Dark mode') : 'Theme'}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-foreground/25 hover:text-foreground/55 hover:bg-foreground/[0.04] transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
