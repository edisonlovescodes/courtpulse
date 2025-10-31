// Whop API client for chat channels and messages
const WHOP_API_BASE = 'https://api.whop.com/api/v1'

type ChatChannel = {
  id: string
  experience: {
    id: string
    name: string
  }
  ban_media: boolean
  ban_urls: boolean
  who_can_post: string
  who_can_react: string
}

type ListChannelsResponse = {
  data: ChatChannel[]
  page_info: {
    end_cursor: string | null
    start_cursor: string | null
    has_next_page: boolean
    has_previous_page: boolean
  }
}

type CreateMessageResponse = {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    username: string
    name: string
  }
}

/**
 * List all chat channels for a company
 */
export async function listChatChannels(companyId: string): Promise<ChatChannel[]> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) {
    throw new Error('WHOP_API_KEY not configured')
  }

  const url = new URL(`${WHOP_API_BASE}/chat_channels`)
  url.searchParams.set('company_id', companyId)

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Whop API error: ${error.message || res.statusText}`)
  }

  const data: ListChannelsResponse = await res.json()
  return data.data
}

/**
 * Create a message in a chat channel
 */
export async function createMessage(
  channelId: string,
  content: string
): Promise<CreateMessageResponse> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) {
    throw new Error('WHOP_API_KEY not configured')
  }

  const res = await fetch(`${WHOP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel_id: channelId,
      content,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Whop API error: ${error.message || res.statusText}`)
  }

  return await res.json()
}

/**
 * Format a game update message for chat
 */
export function formatGameUpdateMessage(data: {
  homeTeam: string
  awayTeam: string
  homeNickname?: string
  awayNickname?: string
  homeScore: number
  awayScore: number
  period: number
  gameClock?: string
  status: string
  eventType?: 'score' | 'quarter_end' | 'game_start' | 'game_end'
}): string {
  const { homeTeam, awayTeam, homeNickname, awayNickname, homeScore, awayScore, period, gameClock, status, eventType } = data

  const readableClock = (() => {
    if (!gameClock) return ''
    const match = gameClock.match(/PT(\d+)M([\d.]+)S/i)
    if (!match) return gameClock
    const mins = match[1]
    const secs = Math.floor(parseFloat(match[2]))
    return `${mins}:${secs.toString().padStart(2, '0')}`
  })()

  const lines: string[] = [
    `${awayTeam} @ ${homeTeam}`,
    '',
    `Score: ${awayNickname ?? awayTeam} ${awayScore} - ${homeScore} ${homeNickname ?? homeTeam}`,
  ]

  if (eventType === 'game_start') {
    lines.push('', '🏀 Game Starting!')
  } else if (eventType === 'game_end') {
    lines.push('', '🏁 Final')
  } else if (eventType === 'quarter_end') {
    lines.push('', `⏰ End of Q${period}`)
  } else if (period > 0) {
    lines.push('', `📊 Q${period}${readableClock ? ` • ${readableClock}` : ''}`)
  } else {
    lines.push('', `📅 ${status}`)
  }

  return lines.join('\n')
}
