"use client"
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'

type TopPlayer = {
  personId: number
  name: string
  points: number
  jerseyNum: string
}

type Game = {
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

type LiveGamesProps = {
  companyId?: string
  isAdmin?: boolean
}

type NotificationSettings = {
  id?: number
  companyId?: string
  enabled: boolean
  channelId: string | null
  channelIds: string[]
  channelName: string | null
  updateFrequency: string
  notifyGameStart: boolean
  notifyGameEnd: boolean
  notifyQuarterEnd: boolean
  trackedGames: string[]
}

function isLive(status: string) {
  const s = status.toLowerCase()
  return s.includes('live') || s.includes('in progress')
}

function getTeamLogoUrl(teamId?: number): string {
  if (!teamId) return ''
  return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`
}

function getPlayerHeadshotUrl(personId: number): string {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${personId}.png`
}

function formatRecord(wins?: number, losses?: number): string {
  if (wins === undefined || losses === undefined) return ''
  return `${wins}-${losses}`
}

function formatGameClock(clock?: string): string {
  if (!clock) return ''
  const match = clock.match(/PT(\d+)M([\d.]+)S/i)
  if (!match) return clock
  const mins = match[1]
  const secs = Math.floor(parseFloat(match[2]))
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const normaliseSettings = (raw: any): NotificationSettings => {
  const tracked = raw?.trackedGames
  const trackedGames = Array.isArray(tracked)
    ? tracked.map((id: any) => String(id))
    : typeof tracked === 'string'
      ? tracked
          .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean)
      : []

  const rawChannelIds = Array.isArray(raw?.channelIds)
    ? raw.channelIds
    : typeof raw?.channelId === 'string'
      ? raw.channelId.split(',')
      : raw?.channelId
        ? [raw.channelId]
        : []
  const channelIds = rawChannelIds
    .map((id: any) => String(id).trim())
    .filter(Boolean)

  return {
    id: raw?.id,
    companyId: raw?.companyId ?? undefined,
    enabled: Boolean(raw?.enabled),
    channelId: channelIds[0] ?? null,
    channelIds,
    channelName: raw?.channelName ?? null,
    updateFrequency: raw?.updateFrequency ?? 'every_point',
    notifyGameStart: raw?.notifyGameStart ?? true,
    notifyGameEnd: raw?.notifyGameEnd ?? true,
    notifyQuarterEnd: raw?.notifyQuarterEnd ?? true,
    trackedGames,
  }
}

export default function LiveGames({ companyId: initialCompanyId, isAdmin }: LiveGamesProps = {}) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simple: server tells us if user is admin via initialCompanyId
  const fallbackCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null
  const companyId = initialCompanyId ?? fallbackCompanyId ?? undefined
  const hasAdminAccess = Boolean(companyId)

  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [trackingBusy, setTrackingBusy] = useState<Record<string, boolean>>({})

  const loadGames = useCallback(async () => {
    try {
      const ts = Date.now()
      const res = await fetch(`/api/games/today?t=${ts}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const j = (await res.json()) as { games: Game[] }
      setGames(j.games || [])
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load games')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGames()
    const id = setInterval(loadGames, 10_000)
    return () => clearInterval(id)
  }, [loadGames])

  const loadNotifications = useCallback(async () => {
    if (!companyId) return
    setNotifLoading(true)
    setNotifError(null)
    try {
      const res = await fetch(`/api/admin/notifications?company_id=${companyId}&sport=nba`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) {
        if (res.status === 403) {
          setNotifSettings(null)
          return
        }
        throw new Error(`Failed (${res.status})`)
      }
      const data = await res.json()
      setNotifSettings(normaliseSettings(data.settings))
    } catch (e: any) {
      setNotifError(e.message || 'Failed to load notifications')
      setNotifSettings(null)
    } finally {
      setNotifLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId) {
      setNotifSettings(null)
      setNotifError(null)
      return
    }
    loadNotifications()
  }, [companyId, loadNotifications])


  const toggleTrackedGame = useCallback(async (gameId: string, nextChecked: boolean) => {
    if (!companyId) {
      setNotifError('Company context missing. Please refresh the page.')
      return
    }
    
    if (!notifSettings) {
      setNotifError('Notification settings not loaded. Please try again.')
      return
    }
    
    if (!notifSettings.channelIds.length) {
      setNotifError('Select at least one chat channel in settings before following games.')
      return
    }

    const previousTracked = [...notifSettings.trackedGames]
    const nextTracked = nextChecked
      ? Array.from(new Set([...previousTracked, gameId]))
      : previousTracked.filter((id) => id !== gameId)

    setTrackingBusy((prev) => ({ ...prev, [gameId]: true }))
    setNotifSettings((prev) => (prev ? { ...prev, trackedGames: nextTracked } : prev))
    setNotifError(null)

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sport: 'nba',
          enabled: notifSettings.enabled,
          channelIds: notifSettings.channelIds,
          channelId: notifSettings.channelIds[0] ?? null,
          channelName: notifSettings.channelName,
          updateFrequency: notifSettings.updateFrequency,
          notifyGameStart: notifSettings.notifyGameStart,
          notifyGameEnd: notifSettings.notifyGameEnd,
          notifyQuarterEnd: notifSettings.notifyQuarterEnd,
          trackedGames: nextTracked,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to update followed games:', errorData)
        throw new Error(errorData.error || 'Failed to update followed games')
      }
      const updated = await res.json()
      setNotifSettings(normaliseSettings(updated.settings))
    } catch (e: any) {
      console.error('toggleTrackedGame error:', e)
      setNotifError(e.message || 'Failed to update followed games')
      setNotifSettings((prev) => (prev ? { ...prev, trackedGames: previousTracked } : prev))
    } finally {
      setTrackingBusy((prev) => {
        const next = { ...prev }
        delete next[gameId]
        return next
      })
    }
  }, [companyId, notifSettings])

  const liveGames = useMemo(() => games.filter((g) => isLive(g.status)), [games])
  const otherGames = useMemo(() => games.filter((g) => !isLive(g.status)), [games])

  const hasAccess = true
  const followConfigMissing = Boolean(hasAdminAccess && notifSettings && !notifSettings.channelIds.length)

  const renderFollowControls = (gameId: string) => {
    if (!hasAdminAccess) return null
    const isTracked = Boolean(notifSettings?.trackedGames.includes(gameId))
    const followDisabled =
      !notifSettings ||
      !notifSettings.channelIds.length ||
      Boolean(trackingBusy[gameId]) ||
      notifLoading

    return (
      <label
        className={`inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm ${followDisabled ? 'opacity-60' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
          checked={isTracked}
          disabled={followDisabled}
          onChange={(e) => toggleTrackedGame(gameId, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        Follow
      </label>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl border border-black/10 bg-white/70 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-28 rounded-xl border border-black/10 bg-white/70 animate-pulse" />
          <div className="h-28 rounded-xl border border-black/10 bg-white/70 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasAdminAccess && notifError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {notifError}
        </div>
      )}
      {followConfigMissing && !notifError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Select at least one chat channel in settings before following games.
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {liveGames.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
              <h3 className="text-lg font-bold text-gray-900">Live Now</h3>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Auto-updating
            </span>
          </div>

          <div className="grid gap-4">
            {liveGames.map((g) => {
              const followControls = renderFollowControls(g.id)
              return (
                <Link
                  key={g.id}
                  href={`/game/${g.id}`}
                  className="group block rounded-2xl border-2 border-red-200 bg-gradient-to-br from-white to-red-50/60 p-6 transition-all hover:-translate-y-0.5 hover:border-red-400 hover:shadow-xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        Live
                      </span>
                      {g.period > 0 && (
                        <span className="text-xs font-semibold text-gray-600">
                          Q{g.period}
                          {g.gameClock && (
                            <span className="ml-1 font-mono text-gray-500">
                              {formatGameClock(g.gameClock)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {followControls}
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr,auto,1fr] items-start gap-6">
                    {/* Away Team */}
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div className="flex items-center gap-3">
                        {g.awayTeamId && (
                          <img
                            src={getTeamLogoUrl(g.awayTeamId)}
                            alt={g.awayTeam}
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-lg font-bold">{g.awayTeam}</div>
                          {formatRecord(g.awayWins, g.awayLosses) && (
                            <div className="text-sm text-gray-600">
                              {formatRecord(g.awayWins, g.awayLosses)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-4xl font-black text-brand-accent">
                        {hasAccess ? g.awayScore : '--'}
                      </div>
                      {/* Away Top Players */}
                      {hasAccess && g.awayTopPlayers && g.awayTopPlayers.length > 0 && (
                        <div className="mt-2 flex justify-end gap-1">
                          {g.awayTopPlayers.map((player) => (
                            <div key={player.personId} className="flex flex-col items-center">
                              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
                                <img
                                  src={getPlayerHeadshotUrl(player.personId)}
                                  alt={player.name}
                                  className="h-full w-full object-cover object-top"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-gray-700">
                                {player.points} PTS
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* VS Divider */}
                    <div className="flex items-center justify-center pt-8">
                      <div className="text-2xl font-bold text-gray-300">VS</div>
                    </div>

                    {/* Home Team */}
                    <div className="flex flex-col items-start gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-lg font-bold">{g.homeTeam}</div>
                          {formatRecord(g.homeWins, g.homeLosses) && (
                            <div className="text-sm text-gray-600">
                              {formatRecord(g.homeWins, g.homeLosses)}
                            </div>
                          )}
                        </div>
                        {g.homeTeamId && (
                          <img
                            src={getTeamLogoUrl(g.homeTeamId)}
                            alt={g.homeTeam}
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                      </div>
                      <div className="text-4xl font-black text-brand-accent">
                        {hasAccess ? g.homeScore : '--'}
                      </div>
                      {/* Home Top Players */}
                      {hasAccess && g.homeTopPlayers && g.homeTopPlayers.length > 0 && (
                        <div className="mt-2 flex justify-start gap-1">
                          {g.homeTopPlayers.map((player) => (
                            <div key={player.personId} className="flex flex-col items-center">
                              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
                                <img
                                  src={getPlayerHeadshotUrl(player.personId)}
                                  alt={player.name}
                                  className="h-full w-full object-cover object-top"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-gray-700">
                                {player.points} PTS
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end text-xs font-semibold text-brand-accent opacity-0 transition group-hover:opacity-100">
                    View details →
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {otherGames.length > 0 && (
        <section className="space-y-4">
          {liveGames.length > 0 && (
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Upcoming &amp; Completed
            </h3>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {otherGames.map((g) => {
              const isFinal = g.status.toLowerCase().includes('final')
              const followControls = renderFollowControls(g.id)
              return (
                <Link
                  key={g.id}
                  href={`/game/${g.id}`}
                  className="group block rounded-xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-accent/40 hover:shadow-lg"
                >
                  {followControls && (
                    <div className="mb-3 flex justify-end">{followControls}</div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {g.awayTeamId && (
                          <img
                            src={getTeamLogoUrl(g.awayTeamId)}
                            alt={g.awayTeam}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-bold">{g.awayTeam}</div>
                          {formatRecord(g.awayWins, g.awayLosses) && (
                            <div className="text-xs text-gray-500">
                              {formatRecord(g.awayWins, g.awayLosses)}
                            </div>
                          )}
                          {/* Away Top Players (inline) */}
                          {isFinal && hasAccess && g.awayTopPlayers && g.awayTopPlayers.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {g.awayTopPlayers.slice(0, 3).map((player) => (
                                <div key={player.personId} className="relative h-6 w-6 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                                  <img
                                    src={getPlayerHeadshotUrl(player.personId)}
                                    alt={player.name}
                                    className="h-full w-full object-cover object-top"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl font-bold">
                        {hasAccess ? g.awayScore : '--'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {g.homeTeamId && (
                          <img
                            src={getTeamLogoUrl(g.homeTeamId)}
                            alt={g.homeTeam}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-bold text-brand-text">
                            {g.homeTeam}
                          </div>
                          {formatRecord(g.homeWins, g.homeLosses) && (
                            <div className="text-xs text-gray-500">
                              {formatRecord(g.homeWins, g.homeLosses)}
                            </div>
                          )}
                          {/* Home Top Players (inline) */}
                          {isFinal && hasAccess && g.homeTopPlayers && g.homeTopPlayers.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {g.homeTopPlayers.slice(0, 3).map((player) => (
                                <div key={player.personId} className="relative h-6 w-6 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                                  <img
                                    src={getPlayerHeadshotUrl(player.personId)}
                                    alt={player.name}
                                    className="h-full w-full object-cover object-top"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-brand-text">
                        {hasAccess ? g.homeScore : '--'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                    <span
                      className={`inline-flex items-center rounded px-2 py-1 font-semibold ${
                        isFinal ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {g.status}
                    </span>
                    <span className="font-medium text-brand-accent transition group-hover:underline">
                      View details →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {games.length === 0 && (
        <div className="rounded-2xl border border-black/10 bg-white/80 p-12 text-center">
          <h3 className="text-xl font-bold text-gray-900">No NBA games today</h3>
          <p className="mt-2 text-sm text-gray-600">
            Fresh matchups will appear here as soon as the schedule resumes.
          </p>
        </div>
      )}
    </div>
  )
}
