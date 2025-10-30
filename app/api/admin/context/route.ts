import { NextResponse } from 'next/server'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await resolveAdminContextFromRequest(req)
  const envFallback = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? null
  const companyId = ctx.companyId || envFallback

  return NextResponse.json({
    companyId,
    isAdmin: true,
    accessLevel: 'admin',
    experienceId: ctx.experienceId,
    source: ctx.source || 'public',
    fallbackUsed: !ctx.companyId && !!companyId,
  })
}
