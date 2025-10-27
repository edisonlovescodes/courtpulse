import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  const store = await cookies()
  store.set('CP_SIM', '', { httpOnly: false, sameSite: 'none', secure: true, path: '/', maxAge: 0 })
  return NextResponse.json({ ok: true, simulate: false })
}

