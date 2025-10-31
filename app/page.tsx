import LiveGames from './components/LiveGames'
import { headers } from 'next/headers'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const hdrs = await headers()
  const mockRequest = new Request('http://localhost:3000/', { headers: hdrs })
  const ctx = await resolveAdminContextFromRequest(mockRequest)
  const envFallback = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? null
  const companyId = ctx.companyId || envFallback
  const isAdmin = true

  // DEBUG: Log what we're passing to LiveGames
  console.log('[page.tsx] LiveGames props:', {
    companyId,
    isAdmin: ctx.isAdmin,
    experienceId: ctx.experienceId,
    source: ctx.source
  })

  return (
    <>
      <main className="space-y-8">
        {/* Sport Tabs */}
        <div className="flex gap-2 border-b border-black/10 pb-1">
          <button
            className="px-4 py-2 font-medium text-brand-accent border-b-2 border-brand-accent -mb-[1px]"
          >
            Basketball
          </button>
          <button
            disabled
            className="px-4 py-2 font-medium text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            NFL
            <span className="text-xs">(coming soon)</span>
          </button>
          <button
            disabled
            className="px-4 py-2 font-medium text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            MLB
            <span className="text-xs">(coming soon)</span>
          </button>
          <button
            disabled
            className="px-4 py-2 font-medium text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            Premier League
            <span className="text-xs">(coming soon)</span>
          </button>
        </div>

        <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} />
      </main>
    </>
  )
}
