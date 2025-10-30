export type Plan = 'starter' | 'pro' | 'max'

export type AuthContext = {
  userId: string
  plan: Plan
}

const planMap = (input?: string | null): Plan => {
  switch ((input || '').toLowerCase()) {
    case 'starter':
      return 'starter'
    case 'pro':
      return 'pro'
    case 'max':
      return 'max'
    default:
      return 'starter'
  }
}

// Placeholder: in production, verify Whop-Signed-Token using WHOP_APP_SECRET
import { verifySignedToken } from './signing'
import { whopSdk } from '@/lib/whop-sdk'

function readPlanMapping(): Record<string, Plan> {
  // Map product IDs (or plan slugs) to our internal plan names
  // e.g., WHOP_PLAN_MAP="prod_abc:starter,prod_def:pro,prod_xyz:max"
  const mapEnv = process.env.WHOP_PLAN_MAP || ''
  const out: Record<string, Plan> = {}
  for (const pair of mapEnv.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [id, planStr] = pair.split(':').map((s) => s.trim())
    const p = planMap(planStr)
    if (id && p) out[id] = p
  }
  return out
}

async function resolvePlanFromWhopAPI(userId: string): Promise<Plan | null> {
  const apiKey = process.env.WHOP_API_KEY
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID
  if (!apiKey || !companyId) return null
  try {
    // NOTE: Endpoint shape may differ; adapt to your Whop API
    // Strategy: list memberships for user within your company/community and map product id → plan
    const url = `https://api.whop.com/v2/memberships?buyer_id=${encodeURIComponent(userId)}&company_id=${encodeURIComponent(companyId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    const items: any[] = json?.data || json?.items || []
    if (!items.length) return null
    const planMapEnv = readPlanMapping()
    for (const m of items) {
      const productId = m?.product_id || m?.product?.id || m?.sku_id
      if (productId && planMapEnv[productId]) return planMapEnv[productId]
      const planSlug = m?.plan || m?.tier || m?.role
      if (planSlug) {
        const p = planMap(String(planSlug))
        if (p) return p
      }
    }
  } catch {}
  return null
}

export async function getAuthFromHeaders(headers: Headers): Promise<AuthContext> {
  // 1) If Whop provides a signed token, verify and trust user id
  const signed = headers.get('Whop-Signed-Token') || headers.get('X-Whop-Signed-Token')
  let userId = headers.get('X-Whop-User-Id') || ''
  const secret = process.env.WHOP_APP_SECRET
  if (signed && secret) {
    const res = verifySignedToken(signed, secret)
    if (res.valid && res.userId) userId = res.userId
  }

  if (!userId) {
    userId = process.env.DEV_USER_ID || 'dev_user_1'
  }

  // 2) Plan: prefer explicit header, else try Whop API, else env default
  const headerPlan = headers.get('X-Whop-Plan') || headers.get('Whop-Plan')
  let plan: Plan | null = headerPlan ? planMap(headerPlan) : null
  if (!plan) {
    plan = await resolvePlanFromWhopAPI(userId)
  }
  if (!plan) {
    plan = planMap(process.env.DEV_PLAN || 'starter')
  }

  return { userId, plan }
}

// Determine if the current user is an admin/owner of the Whop app/company
type HeadersLike = { get(name: string): string | null }

export function isAdminFromHeaders(headers: HeadersLike): boolean {
  // Dev-only override for local testing
  if (
    process.env.NODE_ENV !== 'production' &&
    ['1', 'true', 'yes'].includes(String(process.env.WHOP_DEBUG_ADMIN || '').toLowerCase())
  ) {
    return true
  }
  const role =
    headers.get('X-Whop-Role') ||
    headers.get('Whop-Role') ||
    headers.get('X-Whop-User-Role') ||
    ''

  // If platform provides role headers
  if (role) {
    const r = role.toLowerCase()
    if (r === 'admin' || r === 'owner') return true
  }

  // Allowlist via env var (CSV of user IDs)
  const adminIds = (process.env.WHOP_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const userId = headers.get('X-Whop-User-Id') || headers.get('Whop-User-Id') || ''
  if (userId && adminIds.includes(userId)) return true

  // Fallback: treat the configured agent/owner as admin
  const agentId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
  if (agentId && userId && userId === agentId) return true

  // Optional boolean hint
  const isAdminHeader = headers.get('X-Whop-Is-Admin') || headers.get('Whop-Is-Admin')
  if (isAdminHeader && ['1', 'true', 'yes'].includes(isAdminHeader.toLowerCase())) return true

  return false
}

// Extract the current Whop company ID from headers, else fall back to env
export function getCompanyIdFromHeaders(headers: HeadersLike): string | null {
  const fromHeader =
    headers.get('X-Whop-Company-Id') ||
    headers.get('Whop-Company-Id') ||
    headers.get('X-Company-Id') ||
    ''
  if (fromHeader) return fromHeader
  return process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null
}

// API-backed admin check using Whop SDK for a specific company
export async function isAdminForCompany(headersLike: HeadersLike, companyId: string): Promise<boolean> {
  // Dev-only override for local testing
  if (
    process.env.NODE_ENV !== 'production' &&
    ['1', 'true', 'yes'].includes(String(process.env.WHOP_DEBUG_ADMIN || '').toLowerCase())
  ) {
    return true
  }
  try {
    // Verify the current user from the iframe headers
    const { userId } = await whopSdk.verifyUserToken(headersLike as any)
    if (!userId) return false
    const { accessLevel } = await whopSdk.access.checkIfUserHasAccessToCompany({
      companyId,
      userId,
    })
    return accessLevel === 'admin'
  } catch {
    return false
  }
}

export function getExperienceIdFromHeaders(headers: HeadersLike): string | null {
  return (
    headers.get('X-Whop-Experience-Id') ||
    headers.get('Whop-Experience-Id') ||
    headers.get('Experience-Id') ||
    null
  )
}

export async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey || !experienceId) return null
  try {
    const res = await fetch(
      `https://api.whop.com/api/v1/experiences/${encodeURIComponent(experienceId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      },
    )
    if (!res.ok) return null
    const data: any = await res.json()
    return data?.company_id || data?.companyId || data?.company?.id || null
  } catch {
    return null
  }
}

export async function isAdminForExperience(headersLike: HeadersLike, experienceId: string): Promise<boolean> {
  if (!experienceId) return false
  if (
    process.env.NODE_ENV !== 'production' &&
    ['1', 'true', 'yes'].includes(String(process.env.WHOP_DEBUG_ADMIN || '').toLowerCase())
  ) {
    return true
  }
  try {
    const { userId } = await whopSdk.verifyUserToken(headersLike as any)
    if (!userId) return false
    const { accessLevel } = await whopSdk.access.checkIfUserHasAccessToExperience({
      experienceId,
      userId,
    })
    return accessLevel === 'admin'
  } catch {
    return false
  }
}

export async function resolveAdminContext(
  headersLike: HeadersLike,
  fallbackExperienceId?: string,
): Promise<{
  companyId: string | null
  experienceId: string | null
  isCompanyAdmin: boolean
  isExperienceAdmin: boolean
  isAdmin: boolean
}> {
  const headerCompanyId = getCompanyIdFromHeaders(headersLike)
  const headerExperienceId = getExperienceIdFromHeaders(headersLike)
  const referer = (headersLike.get('referer') || headersLike.get('Referrer') || '') as string

  // Attempt to extract company/experience from Referer when headers are missing.
  let refererCompanyId: string | null = null
  let refererExperienceId: string | null = null
  if (referer) {
    try {
      const u = new URL(referer)
      // Query params first
      refererCompanyId = u.searchParams.get('company_id') || null
      refererExperienceId = u.searchParams.get('experience_id') || null
      // Path heuristics (best-effort; supports several common patterns)
      const path = u.pathname
      // e.g. /companies/biz_xxx or /company/biz_xxx
      let m = path.match(/\/(?:companies|company)\/(biz_[A-Za-z0-9]+)/i)
      if (!refererCompanyId && m) refererCompanyId = m[1]
      // e.g. /experiences/xp_xxx or /experience/xp_xxx
      m = path.match(/\/(?:experiences|experience)\/(xp_[A-Za-z0-9]+)/i)
      if (!refererExperienceId && m) refererExperienceId = m[1]
    } catch {}
  }

  const experienceId = headerExperienceId || refererExperienceId || fallbackExperienceId || null

  let companyId = headerCompanyId || refererCompanyId
  if (!companyId && experienceId) {
    companyId = await getCompanyIdForExperience(experienceId)
  }

  let isCompanyAdmin = false
  if (companyId) {
    isCompanyAdmin = await isAdminForCompany(headersLike, companyId)
  }

  let isExperienceAdmin = false
  if (!isCompanyAdmin && experienceId) {
    isExperienceAdmin = await isAdminForExperience(headersLike, experienceId)
  }

  return {
    companyId,
    experienceId,
    isCompanyAdmin,
    isExperienceAdmin,
    isAdmin: isCompanyAdmin || isExperienceAdmin,
  }
}
