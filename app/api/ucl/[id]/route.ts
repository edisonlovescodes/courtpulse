import { NextResponse } from 'next/server'
import { getGameById } from '@/lib/ucl'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const match = await getGameById(params.id)
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
