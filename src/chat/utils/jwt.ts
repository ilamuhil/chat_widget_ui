/**
 * Returns true when the JWT is missing/invalid/expired.
 * Uses a small skew window to avoid race conditions near expiry.
 */
export function isJwtExpired(token: string, skewSeconds = 5) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return true

    // base64url → base64
    let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (payloadB64.length % 4) payloadB64 += '='

    const payload = JSON.parse(atob(payloadB64)) as { exp?: number }
    const expSeconds = payload?.exp
    if (typeof expSeconds !== 'number') return true
    return expSeconds * 1000 <= Date.now() + skewSeconds * 1000
  } catch {
    return true
  }
}

