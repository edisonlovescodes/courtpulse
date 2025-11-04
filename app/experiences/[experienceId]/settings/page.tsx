import DashboardSettings from '../../../dashboard/[companyId]/settings-client'
import { redirect } from 'next/navigation'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) {
    console.error('[Experience Settings] No WHOP_API_KEY configured')
    return null
  }
  try {
    const url = `https://api.whop.com/api/v1/experiences/${encodeURIComponent(experienceId)}`
    console.log('[Experience Settings] Fetching company for experience:', experienceId)
    console.log('[Experience Settings] URL:', url)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })

    console.log('[Experience Settings] Response status:', res.status, res.statusText)

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unable to read error')
      console.error('[Experience Settings] API error:', errorText)
      return null
    }

    const data: any = await res.json()
    console.log('[Experience Settings] Experience data:', JSON.stringify(data, null, 2))

    const companyId = data?.company_id || data?.companyId || data?.company?.id || null
    console.log('[Experience Settings] Resolved company ID:', companyId)

    return companyId
  } catch (error) {
    console.error('[Experience Settings] Exception:', error)
    return null
  }
}

export default async function ExperienceSettingsPage(props: { params: Promise<{ experienceId: string }> }) {
  const { experienceId } = await props.params
  const fallbackCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null

  console.log('[Experience Settings Page] Experience ID:', experienceId)
  console.log('[Experience Settings Page] Fallback company ID:', fallbackCompanyId)

  const companyId = (await getCompanyIdForExperience(experienceId)) || fallbackCompanyId

  console.log('[Experience Settings Page] Final company ID:', companyId)
  console.log('[Experience Settings Page] Used fallback?', companyId === fallbackCompanyId)

  if (!companyId) {
    redirect('/')
  }

  return <DashboardSettings companyId={companyId} experienceId={experienceId} backHref={`/experiences/${experienceId}`} />
}
