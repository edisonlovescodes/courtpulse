import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  const store = await cookies()
  // SameSite=None so it works inside Whop iFrame
  store.set('CP_SIM', '1', { httpOnly: false, sameSite: 'none', secure: true, path: '/', maxAge: 600 })
  return NextResponse.json({ ok: true, simulate: true })
}

