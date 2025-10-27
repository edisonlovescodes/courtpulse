import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'

export default async function DashboardIndex() {
  const hdrs = await headers()
  const companyId = getCompanyIdFromHeaders(hdrs)
  if (!companyId) {
    redirect('/')
  }
  const allow = await isAdminForCompany(hdrs as any, companyId)
  if (!allow) redirect('/')
  redirect(`/dashboard/${companyId}`)
}
