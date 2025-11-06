import { NextResponse } from 'next/server'
import { getConference, calculateWinPercentage, sortStandings, addGamesBack, ALL_NBA_TEAMS, type TeamStanding } from '@/lib/standings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch today's scoreboard to get current team records
    const response = await fetch(
      `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      throw new Error(`NBA API error: ${response.status}`)
    }

    const data = await response.json()
    const games = data.scoreboard?.games || []

    // Initialize all teams with default 0-0 records
    const teamsMap = new Map<number, TeamStanding>()
    ALL_NBA_TEAMS.forEach(team => {
      teamsMap.set(team.teamId, {
        teamId: team.teamId,
        teamName: team.teamName,
        teamCity: team.teamCity,
        teamTricode: team.teamTricode,
        wins: 0,
        losses: 0,
        winPct: 0,
        conference: getConference(team.teamId),
      })
    })

    // Update with actual records from today's games
    games.forEach((game: any) => {
      // Update home team
      const homeTeam = game.homeTeam
      if (homeTeam?.teamId && homeTeam.wins !== undefined && homeTeam.losses !== undefined) {
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

      // Update away team
      const awayTeam = game.awayTeam
      if (awayTeam?.teamId && awayTeam.wins !== undefined && awayTeam.losses !== undefined) {
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
