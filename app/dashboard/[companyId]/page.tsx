import DashboardSettings from './settings-client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminForCompany } from '@/lib/whop'

export default async function CompanyDashboard(props: { params: Promise<{ companyId: string }> }) {
  const params = await props.params
  const hdrs = await headers()
  const isAdmin = await isAdminForCompany(hdrs as any, params.companyId)
  if (!isAdmin) {
    redirect('/')
  }
  return <DashboardSettings companyId={params.companyId} />
}
