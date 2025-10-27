import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'

async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://api.whop.com/api/v1/experiences/${encodeURIComponent(experienceId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data: any = await res.json()
    return data?.company_id || data?.companyId || data?.company?.id || null
  } catch {
    return null
  }
}

export default async function ExperienceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ experienceId: string }>
}) {
  const { experienceId } = await params
  const hdrs = await headers()

  let showCog = false
  let targetCompanyId: string | null = null
  try {
    const { userId } = await whopSdk.verifyUserToken(hdrs as any)
    const { accessLevel } = await whopSdk.access.checkIfUserHasAccessToExperience({
      experienceId,
      userId,
    })
    if (accessLevel === 'admin') {
      targetCompanyId = await getCompanyIdForExperience(experienceId)
      showCog = !!targetCompanyId
    }
  } catch {}

  return (
    <>
      {/* Inject a minimal top-right cog for experience admins */}
      {showCog && targetCompanyId && (
        <div className="fixed top-4 right-4 z-40">
          <Link
            href={`/experiences/${experienceId}/settings`}
            aria-label="Settings"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 border-black/10 bg-white hover:border-black/20 shadow-sm"
            title={`Manage settings for ${targetCompanyId}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        </div>
      )}
      {children}
    </>
  )
}
