import { NextResponse } from 'next/server'
import { getCompanyIdFromHeaders, isAdminFromHeaders } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const h = req.headers

  const headersOut = {
    'X-Whop-User-Id': h.get('X-Whop-User-Id') || h.get('Whop-User-Id') || null,
    'X-Whop-Role': h.get('X-Whop-Role') || h.get('Whop-Role') || null,
    'X-Whop-Is-Admin': h.get('X-Whop-Is-Admin') || h.get('Whop-Is-Admin') || null,
    'X-Whop-Company-Id':
      h.get('X-Whop-Company-Id') || h.get('Whop-Company-Id') || h.get('X-Company-Id') || null,
    'Whop-Signed-Token':
      (h.get('Whop-Signed-Token') || h.get('X-Whop-Signed-Token')) ? '[present]' : null,
  }

  const isAdmin = isAdminFromHeaders(h as any)
  const companyId = getCompanyIdFromHeaders(h as any)

  return NextResponse.json({
    isAdmin,
    companyId,
    headers: headersOut,
    note: 'Open this inside Whop as an owner/admin to verify headers and detection.'
  })
}

