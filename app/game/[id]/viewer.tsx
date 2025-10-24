"use client"
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import BusinessCard from '../../components/BusinessCard'

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

export default function Client({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const isLive = data.status.toLowerCase().includes('live') || data.status.toLowerCase().includes('in progress')

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

      {/* Limit warnings hidden - app is free for everyone */}

      {/* Business Card */}
      <div className="mt-8">
        <BusinessCard />
      </div>
    </main>
  )
}

