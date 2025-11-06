import { NextResponse } from 'next/server'
import { getConference, calculateWinPercentage, sortStandings, addGamesBack, type TeamStanding } from '@/lib/standings'

export const dynamic = 'force-dynamic'

// Fetch NBA scoreboard data for a given date
async function fetchScoreboardForDate(dateStr: string) {
  try {
    const response = await fetch(
      `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )
    if (!response.ok) return []
    const data = await response.json()
    return data.scoreboard?.games || []
  } catch (e) {
    console.error(`Failed to fetch scoreboard for ${dateStr}:`, e)
    return []
  }
}

export async function GET() {
  try {
    // Fetch scoreboard data for the past 7 days to capture all teams
    const today = new Date()
    const dates: string[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    // Fetch all scoreboards
    const allGamesPromises = dates.map(date => fetchScoreboardForDate(date))
    const allGamesArrays = await Promise.all(allGamesPromises)
    const allGames = allGamesArrays.flat()

    // Build a map of teams with their records
    const teamsMap = new Map<number, TeamStanding>()

    allGames.forEach((game: any) => {
      // Add home team
      const homeTeam = game.homeTeam
      if (homeTeam?.teamId && homeTeam.wins !== undefined && homeTeam.losses !== undefined) {
        if (!teamsMap.has(homeTeam.teamId)) {
          teamsMap.set(homeTeam.teamId, {
            teamId: homeTeam.teamId,
            teamName: homeTeam.teamName || '',
            teamCity: homeTeam.teamCity || '',
            teamTricode: homeTeam.teamTricode || '',
            wins: homeTeam.wins,
            losses: homeTeam.losses,
            winPct: calculateWinPercentage(homeTeam.wins, homeTeam.losses),
            conference: getConference(homeTeam.teamId),
          })
        }
      }

      // Add away team
      const awayTeam = game.awayTeam
      if (awayTeam?.teamId && awayTeam.wins !== undefined && awayTeam.losses !== undefined) {
        if (!teamsMap.has(awayTeam.teamId)) {
          teamsMap.set(awayTeam.teamId, {
            teamId: awayTeam.teamId,
            teamName: awayTeam.teamName || '',
            teamCity: awayTeam.teamCity || '',
            teamTricode: awayTeam.teamTricode || '',
            wins: awayTeam.wins,
            losses: awayTeam.losses,
            winPct: calculateWinPercentage(awayTeam.wins, awayTeam.losses),
            conference: getConference(awayTeam.teamId),
          })
        }
      }
    })

    const allTeams = Array.from(teamsMap.values())

    // Split into conferences
    const eastTeams = allTeams.filter(t => t.conference === 'East')
    const westTeams = allTeams.filter(t => t.conference === 'West')

    // Sort each conference
    const sortedEast = sortStandings(eastTeams)
    const sortedWest = sortStandings(westTeams)

    // Add games back
    const eastWithGB = addGamesBack(sortedEast)
    const westWithGB = addGamesBack(sortedWest)

    return NextResponse.json({
      east: eastWithGB,
      west: westWithGB,
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (e: any) {
    console.error('Error fetching standings:', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch standings' }, { status: 500 })
  }
}
