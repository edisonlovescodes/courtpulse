import { NextResponse } from 'next/server'
import { listChatChannels } from '@/lib/whop-api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/channels
 * List all chat channels for a company
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    const channels = await listChatChannels(companyId)

    return NextResponse.json({ channels })
  } catch (e: any) {
    console.error('Error listing chat channels:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to list channels' },
      { status: 500 }
    )
  }
}
