import './globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'CourtPulse - NBA Live Scores',
  description: 'Real-time NBA scores for your community',
}

export default function RootLayout({ children }: { children: ReactNode }) {
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
              {/* Pricing button hidden for now - will add later */}
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

