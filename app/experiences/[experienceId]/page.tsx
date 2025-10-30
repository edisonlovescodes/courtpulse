import LiveGames from '../../components/LiveGames'
import { headers } from 'next/headers'
import { resolveAdminContext } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage(props: { params: Promise<{ experienceId: string }> }) {
  const params = await props.params
  const hdrs = await headers()
  const ctx = await resolveAdminContext({
    headers: hdrs,
    url: `/experiences/${params.experienceId}?experience_id=${params.experienceId}` ,
    fallbackExperienceId: params.experienceId,
  })
  const companyId = ctx.companyId
  const isAdmin = ctx.isAdmin

  return (
    <main className="space-y-8">
      <LiveGames companyId={companyId ?? undefined} isAdmin={isAdmin} experienceId={params.experienceId} />
    </main>
  )
}
