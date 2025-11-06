'use client'
import { useState } from 'react'
import LiveGames from '../../components/LiveGames'
import LiveNFLGames from '../../components/LiveNFLGames'
import LiveUCLGames from '../../components/LiveUCLGames'

type Sport = 'nba' | 'nfl' | 'ucl'

type ExperienceClientProps = {
  companyId?: string
  experienceId?: string
  isAdmin?: boolean
}

export default function ExperienceClient({ companyId, experienceId, isAdmin }: ExperienceClientProps) {
  const [activeSport, setActiveSport] = useState<Sport>('nba')

  return (
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
          onClick={() => setActiveSport('ucl')}
          className={`px-4 py-2 font-medium transition ${
            activeSport === 'ucl'
              ? 'text-brand-accent border-b-2 border-brand-accent -mb-[1px]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          UCL
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
        <LiveGames companyId={companyId} experienceId={experienceId} isAdmin={isAdmin} />
      )}
      {activeSport === 'nfl' && (
        <LiveNFLGames companyId={companyId} experienceId={experienceId} isAdmin={isAdmin} />
      )}
      {activeSport === 'ucl' && (
        <LiveUCLGames companyId={companyId} experienceId={experienceId} isAdmin={isAdmin} />
      )}
    </main>
  )
}
