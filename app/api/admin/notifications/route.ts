import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompanyIdFromHeaders, isAdminForCompany } from '@/lib/whop'
import { cookies } from 'next/headers'
import { verifyAdminSessionToken } from '@/lib/signing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/notifications?company_id=xxx
 * Get notification settings for a company
 */
export async function GET(req: Request) {
  try {
    const headerCompanyId = getCompanyIdFromHeaders(req.headers)
    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    // Enforce company boundary if header provides one and verify admin
    if (headerCompanyId && headerCompanyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
    }
    let allow = await isAdminForCompany(req.headers as any, companyId)
    if (!allow) {
      const store = await cookies()
      const token = store.get('CP_ADMIN')?.value
      const secret = process.env.WHOP_APP_SECRET
      const v = token && secret ? verifyAdminSessionToken(token, secret) : { valid: false }
      if (!(v.valid && v.companyId === companyId)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      allow = true
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

    // Convert comma-separated to array for client
    const settingsForClient = {
      ...settings,
      trackedGames: settings.trackedGames ? settings.trackedGames.split(',').filter(Boolean) : [],
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
    const headerCompanyId = getCompanyIdFromHeaders(req.headers)
    const body = await req.json()
    const {
      companyId,
      enabled,
      channelId,
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

    // Enforce company boundary if header provides one and verify admin
    if (headerCompanyId && headerCompanyId !== companyId) {
      return NextResponse.json({ error: 'company mismatch' }, { status: 403 })
    }
    let allow = await isAdminForCompany(req.headers as any, companyId)
    if (!allow) {
      const store = await cookies()
      const token = store.get('CP_ADMIN')?.value
      const secret = process.env.WHOP_APP_SECRET
      const v = token && secret ? verifyAdminSessionToken(token, secret) : { valid: false }
      if (!(v.valid && v.companyId === companyId)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      allow = true
    }

    // Convert array to comma-separated string for storage
    const trackedGamesStr = Array.isArray(trackedGames) ? trackedGames.join(',') : (trackedGames || '')

    const settings = await prisma.notificationSettings.upsert({
      where: { companyId },
      create: {
        companyId,
        enabled: enabled ?? false,
        channelId,
        channelName,
        updateFrequency: updateFrequency ?? 'every_point',
        notifyGameStart: notifyGameStart ?? true,
        notifyGameEnd: notifyGameEnd ?? true,
        notifyQuarterEnd: notifyQuarterEnd ?? true,
        trackedGames: trackedGamesStr,
      },
      update: {
        enabled,
        channelId,
        channelName,
        updateFrequency,
        notifyGameStart,
        notifyGameEnd,
        notifyQuarterEnd,
        trackedGames: trackedGamesStr,
      },
    })

    // Convert back to array for client
    const settingsForClient = {
      ...settings,
      trackedGames: settings.trackedGames ? settings.trackedGames.split(',').filter(Boolean) : [],
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
