import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'

async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  // Prefer SDK if available in future; use REST fallback for now
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`https://api.whop.com/api/v1/experiences/${encodeURIComponent(experienceId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data: any = await res.json()
    // Try common shapes
    return (
      data?.company_id ||
      data?.companyId ||
      data?.company?.id ||
      null
    )
  } catch {
    return null
  }
}

export default async function ExperiencePage(props: { params: Promise<{ experienceId: string }> }) {
  const { experienceId } = await props.params

  // Verify user and map experience → company, then route admins to dashboard
  const hdrs = await headers()
  try {
    const { userId } = await whopSdk.verifyUserToken(hdrs as any)
    const { accessLevel } = await whopSdk.access.checkIfUserHasAccessToExperience({
      experienceId,
      userId,
    })
    const companyId = await getCompanyIdForExperience(experienceId)
    if (companyId && accessLevel === 'admin') {
      redirect(`/dashboard/${companyId}`)
    }
  } catch {}

  // Fallback: no admin or no company context → go home
  redirect('/')
}
