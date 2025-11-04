import DashboardSettings from '../../../dashboard/[companyId]/settings-client'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { resolveAdminContext } from '@/lib/whop'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ExperienceSettingsPage(props: { params: Promise<{ experienceId: string }> }) {
  const { experienceId } = await props.params
  const hdrs = await headers()

  // Get company ID from Whop headers (they provide this when loading the app)
  const ctx = await resolveAdminContext({
    headers: hdrs,
    url: `/experiences/${experienceId}/settings`,
    fallbackExperienceId: experienceId,
  })

  // DEBUG: Log the exact value and type before the || evaluation
  console.log('[Experience Settings] ctx.companyId RAW VALUE:', ctx.companyId)
  console.log('[Experience Settings] ctx.companyId TYPE:', typeof ctx.companyId)
  console.log('[Experience Settings] ctx.companyId IS TRUTHY?:', !!ctx.companyId)
  console.log('[Experience Settings] ENV FALLBACK:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID)

  const companyId = ctx.companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null

  console.log('[Experience Settings] Experience ID:', experienceId)
  console.log('[Experience Settings] Company ID from context:', ctx.companyId)
  console.log('[Experience Settings] Final company ID AFTER || evaluation:', companyId)
  console.log('[Experience Settings] DID WE USE THE CORRECT COMPANY ID?:', companyId === ctx.companyId)
  console.log('[Experience Settings] Access level:', ctx.accessLevel)
  console.log('[Experience Settings] Is admin:', ctx.isAdmin)

  if (!companyId) {
    console.error('[Experience Settings] No company ID available, redirecting to home')
    redirect('/')
  }

  // Pass debug info to client component for browser console visibility
  const debugInfo = {
    extractedCompanyId: ctx.companyId,
    usedFallback: !ctx.companyId,
    fallbackValue: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    finalCompanyId: companyId,
    accessLevel: ctx.accessLevel,
    isAdmin: ctx.isAdmin,
  }

  return <DashboardSettings companyId={companyId} experienceId={experienceId} backHref={`/experiences/${experienceId}`} debugContext={debugInfo} />
}
