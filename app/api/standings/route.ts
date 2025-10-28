import { NextResponse } from 'next/server'
import { getTodayGames } from '@/lib/ball'
import { getConference, calculateWinPercentage, sortStandings, addGamesBack, type TeamStanding } from '@/lib/standings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get today's games to extract team records
    const games = await getTodayGames()

    // Build a map of teams with their records
    const teamsMap = new Map<number, TeamStanding>()

    games.forEach(game => {
      // Add home team
      if (game.homeTeamId && game.homeWins !== undefined && game.homeLosses !== undefined) {
        if (!teamsMap.has(game.homeTeamId)) {
          teamsMap.set(game.homeTeamId, {
            teamId: game.homeTeamId,
            teamName: game.homeTeam.split(' ').pop() || game.homeTeam,
            teamCity: game.homeTeam.split(' ').slice(0, -1).join(' ') || '',
            teamTricode: game.homeTricode || '',
            wins: game.homeWins,
            losses: game.homeLosses,
            winPct: calculateWinPercentage(game.homeWins, game.homeLosses),
            conference: getConference(game.homeTeamId),
          })
        }
      }

      // Add away team
      if (game.awayTeamId && game.awayWins !== undefined && game.awayLosses !== undefined) {
        if (!teamsMap.has(game.awayTeamId)) {
          teamsMap.set(game.awayTeamId, {
            teamId: game.awayTeamId,
            teamName: game.awayTeam.split(' ').pop() || game.awayTeam,
            teamCity: game.awayTeam.split(' ').slice(0, -1).join(' ') || '',
            teamTricode: game.awayTricode || '',
            wins: game.awayWins,
            losses: game.awayLosses,
            winPct: calculateWinPercentage(game.awayWins, game.awayLosses),
            conference: getConference(game.awayTeamId),
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
