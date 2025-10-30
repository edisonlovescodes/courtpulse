import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/notifications?company_id=xxx
 * Get notification settings for a company
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const companyId =
      url.searchParams.get('company_id') ||
      process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ||
      ''

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    let settings = await prisma.notificationSettings.findUnique({
      where: { companyId },
    })

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          companyId,
          enabled: false,
          updateFrequency: 'every_point',
          trackedGames: '',
        },
      })
    }

    const channelIds = settings.channelId
      ? settings.channelId.split(',').map((id) => id.trim()).filter(Boolean)
      : []
    const primaryChannelId = channelIds[0] ?? null

    // Convert comma-separated to array for client
    const settingsForClient = {
      ...settings,
      channelId: primaryChannelId,
      trackedGames: settings.trackedGames ? settings.trackedGames.split(',').filter(Boolean) : [],
      channelIds,
    }

    return NextResponse.json({ settings: settingsForClient })
  } catch (e: any) {
    console.error('Error fetching notification settings:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/notifications
 * Update notification settings for a company
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('[/api/admin/notifications] request body:', body)
    const {
      companyId,
      enabled,
      channelId,
      channelIds: inputChannelIds,
      channelName,
      updateFrequency,
      notifyGameStart,
      notifyGameEnd,
      notifyQuarterEnd,
      trackedGames,
    } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }
    
    // Trust the companyId from request body - client already validated access
    console.log('[/api/admin/notifications] updating for company:', companyId)

    const channelIds = Array.isArray(inputChannelIds)
      ? inputChannelIds.map((id: any) => String(id).trim()).filter(Boolean)
      : channelId
        ? [String(channelId).trim()]
        : []
    const channelIdCsv = channelIds.join(',')

    // Convert array to comma-separated string for storage
    const trackedGamesStr = Array.isArray(trackedGames) ? trackedGames.join(',') : (trackedGames || '')

    const settings = await prisma.notificationSettings.upsert({
      where: { companyId },
      create: {
        companyId,
        enabled: enabled ?? false,
        channelId: channelIdCsv,
        channelName,
        updateFrequency: updateFrequency ?? 'every_point',
        notifyGameStart: notifyGameStart ?? true,
        notifyGameEnd: notifyGameEnd ?? true,
        notifyQuarterEnd: notifyQuarterEnd ?? true,
        trackedGames: trackedGamesStr,
      },
      update: {
        enabled,
        channelId: channelIdCsv,
        channelName,
        updateFrequency,
        notifyGameStart,
        notifyGameEnd,
        notifyQuarterEnd,
        trackedGames: trackedGamesStr,
      },
    })

    // Convert back to array for client
    const savedChannelIds = settings.channelId
      ? settings.channelId.split(',').map((id) => id.trim()).filter(Boolean)
      : []

    const settingsForClient = {
      ...settings,
      trackedGames: settings.trackedGames ? settings.trackedGames.split(',').filter(Boolean) : [],
      channelIds: savedChannelIds,
      channelId: savedChannelIds[0] ?? null,
    }

    return NextResponse.json({ settings: settingsForClient })
  } catch (e: any) {
    console.error('Error updating notification settings:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
