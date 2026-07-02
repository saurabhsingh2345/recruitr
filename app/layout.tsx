import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist_Mono, Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Providers } from './providers'
import './globals.css'

// Distinctive characterful display face for headings — the aurora voice.
const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Intervue — AI-Native Engineering Identity Platform',
  description:
    'Turn your GitHub and projects into a verified engineering profile. AI interviews that learn you, proof-of-skill scores recruiters trust.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Atlas',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Intervue',
    description: 'Know what you\'ve actually built.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${display.variable} ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        {/* Global aurora atmosphere — sits behind every page */}
        <div className="aurora-stage" aria-hidden="true" />
        <Providers>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
