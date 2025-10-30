import LiveGames from './components/LiveGames'
import AdminCog from './components/AdminCog'
import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const hdrs = await headers()
  const mockRequest = new Request('http://localhost:3000/', { headers: hdrs })
  const ctx = await resolveAdminContextFromRequest(mockRequest)
  const companyId = ctx.companyId
  // Show admin features when company context exists - same as layout
  const isAdmin = Boolean(companyId)

  // DEBUG: Log what we're passing to LiveGames
  console.log('[page.tsx] LiveGames props:', {
    companyId,
    isAdmin: ctx.isAdmin,
    experienceId: ctx.experienceId,
    source: ctx.source
  })

  return (
    <>
      {/* Admin controls - shown at top of page if user is admin */}
      {companyId && (
        <div className="flex justify-end gap-3 mb-4">
          <Link
            href="/standings"
            className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-brand-accent/60 hover:text-brand-accent"
          >
            Standings
          </Link>
          <AdminCog initialCompanyId={companyId} />
        </div>
      )}

      <main className="space-y-8">
        <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} />
      </main>
    </>
  )
}
