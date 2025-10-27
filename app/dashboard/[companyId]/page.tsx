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
  const signedToken = hdrs.get('Whop-Signed-Token') || hdrs.get('X-Whop-Signed-Token') || ''
  const userId = hdrs.get('X-Whop-User-Id') || hdrs.get('Whop-User-Id') || ''
  const authHeaders: Record<string, string> = {}
  if (signedToken) authHeaders['Whop-Signed-Token'] = signedToken
  if (userId) authHeaders['X-Whop-User-Id'] = userId
  authHeaders['X-Whop-Company-Id'] = params.companyId
  return <DashboardSettings companyId={params.companyId} authHeaders={authHeaders} />
}
