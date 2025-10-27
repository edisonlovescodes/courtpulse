import { NextResponse } from 'next/server'
import { getAuthFromHeaders } from '@/lib/whop'
import { getGameById, isLiveStatus, type NBAGame } from '@/lib/ball'
import { canUnlockGame, logGameView, unlockGame } from '@/lib/limits'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'

function formatStatus(game: NBAGame): string {
  switch (game.gameStatus) {
    case 1:
      return game.gameStatusText
    case 2:
      return 'Live'
    case 3:
      return 'Final'
    default:
      return game.gameStatusText
  }
}

export async function GET(req: Request, { params }: any) {
  const gameId = params.id as string

  const { userId, plan } = await getAuthFromHeaders(req.headers)

  try {
    const game = await getGameById(gameId)
    const status = formatStatus(game)
    const live = isLiveStatus(status)

    // Enforce limits only for live games
    if (live) {
      let allowed = true as boolean
      let reason: string | undefined = undefined
      try {
        const res = await canUnlockGame(userId, plan, game.gameId)
        allowed = res.allowed
        reason = res.reason
      } catch (e) {
        // If DB is not ready (no tables / env), don't block viewing.
        allowed = true
      }

      if (!allowed) {
        return NextResponse.json(
          {
            id: game.gameId,
            homeTeam: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
            awayTeam: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
            homeScore: game.homeTeam.score || 0,
            awayScore: game.awayTeam.score || 0,
            status,
            period: game.period || 0,
            allowed: false,
            reason,
          },
          { status: 200 },
        )
      }
      // Mark unlock and log view (best-effort)
      try { await unlockGame(userId, plan, game.gameId) } catch {}
      try { await logGameView(userId, game.gameId, game.period || 0) } catch {}
    }

    return NextResponse.json({
      id: game.gameId,
      homeTeam: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
      awayTeam: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
      homeScore: game.homeTeam.score || 0,
      awayScore: game.awayTeam.score || 0,
      status,
      period: game.period || 0,
      gameClock: game.gameClock || '',
      allowed: true,
      // Include detailed stats
      homeTeamDetails: {
        teamTricode: game.homeTeam.teamTricode,
        wins: game.homeTeam.wins,
        losses: game.homeTeam.losses,
        periods: game.homeTeam.periods || [],
        players: game.homeTeam.players || [],
        statistics: game.homeTeam.statistics,
      },
      awayTeamDetails: {
        teamTricode: game.awayTeam.teamTricode,
        wins: game.awayTeam.wins,
        losses: game.awayTeam.losses,
        periods: game.awayTeam.periods || [],
        players: game.awayTeam.players || [],
        statistics: game.awayTeam.statistics,
      },
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (e: any) {
    console.error('Error fetching game:', gameId, e)
    // Better error message for scheduled games
    return NextResponse.json({
      error: 'This game has not started yet. Detailed stats will be available once the game begins.',
      gameId,
    }, { status: 404 })
  }
}
