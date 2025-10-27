import DashboardSettings from '../../../dashboard/[companyId]/settings-client'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { whopSdk } from '@/lib/whop-sdk'
import { createAdminSessionToken } from '@/lib/signing'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`https://api.whop.com/api/v1/experiences/${encodeURIComponent(experienceId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data: any = await res.json()
    return data?.company_id || data?.companyId || data?.company?.id || null
  } catch {
    return null
  }
}

export default async function ExperienceSettingsPage(props: { params: Promise<{ experienceId: string }> }) {
  const { experienceId } = await props.params
  const hdrs = await headers()

  // Verify admin access to this experience
  try {
    const { userId } = await whopSdk.verifyUserToken(hdrs as any)
    const { accessLevel } = await whopSdk.access.checkIfUserHasAccessToExperience({
      experienceId,
      userId,
    })
    if (accessLevel !== 'admin') redirect('/')

    // Resolve company id for this experience
    const companyId = await getCompanyIdForExperience(experienceId)
    if (!companyId) redirect('/')

    // Set short-lived admin cookie (iframe-friendly)
    const secret = process.env.WHOP_APP_SECRET
    if (secret) {
      const token = createAdminSessionToken(userId, companyId, secret)
      const store = await cookies()
      store.set('CP_ADMIN', token, { httpOnly: true, sameSite: 'none', secure: true, path: '/', maxAge: 600 })
    }

    // Also pass headers/token to client fetches for resilience
    const signedToken = hdrs.get('Whop-Signed-Token') || hdrs.get('X-Whop-Signed-Token') || ''
    const userIdHeader = hdrs.get('X-Whop-User-Id') || hdrs.get('Whop-User-Id') || ''
    const authHeaders: Record<string, string> = {}
    if (signedToken) authHeaders['Whop-Signed-Token'] = signedToken
    if (userIdHeader) authHeaders['X-Whop-User-Id'] = userIdHeader
    authHeaders['X-Whop-Company-Id'] = companyId

    return <DashboardSettings companyId={companyId} authHeaders={authHeaders} backHref={`/experiences/${experienceId}`} />
  } catch {
    redirect('/')
  }
}
