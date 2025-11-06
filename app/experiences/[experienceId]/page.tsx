import { headers } from 'next/headers'
import { resolveAdminContext } from '@/lib/whop'
import ExperienceClient from './client'

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

  return <ExperienceClient companyId={companyId ?? undefined} experienceId={ctx.experienceId ?? undefined} isAdmin={isAdmin} />
}
