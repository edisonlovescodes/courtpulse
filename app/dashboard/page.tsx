import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAdminContext } from '@/lib/whop'

export default async function DashboardIndex() {
  const hdrs = await headers()
  const ctx = await resolveAdminContext({ headers: hdrs, url: '/dashboard' })
  const envFallbackCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null
  const companyId = ctx.companyId || envFallbackCompanyId

  if (!companyId) {
    redirect('/')
  }

  redirect(`/dashboard/${companyId}`)
}
