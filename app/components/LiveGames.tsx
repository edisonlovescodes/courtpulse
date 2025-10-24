"use client"
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import BusinessCard from './BusinessCard'

type Game = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  period: number
}

function isLive(status: string) {
  const s = status.toLowerCase()
  return s.includes('live') || s.includes('in progress')
}

export default function LiveGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
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
    load()
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [load])

  const liveGames = useMemo(() => games.filter((g) => isLive(g.status)), [games])
  const otherGames = useMemo(() => games.filter((g) => !isLive(g.status)), [games])

  const hasAccess = true

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl bg-white/70 border border-black/10 p-8 animate-pulse h-48" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/70 border border-black/10 p-6 h-36 animate-pulse" />
          <div className="rounded-xl bg-white/70 border border-black/10 p-6 h-36 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative rounded-2xl bg-gradient-to-br from-brand-accent/10 via-orange-50 to-red-50 p-8 md:p-12 overflow-hidden border border-brand-accent/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-xs font-semibold text-brand-accent mb-4 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
            Live Updates
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Today&apos;s NBA Games</h2>
          <p className="text-lg opacity-70 max-w-2xl">Real-time scores with automatic refresh</p>
          <div className="flex items-center gap-4 mt-6">
            <div className="text-xs px-4 py-2 rounded-full bg-white shadow-sm border border-black/5 font-medium">
              {games.length} {games.length === 1 ? 'Game' : 'Games'} Today
            </div>
            {liveGames.length > 0 && (
              <div className="text-xs px-4 py-2 rounded-full bg-red-500 text-white font-medium flex items-center gap-1.5 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                {liveGames.length} Live Now
              </div>
            )}
          </div>
        </div>
      </div>

      {liveGames.length > 0 && (
        <section className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <h3 className="text-lg font-bold">Live Now</h3>
            </div>
            <div className="text-xs opacity-50">Auto-updating</div>
          </div>
          <div className="grid gap-4">
            {liveGames.map((g) => (
              <div key={g.id} className="group relative rounded-2xl p-6 bg-gradient-to-br from-white to-red-50/50 border-2 border-red-200 hover:border-red-400 transition-all hover:shadow-xl">
                <div className="absolute top-3 right-3">
                  <div className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    LIVE
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-sm opacity-60 font-medium">{g.period > 0 && `Quarter ${g.period}`}</div>
                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold mb-1">{g.awayTeam}</div>
                      {hasAccess ? (
                        <div className="text-4xl font-black text-brand-accent">{g.awayScore}</div>
                      ) : (
                        <div className="text-4xl font-black text-gray-300">--</div>
                      )}
                    </div>
                    <div className="text-2xl opacity-20 font-bold">VS</div>
                    <div className="text-left">
                      <div className="text-lg font-bold mb-1">{g.homeTeam}</div>
                      {hasAccess ? (
                        <div className="text-4xl font-black text-brand-accent">{g.homeScore}</div>
                      ) : (
                        <div className="text-4xl font-black text-gray-300">--</div>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/game/${g.id}`} className="absolute bottom-3 left-6 right-6 flex justify-end">
                  <div className="text-xs font-medium text-brand-accent group-hover:underline">View Details →</div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {otherGames.length > 0 && (
        <section className="space-y-4 mt-8">
          {liveGames.length > 0 && <h3 className="text-lg font-bold opacity-60">Upcoming & Completed</h3>}
          <div className="grid md:grid-cols-2 gap-4">
            {otherGames.map((g) => {
              const isFinal = g.status.toLowerCase().includes('final')
              return (
                <div key={g.id} className="group rounded-xl p-5 bg-white border border-black/10 hover:border-brand-accent/30 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="text-sm font-bold mb-1">{g.awayTeam}</div>
                      <div className="text-sm font-bold text-brand-text/80">{g.homeTeam}</div>
                    </div>
                    <div className="text-right">
                      {hasAccess ? (
                        <>
                          <div className="text-2xl font-bold">{g.awayScore}</div>
                          <div className="text-2xl font-bold text-brand-text/80">{g.homeScore}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-gray-300">--</div>
                          <div className="text-2xl font-bold text-gray-300">--</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <div className={`text-xs font-semibold px-2 py-1 rounded ${isFinal ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>{g.status}</div>
                    <Link href={`/game/${g.id}`} className="text-xs text-brand-accent group-hover:underline font-medium">
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {games.length === 0 && (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-brand-accent/20 to-orange-100 mb-6">
            <div className="text-5xl">🏀</div>
          </div>
          <h3 className="text-2xl font-bold mb-2">No Games Today</h3>
          <p className="text-lg opacity-70">Check back during the NBA season for live scores!</p>
        </div>
      )}

      {games.length > 0 && (
        <div className="mt-12">
          <BusinessCard />
        </div>
      )}
    </>
  )
}

