import DashboardSettings from './settings-client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAdminContext, isAdminForCompany } from '@/lib/whop'
import { cookies } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'
import { createAdminSessionToken } from '@/lib/signing'

export default async function CompanyDashboard(props: { params: Promise<{ companyId: string }> }) {
  const params = await props.params
  const hdrs = await headers()
  const ctx = await resolveAdminContext({
    headers: hdrs,
    url: `/dashboard/${params.companyId}?company_id=${params.companyId}` ,
  })

  if (!ctx.companyId || ctx.companyId !== params.companyId || !ctx.isAdmin) {
    // Final guard: fall back to direct check in case headers lacked context but we can still validate
    const allow = await isAdminForCompany(hdrs as any, params.companyId)
    if (!allow) {
      redirect('/')
    }
  }

  const userIdFromContext = ctx.userId
  let userId = userIdFromContext
  if (!userId) {
    try {
      const verified = await whopSdk.verifyUserToken(hdrs as any)
      userId = verified.userId
    } catch {
      userId = null
    }
  }

  const secret = process.env.WHOP_APP_SECRET
  let adminToken: string | null = null
  if (userId && secret) {
    const token = createAdminSessionToken(userId, params.companyId, secret)
    adminToken = token
    const store = await cookies()
    store.set('CP_ADMIN', token, { httpOnly: true, sameSite: 'none', secure: true, path: '/', maxAge: 600 })
  }

  const signedToken = hdrs.get('Whop-Signed-Token') || hdrs.get('X-Whop-Signed-Token') || ''
  const userIdHeader = hdrs.get('X-Whop-User-Id') || hdrs.get('Whop-User-Id') || ''
  const authHeaders: Record<string, string> = {}
  if (signedToken) authHeaders['Whop-Signed-Token'] = signedToken
  if (userIdHeader) authHeaders['X-Whop-User-Id'] = userIdHeader
  authHeaders['X-Whop-Company-Id'] = params.companyId
  return <DashboardSettings companyId={params.companyId} authHeaders={authHeaders} adminToken={adminToken || undefined} />
}
