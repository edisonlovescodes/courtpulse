import LiveGames from './components/LiveGames'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main className="space-y-8">
      <LiveGames />
    </main>
  )
}
