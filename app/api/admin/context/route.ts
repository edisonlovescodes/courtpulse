import { NextResponse } from 'next/server'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await resolveAdminContextFromRequest(req)
  const envFallback = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? null
  const companyId = ctx.companyId || (ctx.isAdmin ? envFallback : null)

  return NextResponse.json({
    companyId,
    isAdmin: ctx.isAdmin,
    accessLevel: ctx.accessLevel,
    experienceId: ctx.experienceId,
    source: ctx.source,
    fallbackUsed: !ctx.companyId && !!companyId,
  })
}
