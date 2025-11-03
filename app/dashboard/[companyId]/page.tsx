import { headers } from 'next/headers'
import DashboardSettings from './settings-client'
import { resolveAdminContext } from '@/lib/whop'

export default async function CompanyDashboard(props: { params: Promise<{ companyId: string }> }) {
  const params = await props.params

  // Extract experienceId from Whop context
  const hdrs = await headers()
  const ctx = await resolveAdminContext({ headers: hdrs, url: `/dashboard/${params.companyId}` })

  return <DashboardSettings companyId={params.companyId} experienceId={ctx.experienceId || undefined} />
}
