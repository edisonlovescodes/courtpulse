// Using football-data.org free API for UEFA Champions League data
const UCL_API_BASE = 'https://api.football-data.org/v4'
const UCL_COMPETITION_ID = 2001 // UEFA Champions League ID

export type UCLTeam = {
  teamId: number
  teamName: string
  teamShortName: string
  teamCrest: string
  score: number
  wins?: number
  draws?: number
  losses?: number
}

export type UCLScorer = {
  playerId?: number
  playerName: string
  minute: number
  team: 'home' | 'away'
}

export type UCLGame = {
  gameId: string
  gameStatus: number // 1 = scheduled, 2 = live, 3 = finished
  gameStatusText: string
  matchday: number
  minute: number | null
  homeTeam: UCLTeam
  awayTeam: UCLTeam
  scorers: UCLScorer[]
  gameTimeUTC: string
  venue: string
}

export type TodayGame = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  matchday: number
  minute?: number
  homeWins?: number
  homeDraws?: number
  homeLosses?: number
  awayWins?: number
  awayDraws?: number
  awayLosses?: number
  homeTeamId?: number
  awayTeamId?: number
  homeCrest?: string
  awayCrest?: string
  topScorers?: { playerName: string; minute: number }[]
  venue?: string
  gameTimeUTC?: string
}

// Get team crest URL
export function getTeamCrestUrl(crestUrl?: string): string {
  if (!crestUrl) return ''
  return crestUrl
}

// Format match status to user-friendly string
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'SCHEDULED': 'Upcoming',
    'TIMED': 'Upcoming',
    'IN_PLAY': 'Live',
    'PAUSED': 'Half Time',
    'FINISHED': 'Final',
    'POSTPONED': 'Postponed',
    'SUSPENDED': 'Suspended',
    'CANCELLED': 'Cancelled',
    'AWARDED': 'Final'
  }
  return statusMap[status] || status
}

// Convert match status to game status number
function getGameStatus(status: string): number {
  if (status === 'SCHEDULED' || status === 'TIMED') return 1
  if (status === 'IN_PLAY' || status === 'PAUSED') return 2
  return 3 // FINISHED, AWARDED, etc.
}

// Parse API match response to TodayGame format
function parseMatch(match: any): TodayGame {
  const homeScore = match.score?.fullTime?.home ?? match.score?.regular?.home ?? 0
  const awayScore = match.score?.fullTime?.away ?? match.score?.regular?.away ?? 0

  return {
    id: match.id.toString(),
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeScore,
    awayScore,
    status: formatStatus(match.status),
    matchday: match.matchday || 0,
    minute: match.minute,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeCrest: match.homeTeam.crest,
    awayCrest: match.awayTeam.crest,
    venue: match.venue,
    gameTimeUTC: match.utcDate,
    topScorers: match.goals?.slice(0, 3).map((g: any) => ({
      playerName: g.scorer?.name || 'Unknown',
      minute: g.minute || 0
    })) || []
  }
}

// Parse detailed match data
function parseDetailedMatch(data: any): UCLGame {
  const match = data.match || data
  const homeScore = match.score?.fullTime?.home ?? match.score?.regular?.home ?? 0
  const awayScore = match.score?.fullTime?.away ?? match.score?.regular?.away ?? 0

  const homeTeam: UCLTeam = {
    teamId: match.homeTeam.id,
    teamName: match.homeTeam.name,
    teamShortName: match.homeTeam.shortName || match.homeTeam.name,
    teamCrest: match.homeTeam.crest,
    score: homeScore
  }

  const awayTeam: UCLTeam = {
    teamId: match.awayTeam.id,
    teamName: match.awayTeam.name,
    teamShortName: match.awayTeam.shortName || match.awayTeam.name,
    teamCrest: match.awayTeam.crest,
    score: awayScore
  }

  const scorers: UCLScorer[] = (match.goals || []).map((g: any) => ({
    playerId: g.scorer?.id,
    playerName: g.scorer?.name || 'Unknown',
    minute: g.minute || 0,
    team: g.team.id === homeTeam.teamId ? 'home' : 'away'
  }))

  return {
    gameId: match.id.toString(),
    gameStatus: getGameStatus(match.status),
    gameStatusText: formatStatus(match.status),
    matchday: match.matchday || 0,
    minute: match.minute,
    homeTeam,
    awayTeam,
    scorers,
    gameTimeUTC: match.utcDate,
    venue: match.venue || ''
  }
}

// Get today's UCL matches
export async function getTodayGames(): Promise<TodayGame[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const apiKey = process.env.FOOTBALL_DATA_API_KEY

    if (!apiKey) {
      console.warn('FOOTBALL_DATA_API_KEY not configured')
      return []
    }

    const url = `${UCL_API_BASE}/competitions/${UCL_COMPETITION_ID}/matches?dateFrom=${today}&dateTo=${today}`
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('UCL API non-OK response', res.status)
      }
      return []
    }

    const json = await res.json()
    const matches = json.matches || []
    return matches.map(parseMatch)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch UCL matches', e)
    }
    return []
  }
}

// Get UCL matches by date
export async function getGamesByDate(date: string): Promise<TodayGame[]> {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY

    if (!apiKey) {
      console.warn('FOOTBALL_DATA_API_KEY not configured')
      return []
    }

    const url = `${UCL_API_BASE}/competitions/${UCL_COMPETITION_ID}/matches?dateFrom=${date}&dateTo=${date}`
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('UCL API non-OK response for date', res.status, date)
      }
      return []
    }

    const json = await res.json()
    const matches = json.matches || []
    return matches.map(parseMatch)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch UCL matches by date', e)
    }
    return []
  }
}

// Get match by ID
export async function getGameById(id: string): Promise<UCLGame> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY

  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY not configured')
  }

  const url = `${UCL_API_BASE}/matches/${id}`
  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': apiKey
    },
    cache: 'no-store',
    next: { revalidate: 0 }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch match')
  }

  const json = await res.json()
  return parseDetailedMatch(json)
}

// Check if match status is live
export function isLiveStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'live' || s === 'in play' || s.includes('half time')
}

// Format match minute display
export function formatMatchMinute(minute?: number | null): string {
  if (!minute && minute !== 0) return ''
  if (minute > 90) return `90+${minute - 90}'`
  return `${minute}'`
}
