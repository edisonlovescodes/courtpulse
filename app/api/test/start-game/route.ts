import { NextResponse } from 'next/server'
import { startTestGame } from '@/lib/test-game-state'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const ctx = await resolveAdminContextFromRequest(req)
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { companyId, gameKey } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (ctx.companyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
    }

    // Default to lakers-celtics if not specified
    const selectedGameKey = gameKey || 'lakers-celtics'

    // Start the test game
    const session = await startTestGame(companyId, selectedGameKey)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        gameId: session.gameId,
        startedAt: session.startedAt,
        isActive: session.isActive,
      },
    })
  } catch (error: any) {
    console.error('Error starting test game:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start test game' },
      { status: 500 }
    )
  }
}
