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

export type TopPlayer = {
  personId: number
  name: string
  points: number
  jerseyNum: string
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
  homeTopPlayers?: TopPlayer[]
  awayTopPlayers?: TopPlayer[]
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

// Get player headshot URL from NBA CDN
export function getPlayerHeadshotUrl(personId: number): string {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${personId}.png`
}

// Alternative lower resolution player headshot
export function getPlayerHeadshotSmallUrl(personId: number): string {
  return `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${personId}.png`
}

// Extract top 3 players by points from a team's player list
export function getTopPlayers(players?: PlayerStats[], limit: number = 3): TopPlayer[] {
  if (!players || players.length === 0) return []

  return players
    .filter(p => p.played === '1' && p.statistics.points > 0)
    .sort((a, b) => b.statistics.points - a.statistics.points)
    .slice(0, limit)
    .map(p => ({
      personId: p.personId,
      name: p.name,
      points: p.statistics.points,
      jerseyNum: p.jerseyNum
    }))
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

// Calculate season averages from recent completed games
// Optimized: Only fetch last 30 days to avoid serverless timeouts
export async function getTeamSeasonStats(teamId: number): Promise<EstimatedTeamStats | null> {
  try {
    const games: NBAGame[] = []
    const today = new Date()

    // Fetch last 30 days (much faster, still gets good sample size)
    // Each team plays ~82 games in ~180 days, so 30 days = ~13-14 games
    for (let i = 0; i < 30 && games.length < 20; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')

      try {
        const url = `${NBA_API_BASE}/scoreboard/${dateStr}/scoreboard.json`
        const res = await fetch(url, {
          next: { revalidate: 3600 }, // Cache for 1 hour
        })
        if (!res.ok) continue

        const json = await res.json()
        const dayGames: NBAGame[] = json.scoreboard?.games || []

        // Filter for completed games with this team
        const teamGames = dayGames.filter(g =>
          g.gameStatus === 3 && // Final
          (g.homeTeam.teamId === teamId || g.awayTeam.teamId === teamId) &&
          g.homeTeam.statistics && g.awayTeam.statistics
        )
        games.push(...teamGames)

        // Stop early if we have enough games for good average
        if (games.length >= 15) break
      } catch {
        continue
      }
    }

    if (games.length === 0) {
      console.log(`No completed games found for team ${teamId}`)
      return null
    }

    console.log(`Found ${games.length} completed games for team ${teamId} this season`)

    // Calculate averages from ALL games
    let totalPPG = 0, totalPAPG = 0, totalFG = 0, totalFGA = 0
    let total3P = 0, total3PA = 0, totalFT = 0, totalFTA = 0
    let totalREB = 0, totalAST = 0, totalSTL = 0, totalBLK = 0, totalTOV = 0

    games.forEach(g => {
      const isHome = g.homeTeam.teamId === teamId
      const team = isHome ? g.homeTeam : g.awayTeam
      const opponent = isHome ? g.awayTeam : g.homeTeam
      const stats = team.statistics!

      totalPPG += team.score
      totalPAPG += opponent.score
      totalFG += stats.fieldGoalsMade
      totalFGA += stats.fieldGoalsAttempted
      total3P += stats.threePointersMade
      total3PA += stats.threePointersAttempted
      totalFT += stats.freeThrowsMade
      totalFTA += stats.freeThrowsAttempted
      totalREB += stats.reboundsTotal
      totalAST += stats.assists
      totalSTL += stats.steals
      totalBLK += stats.blocks
      totalTOV += stats.turnovers
    })

    const gameCount = games.length

    return {
      ppg: Math.round((totalPPG / gameCount) * 10) / 10,
      papg: Math.round((totalPAPG / gameCount) * 10) / 10,
      fgPct: Math.round((totalFG / totalFGA * 100) * 10) / 10,
      fg3Pct: Math.round((total3P / total3PA * 100) * 10) / 10,
      ftPct: Math.round((totalFT / totalFTA * 100) * 10) / 10,
      rpg: Math.round((totalREB / gameCount) * 10) / 10,
      apg: Math.round((totalAST / gameCount) * 10) / 10,
      spg: Math.round((totalSTL / gameCount) * 10) / 10,
      bpg: Math.round((totalBLK / gameCount) * 10) / 10,
      tpg: Math.round((totalTOV / gameCount) * 10) / 10,
    }
  } catch (e) {
    console.error('Error calculating team season stats for team', teamId, ':', e)
    return null
  }
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

// Play-by-Play Types
export type PlayByPlayAction = {
  actionNumber: number
  actionType: string
  assistPersonId?: number
  assistPlayerNameInitial?: string
  assistTotal?: number
  clock: string
  description: string
  descriptor?: string
  edited?: string
  foulDrawnPersonId?: number
  foulDrawnPlayerName?: string
  foulPersonalTotal?: number
  foulTechnicalTotal?: number
  isFieldGoal?: number
  jumpBallRecoveredName?: string
  jumpBallRecoverdPersonId?: number
  jumpBallWonPersonId?: number
  jumpBallWonPlayerName?: string
  orderNumber: number
  period: number
  periodType?: string
  personId?: number
  personIdsFilter?: number[]
  playerName?: string
  playerNameI?: string
  pointsTotal?: number
  possession?: number
  qualifiers?: string[]
  reboundDefensiveTotal?: number
  reboundOffensiveTotal?: number
  reboundTotal?: number
  scoreAway?: string
  scoreHome?: string
  shotActionNumber?: number
  shotDistance?: number
  shotResult?: string
  stealPersonId?: number
  stealPlayerName?: string
  subType?: string
  teamId?: number
  teamTricode?: string
  turnoverTotal?: number
  value?: string
  x?: number
  xLegacy?: number
  y?: number
  yLegacy?: number
}

export type PlayByPlayResponse = {
  gameId: string
  actions: PlayByPlayAction[]
  totalActions: number
}
