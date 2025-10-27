import DashboardSettings from './settings-client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminFromHeaders } from '@/lib/whop'

export default async function CompanyDashboard(props: { params: Promise<{ companyId: string }> }) {
  const params = await props.params
  const hdrs = await headers()
  const isAdmin = isAdminFromHeaders(hdrs)
  if (!isAdmin) {
    redirect('/')
  }
  return <DashboardSettings companyId={params.companyId} />
}
