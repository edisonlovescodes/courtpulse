import Client from './viewer'

export default function GamePage({ params }: { params: { id: string } }) {
  return <Client id={params.id} />
}
