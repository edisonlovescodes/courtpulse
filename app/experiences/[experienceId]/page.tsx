import LiveGames from '../../components/LiveGames'
import { headers } from 'next/headers'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage(props: { params: Promise<{ experienceId: string }> }) {
  await props.params // ensure route segment resolves

  const hdrs = await headers()
  const companyId = getCompanyIdFromHeaders(hdrs)
  const isAdmin = companyId ? await isAdminForCompany(hdrs as any, companyId) : false

  return (
    <main className="space-y-8">
      <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} />
    </main>
  )
}
