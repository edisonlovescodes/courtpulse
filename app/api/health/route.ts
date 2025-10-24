import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, env: {
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || null,
    companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null,
  } })
}

