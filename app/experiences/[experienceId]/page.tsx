import LiveGames from '../../components/LiveGames'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage(props: { params: Promise<{ experienceId: string }> }) {
  await props.params // ensure route segment resolves
  return (
    <main className="space-y-8">
      <LiveGames />
    </main>
  )
}
