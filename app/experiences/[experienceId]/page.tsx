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
  )
}
