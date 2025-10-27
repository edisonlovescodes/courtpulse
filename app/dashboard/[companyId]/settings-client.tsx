"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTodayGames, type TodayGame } from '@/lib/ball'

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
  enabled: boolean
  channelId: string | null
  channelName: string | null
  updateFrequency: string
  notifyGameStart: boolean
  notifyGameEnd: boolean
  notifyQuarterEnd: boolean
  trackedGames: string[]
}

export default function DashboardSettings({ companyId, authHeaders, adminToken }: { companyId: string, authHeaders?: Record<string, string>, adminToken?: string }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [games, setGames] = useState<TodayGame[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [simulating, setSimulating] = useState(false)

  // Form state
  const [enabled, setEnabled] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState('')
  const [updateFrequency, setUpdateFrequency] = useState('every_point')
  const [notifyGameStart, setNotifyGameStart] = useState(true)
  const [notifyGameEnd, setNotifyGameEnd] = useState(true)
  const [notifyQuarterEnd, setNotifyQuarterEnd] = useState(true)
  const [trackedGames, setTrackedGames] = useState<string[]>([])

  // Auto-load settings on mount
  useEffect(() => {
    getTodayGames().then(setGames)
    loadSettings()
  }, [companyId])

  const loadSettings = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Load channels
      const channelsRes = await fetch(`/api/admin/channels?company_id=${companyId}` , {
        headers: { ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
      })
      if (!channelsRes.ok) throw new Error('Failed to load channels')
      const channelsData = await channelsRes.json()
      setChannels(channelsData.channels || [])

      // Load settings
      const settingsRes = await fetch(`/api/admin/notifications?company_id=${companyId}`, {
        headers: { ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
      })
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settingsData = await settingsRes.json()
      const s = settingsData.settings

      setSettings(s)
      setEnabled(s.enabled)
      setSelectedChannel(s.channelId || '')
      setUpdateFrequency(s.updateFrequency)
      setNotifyGameStart(s.notifyGameStart)
      setNotifyGameEnd(s.notifyGameEnd)
      setNotifyQuarterEnd(s.notifyQuarterEnd)
      setTrackedGames(s.trackedGames || [])

      setMessage('Settings loaded')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      const channelName = channels.find(c => c.id === selectedChannel)?.experience.name || null

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
        body: JSON.stringify({
          companyId,
          enabled,
          channelId: selectedChannel || null,
          channelName,
          updateFrequency,
          notifyGameStart,
          notifyGameEnd,
          notifyQuarterEnd,
          trackedGames,
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      const data = await res.json()
      setSettings(data.settings)
      setMessage('Settings saved successfully!')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Simulate notifications to the selected channel (or saved channel if none selected)
  const simulate = async (eventType: 'game_start' | 'score' | 'quarter_end' | 'game_end') => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/notifications/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}), ...(adminToken ? { 'X-CP-Admin': adminToken } : {}) },
        body: JSON.stringify({
          companyId,
          channelId: selectedChannel || undefined,
          eventType,
          homeTeam: 'Lakers',
          awayTeam: 'Celtics',
          homeScore: 54,
          awayScore: 51,
          period: 2,
          gameClock: eventType === 'score' ? '03:21' : '00:00',
          status: eventType === 'game_end' ? 'Final' : 'Live',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any))
        throw new Error(err?.error || `Failed to simulate (${res.status})`)
      }
      setMessage('Test notification sent to channel')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleSimulate = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(simulating ? '/api/dev/simulate/stop' : '/api/dev/simulate/start', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to toggle simulation')
      setSimulating(!simulating)
      setMessage(simulating ? 'Simulation disabled' : 'Simulation enabled for 10 minutes')
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
        <Link href="/" className="text-sm font-medium hover:text-brand-accent">
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
              Send live game updates to your selected chat channel
            </div>
          </div>
        </label>
      </div>

      {/* Channel Selection */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Chat Channel</label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-brand-accent"
          >
            <option value="">Select a channel...</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                {channel.experience.name}
              </option>
            ))}
          </select>
          {channels.length === 0 && (
            <p className="text-xs text-orange-600 mt-2">
              No chat channels found. Create an Experience with chat enabled in your Whop dashboard first.
            </p>
          )}
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

          {games.length === 0 ? (
            <p className="text-sm text-gray-500">No games today</p>
          ) : (
            <div className="space-y-2">
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
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving || !selectedChannel}
          className="px-8 py-3 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Test Notifications */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-3">
        <h3 className="font-bold mb-1">Send Test Notification</h3>
        <p className="text-sm text-gray-600 mb-3">Simulate messages without a live game</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => simulate('game_start')} className="px-4 py-2 border-2 border-black/10 rounded-lg hover:border-brand-accent/50">Game Start</button>
          <button onClick={() => simulate('score')} className="px-4 py-2 border-2 border-black/10 rounded-lg hover:border-brand-accent/50">Score</button>
          <button onClick={() => simulate('quarter_end')} className="px-4 py-2 border-2 border-black/10 rounded-lg hover:border-brand-accent/50">Quarter End</button>
          <button onClick={() => simulate('game_end')} className="px-4 py-2 border-2 border-black/10 rounded-lg hover:border-brand-accent/50">Final</button>
        </div>
        <p className="text-xs text-gray-500">Uses the selected channel above (or saved channel if none selected).</p>
        <div className="pt-4 flex items-center gap-3">
          <button onClick={toggleSimulate} className="px-4 py-2 border-2 border-black/10 rounded-lg hover:border-brand-accent/50">
            {simulating ? 'Disable Live Simulation' : 'Enable Live Simulation'}
          </button>
          <span className="text-xs text-gray-500">When enabled, Today’s games and details use mock live data for ~10 minutes.</span>
        </div>
      </div>
    </main>
  )
}
