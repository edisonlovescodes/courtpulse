import { NextResponse } from 'next/server'
import { startTestGame } from '@/lib/test-game-state'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { companyId, gameKey } = body || {}
    const resolvedCompanyId = companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || ''

    if (!resolvedCompanyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Default to lakers-celtics if not specified
    const selectedGameKey = gameKey || 'lakers-celtics'

    // Start the test game
    const session = await startTestGame(resolvedCompanyId, selectedGameKey)

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
