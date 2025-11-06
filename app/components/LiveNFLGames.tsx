"use client"
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'

type NFLTeam = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  score: number
  wins: number
  losses: number
  ties: number
  timeouts: number
  possession: boolean
  logoUrl: string
}

type NFLGame = {
  gameId: string
  gameStatus: number
  gameStatusText: string
  period: number
  gameClock: string
  possessionText?: string
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  gameTimeUTC: string
  gameDate: string
}

type LiveNFLGamesProps = {
  companyId?: string
  experienceId?: string
  isAdmin?: boolean
}

type NotificationSettings = {
  id?: number
  companyId?: string
  sport?: string
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

function isLive(status: number) {
  return status === 2 // 2 = in-progress
}

function formatRecord(wins: number, losses: number, ties: number): string {
  if (ties > 0) {
    return `${wins}-${losses}-${ties}`
  }
  return `${wins}-${losses}`
}

function getPeriodLabel(period: number): string {
  if (period === 0) return 'Pregame'
  if (period <= 4) return `Q${period}`
  return `OT${period - 4}`
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
    sport: raw?.sport ?? 'nfl',
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

export default function LiveNFLGames({ companyId: initialCompanyId, isAdmin }: LiveNFLGamesProps = {}) {
  const [games, setGames] = useState<NFLGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(`/api/nfl/today?t=${ts}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = (await res.json()) as NFLGame[]
      setGames(data || [])
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load NFL games')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGames()
    const id = setInterval(loadGames, 10_000) // Refresh every 10 seconds
    return () => clearInterval(id)
  }, [loadGames])

  const loadNotifications = useCallback(async () => {
    if (!companyId) return
    setNotifLoading(true)
    setNotifError(null)
    try {
      // Load NBA settings for channel configuration
      const nbaRes = await fetch(`/api/admin/notifications?company_id=${companyId}&sport=nba`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!nbaRes.ok) {
        if (nbaRes.status === 403) {
          setNotifSettings(null)
          return
        }
        throw new Error(`Failed (${nbaRes.status})`)
      }
      const nbaData = await nbaRes.json()
      const nbaSettings = normaliseSettings(nbaData.settings)

      // Load NFL tracked games
      const nflRes = await fetch(`/api/admin/notifications?company_id=${companyId}&sport=nfl`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      const nflData = nflRes.ok ? await nflRes.json() : null
      const nflTrackedGames = nflData?.settings?.trackedGames || []

      // Combine: use NBA settings but with NFL tracked games
      setNotifSettings({
        ...nbaSettings,
        sport: 'nfl',
        trackedGames: Array.isArray(nflTrackedGames)
          ? nflTrackedGames
          : typeof nflTrackedGames === 'string'
            ? nflTrackedGames.split(',').filter(Boolean)
            : []
      })
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
    console.log('toggleTrackedGame called:', { companyId, hasNotifSettings: !!notifSettings, channelIds: notifSettings?.channelIds })

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
          sport: 'nfl',
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

  const liveGames = useMemo(() => games.filter((g) => isLive(g.gameStatus)), [games])
  const otherGames = useMemo(() => games.filter((g) => !isLive(g.gameStatus)), [games])

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
              const followControls = renderFollowControls(g.gameId)
              return (
                <Link
                  key={g.gameId}
                  href={`/game/${g.gameId}?sport=nfl`}
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
                          {getPeriodLabel(g.period)}
                          {g.gameClock && (
                            <span className="ml-1 font-mono text-gray-500">
                              {g.gameClock}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {followControls}
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr,auto,1fr] items-center gap-6">
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div className="flex items-center gap-3">
                        {g.awayTeam.logoUrl && (
                          <img
                            src={g.awayTeam.logoUrl}
                            alt={g.awayTeam.teamName}
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-lg font-bold flex items-center gap-1.5">
                            {g.awayTeam.teamCity} {g.awayTeam.teamName}
                            {g.awayTeam.possession && (
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Possession" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatRecord(g.awayTeam.wins, g.awayTeam.losses, g.awayTeam.ties)}
                          </div>
                        </div>
                      </div>
                      <div className="text-4xl font-black text-brand-accent">
                        {hasAccess ? g.awayTeam.score : '--'}
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-gray-300">VS</div>

                    <div className="flex flex-col items-start gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-lg font-bold flex items-center gap-1.5">
                            {g.homeTeam.teamCity} {g.homeTeam.teamName}
                            {g.homeTeam.possession && (
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Possession" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatRecord(g.homeTeam.wins, g.homeTeam.losses, g.homeTeam.ties)}
                          </div>
                        </div>
                        {g.homeTeam.logoUrl && (
                          <img
                            src={g.homeTeam.logoUrl}
                            alt={g.homeTeam.teamName}
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                      </div>
                      <div className="text-4xl font-black text-brand-accent">
                        {hasAccess ? g.homeTeam.score : '--'}
                      </div>
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
              const isFinal = g.gameStatus === 3
              const followControls = renderFollowControls(g.gameId)
              return (
                <Link
                  key={g.gameId}
                  href={`/game/${g.gameId}?sport=nfl`}
                  className="group block rounded-xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-accent/40 hover:shadow-lg"
                >
                  {followControls && (
                    <div className="mb-3 flex justify-end">{followControls}</div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {g.awayTeam.logoUrl && (
                          <img
                            src={g.awayTeam.logoUrl}
                            alt={g.awayTeam.teamName}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-bold">
                            {g.awayTeam.teamCity} {g.awayTeam.teamName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatRecord(g.awayTeam.wins, g.awayTeam.losses, g.awayTeam.ties)}
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold">
                        {hasAccess ? g.awayTeam.score : '--'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {g.homeTeam.logoUrl && (
                          <img
                            src={g.homeTeam.logoUrl}
                            alt={g.homeTeam.teamName}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-bold text-brand-text">
                            {g.homeTeam.teamCity} {g.homeTeam.teamName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatRecord(g.homeTeam.wins, g.homeTeam.losses, g.homeTeam.ties)}
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-brand-text">
                        {hasAccess ? g.homeTeam.score : '--'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                    <span
                      className={`inline-flex items-center rounded px-2 py-1 font-semibold ${
                        isFinal ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {g.gameStatusText}
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
          <h3 className="text-xl font-bold text-gray-900">No NFL games today</h3>
          <p className="mt-2 text-sm text-gray-600">
            Fresh matchups will appear here as soon as the schedule resumes.
          </p>
        </div>
      )}
    </div>
  )
}
