import { NextResponse } from 'next/server'
import { getActiveTestGame, testGameToTodayGame } from '@/lib/test-game-state'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const ctx = await resolveAdminContextFromRequest(req)
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    if (ctx.companyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
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
