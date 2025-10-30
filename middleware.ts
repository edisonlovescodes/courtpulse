import { NextRequest, NextResponse } from 'next/server'
import { resolveAdminContext } from './lib/whop'
import { whopSdk } from './lib/whop-sdk'

export async function middleware(req: NextRequest) {
  const ctx = await resolveAdminContext({ headers: req.headers, url: req.url })

  const headers = new Headers(req.headers)
  if (ctx.companyId) {
    headers.set('X-Company-Id', ctx.companyId)
  }

  return NextResponse.next({
    request: {
      headers,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
