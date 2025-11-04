import { NextResponse } from 'next/server'
import { getTodayGames, getGameById, isLiveStatus, formatGameClock, getTopPlayers } from '@/lib/ball'
import { processGameNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Opportunistic notifier: run notification processing on every scoreboard poll.
    // If cron also runs, GameNotificationState prevents duplicates.
    try {
      await processGameNotifications()
    } catch (err) {
      console.error('processGameNotifications (inline) failed:', err)
    }

    const games = await getTodayGames()
    // For live and completed games, refresh scores and get player data from per-game boxscore
    const gamesNeedingDetails = games.filter(g => isLiveStatus(g.status) || g.status.toLowerCase().includes('final'))
    const gameIds = gamesNeedingDetails.map(g => g.id)

    if (gameIds.length > 0) {
      const refreshed = await Promise.allSettled(gameIds.map(id => getGameById(id)))
      const detailsMap = new Map()

      refreshed.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const g = r.value
          const gameId = gameIds[i]
          const originalGame = games.find(game => game.id === gameId)

          detailsMap.set(gameId, {
            homeScore: g.homeTeam.score || 0,
            awayScore: g.awayTeam.score || 0,
            period: g.period || 0,
            status: isLiveStatus(originalGame?.status || '') ? 'Live' : originalGame?.status || '',
            gameClock: formatGameClock(g.gameClock || ''),
            homeTopPlayers: getTopPlayers(g.homeTeam.players, 3),
            awayTopPlayers: getTopPlayers(g.awayTeam.players, 3),
          })
        }
      })

      for (const g of games) {
        const upd = detailsMap.get(g.id)
        if (upd) {
          g.homeScore = upd.homeScore
          g.awayScore = upd.awayScore
          g.period = upd.period
          g.status = upd.status
          ;(g as any).gameClock = upd.gameClock
          g.homeTopPlayers = upd.homeTopPlayers
          g.awayTopPlayers = upd.awayTopPlayers
        }
      }
    }
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
