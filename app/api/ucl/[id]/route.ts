import { NextResponse } from 'next/server'
import { getGameById } from '@/lib/ucl'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const matchId = params.id

  try {
    const match = await getGameById(matchId)
    return NextResponse.json(match, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Match not found' }, { status: 404 })
  }
}
