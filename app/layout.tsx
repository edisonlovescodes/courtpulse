import './globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveAdminContextFromRequest } from '@/lib/whop'
import AdminCog from './components/AdminCog'

export const metadata = {
  title: 'CourtPulse - NBA Live Scores',
  description: 'Real-time NBA scores for your community',
}

// Force dynamic rendering - don't cache this layout
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers()
  const envFallbackCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? null

  // Middleware already mirrors company id into the headers – prefer that first
  const headerCompanyId =
    hdrs.get('x-company-id') ||
    hdrs.get('x-whop-company-id') ||
    hdrs.get('whop-company-id')

  let companyId: string | null = headerCompanyId
  let ctx: Awaited<ReturnType<typeof resolveAdminContextFromRequest>> | null = null

  if (!companyId) {
    // No direct header hit – rebuild the absolute URL so the resolver can look at query/referer
    const proto = hdrs.get('x-forwarded-proto') || 'http'
    const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000'
    const path = hdrs.get('x-forwarded-path') || '/'
    const absoluteUrl = `${proto}://${host}${path}`

    const headersClone = new Headers()
    hdrs.forEach((value, key) => {
      headersClone.append(key, value)
    })

    const mockRequest = new Request(absoluteUrl, { headers: headersClone })
    ctx = await resolveAdminContextFromRequest(mockRequest)
    companyId = ctx.companyId || (ctx.isAdmin ? envFallbackCompanyId : null)
  }

  // DEBUG: Log what we're passing to AdminCog
  console.log('[layout.tsx] AdminCog props:', {
    companyId,
    headerCompanyId,
    resolvedCompanyId: ctx?.companyId ?? null,
    isAdmin: ctx?.isAdmin ?? null,
    experienceId: ctx?.experienceId ?? null,
    source: ctx?.source ?? (headerCompanyId ? 'header' : 'none'),
    fallbackUsed: !ctx?.companyId && !!companyId
  })
  
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-bg text-brand-text antialiased">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="mb-8">
            <nav className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <Link
                href="/"
                className="text-xl font-semibold tracking-tight text-gray-900 transition hover:text-brand-accent"
              >
                CourtPulse
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href="/standings"
                  className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-brand-accent/60 hover:text-brand-accent"
                >
                  Standings
                </Link>
                <AdminCog initialCompanyId={companyId} />
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
