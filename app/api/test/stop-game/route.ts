import { NextResponse } from 'next/server'
import { stopTestGame } from '@/lib/test-game-state'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const ctx = await resolveAdminContextFromRequest(req)
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (ctx.companyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
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
