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

