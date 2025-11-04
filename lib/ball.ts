// Using NBA.com's free public API
const NBA_API_BASE = 'https://cdn.nba.com/static/json/liveData'

export type PlayerStats = {
  personId: number
  name: string
  nameI?: string
  firstName?: string
  familyName?: string
  jerseyNum: string
  position: string
  starter: string
  oncourt: string
  played: string
  statistics: {
    assists: number
    blocks: number
    blocksReceived: number
    fieldGoalsAttempted: number
    fieldGoalsMade: number
    fieldGoalsPercentage: number
    foulsOffensive: number
    foulsDrawn: number
    foulsPersonal: number
    foulsTechnical: number
    freeThrowsAttempted: number
    freeThrowsMade: number
    freeThrowsPercentage: number
    minus: number
    minutes: string
    minutesCalculated: string
    plus: number
    plusMinusPoints: number
    points: number
    pointsFastBreak: number
    pointsInThePaint: number
    pointsSecondChance: number
    reboundsDefensive: number
    reboundsOffensive: number
    reboundsTotal: number
    steals: number
    threePointersAttempted: number
    threePointersMade: number
    threePointersPercentage: number
    turnovers: number
    twoPointersAttempted: number
    twoPointersMade: number
    twoPointersPercentage: number
  }
}

export type TeamStats = {
  assists: number
  assistsTurnoverRatio: number
  benchPoints: number
  biggestLead: number
  biggestScoringRun: number
  blocks: number
  blocksReceived: number
  fastBreakPointsAttempted: number
  fastBreakPointsMade: number
  fastBreakPointsPercentage: number
  fieldGoalsAttempted: number
  fieldGoalsMade: number
  fieldGoalsPercentage: number
  foulsOffensive: number
  foulsDrawn: number
  foulsPersonal: number
  foulsTeam: number
  foulsTechnical: number
  foulsTeamTechnical: number
  freeThrowsAttempted: number
  freeThrowsMade: number
  freeThrowsPercentage: number
  leadChanges: number
  minutes: string
  minutesCalculated: string
  points: number
  pointsAgainst: number
  pointsFastBreak: number
  pointsFromTurnovers: number
  pointsInThePaint: number
  pointsInThePaintAttempted: number
  pointsInThePaintMade: number
  pointsInThePaintPercentage: number
  pointsSecondChance: number
  reboundsDefensive: number
  reboundsOffensive: number
  reboundsPersonal: number
  reboundsTeam: number
  reboundsTeamDefensive: number
  reboundsTeamOffensive: number
  reboundsTotal: number
  secondChancePointsAttempted: number
  secondChancePointsMade: number
  secondChancePointsPercentage: number
  steals: number
  threePointersAttempted: number
  threePointersMade: number
  threePointersPercentage: number
  timeLeading: string
  timesTied: number
  trueShootingAttempts: number
  trueShootingPercentage: number
  turnovers: number
  turnoversTeam: number
  turnoversTotal: number
  twoPointersAttempted: number
  twoPointersMade: number
  twoPointersPercentage: number
}

export type PeriodScore = {
  period: number
  periodType: string
  score: number
}

export type NBATeam = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  score: number
  wins: number
  losses: number
  periods?: PeriodScore[]
  players?: PlayerStats[]
  statistics?: TeamStats
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
  homeWins?: number
  homeLosses?: number
  awayWins?: number
  awayLosses?: number
  homeTeamId?: number
  awayTeamId?: number
  homeTricode?: string
  awayTricode?: string
}

export function formatGameClock(clock?: string): string {
  if (!clock) return ''
  if (!clock.startsWith('PT')) return clock
  const match = clock.match(/^PT(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?$/)
  if (!match) return clock
  const minutesPart = Number(match[1] || 0)
  const secondsPartRaw = Number(match[2] || 0)
  const totalSeconds = minutesPart * 60 + Math.floor(secondsPartRaw)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatTeam(team: NBATeam): string {
  return `${team.teamCity} ${team.teamName}`
}

// Get team logo URL from NBA CDN
export function getTeamLogoUrl(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`
}

// Alternative PNG logos if SVG doesn't work
export function getTeamLogoPngUrl(teamTricode: string): string {
  return `https://cdn.nba.com/logos/nba/${teamTricode}/logo.png`
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
      gameClock: formatGameClock(g.gameClock),
      homeWins: g.homeTeam.wins || 0,
      homeLosses: g.homeTeam.losses || 0,
      awayWins: g.awayTeam.wins || 0,
      awayLosses: g.awayTeam.losses || 0,
      homeTeamId: g.homeTeam.teamId,
      awayTeamId: g.awayTeam.teamId,
      homeTricode: g.homeTeam.teamTricode,
      awayTricode: g.awayTeam.teamTricode,
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
      gameClock: formatGameClock((g as any).gameClock),
      homeWins: g.homeTeam.wins || 0,
      homeLosses: g.homeTeam.losses || 0,
      awayWins: g.awayTeam.wins || 0,
      awayLosses: g.awayTeam.losses || 0,
      homeTeamId: g.homeTeam.teamId,
      awayTeamId: g.awayTeam.teamId,
      homeTricode: g.homeTeam.teamTricode,
      awayTricode: g.awayTeam.teamTricode,
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
    periods: t.periods || [],
    players: t.players || [],
    statistics: t.statistics || undefined,
  })

  const periodVal = typeof g.period === 'number' ? g.period : (g.period?.current ?? 0)
  return {
    gameId: id,
    gameStatus: Number(g.gameStatus) || 0,
    gameStatusText: String(g.gameStatusText || ''),
    period: periodVal,
    gameClock: formatGameClock(String(g.gameClock || '')),
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

// Get current season stats for a team
// For pre-game use, returns estimated stats based on record
// Live game stats are always accurate and pulled from game data
export async function getTeamSeasonStats(teamId: number): Promise<EstimatedTeamStats | null> {
  // Due to serverless timeout constraints, we cannot fetch historical game data
  // Pre-game stats will use estimates; live games always show real-time stats
  console.log(`[getTeamSeasonStats] Returning null for team ${teamId} - will use estimates for pre-game`)
  return null
}

// Estimate team stats for pre-game preview based on win-loss record
// This provides rough estimates until we have historical data
export type EstimatedTeamStats = {
  ppg: number // points per game
  papg: number // points allowed per game
  fgPct: number // field goal percentage
  fg3Pct: number // 3-point percentage
  ftPct: number // free throw percentage
  rpg: number // rebounds per game
  apg: number // assists per game
  spg: number // steals per game
  bpg: number // blocks per game
  tpg: number // turnovers per game
}

export function estimateTeamStats(wins: number, losses: number, teamId?: number): EstimatedTeamStats {
  const totalGames = wins + losses
  if (totalGames === 0) {
    // Default NBA averages
    return {
      ppg: 112.0,
      papg: 112.0,
      fgPct: 46.5,
      fg3Pct: 36.5,
      ftPct: 77.5,
      rpg: 43.5,
      apg: 25.0,
      spg: 7.5,
      bpg: 5.0,
      tpg: 13.5,
    }
  }

  const winPct = wins / totalGames

  // Add team-specific variance to prevent identical stats for teams with same record
  // Use teamId to create deterministic but unique variations
  const teamVariance = teamId ? (teamId % 100) / 200 : 0 // -0.25 to +0.25 range

  // Better teams tend to score more, allow less, and have better percentages
  // These are rough estimates based on NBA correlations
  const ppg = 108 + (winPct * 12) + (teamVariance * 8) // Range: ~104-124
  const papg = 118 - (winPct * 12) + (teamVariance * 6) // Range: ~103-121 (inverse)
  const fgPct = 44.5 + (winPct * 4) + (teamVariance * 2.5) // Range: ~42-49.5
  const fg3Pct = 35.0 + (winPct * 3.5) + (teamVariance * 2) // Range: ~33-40
  const ftPct = 76.0 + (winPct * 4) + (teamVariance * 3) // Range: ~73.5-81.5
  const rpg = 42.0 + (winPct * 4) + (teamVariance * 3) // Range: ~39.5-47.5
  const apg = 24.0 + (winPct * 4) + (teamVariance * 2.5) // Range: ~22-29
  const spg = 7.0 + (winPct * 2) + (teamVariance * 1.5) // Range: ~6-10
  const bpg = 4.5 + (winPct * 1.5) + (teamVariance * 1) // Range: ~4-7
  const tpg = 15.0 - (winPct * 3) - (teamVariance * 2) // Range: ~11-17 (inverse)

  return {
    ppg: Math.round(ppg * 10) / 10,
    papg: Math.round(papg * 10) / 10,
    fgPct: Math.round(fgPct * 10) / 10,
    fg3Pct: Math.round(fg3Pct * 10) / 10,
    ftPct: Math.round(ftPct * 10) / 10,
    rpg: Math.round(rpg * 10) / 10,
    apg: Math.round(apg * 10) / 10,
    spg: Math.round(spg * 10) / 10,
    bpg: Math.round(bpg * 10) / 10,
    tpg: Math.round(tpg * 10) / 10,
  }
}
