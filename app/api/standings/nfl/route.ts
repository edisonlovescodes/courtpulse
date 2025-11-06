import { NextResponse } from 'next/server'
import { type TeamStanding } from '@/lib/standings'

export const dynamic = 'force-dynamic'

function parseESPNNFLStandings(entries: any[]): TeamStanding[] {
  return entries.map((entry: any) => {
    const team = entry.team
    const stats = entry.stats.reduce((acc: any, stat: any) => {
      acc[stat.name] = stat.value
      return acc
    }, {})

    return {
      teamId: parseInt(team.id),
      teamName: team.name,
      teamCity: team.location,
      teamTricode: team.abbreviation,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      winPct: stats.winPercent || 0,
      conference: 'East', // Will be set by parent (AFC = East, NFC = West for consistency)
      gamesBack: stats.gamesBehind || 0,
    }
  })
}

export async function GET() {
  try {
    // Fetch live standings from ESPN
    const response = await fetch(
      'https://site.api.espn.com/apis/v2/sports/football/nfl/standings',
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    const data = await response.json()

    // ESPN returns conferences as children
    const conferences = data.children || []
    const afcConf = conferences.find((c: any) => c.abbreviation === 'AFC')
    const nfcConf = conferences.find((c: any) => c.abbreviation === 'NFC')

    const afcTeams = afcConf ? parseESPNNFLStandings(afcConf.standings.entries) : []
    const nfcTeams = nfcConf ? parseESPNNFLStandings(nfcConf.standings.entries) : []

    // Set correct conference (using 'East' for AFC and 'West' for NFC for frontend consistency)
    afcTeams.forEach(t => t.conference = 'East')
    nfcTeams.forEach(t => t.conference = 'West')

    return NextResponse.json({
      east: afcTeams,
      west: nfcTeams,
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
