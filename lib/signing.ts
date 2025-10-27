import crypto from 'crypto'

// Placeholder signed-token verification.
// Format: userId:timestamp:signature
// signature = HMAC-SHA256( `${userId}.${timestamp}` , WHOP_APP_SECRET ) hex
// This is a placeholder; replace with Whop’s official verification.
export function verifySignedToken(token: string, secret?: string): { valid: boolean; userId?: string } {
  try {
    if (!token || !secret) return { valid: false }
    const parts = token.split(':')
    if (parts.length !== 3) return { valid: false }
    const [userId, tsStr, sig] = parts
    const timestamp = Number(tsStr)
    if (!userId || !Number.isFinite(timestamp) || !sig) return { valid: false }
    // 5-minute skew
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestamp) > 300) return { valid: false }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${userId}.${timestamp}`)
      .digest('hex')
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return { valid: true, userId }
    }
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

// App-internal short-lived admin session token
// Format: base64url(`${userId}:${companyId}:${timestamp}`) + '.' + HMAC-SHA256 over the base64 part
export function createAdminSessionToken(userId: string, companyId: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(`${userId}:${companyId}:${ts}`).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyAdminSessionToken(
  token: string,
  secret?: string,
): { valid: boolean; userId?: string; companyId?: string } {
  try {
    if (!token || !secret) return { valid: false }
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return { valid: false }
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return { valid: false }
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const [userId, companyId, tsStr] = decoded.split(':')
    const ts = Number(tsStr)
    if (!userId || !companyId || !Number.isFinite(ts)) return { valid: false }
    // 10-minute expiry
    const now = Math.floor(Date.now() / 1000)
    if (now - ts > 600) return { valid: false }
    return { valid: true, userId, companyId }
  } catch {
    return { valid: false }
  }
}
