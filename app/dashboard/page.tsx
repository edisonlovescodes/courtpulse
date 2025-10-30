import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAdminContext } from '@/lib/whop'

export default async function DashboardIndex() {
  const hdrs = await headers()
  const { companyId, isAdmin } = await resolveAdminContext(hdrs as any)
  if (!companyId || !isAdmin) {
    redirect('/')
  }
  redirect(`/dashboard/${companyId}`)
}
