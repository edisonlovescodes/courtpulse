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
        <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} />
      </main>
    </>
  )
}
