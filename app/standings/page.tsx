"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Sport = 'nba' | 'nfl' | 'ucl'

type TeamStanding = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  wins: number
  losses: number
  winPct: number
  conference: 'East' | 'West'
  gamesBack?: number
}

type StandingsData = {
  east: TeamStanding[]
  west: TeamStanding[]
  lastUpdated: string
}

function getTeamLogoUrl(teamId: number, sport: Sport): string {
  if (sport === 'nba') {
    return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`
  } else if (sport === 'nfl') {
    // ESPN NFL team logos
    return `https://a.espncdn.com/i/teamlogos/nfl/500/${teamId}.png`
  } else {
    // UCL team crests - will be handled differently
    return ''
  }
}

function formatWinPct(pct: number): string {
  return pct.toFixed(3)
}

function formatGamesBack(gb?: number): string {
  if (gb === undefined || gb === 0) return '-'
  return gb.toFixed(1)
}

export default function StandingsPage() {
  const [activeSport, setActiveSport] = useState<Sport>('nba')
  const [standings, setStandings] = useState<StandingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStandings() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/standings/${activeSport}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        })
        if (!res.ok) throw new Error('Failed to fetch standings')
        const data = await res.json()
        setStandings(data)
        setError(null)
      } catch (e: any) {
        setError(e.message || 'Failed to load standings')
      } finally {
        setLoading(false)
      }
    }

    loadStandings()
  }, [activeSport])

  const getSportTitle = () => {
    switch (activeSport) {
      case 'nba': return 'NBA Standings'
      case 'nfl': return 'NFL Standings'
      case 'ucl': return 'UCL Standings'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-bg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="text-sm text-brand-accent hover:underline">← Back to Games</Link>
            <h1 className="text-4xl font-bold mt-4 mb-2">{getSportTitle()}</h1>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveSport('nba')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  activeSport === 'nba'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
                }`}
              >
                NBA
              </button>
              <button
                onClick={() => setActiveSport('nfl')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  activeSport === 'nfl'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
                }`}
              >
                NFL
              </button>
              <button
                onClick={() => setActiveSport('ucl')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  activeSport === 'ucl'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
                }`}
              >
                UCL
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border-2 border-black/10 p-8 animate-pulse h-96" />
            <div className="bg-white rounded-2xl border-2 border-black/10 p-8 animate-pulse h-96" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !standings) {
    return (
      <main className="min-h-screen bg-brand-bg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="text-sm text-brand-accent hover:underline">← Back to Games</Link>
            <h1 className="text-4xl font-bold mt-4 mb-2">{getSportTitle()}</h1>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveSport('nba')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  activeSport === 'nba'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
                }`}
              >
                NBA
              </button>
              <button
                onClick={() => setActiveSport('nfl')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  activeSport === 'nfl'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
                }`}
              >
                NFL
              </button>
              <button
                onClick={() => setActiveSport('ucl')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  activeSport === 'ucl'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
                }`}
              >
                UCL
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-black/10 p-8 text-center">
            <p className="text-red-600">{error || 'No standings data available'}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-accent hover:underline font-medium">← Back to Games</Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">{getSportTitle()}</h1>
          <p className="text-sm text-gray-600">Current season records</p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setActiveSport('nba')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeSport === 'nba'
                  ? 'bg-brand-accent text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
              }`}
            >
              NBA
            </button>
            <button
              onClick={() => setActiveSport('nfl')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeSport === 'nfl'
                  ? 'bg-brand-accent text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
              }`}
            >
              NFL
            </button>
            <button
              onClick={() => setActiveSport('ucl')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeSport === 'ucl'
                  ? 'bg-brand-accent text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-black/10'
              }`}
            >
              UCL
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Eastern Conference / AFC / Top Half */}
          <div className="bg-white rounded-2xl border-2 border-black/10 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
              <h2 className="text-2xl font-bold text-white">
                {activeSport === 'nba' ? 'Eastern Conference' : activeSport === 'nfl' ? 'AFC' : 'Top Teams'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-black/5">
                  <tr>
                    <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">#</th>
                    <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">Team</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">W</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">L</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">PCT</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">GB</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.east.map((team, idx) => (
                    <tr key={team.teamId} className="border-b border-black/5 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-gray-500">{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getTeamLogoUrl(team.teamId, activeSport)}
                            alt={team.teamName}
                            className="w-8 h-8 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div>
                            <div className="font-bold text-sm">{team.teamCity || team.teamName}</div>
                            <div className="text-xs text-gray-600">{team.teamCity ? team.teamName : team.teamTricode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold">{team.wins}</td>
                      <td className="p-4 text-center font-bold">{team.losses}</td>
                      <td className="p-4 text-center text-sm">{formatWinPct(team.winPct)}</td>
                      <td className="p-4 text-center text-sm text-gray-600">{formatGamesBack(team.gamesBack)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Western Conference / NFC / Bottom Half */}
          <div className="bg-white rounded-2xl border-2 border-black/10 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <h2 className="text-2xl font-bold text-white">
                {activeSport === 'nba' ? 'Western Conference' : activeSport === 'nfl' ? 'NFC' : 'Bottom Teams'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-black/5">
                  <tr>
                    <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">#</th>
                    <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">Team</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">W</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">L</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">PCT</th>
                    <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wide">GB</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.west.map((team, idx) => (
                    <tr key={team.teamId} className="border-b border-black/5 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-gray-500">{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getTeamLogoUrl(team.teamId, activeSport)}
                            alt={team.teamName}
                            className="w-8 h-8 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div>
                            <div className="font-bold text-sm">{team.teamCity || team.teamName}</div>
                            <div className="text-xs text-gray-600">{team.teamCity ? team.teamName : team.teamTricode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold">{team.wins}</td>
                      <td className="p-4 text-center font-bold">{team.losses}</td>
                      <td className="p-4 text-center text-sm">{formatWinPct(team.winPct)}</td>
                      <td className="p-4 text-center text-sm text-gray-600">{formatGamesBack(team.gamesBack)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {(standings.east.length === 0 && standings.west.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-600">No standings data available yet. Check back when games start!</p>
          </div>
        )}
      </div>
    </main>
  )
}
