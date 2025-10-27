import { NextResponse } from 'next/server'
import { stopTestGame } from '@/lib/test-game-state'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'
import { cookies } from 'next/headers'
import { verifyAdminSessionToken } from '@/lib/signing'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const headerCompanyId = getCompanyIdFromHeaders(req.headers)
    const body = await req.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Verify admin access
    if (headerCompanyId && headerCompanyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
    }
    let allow = await isAdminForCompany(req.headers as any, companyId)
    if (!allow) {
      const store = await cookies()
      const token = req.headers.get('X-CP-Admin') || store.get('CP_ADMIN')?.value
      const secret = process.env.WHOP_APP_SECRET
      const v = token && secret ? verifyAdminSessionToken(token, secret) : { valid: false }
      if (!(v.valid && v.companyId === companyId)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      allow = true
    }

    // Stop the test game
    await stopTestGame(companyId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error stopping test game:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to stop test game' },
      { status: 500 }
    )
  }
}
