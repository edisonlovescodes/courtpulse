'use client'
import { useState } from 'react'
import LiveGames from './components/LiveGames'
import LiveNFLGames from './components/LiveNFLGames'

type Sport = 'nba' | 'nfl'

export default function HomePage() {
  const [activeSport, setActiveSport] = useState<Sport>('nba')

  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? undefined
  const isAdmin = true

  return (
    <>
      <main className="space-y-8">
        {/* Sport Tabs */}
        <div className="flex gap-2 border-b border-black/10 pb-1">
          <button
            onClick={() => setActiveSport('nba')}
            className={`px-4 py-2 font-medium transition ${
              activeSport === 'nba'
                ? 'text-brand-accent border-b-2 border-brand-accent -mb-[1px]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            NBA
          </button>
          <button
            onClick={() => setActiveSport('nfl')}
            className={`px-4 py-2 font-medium transition ${
              activeSport === 'nfl'
                ? 'text-brand-accent border-b-2 border-brand-accent -mb-[1px]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            NFL
          </button>
          <button
            disabled
            className="px-4 py-2 font-medium text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            MLB
            <span className="text-xs">(coming soon)</span>
          </button>
          <button
            disabled
            className="px-4 py-2 font-medium text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            Premier League
            <span className="text-xs">(coming soon)</span>
          </button>
        </div>

        {activeSport === 'nba' && (
          <LiveGames companyId={companyId} isAdmin={isAdmin} />
        )}
        {activeSport === 'nfl' && (
          <LiveNFLGames companyId={companyId} isAdmin={isAdmin} />
        )}
      </main>
    </>
  )
}
