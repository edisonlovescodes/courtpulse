import { NextResponse } from 'next/server'
import { stopTestGame } from '@/lib/test-game-state'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { companyId } = body || {}
    const resolvedCompanyId = companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || ''

    if (!resolvedCompanyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Stop the test game
    await stopTestGame(resolvedCompanyId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error stopping test game:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to stop test game' },
      { status: 500 }
    )
  }
}
