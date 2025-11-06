"use client"
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'

type UCLGame = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  matchday: number
  minute?: number
  homeTeamId?: number
  awayTeamId?: number
  homeCrest?: string
  awayCrest?: string
  topScorers?: { playerName: string; minute: number }[]
  venue?: string
  gameTimeUTC?: string
}

type LiveUCLGamesProps = {
  companyId?: string
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

function isLive(status: string) {
  const s = status.toLowerCase()
  return s.includes('live') || s.includes('in play') || s.includes('half time')
}

function formatMatchMinute(minute?: number): string {
  if (!minute && minute !== 0) return ''
  if (minute > 90) return `90+${minute - 90}'`
  return `${minute}'`
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
    sport: raw?.sport ?? 'ucl',
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

export default function LiveUCLGames({ companyId: initialCompanyId, isAdmin }: LiveUCLGamesProps = {}) {
  const [games, setGames] = useState<UCLGame[]>([])
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
      const res = await fetch(`/api/ucl/today?t=${ts}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setGames(data.games || [])
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load UCL matches')
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
      const res = await fetch(`/api/admin/notifications?company_id=${companyId}&sport=ucl`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('Failed to load notification settings')
      }
      const data = await res.json()
      setNotifSettings(normaliseSettings(data.settings))
    } catch (e: any) {
      console.error('Failed to load notification settings:', e)
      setNotifError(e.message || 'Failed to load notification settings')
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
      setNotifError('Select at least one chat channel in settings before following matches.')
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
          sport: 'ucl',
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
        throw new Error(errorData.error || 'Failed to update followed matches')
      }
      const updated = await res.json()
      setNotifSettings(normaliseSettings(updated.settings))
    } catch (e: any) {
      console.error('toggleTrackedGame error:', e)
      setNotifError(e.message || 'Failed to update followed matches')
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
          Select at least one chat channel in settings before following matches.
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
                  href={`/game/${g.id}?sport=ucl`}
                  className="group block rounded-2xl border-2 border-red-200 bg-gradient-to-br from-white to-red-50/60 p-6 transition-all hover:-translate-y-0.5 hover:border-red-400 hover:shadow-xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        Live
                      </span>
                      {g.minute !== undefined && g.minute !== null && (
                        <span className="text-xs font-semibold text-gray-600">
                          <span className="font-mono text-gray-500">
                            {formatMatchMinute(g.minute)}
                          </span>
                        </span>
                      )}
                    </div>
                    {followControls}
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr,auto,1fr] items-center gap-6">
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div className="flex items-center gap-3">
                        {g.awayCrest && (
                          <img
                            src={g.awayCrest}
                            alt={g.awayTeam}
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-lg font-bold">{g.awayTeam}</div>
                        </div>
                      </div>
                      <div className="text-4xl font-black text-brand-accent">
                        {hasAccess ? g.awayScore : '--'}
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-gray-300">VS</div>

                    <div className="flex flex-col items-start gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-lg font-bold">{g.homeTeam}</div>
                        </div>
                        {g.homeCrest && (
                          <img
                            src={g.homeCrest}
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
                    </div>
                  </div>

                  {g.topScorers && g.topScorers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-black/5">
                      <div className="text-xs font-semibold text-gray-500 mb-2">Scorers</div>
                      <div className="flex flex-wrap gap-2">
                        {g.topScorers.map((scorer, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded px-2 py-1">
                            <span className="font-medium">{scorer.playerName}</span>
                            <span className="text-gray-500">{scorer.minute}&apos;</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
                  href={`/game/${g.id}?sport=ucl`}
                  className="group block rounded-xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-accent/40 hover:shadow-lg"
                >
                  {followControls && (
                    <div className="mb-3 flex justify-end">{followControls}</div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {g.awayCrest && (
                          <img
                            src={g.awayCrest}
                            alt={g.awayTeam}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-bold">{g.awayTeam}</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold">
                        {hasAccess ? g.awayScore : '--'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {g.homeCrest && (
                          <img
                            src={g.homeCrest}
                            alt={g.homeTeam}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-bold text-brand-text">
                            {g.homeTeam}
                          </div>
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
          <h3 className="text-xl font-bold text-gray-900">No UCL matches today</h3>
          <p className="mt-2 text-sm text-gray-600">
            Fresh matchups will appear here as soon as the schedule resumes.
          </p>
        </div>
      )}
    </div>
  )
}
