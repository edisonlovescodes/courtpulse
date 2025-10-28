"use client"
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import BusinessCard from '../../components/BusinessCard'
import { estimateTeamStats, type EstimatedTeamStats } from '@/lib/ball'

type PlayerStats = {
  personId: number
  name: string
  jerseyNum: string
  position: string
  starter: string
  played: string
  statistics: {
    minutes: string
    points: number
    reboundsTotal: number
    assists: number
    fieldGoalsMade: number
    fieldGoalsAttempted: number
    fieldGoalsPercentage: number
    threePointersMade: number
    threePointersAttempted: number
    threePointersPercentage: number
    freeThrowsMade: number
    freeThrowsAttempted: number
    freeThrowsPercentage: number
    foulsPersonal: number
    steals: number
    blocks: number
    turnovers: number
    plusMinusPoints: number
  }
}

type TeamStats = {
  fieldGoalsMade: number
  fieldGoalsAttempted: number
  fieldGoalsPercentage: number
  threePointersMade: number
  threePointersAttempted: number
  threePointersPercentage: number
  freeThrowsMade: number
  freeThrowsAttempted: number
  freeThrowsPercentage: number
  reboundsTotal: number
  reboundsOffensive: number
  reboundsDefensive: number
  assists: number
  blocks: number
  steals: number
  turnovers: number
  pointsInThePaint: number
  foulsPersonal: number
}

type PeriodScore = {
  period: number
  periodType: string
  score: number
}

type TeamDetails = {
  teamTricode: string
  wins: number
  losses: number
  periods: PeriodScore[]
  players: PlayerStats[]
  statistics?: TeamStats
}

type Detail = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  period: number
  gameClock?: string
  allowed: boolean
  reason?: string
  homeTeamDetails?: TeamDetails
  awayTeamDetails?: TeamDetails
  isPreGame?: boolean
  homeWins?: number
  homeLosses?: number
  awayWins?: number
  awayLosses?: number
  homeTeamId?: number
  awayTeamId?: number
  homeTricode?: string
  awayTricode?: string
}

function formatGameClock(clock?: string): string {
  if (!clock) return ''
  // NBA API returns format like "PT09M43.00S"
  // Extract minutes and seconds
  const match = clock.match(/PT(\d+)M([\d.]+)S/)
  if (!match) return clock
  const mins = match[1]
  const secs = Math.floor(parseFloat(match[2]))
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatMinutes(minutes: string): string {
  if (!minutes || minutes === '0:00') return '0'
  // Parse PT12M34.00S or MM:SS format
  if (minutes.startsWith('PT')) {
    const match = minutes.match(/PT(\d+)M/)
    if (match) {
      return Math.ceil(parseInt(match[1])).toString()
    }
  }
  // Parse MM:SS format
  const parts = minutes.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0])
    const secs = parseInt(parts[1])
    return Math.ceil(mins + (secs > 0 ? 1 : 0)).toString()
  }
  return minutes
}

function getTeamLogoUrl(teamId?: number): string {
  if (!teamId) return ''
  return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`
}

function formatRecord(wins?: number, losses?: number): string {
  if (wins === undefined || losses === undefined) return ''
  return `${wins}-${losses}`
}

export default function Client({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'boxscore' | 'teamstats'>('boxscore')

  const load = useCallback(async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const res = await fetch(`/api/games/${id}?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Request failed (${res.status})`)
      }
      const j = (await res.json()) as Detail
      setData(j)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [load])

  if (error) {
    return (
      <main className="space-y-4">
        <Link href="/" className="text-sm">← Back</Link>
        <div className="card">
          <div className="text-red-600 font-medium">{error}</div>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="p-4">
        <div className="rounded-2xl bg-white border border-black/10 p-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-2/3"></div>
        </div>
      </main>
    )
  }

  // Pre-game view for scheduled games
  if (data.isPreGame) {
    return (
      <main className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-brand-accent transition group">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to All Games
        </Link>

        {/* Pre-Game Matchup Card */}
        <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 shadow-xl">
          <div className="space-y-8">
            {/* Game Time */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-bold mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {data.status}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Game Preview</h2>
            </div>

            {/* Team Matchup */}
            <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-8">
              {/* Away Team */}
              <div className="text-center">
                {data.awayTeamId && (
                  <img
                    src={getTeamLogoUrl(data.awayTeamId)}
                    alt={data.awayTeam}
                    className="w-32 h-32 object-contain mx-auto mb-4"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <h3 className="text-2xl font-bold mb-2">{data.awayTeam}</h3>
                {formatRecord(data.awayWins, data.awayLosses) && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
                    <span className="text-sm font-semibold text-gray-600">RECORD</span>
                    <span className="text-lg font-bold">{formatRecord(data.awayWins, data.awayLosses)}</span>
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center">
                <div className="text-4xl font-black text-gray-300">@</div>
              </div>

              {/* Home Team */}
              <div className="text-center">
                {data.homeTeamId && (
                  <img
                    src={getTeamLogoUrl(data.homeTeamId)}
                    alt={data.homeTeam}
                    className="w-32 h-32 object-contain mx-auto mb-4"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <h3 className="text-2xl font-bold mb-2">{data.homeTeam}</h3>
                {formatRecord(data.homeWins, data.homeLosses) && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
                    <span className="text-sm font-semibold text-gray-600">RECORD</span>
                    <span className="text-lg font-bold">{formatRecord(data.homeWins, data.homeLosses)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Team Comparison Stats */}
            {data.awayWins !== undefined && data.awayLosses !== undefined &&
             data.homeWins !== undefined && data.homeLosses !== undefined && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-center mb-6 text-gray-900">Team Comparison</h3>

                {(() => {
                  const awayStats = estimateTeamStats(data.awayWins, data.awayLosses)
                  const homeStats = estimateTeamStats(data.homeWins, data.homeLosses)

                  const StatRow = ({ label, awayStat, homeStat, unit = '', inverse = false }: {
                    label: string
                    awayStat: number
                    homeStat: number
                    unit?: string
                    inverse?: boolean
                  }) => {
                    const maxValue = Math.max(awayStat, homeStat)
                    const awayPct = (awayStat / maxValue) * 100
                    const homePct = (homeStat / maxValue) * 100
                    const awayBetter = inverse ? awayStat < homeStat : awayStat > homeStat
                    const homeBetter = inverse ? homeStat < awayStat : homeStat > awayStat

                    return (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-bold ${awayBetter ? 'text-blue-600' : 'text-gray-500'}`}>
                            {awayStat.toFixed(1)}{unit}
                          </span>
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
                          <span className={`text-sm font-bold ${homeBetter ? 'text-blue-600' : 'text-gray-500'}`}>
                            {homeStat.toFixed(1)}{unit}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${awayBetter ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'}`}
                              style={{ width: `${awayPct}%` }}
                            />
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${homeBetter ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gray-300'}`}
                              style={{ width: `${homePct}%`, marginLeft: 'auto' }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      <StatRow label="Points Per Game" awayStat={awayStats.ppg} homeStat={homeStats.ppg} />
                      <StatRow label="Points Allowed" awayStat={awayStats.papg} homeStat={homeStats.papg} inverse />
                      <StatRow label="Field Goal %" awayStat={awayStats.fgPct} homeStat={homeStats.fgPct} unit="%" />
                      <StatRow label="3-Point %" awayStat={awayStats.fg3Pct} homeStat={homeStats.fg3Pct} unit="%" />
                      <StatRow label="Free Throw %" awayStat={awayStats.ftPct} homeStat={homeStats.ftPct} unit="%" />
                      <StatRow label="Rebounds Per Game" awayStat={awayStats.rpg} homeStat={homeStats.rpg} />
                      <StatRow label="Assists Per Game" awayStat={awayStats.apg} homeStat={homeStats.apg} />
                      <StatRow label="Steals Per Game" awayStat={awayStats.spg} homeStat={homeStats.spg} />
                      <StatRow label="Blocks Per Game" awayStat={awayStats.bpg} homeStat={homeStats.bpg} />
                      <StatRow label="Turnovers Per Game" awayStat={awayStats.tpg} homeStat={homeStats.tpg} inverse />
                    </div>
                  )
                })()}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center italic">
                    * Stats are estimated based on team records. Live stats will be available when the game starts.
                  </p>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="text-center p-6 bg-white/60 rounded-2xl border border-blue-100">
              <p className="text-gray-600">
                Detailed stats and live scoring will be available when the game starts.
              </p>
            </div>
          </div>
        </div>

        <BusinessCard />
      </main>
    )
  }

  const isLive = data.status.toLowerCase().includes('live') || data.status.toLowerCase().includes('in progress')
  const awayPeriods = data.awayTeamDetails?.periods || []
  const homePeriods = data.homeTeamDetails?.periods || []
  const awayPlayers = data.awayTeamDetails?.players?.filter(p => p.played === '1') || []
  const homePlayers = data.homeTeamDetails?.players?.filter(p => p.played === '1') || []

  return (
    <main className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-brand-accent transition group">
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to All Games
      </Link>

      {/* Main Game Card */}
      <div className={`relative rounded-3xl p-8 md:p-12 overflow-hidden ${
        isLive
          ? 'bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-300 shadow-2xl'
          : 'bg-gradient-to-br from-white to-gray-50 border-2 border-black/10 shadow-xl'
      }`}>
        {isLive && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        )}

        <div className="relative space-y-8">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLive && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                  <span className="text-sm font-bold uppercase tracking-wide">Live</span>
                </div>
              )}
              {!isLive && (
                <div className="px-4 py-2 rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                  {data.status}
                </div>
              )}
              {data.period > 0 && (
                <div className="text-lg font-bold opacity-70">
                  Q{data.period}
                  {data.gameClock && (
                    <span className="ml-2 font-mono">{formatGameClock(data.gameClock)}</span>
                  )}
                </div>
              )}
            </div>
            {isLive && (
              <div className="flex items-center gap-2 text-xs opacity-60 bg-white/50 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                Live Updates
              </div>
            )}
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-8 py-8">
            {/* Away Team */}
            <div className="text-right space-y-3">
              <div className="text-xl md:text-2xl font-bold">{data.awayTeam}</div>
              <div className="text-6xl md:text-7xl font-black text-brand-accent tabular-nums">
                {data.awayScore}
              </div>
              <div className="text-sm opacity-50 font-medium">Away</div>
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl md:text-4xl font-bold opacity-20">VS</div>
              <div className="w-px h-12 bg-black/10"></div>
            </div>

            {/* Home Team */}
            <div className="text-left space-y-3">
              <div className="text-xl md:text-2xl font-bold">{data.homeTeam}</div>
              <div className="text-6xl md:text-7xl font-black text-brand-accent tabular-nums">
                {data.homeScore}
              </div>
              <div className="text-sm opacity-50 font-medium">Home</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quarter by Quarter Score */}
      {(awayPeriods.length > 0 || homePeriods.length > 0) && (
        <div className="bg-white rounded-2xl border-2 border-black/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-black/10">
                  <th className="text-left py-3 px-4 font-bold">Team</th>
                  {[1, 2, 3, 4].map(q => (
                    <th key={q} className="text-center py-3 px-4 font-bold min-w-[60px]">{q}</th>
                  ))}
                  {Math.max(awayPeriods.length, homePeriods.length) > 4 && (
                    [...Array(Math.max(awayPeriods.length, homePeriods.length) - 4)].map((_, i) => (
                      <th key={`ot${i}`} className="text-center py-3 px-4 font-bold min-w-[60px]">OT{i > 0 ? i + 1 : ''}</th>
                    ))
                  )}
                  <th className="text-center py-3 px-4 font-bold bg-brand-accent text-white min-w-[80px]">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">{data.awayTeam}</td>
                  {[1, 2, 3, 4].map(q => {
                    const period = awayPeriods.find(p => p.period === q)
                    return <td key={q} className="text-center py-3 px-4 tabular-nums">{period?.score || '-'}</td>
                  })}
                  {awayPeriods.length > 4 && awayPeriods.slice(4).map((p, i) => (
                    <td key={`ot${i}`} className="text-center py-3 px-4 tabular-nums">{p.score}</td>
                  ))}
                  <td className="text-center py-3 px-4 font-bold bg-brand-accent/10 tabular-nums">{data.awayScore}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">{data.homeTeam}</td>
                  {[1, 2, 3, 4].map(q => {
                    const period = homePeriods.find(p => p.period === q)
                    return <td key={q} className="text-center py-3 px-4 tabular-nums">{period?.score || '-'}</td>
                  })}
                  {homePeriods.length > 4 && homePeriods.slice(4).map((p, i) => (
                    <td key={`ot${i}`} className="text-center py-3 px-4 tabular-nums">{p.score}</td>
                  ))}
                  <td className="text-center py-3 px-4 font-bold bg-brand-accent/10 tabular-nums">{data.homeScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/10">
        <button
          onClick={() => setActiveTab('boxscore')}
          className={`px-6 py-3 font-bold transition ${
            activeTab === 'boxscore'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Player Stats
        </button>
        <button
          onClick={() => setActiveTab('teamstats')}
          className={`px-6 py-3 font-bold transition ${
            activeTab === 'teamstats'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Team Stats
        </button>
      </div>

      {/* Player Stats Tab */}
      {activeTab === 'boxscore' && (
        <div className="space-y-6">
          {/* Away Team Players */}
          <div className="bg-white rounded-2xl border-2 border-black/10 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-black/10">
              <h3 className="font-bold text-lg">{data.awayTeam}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-gray-600">
                    <th className="text-left py-2 px-4 font-bold sticky left-0 bg-white">Player</th>
                    <th className="text-center py-2 px-3 font-bold">Pos</th>
                    <th className="text-center py-2 px-3 font-bold">Min</th>
                    <th className="text-center py-2 px-3 font-bold">Reb</th>
                    <th className="text-center py-2 px-3 font-bold">Ast</th>
                    <th className="text-center py-2 px-3 font-bold">Pts</th>
                    <th className="text-center py-2 px-3 font-bold">FG</th>
                    <th className="text-center py-2 px-3 font-bold">3PT</th>
                    <th className="text-center py-2 px-3 font-bold">FT</th>
                    <th className="text-center py-2 px-3 font-bold">Stl</th>
                    <th className="text-center py-2 px-3 font-bold">Blk</th>
                    <th className="text-center py-2 px-3 font-bold">TO</th>
                    <th className="text-center py-2 px-3 font-bold">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {awayPlayers.map((player) => (
                    <tr key={player.personId} className="border-b border-black/5 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium sticky left-0 bg-white">{player.name}</td>
                      <td className="text-center py-3 px-3">{player.position}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{formatMinutes(player.statistics.minutes)}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.reboundsTotal}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.assists}</td>
                      <td className="text-center py-3 px-3 font-bold tabular-nums">{player.statistics.points}</td>
                      <td className="text-center py-3 px-3 tabular-nums text-xs">
                        {player.statistics.fieldGoalsMade}/{player.statistics.fieldGoalsAttempted}
                      </td>
                      <td className="text-center py-3 px-3 tabular-nums text-xs">
                        {player.statistics.threePointersMade}/{player.statistics.threePointersAttempted}
                      </td>
                      <td className="text-center py-3 px-3 tabular-nums text-xs">
                        {player.statistics.freeThrowsMade}/{player.statistics.freeThrowsAttempted}
                      </td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.steals}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.blocks}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.turnovers}</td>
                      <td className={`text-center py-3 px-3 tabular-nums font-medium ${
                        player.statistics.plusMinusPoints > 0 ? 'text-green-600' :
                        player.statistics.plusMinusPoints < 0 ? 'text-red-600' : ''
                      }`}>
                        {player.statistics.plusMinusPoints > 0 ? '+' : ''}{player.statistics.plusMinusPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Home Team Players */}
          <div className="bg-white rounded-2xl border-2 border-black/10 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-black/10">
              <h3 className="font-bold text-lg">{data.homeTeam}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-gray-600">
                    <th className="text-left py-2 px-4 font-bold sticky left-0 bg-white">Player</th>
                    <th className="text-center py-2 px-3 font-bold">Pos</th>
                    <th className="text-center py-2 px-3 font-bold">Min</th>
                    <th className="text-center py-2 px-3 font-bold">Reb</th>
                    <th className="text-center py-2 px-3 font-bold">Ast</th>
                    <th className="text-center py-2 px-3 font-bold">Pts</th>
                    <th className="text-center py-2 px-3 font-bold">FG</th>
                    <th className="text-center py-2 px-3 font-bold">3PT</th>
                    <th className="text-center py-2 px-3 font-bold">FT</th>
                    <th className="text-center py-2 px-3 font-bold">Stl</th>
                    <th className="text-center py-2 px-3 font-bold">Blk</th>
                    <th className="text-center py-2 px-3 font-bold">TO</th>
                    <th className="text-center py-2 px-3 font-bold">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {homePlayers.map((player) => (
                    <tr key={player.personId} className="border-b border-black/5 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium sticky left-0 bg-white">{player.name}</td>
                      <td className="text-center py-3 px-3">{player.position}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{formatMinutes(player.statistics.minutes)}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.reboundsTotal}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.assists}</td>
                      <td className="text-center py-3 px-3 font-bold tabular-nums">{player.statistics.points}</td>
                      <td className="text-center py-3 px-3 tabular-nums text-xs">
                        {player.statistics.fieldGoalsMade}/{player.statistics.fieldGoalsAttempted}
                      </td>
                      <td className="text-center py-3 px-3 tabular-nums text-xs">
                        {player.statistics.threePointersMade}/{player.statistics.threePointersAttempted}
                      </td>
                      <td className="text-center py-3 px-3 tabular-nums text-xs">
                        {player.statistics.freeThrowsMade}/{player.statistics.freeThrowsAttempted}
                      </td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.steals}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.blocks}</td>
                      <td className="text-center py-3 px-3 tabular-nums">{player.statistics.turnovers}</td>
                      <td className={`text-center py-3 px-3 tabular-nums font-medium ${
                        player.statistics.plusMinusPoints > 0 ? 'text-green-600' :
                        player.statistics.plusMinusPoints < 0 ? 'text-red-600' : ''
                      }`}>
                        {player.statistics.plusMinusPoints > 0 ? '+' : ''}{player.statistics.plusMinusPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Team Stats Tab */}
      {activeTab === 'teamstats' && data.awayTeamDetails?.statistics && data.homeTeamDetails?.statistics && (
        <div className="bg-white rounded-2xl border-2 border-black/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-black/10">
                  <th className="text-left py-3 px-4 font-bold">Stat</th>
                  <th className="text-center py-3 px-4 font-bold">{data.awayTeam}</th>
                  <th className="text-center py-3 px-4 font-bold">{data.homeTeam}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Field Goals</td>
                  <td className="text-center py-3 px-4 tabular-nums">
                    {data.awayTeamDetails.statistics.fieldGoalsMade}/{data.awayTeamDetails.statistics.fieldGoalsAttempted}
                  </td>
                  <td className="text-center py-3 px-4 tabular-nums">
                    {data.homeTeamDetails.statistics.fieldGoalsMade}/{data.homeTeamDetails.statistics.fieldGoalsAttempted}
                  </td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Field Goal %</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.fieldGoalsPercentage.toFixed(1)}%</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.fieldGoalsPercentage.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">3 Pointers</td>
                  <td className="text-center py-3 px-4 tabular-nums">
                    {data.awayTeamDetails.statistics.threePointersMade}/{data.awayTeamDetails.statistics.threePointersAttempted}
                  </td>
                  <td className="text-center py-3 px-4 tabular-nums">
                    {data.homeTeamDetails.statistics.threePointersMade}/{data.homeTeamDetails.statistics.threePointersAttempted}
                  </td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">3 Point %</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.threePointersPercentage.toFixed(1)}%</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.threePointersPercentage.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Free Throws</td>
                  <td className="text-center py-3 px-4 tabular-nums">
                    {data.awayTeamDetails.statistics.freeThrowsMade}/{data.awayTeamDetails.statistics.freeThrowsAttempted}
                  </td>
                  <td className="text-center py-3 px-4 tabular-nums">
                    {data.homeTeamDetails.statistics.freeThrowsMade}/{data.homeTeamDetails.statistics.freeThrowsAttempted}
                  </td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Free Throw %</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.freeThrowsPercentage.toFixed(1)}%</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.freeThrowsPercentage.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Total Rebounds</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.reboundsTotal}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.reboundsTotal}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Offensive Rebounds</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.reboundsOffensive}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.reboundsOffensive}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Defensive Rebounds</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.reboundsDefensive}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.reboundsDefensive}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Assists</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.assists}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.assists}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Blocks</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.blocks}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.blocks}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Steals</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.steals}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.steals}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Turnovers</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.turnovers}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.turnovers}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-3 px-4 font-medium">Points in the Paint</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.pointsInThePaint}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.pointsInThePaint}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Fouls (Personal)</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.awayTeamDetails.statistics.foulsPersonal}</td>
                  <td className="text-center py-3 px-4 tabular-nums">{data.homeTeamDetails.statistics.foulsPersonal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Business Card */}
      <div className="mt-8">
        <BusinessCard />
      </div>
    </main>
  )
}

