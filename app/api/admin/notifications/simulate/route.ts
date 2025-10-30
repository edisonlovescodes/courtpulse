import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMessage, formatGameUpdateMessage } from '@/lib/whop-api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/notifications/simulate
 * Simulate a notification event (e.g., quarter_end) and post to the configured channel.
 * Body: {
 *   companyId: string,
 *   channelId?: string, // optional, will use settings if omitted
 *   eventType: 'score' | 'quarter_end' | 'game_start' | 'game_end',
 *   homeTeam?: string,
 *   awayTeam?: string,
 *   homeScore?: number,
 *   awayScore?: number,
 *   period?: number,
 *   gameClock?: string,
 *   status?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      companyId,
      channelId: channelIdInput,
      eventType,
      homeTeam = 'Home',
      awayTeam = 'Away',
      homeScore = 0,
      awayScore = 0,
      period = 1,
      gameClock = '00:00',
      status = 'Live',
    } = body || {}

    const resolvedCompanyId = companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || ''

    if (!resolvedCompanyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    // Resolve channels
    let channelIds: string[] = []
    if (Array.isArray(channelIdInput)) {
      channelIds = channelIdInput.map((id) => String(id).trim()).filter(Boolean)
    } else if (typeof channelIdInput === 'string') {
      channelIds = channelIdInput.split(',').map((id) => id.trim()).filter(Boolean)
    }
    if (channelIds.length === 0) {
      const settings = await prisma.notificationSettings.findUnique({ where: { companyId: resolvedCompanyId } })
      if (settings?.channelId) {
        channelIds = settings.channelId.split(',').map((id) => id.trim()).filter(Boolean)
      }
    }
    if (channelIds.length === 0) {
      return NextResponse.json({ error: 'No channel configured. Select at least one channel and save settings first.' }, { status: 400 })
    }

    const message = formatGameUpdateMessage({
      homeTeam,
      awayTeam,
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      period: Number(period) || 1,
      gameClock: String(gameClock || ''),
      status: String(status || 'Live'),
      eventType,
    })

    const results = await Promise.all(
      channelIds.map((id) => createMessage(id, message))
    )

    return NextResponse.json({ ok: true, posted: results })
  } catch (e: any) {
    console.error('Error simulating notification:', e)
    return NextResponse.json({ error: e.message || 'Failed to simulate' }, { status: 500 })
  }
}
