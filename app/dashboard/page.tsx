import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyIdFromHeaders, isAdminFromHeaders } from '@/lib/whop'

export default async function DashboardIndex() {
  const hdrs = await headers()
  const isAdmin = isAdminFromHeaders(hdrs)
  if (!isAdmin) {
    redirect('/')
  }
  const companyId = getCompanyIdFromHeaders(hdrs)
  if (!companyId) {
    redirect('/')
  }
  redirect(`/dashboard/${companyId}`)
}
