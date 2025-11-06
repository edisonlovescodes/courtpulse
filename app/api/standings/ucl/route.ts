import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UCL_API_BASE = 'https://api.football-data.org/v4'
const UCL_COMPETITION_ID = 2001 // UEFA Champions League ID

type UCLTeamStanding = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  wins: number
  losses: number
  draws?: number
  winPct: number
  conference: string // Group name (e.g., "Group A") or "League Phase"
  gamesBack?: number
  points?: number
  played?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDifference?: number
}

function calculateWinPercentage(wins: number, draws: number, losses: number): number {
  const totalGames = wins + draws + losses
  if (totalGames === 0) return 0
  // In football, wins are 3 points, draws are 1 point, losses are 0 points
  const points = wins * 3 + draws * 1
  const maxPoints = totalGames * 3
  return points / maxPoints
}

function sortStandings(teams: UCLTeamStanding[]): UCLTeamStanding[] {
  return teams.sort((a, b) => {
    // Sort by points (descending)
    if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
    // If tied, sort by goal difference
    if ((b.goalDifference || 0) !== (a.goalDifference || 0)) return (b.goalDifference || 0) - (a.goalDifference || 0)
    // If still tied, sort by goals scored
    if ((b.goalsFor || 0) !== (a.goalsFor || 0)) return (b.goalsFor || 0) - (a.goalsFor || 0)
    // Finally by wins
    return b.wins - a.wins
  })
}

export async function GET() {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY

    if (!apiKey) {
      console.warn('FOOTBALL_DATA_API_KEY not configured')
      return NextResponse.json({
        east: [],
        west: [],
        lastUpdated: new Date().toISOString()
      })
    }

    // Fetch standings from football-data.org API
    const url = `${UCL_API_BASE}/competitions/${UCL_COMPETITION_ID}/standings`
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      console.warn('UCL API non-OK response', res.status)
      return NextResponse.json({
        east: [],
        west: [],
        lastUpdated: new Date().toISOString()
      })
    }

    const data = await res.json()
    const standings = data.standings || []

    if (standings.length === 0) {
      return NextResponse.json({
        east: [],
        west: [],
        lastUpdated: new Date().toISOString()
      })
    }

    // UCL has different formats: either league phase or group stage
    // We'll take the first standings table (usually league phase or first group)
    const mainStandings = standings[0]
    const allTeams: UCLTeamStanding[] = (mainStandings.table || []).map((entry: any) => ({
      teamId: entry.team.id,
      teamName: entry.team.name,
      teamCity: '', // Not provided by API
      teamTricode: entry.team.tla || entry.team.shortName || '',
      wins: entry.won || 0,
      losses: entry.lost || 0,
      draws: entry.draw || 0,
      winPct: calculateWinPercentage(entry.won || 0, entry.draw || 0, entry.lost || 0),
      conference: mainStandings.group || mainStandings.stage || 'LEAGUE_STAGE',
      points: entry.points || 0,
      played: entry.playedGames || 0,
      goalsFor: entry.goalsFor || 0,
      goalsAgainst: entry.goalsAgainst || 0,
      goalDifference: entry.goalDifference || 0,
    }))

    // Sort teams
    const sortedTeams = sortStandings(allTeams)

    // Split into two groups for display (top half and bottom half)
    const midpoint = Math.ceil(sortedTeams.length / 2)
    const topHalf = sortedTeams.slice(0, midpoint)
    const bottomHalf = sortedTeams.slice(midpoint)

    return NextResponse.json({
      east: topHalf,
      west: bottomHalf,
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (e: any) {
    console.error('Error fetching UCL standings:', e)
    return NextResponse.json({
      east: [],
      west: [],
      lastUpdated: new Date().toISOString()
    }, { status: 200 }) // Return empty data instead of error
  }
}
