// Using NBA.com's free public API
const NBA_API_BASE = 'https://cdn.nba.com/static/json/liveData'

export type NBATeam = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  score: number
  wins: number
  losses: number
}

export type NBAGame = {
  gameId: string
  gameStatus: number // 1 = scheduled, 2 = live, 3 = final
  gameStatusText: string
  period: number
  gameClock: string
  homeTeam: NBATeam
  awayTeam: NBATeam
}

export type TodayGame = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  period: number
  gameClock?: string
}

function formatTeam(team: NBATeam): string {
  return `${team.teamCity} ${team.teamName}`
}

export async function getTodayGames(): Promise<TodayGame[]> {
  try {
    const ts = Date.now()
    const url = `${NBA_API_BASE}/scoreboard/todaysScoreboard_00.json?t=${ts}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('NBA API non-OK response', res.status)
      }
      return []
    }
    const json = await res.json()
    const games: NBAGame[] = json.scoreboard?.games || []
    return games.map((g) => ({
      id: g.gameId,
      homeTeam: formatTeam(g.homeTeam),
      awayTeam: formatTeam(g.awayTeam),
      homeScore: g.homeTeam.score || 0,
      awayScore: g.awayTeam.score || 0,
      status: formatStatus(g.gameStatus, g.gameStatusText),
      period: g.period || 0,
      gameClock: g.gameClock || '',
    }))
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch games', e)
    }
    return []
  }
}

export async function getGamesByDate(date: string): Promise<TodayGame[]> {
  try {
    // Format: YYYY-MM-DD -> YYYYMMDD for NBA API
    const dateStr = date.replace(/-/g, '')
    const ts = Date.now()
    const url = `${NBA_API_BASE}/scoreboard/${dateStr}/scoreboard.json?t=${ts}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('NBA API non-OK response for date', res.status, date)
      }
      return []
    }
    const json = await res.json()
    const games: NBAGame[] = json.scoreboard?.games || []
    return games.map((g) => ({
      id: g.gameId,
      homeTeam: formatTeam(g.homeTeam),
      awayTeam: formatTeam(g.awayTeam),
      homeScore: g.homeTeam.score || 0,
      awayScore: g.awayTeam.score || 0,
      status: formatStatus(g.gameStatus, g.gameStatusText),
      period: g.period || 0,
      gameClock: (g as any).gameClock || '',
    }))
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch games by date', e)
    }
    return []
  }
}

export async function getGameById(id: string): Promise<NBAGame> {
  // Prefer per-game boxscore feed for fresher data
  const timestamp = Date.now()
  const url = `${NBA_API_BASE}/boxscore/boxscore_${encodeURIComponent(id)}.json?t=${timestamp}`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  })
  if (!res.ok) throw new Error('Failed to fetch game')
  const json = await res.json()
  const g = json.game
  if (!g) throw new Error('Game not found')
  const toTeam = (t: any): NBATeam => ({
    teamId: Number(t.teamId) || 0,
    teamName: t.teamName,
    teamCity: t.teamCity,
    teamTricode: t.teamTricode,
    score: Number(t.score) || 0,
    wins: Number(t.wins) || 0,
    losses: Number(t.losses) || 0,
  })
  const periodVal = typeof g.period === 'number' ? g.period : (g.period?.current ?? 0)
  return {
    gameId: id,
    gameStatus: Number(g.gameStatus) || 0,
    gameStatusText: String(g.gameStatusText || ''),
    period: periodVal,
    gameClock: String(g.gameClock || ''),
    homeTeam: toTeam(g.homeTeam),
    awayTeam: toTeam(g.awayTeam),
  }
}

function formatStatus(gameStatus: number, statusText: string): string {
  switch (gameStatus) {
    case 1:
      return statusText // "7:30 pm ET"
    case 2:
      return 'Live'
    case 3:
      return 'Final'
    default:
      return statusText
  }
}

export function isLiveStatus(status: string): boolean {
  return status.toLowerCase() === 'live'
}
