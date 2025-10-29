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

export default function NotificationSettings() {
  const [companyId, setCompanyId] = useState('')
  const [channels, setChannels] = useState<Channel[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [games, setGames] = useState<TodayGame[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Form state
  const [enabled, setEnabled] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState('')
  const [updateFrequency, setUpdateFrequency] = useState('every_point')
  const [notifyGameStart, setNotifyGameStart] = useState(true)
  const [notifyGameEnd, setNotifyGameEnd] = useState(true)
  const [notifyQuarterEnd, setNotifyQuarterEnd] = useState(true)
  const [trackedGames, setTrackedGames] = useState<string[]>([])

  useEffect(() => {
    // Load today's games
    getTodayGames().then(setGames)
  }, [])

  const loadChannels = async () => {
    if (!companyId) {
      setMessage('Please enter a Company ID')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Load channels
      const channelsRes = await fetch(`/api/admin/channels?company_id=${companyId}`)
      if (!channelsRes.ok) throw new Error('Failed to load channels')
      const channelsData = await channelsRes.json()
      setChannels(channelsData.channels || [])

      // Load settings
      const settingsRes = await fetch(`/api/admin/notifications?company_id=${companyId}`)
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

      setMessage('')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!companyId) {
      setMessage('Please enter a Company ID')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const channelName = channels.find(c => c.id === selectedChannel)?.experience.name || null

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const toggleGame = (gameId: string) => {
    setTrackedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Game Notifications Settings</h1>
        <Link href="/" className="text-sm font-medium hover:text-brand-accent">
          ← Back to Games
        </Link>
      </div>

      {/* Company ID Input */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Company ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="biz_xxxxxxxxxxxxx"
              className="flex-1 px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-brand-accent"
            />
            <button
              onClick={loadChannels}
              disabled={loading}
              className="px-6 py-2 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent/90 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Settings'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter your Whop Company ID (found in dashboard URL or env vars)
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.startsWith('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {settings && (
        <>
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
              <p className="text-xs text-gray-500 mt-1">
                Choose which chat channel to send game updates to
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
        </>
      )}
    </main>
  )
}
