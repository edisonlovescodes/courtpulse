import { NextResponse } from 'next/server'
import { getTeamSeasonStats, estimateTeamStats } from '@/lib/ball'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Cache for 1 hour

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId: teamIdStr } = await params
  try {
    const teamId = parseInt(teamIdStr)
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    // Try to get real stats from recent games
    const realStats = await getTeamSeasonStats(teamId)

    if (realStats) {
      return NextResponse.json({
        teamId,
        stats: realStats,
        source: 'calculated',
        message: 'Stats calculated from all season games'
      })
    }

    // Fallback to estimates (shouldn't happen often in season)
    return NextResponse.json({
      teamId,
      stats: null,
      source: 'unavailable',
      message: 'No recent game data available'
    })
  } catch (e: any) {
    console.error('Error fetching team stats:', e)
    return NextResponse.json(
      { error: 'Failed to fetch team stats', details: e.message },
      { status: 500 }
    )
  }
}
