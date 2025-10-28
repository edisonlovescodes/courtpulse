import './globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'

export const metadata = {
  title: 'CourtPulse - NBA Live Scores',
  description: 'Real-time NBA scores for your community',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers()
  const companyId = getCompanyIdFromHeaders(hdrs)
  const isAdmin = companyId ? await isAdminForCompany(hdrs as any, companyId) : false
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-bg text-brand-text antialiased">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="mb-8">
            <nav className="flex items-center justify-between pb-4">
              <Link href="/" className="group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-accent to-orange-600 flex items-center justify-center text-xl shadow-lg">
                    🏀
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold group-hover:text-brand-accent transition">
                      Court<span className="text-brand-accent">Pulse</span>
                    </h1>
                    <p className="text-xs opacity-60 -mt-0.5">Real-time NBA Scores</p>
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/standings"
                  className="text-sm font-medium hover:text-brand-accent transition"
                >
                  Standings
                </Link>
                {/* Admin-only settings cog (requires company context) */}
                {isAdmin ? (
                <Link
                  href="/dashboard"
                  aria-label="Settings"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-black/10 hover:border-black/20"
                  title="Manage settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                </Link>
                ) : null}
              </div>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="mt-16 pt-8 border-t border-black/5">
            <div className="flex items-center justify-between text-xs">
              <p className="opacity-50">© 2025 CourtPulse. All rights reserved.</p>
              <p className="opacity-40">Data: NBA.com • Live Updates</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
