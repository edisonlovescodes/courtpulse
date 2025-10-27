import { NextResponse } from 'next/server'
import { getCompanyIdFromHeaders, isAdminFromHeaders } from '@/lib/whop'
import { whopSdk } from '@/lib/whop-sdk'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const h = req.headers

  const headersOut = {
    'X-Whop-User-Id': h.get('X-Whop-User-Id') || h.get('Whop-User-Id') || null,
    'X-Whop-Role': h.get('X-Whop-Role') || h.get('Whop-Role') || null,
    'X-Whop-Is-Admin': h.get('X-Whop-Is-Admin') || h.get('Whop-Is-Admin') || null,
    'X-Whop-Experience-Id': h.get('X-Whop-Experience-Id') || h.get('Whop-Experience-Id') || null,
    'X-Whop-Company-Id':
      h.get('X-Whop-Company-Id') || h.get('Whop-Company-Id') || h.get('X-Company-Id') || null,
    'Whop-Signed-Token':
      (h.get('Whop-Signed-Token') || h.get('X-Whop-Signed-Token')) ? '[present]' : null,
  }

  const isAdmin = isAdminFromHeaders(h as any)
  const companyId = getCompanyIdFromHeaders(h as any)

  let sdkAdmin: boolean | null = null
  let accessLevel: string | null = null
  try {
    if (companyId) {
      const { userId } = await whopSdk.verifyUserToken(h as any)
      const res = await whopSdk.access.checkIfUserHasAccessToCompany({ companyId, userId })
      accessLevel = res.accessLevel
      sdkAdmin = res.accessLevel === 'admin'
    }
  } catch {}

  return NextResponse.json({
    isAdmin,
    companyId,
    headers: headersOut,
    sdkAdmin,
    accessLevel,
    note: 'Open this inside Whop as an owner/admin to verify headers and detection.'
  })
}
