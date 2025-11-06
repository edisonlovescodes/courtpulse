import { NextResponse } from 'next/server'
import { type TeamStanding } from '@/lib/standings'

export const dynamic = 'force-dynamic'

// ESPN team ID to NBA team ID mapping
const ESPN_TO_NBA_ID: Record<string, number> = {
  '1': 1610612737,  // Atlanta Hawks
  '2': 1610612738,  // Boston Celtics
  '3': 1610612739,  // Cleveland Cavaliers
  '4': 1610612740,  // New Orleans Pelicans
  '5': 1610612741,  // Chicago Bulls
  '6': 1610612742,  // Dallas Mavericks
  '7': 1610612743,  // Denver Nuggets
  '8': 1610612765,  // Detroit Pistons
  '9': 1610612744,  // Golden State Warriors
  '10': 1610612745, // Houston Rockets
  '11': 1610612754, // Indiana Pacers
  '12': 1610612746, // LA Clippers
  '13': 1610612747, // Los Angeles Lakers
  '14': 1610612763, // Memphis Grizzlies
  '15': 1610612748, // Miami Heat
  '16': 1610612749, // Milwaukee Bucks
  '17': 1610612750, // Minnesota Timberwolves
  '18': 1610612751, // Brooklyn Nets
  '19': 1610612752, // New York Knicks
  '20': 1610612753, // Orlando Magic
  '21': 1610612755, // Philadelphia 76ers
  '22': 1610612756, // Phoenix Suns
  '23': 1610612757, // Portland Trail Blazers
  '24': 1610612758, // Sacramento Kings
  '25': 1610612759, // San Antonio Spurs
  '26': 1610612760, // Oklahoma City Thunder
  '27': 1610612761, // Toronto Raptors
  '28': 1610612762, // Utah Jazz
  '29': 1610612764, // Washington Wizards
  '30': 1610612766, // Charlotte Hornets
}

function parseESPNStandings(entries: any[]): TeamStanding[] {
  return entries.map((entry: any) => {
    const team = entry.team
    const stats = entry.stats.reduce((acc: any, stat: any) => {
      acc[stat.name] = stat.value
      return acc
    }, {})

    return {
      teamId: ESPN_TO_NBA_ID[team.id] || parseInt(team.id),
      teamName: team.name,
      teamCity: team.location,
      teamTricode: team.abbreviation,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      winPct: stats.winPercent || 0,
      conference: 'East', // Will be set correctly by the parent
      gamesBack: stats.gamesBehind || 0,
    }
  })
}

export async function GET() {
  try {
    // Fetch live standings from ESPN
    const response = await fetch(
      'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    const data = await response.json()

    // ESPN returns conferences as children
    const conferences = data.children || []
    const eastConf = conferences.find((c: any) => c.abbreviation === 'East')
    const westConf = conferences.find((c: any) => c.abbreviation === 'West')

    const eastTeams = eastConf ? parseESPNStandings(eastConf.standings.entries) : []
    const westTeams = westConf ? parseESPNStandings(westConf.standings.entries) : []

    // Set correct conference
    eastTeams.forEach(t => t.conference = 'East')
    westTeams.forEach(t => t.conference = 'West')

    return NextResponse.json({
      east: eastTeams,
      west: westTeams,
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (e: any) {
    console.error('Error fetching NBA standings:', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch standings' }, { status: 500 })
  }
}
