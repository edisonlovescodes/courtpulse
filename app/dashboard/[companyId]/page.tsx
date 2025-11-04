import { headers } from 'next/headers'
import DashboardSettings from './settings-client'
import { resolveAdminContext } from '@/lib/whop'

export default async function CompanyDashboard(props: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ experience_id?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  // Extract experienceId from Whop context (headers, query params, referer)
  const hdrs = await headers()

  // Rebuild URL with query params for proper context resolution
  const queryString = searchParams.experience_id
    ? `?experience_id=${searchParams.experience_id}`
    : ''
  const url = `/dashboard/${params.companyId}${queryString}`

  const ctx = await resolveAdminContext({ headers: hdrs, url })

  // Pass debug info to client component
  const debugInfo = {
    extractedCompanyId: ctx.companyId,
    usedFallback: !ctx.companyId,
    fallbackValue: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    finalCompanyId: params.companyId,
    accessLevel: ctx.accessLevel,
    isAdmin: ctx.isAdmin,
  }

  return <DashboardSettings companyId={params.companyId} experienceId={ctx.experienceId || undefined} debugContext={debugInfo} />
}
