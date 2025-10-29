import { NextRequest, NextResponse } from 'next/server'
import { createMessage, formatGameUpdateMessage } from '@/lib/whop-api'

// Minimal webhook stub: logs events for visibility. Replace with real handling.
// Configure in Whop dashboard to point to /api/webhooks/whop
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const testSecret = process.env.TEST_WEBHOOK_SECRET

    // Read body as JSON if possible; else as text
    const text = await req.text()
    let body: any = {}
    try { body = text ? JSON.parse(text) : {} } catch { body = { text } }

    // If this is a test call (Authorization: Bearer TEST_WEBHOOK_SECRET), allow sending a chat message
    if (testSecret && auth === `Bearer ${testSecret}`) {
      const companyId = body.companyId as string | undefined
      const channelIdsRaw = body.channelIds
      const channelIdSingle = body.channelId as string | undefined
      let channelIds: string[] = []
      if (Array.isArray(channelIdsRaw)) {
        channelIds = channelIdsRaw.map((id) => String(id).trim()).filter(Boolean)
      } else if (typeof channelIdsRaw === 'string') {
        channelIds = channelIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)
      } else if (typeof channelIdSingle === 'string') {
        channelIds = channelIdSingle.split(',').map((id) => id.trim()).filter(Boolean)
      }

      if (!companyId || channelIds.length === 0) {
        return NextResponse.json({ ok: false, error: 'companyId and at least one channelId required' }, { status: 400 })
      }

      // If specific game-style fields provided, format; else send raw text
      const eventType = body.eventType as 'score' | 'quarter_end' | 'game_start' | 'game_end' | undefined
      let content: string
      if (eventType) {
        content = formatGameUpdateMessage({
          homeTeam: String(body.homeTeam || 'Home'),
          awayTeam: String(body.awayTeam || 'Away'),
          homeScore: Number(body.homeScore ?? 0),
          awayScore: Number(body.awayScore ?? 0),
          period: Number(body.period ?? 1),
          gameClock: body.gameClock ? String(body.gameClock) : undefined,
          status: String(body.status || 'Live'),
          eventType,
        })
      } else {
        content = String(body.text || 'Test message from webhook')
      }

      const posted = await Promise.all(channelIds.map((id) => createMessage(id, content)))
      return NextResponse.json({ ok: true, posted })
    }

    // Production webhook: just log until signature verification added
    const sig = req.headers.get('Whop-Signature') || req.headers.get('X-Whop-Signature')
    console.log('[Whop webhook] sig:', sig)
    console.log('[Whop webhook] body:', text)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
