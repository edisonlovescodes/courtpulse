import { NextResponse } from 'next/server'
import { getTodayGames } from '@/lib/ucl'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const games = await getTodayGames()
    return NextResponse.json(
      { games },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
