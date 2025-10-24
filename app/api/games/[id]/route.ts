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
      const { allowed, reason } = await canUnlockGame(userId, plan, game.gameId)
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
      // Mark unlock and log view
      await unlockGame(userId, plan, game.gameId)
      await logGameView(userId, game.gameId, game.period || 0)
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
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
