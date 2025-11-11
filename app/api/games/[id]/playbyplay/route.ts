import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NBA_API_BASE = 'https://cdn.nba.com/static/json/liveData'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Add timestamp to prevent caching
    const timestamp = Date.now()
    const url = `${NBA_API_BASE}/playbyplay/playbyplay_${id}.json?t=${timestamp}`

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch play-by-play data: ${res.status}`)
    }

    const json = await res.json()
    const actions = json.game?.actions || []

    // Return actions with metadata
    return NextResponse.json(
      {
        gameId: id,
        actions,
        totalActions: actions.length
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (e: any) {
    console.error('Error fetching play-by-play:', id, e.message)
    return NextResponse.json(
      {
        error: 'Play-by-play data not available',
        gameId: id,
        message: e.message
      },
      { status: 404 }
    )
  }
}
