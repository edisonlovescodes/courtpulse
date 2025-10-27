import { NextResponse } from 'next/server'
import { processGameNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for processing

/**
 * GET /api/cron/notifications
 * Triggered by Vercel Cron or external scheduler
 * Processes all active game notifications
 */
export async function GET(req: Request) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const vercelCron = req.headers.get('x-vercel-cron') || req.headers.get('X-Vercel-Cron')

    // Allow if:
    // - No secret set (public), or
    // - Authorization matches, or
    // - Request comes from Vercel Cron (header present)
    const authorized =
      !cronSecret ||
      authHeader === `Bearer ${cronSecret}` ||
      Boolean(vercelCron)

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await processGameNotifications()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('Error in cron job:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to process notifications' },
      { status: 500 }
    )
  }
}
