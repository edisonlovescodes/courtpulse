import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTodayGames, getGameById, isLiveStatus } from '@/lib/ball'

export const dynamic = 'force-dynamic'

function simulatedGames() {
  const now = new Date()
  const idBase = now.toISOString().slice(0,10).replace(/-/g,'')
  return [
    {
      id: `sim_${idBase}_001`,
      homeTeam: 'Los Angeles Lakers',
      awayTeam: 'Boston Celtics',
      homeScore: 78,
      awayScore: 75,
      status: 'Live',
      period: 3,
      gameClock: '03:21',
    },
    {
      id: `sim_${idBase}_002`,
      homeTeam: 'Miami Heat',
      awayTeam: 'New York Knicks',
      homeScore: 0,
      awayScore: 0,
      status: '7:00 PM ET',
      period: 0,
      gameClock: '',
    },
  ]
}

export async function GET() {
  try {
    const store = await cookies()
    const sim = store.get('CP_SIM')?.value
    if (sim === '1') {
      return NextResponse.json(
        { games: simulatedGames() },
        { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' } },
      )
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
            gameClock: g.gameClock || '',
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
