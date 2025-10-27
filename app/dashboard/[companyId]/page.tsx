import DashboardSettings from './settings-client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminForCompany } from '@/lib/whop'
import { cookies } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'
import { createAdminSessionToken } from '@/lib/signing'

export default async function CompanyDashboard(props: { params: Promise<{ companyId: string }> }) {
  const params = await props.params
  const hdrs = await headers()
  const isAdmin = await isAdminForCompany(hdrs as any, params.companyId)
  if (!isAdmin) {
    redirect('/')
  }
  // Create a short-lived admin session cookie so client -> API calls can authorize
  const { userId } = await whopSdk.verifyUserToken(hdrs as any)
  const secret = process.env.WHOP_APP_SECRET
  let adminToken: string | null = null
  if (userId && secret) {
    const token = createAdminSessionToken(userId, params.companyId, secret)
    adminToken = token
    const store = await cookies()
    // SameSite=None so cookie is sent from Whop iframe (cross-site context)
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
