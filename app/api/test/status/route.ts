import { NextResponse } from 'next/server'
import { getActiveTestGame, testGameToTodayGame } from '@/lib/test-game-state'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'
import { cookies } from 'next/headers'
import { verifyAdminSessionToken } from '@/lib/signing'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const headerCompanyId = getCompanyIdFromHeaders(req.headers)
    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
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

    // Get active test game
    const session = await getActiveTestGame(companyId)

    if (!session) {
      return NextResponse.json({
        isActive: false,
        session: null,
        currentState: null,
      })
    }

    const currentState = testGameToTodayGame(session)

    return NextResponse.json({
      isActive: true,
      session: {
        id: session.id,
        gameId: session.gameId,
        startedAt: session.startedAt,
      },
      currentState,
    })
  } catch (error: any) {
    console.error('Error getting test game status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    )
  }
}
