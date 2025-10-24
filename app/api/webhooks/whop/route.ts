import { NextRequest, NextResponse } from 'next/server'

// Minimal webhook stub: logs events for visibility. Replace with real handling.
// Configure in Whop dashboard to point to /api/webhooks/whop
export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const sig = req.headers.get('Whop-Signature') || req.headers.get('X-Whop-Signature')
    // TODO: verify signature using WHOP_WEBHOOK_SECRET when available
    console.log('[Whop webhook] sig:', sig)
    console.log('[Whop webhook] body:', bodyText)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

