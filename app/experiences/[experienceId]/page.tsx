import LiveGames from '../../components/LiveGames'
import { headers } from 'next/headers'
import { resolveAdminContext } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage(props: { params: Promise<{ experienceId: string }> }) {
  const params = await props.params
  const hdrs = await headers()
  const { companyId, isAdmin } = await resolveAdminContext(hdrs as any, params.experienceId)

  return (
    <main className="space-y-8">
      <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} />
    </main>
  )
}
