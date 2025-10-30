import LiveGames from './components/LiveGames'
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

  return (
    <main className="space-y-8">
      <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} />
    </main>
  )
}
