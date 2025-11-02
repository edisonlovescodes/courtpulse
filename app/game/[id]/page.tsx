import Client from './viewer'

export default async function GamePage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sport?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const sport = searchParams.sport || 'nba'

  return <Client id={params.id} sport={sport} />
}
