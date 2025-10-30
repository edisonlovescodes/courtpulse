import DashboardSettings from '../../../dashboard/[companyId]/settings-client'
import { redirect } from 'next/navigation'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`https://api.whop.com/api/v1/experiences/${encodeURIComponent(experienceId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data: any = await res.json()
    return data?.company_id || data?.companyId || data?.company?.id || null
  } catch {
    return null
  }
}

export default async function ExperienceSettingsPage(props: { params: Promise<{ experienceId: string }> }) {
  const { experienceId } = await props.params
  const fallbackCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null
  const companyId = (await getCompanyIdForExperience(experienceId)) || fallbackCompanyId

  if (!companyId) {
    redirect('/')
  }

  return <DashboardSettings companyId={companyId} backHref={`/experiences/${experienceId}`} />
}
