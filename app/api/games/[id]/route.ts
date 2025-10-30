import { NextResponse } from 'next/server'
import { getAuthFromHeaders } from '@/lib/whop'
import { getGameById, type NBAGame } from '@/lib/ball'

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

    // For scheduled games that haven't started, try to get basic info from today's games
    try {
      const { getTodayGames } = await import('@/lib/ball')
      const todayGames = await getTodayGames()
      const scheduledGame = todayGames.find(g => g.id === gameId)

      if (scheduledGame) {
        // Return pre-game data
        return NextResponse.json({
          id: scheduledGame.id,
          homeTeam: scheduledGame.homeTeam,
          awayTeam: scheduledGame.awayTeam,
          homeScore: 0,
          awayScore: 0,
          status: scheduledGame.status,
          period: 0,
          allowed: true,
          isPreGame: true,
          homeWins: scheduledGame.homeWins,
          homeLosses: scheduledGame.homeLosses,
          awayWins: scheduledGame.awayWins,
          awayLosses: scheduledGame.awayLosses,
          homeTeamId: scheduledGame.homeTeamId,
          awayTeamId: scheduledGame.awayTeamId,
          homeTricode: scheduledGame.homeTricode,
          awayTricode: scheduledGame.awayTricode,
        })
      }
    } catch (preGameError) {
      console.error('Error fetching pre-game data:', preGameError)
    }

    // If we can't get pre-game data, return error
    return NextResponse.json({
      error: 'Game data not available.',
      gameId,
    }, { status: 404 })
  }
}
