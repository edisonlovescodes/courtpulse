import { NextResponse } from 'next/server'
import { listChatChannels } from '@/lib/whop-api'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'
import { cookies } from 'next/headers'
import { verifyAdminSessionToken } from '@/lib/signing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/channels
 * List all chat channels for a company
 */
export async function GET(req: Request) {
  try {
    const headerCompanyId = getCompanyIdFromHeaders(req.headers)
    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    // Enforce company boundary if header provides one and verify admin
    if (headerCompanyId && headerCompanyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
    }
    let allow = await isAdminForCompany(req.headers as any, companyId)
    if (!allow) {
      const store = await cookies()
      const token = store.get('CP_ADMIN')?.value
      const secret = process.env.WHOP_APP_SECRET
      const v = token && secret ? verifyAdminSessionToken(token, secret) : { valid: false }
      if (!(v.valid && v.companyId === companyId)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      allow = true
    }

    const channels = await listChatChannels(companyId)

    return NextResponse.json({ channels })
  } catch (e: any) {
    console.error('Error listing chat channels:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to list channels' },
      { status: 500 }
    )
  }
}
