import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAdminContext } from '@/lib/whop'

export default async function DashboardIndex() {
  const hdrs = await headers()
  const ctx = await resolveAdminContext({ headers: hdrs, url: '/dashboard' })
  const { companyId, isAdmin } = ctx
  if (!companyId || !isAdmin) {
    redirect('/')
  }
  redirect(`/dashboard/${companyId}`)
}
