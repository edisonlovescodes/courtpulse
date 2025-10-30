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
export type HeadersLike = { get(name: string): string | null }

export type AccessLevel = 'admin' | 'member' | 'no_access'

export type AdminContextSource = 'headers' | 'query' | 'referer' | 'experience_map' | 'none'

export type AdminContext = {
  companyId: string | null
  experienceId: string | null
  userId: string | null
  accessLevel: AccessLevel
  isAdmin: boolean
  source: AdminContextSource
  debug: {
    headers: Record<string, string | null>
    referer: string | null
    url: string
  }
}

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
  return null
}

// API-backed admin check using Whop SDK for a specific company
export function getExperienceIdFromHeaders(headers: HeadersLike): string | null {
  return (
    headers.get('X-Whop-Experience-Id') ||
    headers.get('Whop-Experience-Id') ||
    headers.get('Experience-Id') ||
    null
  )
}

export async function getCompanyIdForExperience(experienceId: string): Promise<string | null> {
  if (!experienceId) return null
  // Prefer SDK if available
  try {
    const experiencesResource: any = (whopSdk as any)?.experiences
    if (experiencesResource) {
      if (typeof experiencesResource.retrieve === 'function') {
        const result = await experiencesResource.retrieve({ id: experienceId })
        const companyId =
          result?.company_id || result?.companyId || (result?.company && result.company.id)
        if (companyId) return companyId
      }
      if (typeof experiencesResource.get === 'function') {
        const result = await experiencesResource.get({ id: experienceId })
        const companyId =
          result?.company_id || result?.companyId || (result?.company && result.company.id)
        if (companyId) return companyId
      }
    }
  } catch {
    // fall through to REST fetch fallback
  }

  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) return null
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

const ADMIN_ROLE_VALUES = new Set(['admin', 'owner'])
const MEMBER_ROLE_VALUES = new Set(['member', 'customer', 'sales_manager', 'moderator'])

function normalizeAccessLevel(value: any): AccessLevel {
  const normalized = String(value ?? '').toLowerCase()
  if (ADMIN_ROLE_VALUES.has(normalized)) return 'admin'
  if (MEMBER_ROLE_VALUES.has(normalized)) return 'member'
  return 'no_access'
}

function buildUrl(input?: string): URL {
  const fallback = 'http://placeholder.local/'
  if (!input) return new URL(fallback)
  try {
    if (/^https?:\/\//i.test(input)) {
      return new URL(input)
    }
    return new URL(input, fallback)
  } catch {
    return new URL(fallback)
  }
}

function extractIdsFromReferer(referer: string | null): { companyId: string | null; experienceId: string | null } {
  if (!referer) return { companyId: null, experienceId: null }
  try {
    const refUrl = new URL(referer)
    const companyId =
      refUrl.searchParams.get('company_id') ||
      (refUrl.pathname.match(/\/(?:companies|company)\/(biz_[A-Za-z0-9]+)/i)?.[1] ?? null)
    const experienceId =
      refUrl.searchParams.get('experience_id') ||
      (refUrl.pathname.match(/\/(?:experiences|experience)\/(xp_[A-Za-z0-9]+)/i)?.[1] ?? null)
    return { companyId, experienceId }
  } catch {
    return { companyId: null, experienceId: null }
  }
}

type ResolveAdminOptions = {
  headers: HeadersLike
  url?: string
  fallbackExperienceId?: string
}

export async function resolveAdminContext(options: ResolveAdminOptions): Promise<AdminContext> {
  const { headers: headersLike } = options
  const requestUrl = buildUrl(options.url)

  const debugHeaders: Record<string, string | null> = {
    'X-Whop-Company-Id': getCompanyIdFromHeaders(headersLike),
    'X-Whop-Experience-Id': getExperienceIdFromHeaders(headersLike),
    'X-Whop-User-Id': headersLike.get('X-Whop-User-Id') || headersLike.get('Whop-User-Id'),
    'Whop-Signed-Token': headersLike.get('Whop-Signed-Token') || headersLike.get('X-Whop-Signed-Token'),
  }

  const referer = headersLike.get('referer') || headersLike.get('Referrer') || null

  const fromHeaders = {
    companyId: debugHeaders['X-Whop-Company-Id'],
    experienceId: debugHeaders['X-Whop-Experience-Id'],
  }
  const fromQuery = {
    companyId: requestUrl.searchParams.get('company_id'),
    experienceId: requestUrl.searchParams.get('experience_id'),
  }
  const fromReferer = extractIdsFromReferer(referer)

  let source: AdminContextSource = 'none'

  let companyId =
    fromHeaders.companyId || fromQuery.companyId || fromReferer.companyId || null
  let experienceId =
    fromHeaders.experienceId ||
    fromQuery.experienceId ||
    fromReferer.experienceId ||
    options.fallbackExperienceId ||
    null

  if (fromHeaders.companyId || fromHeaders.experienceId) {
    source = 'headers'
  } else if (fromQuery.companyId || fromQuery.experienceId) {
    source = 'query'
  } else if (fromReferer.companyId || fromReferer.experienceId) {
    source = 'referer'
  }

  if (!companyId && experienceId) {
    const mappedCompanyId = await getCompanyIdForExperience(experienceId)
    if (mappedCompanyId) {
      companyId = mappedCompanyId
      if (source === 'none') source = 'experience_map'
    }
  }

  let userId = debugHeaders['X-Whop-User-Id']
  const signedToken = debugHeaders['Whop-Signed-Token']
  if (!userId && signedToken) {
    const secret = process.env.WHOP_APP_SECRET
    if (secret) {
      try {
        const decoded = verifySignedToken(signedToken, secret)
        if (decoded.valid && decoded.userId) {
          userId = decoded.userId
        }
      } catch {}
    }
  }

  if (!userId) {
    try {
      const verified: any = await (whopSdk as any)?.verifyUserToken?.(headersLike as any, {
        dontThrow: true,
      })
      if (verified && typeof verified === 'object' && 'userId' in verified) {
        userId = verified.userId as string
      }
    } catch {}
  }

  if (
    !userId &&
    process.env.NODE_ENV !== 'production' &&
    ['1', 'true', 'yes'].includes(String(process.env.WHOP_DEBUG_ADMIN || '').toLowerCase())
  ) {
    userId = process.env.WHOP_DEBUG_USER_ID || 'debug-user'
  }

  let accessLevel: AccessLevel = 'no_access'
  let isAdmin = false

  if (companyId && userId) {
    try {
      const result: any = await (whopSdk as any)?.access?.checkIfUserHasAccessToCompany?.({
        companyId,
        userId,
      })
      if (result) {
        const level = normalizeAccessLevel(result.accessLevel ?? result.access_level)
        accessLevel = level
        isAdmin = level === 'admin'
      }
    } catch {}
  }

  if (!isAdmin && experienceId && userId) {
    try {
      const result: any = await (whopSdk as any)?.access?.checkIfUserHasAccessToExperience?.({
        experienceId,
        userId,
      })
      if (result) {
        const level = normalizeAccessLevel(result.accessLevel ?? result.access_level)
        if (level === 'admin') {
          accessLevel = 'admin'
          isAdmin = true
          if (!companyId) {
            const mappedCompanyId = await getCompanyIdForExperience(experienceId)
            if (mappedCompanyId) {
              companyId = mappedCompanyId
              if (source === 'none') source = 'experience_map'
            }
          }
        } else if (level === 'member' && accessLevel === 'no_access') {
          accessLevel = 'member'
        }
      }
    } catch {}
  }

  if (!companyId) {
    isAdmin = false
    if (accessLevel === 'admin') accessLevel = 'no_access'
  }

  return {
    companyId,
    experienceId,
    userId: userId || null,
    accessLevel,
    isAdmin,
    source,
    debug: {
      headers: debugHeaders,
      referer,
      url: options.url ?? requestUrl.toString(),
    },
  }
}

export async function resolveAdminContextFromRequest(
  req: Request,
  options?: { fallbackExperienceId?: string },
): Promise<AdminContext> {
  return resolveAdminContext({
    headers: req.headers,
    url: req.url,
    fallbackExperienceId: options?.fallbackExperienceId,
  })
}

export async function isAdminForCompany(headersLike: HeadersLike, companyId: string): Promise<boolean> {
  const ctx = await resolveAdminContext({ headers: headersLike })
  if (ctx.companyId === companyId) {
    return ctx.isAdmin
  }
  if (ctx.userId) {
    try {
      const result: any = await (whopSdk as any)?.access?.checkIfUserHasAccessToCompany?.({
        companyId,
        userId: ctx.userId,
      })
      return normalizeAccessLevel(result?.accessLevel ?? result?.access_level) === 'admin'
    } catch {}
  }
  return false
}

export async function isAdminForExperience(headersLike: HeadersLike, experienceId: string): Promise<boolean> {
  const ctx = await resolveAdminContext({ headers: headersLike, fallbackExperienceId: experienceId })
  if (ctx.experienceId === experienceId) {
    return ctx.isAdmin
  }
  if (ctx.userId) {
    try {
      const result: any = await (whopSdk as any)?.access?.checkIfUserHasAccessToExperience?.({
        experienceId,
        userId: ctx.userId,
      })
      return normalizeAccessLevel(result?.accessLevel ?? result?.access_level) === 'admin'
    } catch {}
  }
  return false
}
