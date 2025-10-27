import { NextResponse } from 'next/server'
import { getTodayGames, getGameById, isLiveStatus, formatGameClock } from '@/lib/ball'
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
    // For live games, refresh scores from per-game boxscore for maximum freshness
    const liveIds = games.filter(g => isLiveStatus(g.status)).map(g => g.id)
    if (liveIds.length > 0) {
      const refreshed = await Promise.allSettled(liveIds.map(id => getGameById(id)))
      const liveMap = new Map<string, { homeScore: number; awayScore: number; period: number; status: string; gameClock?: string }>()
      refreshed.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const g = r.value
          liveMap.set(liveIds[i], {
            homeScore: g.homeTeam.score || 0,
            awayScore: g.awayTeam.score || 0,
            period: g.period || 0,
            status: 'Live',
            gameClock: formatGameClock(g.gameClock || ''),
          })
        }
      })
      for (const g of games) {
        const upd = liveMap.get(g.id)
        if (upd) {
          g.homeScore = upd.homeScore
          g.awayScore = upd.awayScore
          g.period = upd.period
          g.status = upd.status
          ;(g as any).gameClock = upd.gameClock
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
