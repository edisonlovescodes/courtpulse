import Client from './viewer'

export default async function GamePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  return <Client id={params.id} />
}
