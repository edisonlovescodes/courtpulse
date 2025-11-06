"use client"
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { TodayGame } from '@/lib/ball'

type Channel = {
  id: string
  experience: {
    id: string
    name: string
  }
}

type Settings = {
  id: number
  companyId: string
  sport?: string
  enabled: boolean
  channelId: string | null
  channelIds?: string[]
  channelName: string | null
  updateFrequency: string
  notifyGameStart: boolean
  notifyGameEnd: boolean
  notifyQuarterEnd: boolean
  trackedGames: string[]
}

type NFLGame = {
  gameId: string
  gameStatus: number
  gameStatusText: string
  homeTeam: {
    teamCity: string
    teamName: string
    score: number
  }
  awayTeam: {
    teamCity: string
    teamName: string
    score: number
  }
}

type UCLGame = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
}

type DashboardSettingsProps = {
  companyId: string
  experienceId?: string
  authHeaders?: Record<string, string>
  adminToken?: string
  backHref?: string
  debugContext?: {
    extractedCompanyId: string | null
    usedFallback: boolean
    fallbackValue: string | undefined
    finalCompanyId: string
    accessLevel?: string
    isAdmin?: boolean
  }
}

export default function DashboardSettings({ companyId, experienceId: serverExperienceId, authHeaders, adminToken, backHref, debugContext }: DashboardSettingsProps) {
  // ALWAYS log to verify prop is being passed
  console.log('[Settings Debug] === PROPS RECEIVED ===')
  console.log('[Settings Debug] companyId prop:', companyId)
  console.log('[Settings Debug] serverExperienceId prop:', serverExperienceId)
  console.log('[Settings Debug] debugContext prop:', debugContext)
  console.log('[Settings Debug] debugContext is null/undefined?', debugContext === null || debugContext === undefined)

  // Log debug context from server component to diagnose company ID extraction
  if (debugContext) {
    console.log('[Settings Debug] === SERVER CONTEXT DEBUG ===')
    console.log('[Settings Debug] Company ID extracted from Whop headers:', debugContext.extractedCompanyId)
    console.log('[Settings Debug] Used env fallback?', debugContext.usedFallback)
    console.log('[Settings Debug] Fallback env value:', debugContext.fallbackValue)
    console.log('[Settings Debug] Final company ID:', debugContext.finalCompanyId)
    console.log('[Settings Debug] Access level:', debugContext.accessLevel)
    console.log('[Settings Debug] Is admin:', debugContext.isAdmin)
    console.log('[Settings Debug] === END SERVER CONTEXT ===')
  } else {
    console.log('[Settings Debug] ⚠️ debugContext was NOT passed from server component!')
  }

  const [channels, setChannels] = useState<Channel[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [games, setGames] = useState<TodayGame[]>([])
  const [nflGames, setNflGames] = useState<NFLGame[]>([])
  const [uclGames, setUclGames] = useState<UCLGame[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Form state
  const [enabled, setEnabled] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [updateFrequency, setUpdateFrequency] = useState('every_point')
  const [notifyGameStart, setNotifyGameStart] = useState(true)
  const [notifyGameEnd, setNotifyGameEnd] = useState(true)
  const [notifyQuarterEnd, setNotifyQuarterEnd] = useState(true)
  const [trackedGames, setTrackedGames] = useState<string[]>([])
  const [nflTrackedGames, setNflTrackedGames] = useState<string[]>([])
  const [uclTrackedGames, setUclTrackedGames] = useState<string[]>([])

  // Extract experienceId from URL if not provided by server
  const experienceId = serverExperienceId || (() => {
    if (typeof window === 'undefined') return undefined
    // Try to extract from parent URL (when in iframe)
    try {
      const parentUrl = window.parent.location.href
      const match = parentUrl.match(/\/((?:exp|xp)_[A-Za-z0-9]+)/)
      if (match) {
        console.log('[Settings Debug] Extracted experienceId from parent URL:', match[1])
        return match[1]
      }
    } catch (e) {
      // Cross-origin iframe, can't access parent
    }
    // Try to extract from current URL
    const match = window.location.href.match(/\/((?:exp|xp)_[A-Za-z0-9]+)/)
    if (match) {
      console.log('[Settings Debug] Extracted experienceId from current URL:', match[1])
      return match[1]
    }
    return undefined
  })()

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      // Load channels
      console.log('[Settings Debug] === CHANNEL LOADING ===')
      console.log('[Settings Debug] Company ID:', companyId)
      console.log('[Settings Debug] Current experienceId:', experienceId)

      const channelsRes = await fetch(`/api/admin/channels?company_id=${companyId}` , {
        headers: { ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
      })
      if (!channelsRes.ok) throw new Error('Failed to load channels')
      const channelsData = await channelsRes.json()
      const allChannels = channelsData.channels || []

      // Filter to show ONLY channels that belong to this experience
      console.log('[Settings Debug] All channels for company:', allChannels.length)
      console.log('[Settings Debug] ALL CHANNELS RAW:', JSON.stringify(allChannels.map((ch: any) => ({
        id: ch.id,
        experienceId: ch.experience?.id,
        experienceName: ch.experience?.name
      })), null, 2))

      // CHANGED: Show ALL channels from this company, not just current experience
      // This allows admins to configure notifications for any channel they own
      const filteredChannels = allChannels

      console.log('[Settings Debug] Showing all company channels:', filteredChannels.length)
      console.log('[Settings Debug] Channel details:')
      filteredChannels.forEach((ch: Channel, idx: number) => {
        console.log(`  Channel ${idx + 1}:`, {
          id: ch.id,
          experienceId: ch.experience?.id,
          experienceName: ch.experience?.name
        })
      })

      setChannels(filteredChannels)

      // Load NBA settings (scoped to this experience)
      if (!experienceId) {
        throw new Error('experienceId is required for loading settings')
      }
      const settingsRes = await fetch(`/api/admin/notifications?company_id=${companyId}&experience_id=${experienceId}&sport=nba`, {
        headers: { ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
      })
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settingsData = await settingsRes.json()
      const s = settingsData.settings

      setSettings(s)
      setEnabled(s.enabled)
      const initialChannelIds = Array.isArray(s.channelIds)
        ? s.channelIds
        : s.channelId
          ? [s.channelId]
          : []
      setSelectedChannels(initialChannelIds)
      setUpdateFrequency(s.updateFrequency)
      setNotifyGameStart(s.notifyGameStart)
      setNotifyGameEnd(s.notifyGameEnd)
      setNotifyQuarterEnd(s.notifyQuarterEnd)
      setTrackedGames(s.trackedGames || [])

      // Load NFL tracked games (scoped to this experience)
      const nflSettingsRes = await fetch(`/api/admin/notifications?company_id=${companyId}&experience_id=${experienceId}&sport=nfl`, {
        headers: { ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
      })
      if (nflSettingsRes.ok) {
        const nflData = await nflSettingsRes.json()
        setNflTrackedGames(nflData.settings?.trackedGames || [])
      }

      // Load UCL tracked games (scoped to this experience)
      const uclSettingsRes = await fetch(`/api/admin/notifications?company_id=${companyId}&experience_id=${experienceId}&sport=ucl`, {
        headers: { ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
      })
      if (uclSettingsRes.ok) {
        const uclData = await uclSettingsRes.json()
        setUclTrackedGames(uclData.settings?.trackedGames || [])
      }

      setMessage('')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [adminToken, authHeaders, companyId, experienceId])

  // Auto-load settings on mount
  useEffect(() => {
    // Load today's NBA games
    fetch('/api/games/today', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Failed (${r.status})`))))
      .then((data: { games: TodayGame[] }) => setGames(data.games || []))
      .catch(() => setGames([]))

    // Load today's NFL games
    fetch('/api/nfl/today', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Failed (${r.status})`))))
      .then((data: NFLGame[]) => setNflGames(data || []))
      .catch(() => setNflGames([]))

    // Load today's UCL matches
    fetch('/api/ucl/today', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Failed (${r.status})`))))
      .then((data: { games: UCLGame[] }) => setUclGames(data.games || []))
      .catch(() => setUclGames([]))

    loadSettings()
  }, [loadSettings])

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      if (!experienceId) {
        throw new Error('experienceId is required for saving settings')
      }

      const channelName = selectedChannels.length
        ? channels.find(c => c.id === selectedChannels[0])?.experience.name || null
        : null

      // Save NBA settings (scoped to this experience)
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
        body: JSON.stringify({
          companyId,
          experienceId,
          sport: 'nba',
          enabled,
          channelId: selectedChannels[0] || null,
          channelIds: selectedChannels,
          channelName,
          updateFrequency,
          notifyGameStart,
          notifyGameEnd,
          notifyQuarterEnd,
          trackedGames,
        }),
      })

      if (!res.ok) throw new Error('Failed to save NBA settings')

      // Save NFL settings (tracked games only, scoped to this experience)
      const nflRes = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
        body: JSON.stringify({
          companyId,
          experienceId,
          sport: 'nfl',
          enabled,
          channelId: selectedChannels[0] || null,
          channelIds: selectedChannels,
          channelName,
          updateFrequency,
          notifyGameStart,
          notifyGameEnd,
          notifyQuarterEnd,
          trackedGames: nflTrackedGames,
        }),
      })

      if (!nflRes.ok) throw new Error('Failed to save NFL settings')

      // Save UCL settings (tracked games only, scoped to this experience)
      const uclRes = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
        body: JSON.stringify({
          companyId,
          experienceId,
          sport: 'ucl',
          enabled,
          channelId: selectedChannels[0] || null,
          channelIds: selectedChannels,
          channelName,
          updateFrequency,
          notifyGameStart,
          notifyGameEnd,
          notifyQuarterEnd,
          trackedGames: uclTrackedGames,
        }),
      })

      if (!uclRes.ok) throw new Error('Failed to save UCL settings')

      const data = await res.json()
      setSettings(data.settings)
      setMessage('Settings saved successfully!')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleGame = (gameId: string) => {
    setTrackedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  const toggleNflGame = (gameId: string) => {
    setNflTrackedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  const toggleUclGame = (gameId: string) => {
    setUclTrackedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-black/10 p-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Game Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">Configure live NBA score updates for your community</p>
        </div>
        <Link href={backHref || '/'} className="text-sm font-medium hover:text-brand-accent">
          ← View Games
        </Link>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${
          message.startsWith('Error')
            ? 'bg-red-100 text-red-700 border-2 border-red-300'
            : 'bg-green-100 text-green-700 border-2 border-green-300'
        }`}>
          {message}
        </div>
      )}

      {/* Enable/Disable */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 text-brand-accent rounded border-gray-300 focus:ring-brand-accent"
          />
          <div>
            <div className="font-bold">Enable Game Notifications</div>
            <div className="text-sm text-gray-600">
              Send live game updates to your selected chat channels
            </div>
          </div>
        </label>
      </div>

      {/* Channel Selection */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Chat Channels</label>
          {channels.length === 0 ? (
            <p className="text-xs text-orange-600">
              No chat channels found. Create an Experience with chat enabled in your Whop dashboard first.
            </p>
          ) : (
            <div className="space-y-2">
              {channels.map(channel => {
                const checked = selectedChannels.includes(channel.id)
                return (
                  <label
                    key={channel.id}
                    className="flex items-center gap-3 rounded-lg border border-black/5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedChannels(prev =>
                          prev.includes(channel.id)
                            ? prev.filter(id => id !== channel.id)
                            : [...prev, channel.id]
                        )
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                    />
                    <div>
                      <div className="text-sm font-semibold">{channel.experience.name}</div>
                      <div className="text-xs text-gray-500">Channel ID: {channel.id}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Choose one or more chat channels to send game updates to.
          </p>
        </div>
      </div>

      {/* Update Frequency */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Update Frequency</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="every_point"
                checked={updateFrequency === 'every_point'}
                onChange={(e) => setUpdateFrequency(e.target.value)}
                className="w-4 h-4 text-brand-accent"
              />
              <div>
                <div className="font-medium">Every Point</div>
                <div className="text-sm text-gray-600">Send update whenever score changes</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="every_minute"
                checked={updateFrequency === 'every_minute'}
                onChange={(e) => setUpdateFrequency(e.target.value)}
                className="w-4 h-4 text-brand-accent"
              />
              <div>
                <div className="font-medium">Every Minute</div>
                <div className="text-sm text-gray-600">Send update once per minute during live games</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="every_quarter"
                checked={updateFrequency === 'every_quarter'}
                onChange={(e) => setUpdateFrequency(e.target.value)}
                className="w-4 h-4 text-brand-accent"
              />
              <div>
                <div className="font-medium">Every Quarter</div>
                <div className="text-sm text-gray-600">Send update only at end of each quarter</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Event Notifications */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-3">
        <h3 className="font-bold mb-3">Special Event Notifications</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyGameStart}
            onChange={(e) => setNotifyGameStart(e.target.checked)}
            className="w-4 h-4 text-brand-accent rounded"
          />
          <span>Notify when game starts</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyQuarterEnd}
            onChange={(e) => setNotifyQuarterEnd(e.target.checked)}
            className="w-4 h-4 text-brand-accent rounded"
          />
          <span>Notify at end of each quarter</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyGameEnd}
            onChange={(e) => setNotifyGameEnd(e.target.checked)}
            className="w-4 h-4 text-brand-accent rounded"
          />
          <span>Notify when game ends (final score)</span>
        </label>
      </div>

      {/* Game Selection */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-4">
        <div>
          <h3 className="font-bold mb-3">Select Games to Track</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose which games you want to receive notifications for
          </p>

          {games.length === 0 && nflGames.length === 0 && uclGames.length === 0 ? (
            <p className="text-sm text-gray-500">No games today</p>
          ) : (
            <div className="space-y-4">
              {/* NBA Games */}
              {games.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">NBA Games</h4>
                  {games.map(game => (
                    <label
                      key={game.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-black/10 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={trackedGames.includes(game.id)}
                        onChange={() => toggleGame(game.id)}
                        className="w-4 h-4 text-brand-accent rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {game.awayTeam} @ {game.homeTeam}
                        </div>
                        <div className="text-sm text-gray-600">
                          {game.status} • {game.awayScore} - {game.homeScore}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* NFL Games */}
              {nflGames.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">NFL Games</h4>
                  {nflGames.map(game => (
                    <label
                      key={game.gameId}
                      className="flex items-center gap-3 p-3 rounded-lg border border-black/10 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={nflTrackedGames.includes(game.gameId)}
                        onChange={() => toggleNflGame(game.gameId)}
                        className="w-4 h-4 text-brand-accent rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {game.awayTeam.teamCity} {game.awayTeam.teamName} @ {game.homeTeam.teamCity} {game.homeTeam.teamName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {game.gameStatusText} • {game.awayTeam.score} - {game.homeTeam.score}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* UCL Matches */}
              {uclGames.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">UCL Matches</h4>
                  {uclGames.map(game => (
                    <label
                      key={game.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-black/10 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={uclTrackedGames.includes(game.id)}
                        onChange={() => toggleUclGame(game.id)}
                        className="w-4 h-4 text-brand-accent rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {game.awayTeam} @ {game.homeTeam}
                        </div>
                        <div className="text-sm text-gray-600">
                          {game.status} • {game.awayScore} - {game.homeScore}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-8 py-3 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </main>
  )
}
