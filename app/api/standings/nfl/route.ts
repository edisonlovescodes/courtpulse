import { NextResponse } from 'next/server'
import { getTodaysNFLGames } from '@/lib/nfl'

export const dynamic = 'force-dynamic'

type NFLTeamStanding = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  wins: number
  losses: number
  ties: number
  winPct: number
  conference: 'AFC' | 'NFC'
  gamesBack?: number
}

function calculateWinPercentage(wins: number, losses: number, ties: number): number {
  const totalGames = wins + losses + ties
  if (totalGames === 0) return 0
  // In NFL, ties count as 0.5 wins
  return (wins + ties * 0.5) / totalGames
}

function sortStandings(teams: NFLTeamStanding[]): NFLTeamStanding[] {
  return teams.sort((a, b) => {
    // Sort by win percentage (descending)
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    // If tied, sort by wins
    if (b.wins !== a.wins) return b.wins - a.wins
    // If still tied, sort by losses
    return a.losses - b.losses
  })
}

function addGamesBack(teams: NFLTeamStanding[]): NFLTeamStanding[] {
  if (teams.length === 0) return teams

  const leader = teams[0]
  const leaderWins = leader.wins
  const leaderLosses = leader.losses

  return teams.map(team => ({
    ...team,
    gamesBack: team.teamId === leader.teamId
      ? 0
      : ((leaderWins - team.wins) + (team.losses - leaderLosses)) / 2
  }))
}

// NFL team conference mapping
const AFC_TEAMS = [
  'Bills', 'Dolphins', 'Patriots', 'Jets', // AFC East
  'Ravens', 'Bengals', 'Browns', 'Steelers', // AFC North
  'Texans', 'Colts', 'Jaguars', 'Titans', // AFC South
  'Chiefs', 'Chargers', 'Raiders', 'Broncos' // AFC West
]

function getConference(teamName: string): 'AFC' | 'NFC' {
  return AFC_TEAMS.includes(teamName) ? 'AFC' : 'NFC'
}

export async function GET() {
  try {
    // Get NFL games to extract team records
    const games = await getTodaysNFLGames()

    // Build a map of teams with their records
    const teamsMap = new Map<number, NFLTeamStanding>()

    games.forEach(game => {
      // Add home team
      if (game.homeTeam.teamId && game.homeTeam.wins !== undefined) {
        if (!teamsMap.has(game.homeTeam.teamId)) {
          teamsMap.set(game.homeTeam.teamId, {
            teamId: game.homeTeam.teamId,
            teamName: game.homeTeam.teamName,
            teamCity: game.homeTeam.teamCity,
            teamTricode: game.homeTeam.teamTricode,
            wins: game.homeTeam.wins,
            losses: game.homeTeam.losses,
            ties: game.homeTeam.ties,
            winPct: calculateWinPercentage(game.homeTeam.wins, game.homeTeam.losses, game.homeTeam.ties),
            conference: getConference(game.homeTeam.teamName),
          })
        }
      }

      // Add away team
      if (game.awayTeam.teamId && game.awayTeam.wins !== undefined) {
        if (!teamsMap.has(game.awayTeam.teamId)) {
          teamsMap.set(game.awayTeam.teamId, {
            teamId: game.awayTeam.teamId,
            teamName: game.awayTeam.teamName,
            teamCity: game.awayTeam.teamCity,
            teamTricode: game.awayTeam.teamTricode,
            wins: game.awayTeam.wins,
            losses: game.awayTeam.losses,
            ties: game.awayTeam.ties,
            winPct: calculateWinPercentage(game.awayTeam.wins, game.awayTeam.losses, game.awayTeam.ties),
            conference: getConference(game.awayTeam.teamName),
          })
        }
      }
    })

    const allTeams = Array.from(teamsMap.values())

    // Split into conferences
    const afcTeams = allTeams.filter(t => t.conference === 'AFC')
    const nfcTeams = allTeams.filter(t => t.conference === 'NFC')

    // Sort each conference
    const sortedAFC = sortStandings(afcTeams)
    const sortedNFC = sortStandings(nfcTeams)

    // Add games back
    const afcWithGB = addGamesBack(sortedAFC)
    const nfcWithGB = addGamesBack(sortedNFC)

    return NextResponse.json({
      east: afcWithGB, // Using 'east' key for consistency with frontend (AFC)
      west: nfcWithGB, // Using 'west' key for consistency with frontend (NFC)
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (e: any) {
    console.error('Error fetching NFL standings:', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch standings' }, { status: 500 })
  }
}
