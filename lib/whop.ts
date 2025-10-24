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
