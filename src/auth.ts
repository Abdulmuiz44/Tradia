export interface AuthResult {
  authenticated: boolean
  apiKey?: string
  reason?: string
}

export function authenticateRequest(authHeader?: string | null, xApiKey?: string | null): AuthResult {
  if (process.env.TRADIA_ALLOW_LOCAL_UNAUTH === 'true' && !authHeader && !xApiKey) {
    return { authenticated: true, reason: 'local_unauth_mode' }
  }

  const apiKey = extractApiKey(authHeader, xApiKey)

  if (!apiKey) {
    return { authenticated: false, reason: 'missing_api_key' }
  }

  if (process.env.TALOCODE_API_KEY && apiKey !== process.env.TALOCODE_API_KEY) {
    return { authenticated: false, reason: 'invalid_api_key' }
  }

  if (!process.env.TALOCODE_API_KEY) {
    if (process.env.TRADIA_ALLOW_LOCAL_UNAUTH === 'true') {
      return { authenticated: true, reason: 'local_mode_with_key' }
    }
    return { authenticated: false, reason: 'no_api_key_configured' }
  }

  return { authenticated: true, apiKey }
}

function extractApiKey(authHeader?: string | null, xApiKey?: string | null): string | undefined {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  if (xApiKey) {
    return xApiKey.trim()
  }
  return undefined
}

export function redactApiKey(key?: string): string {
  if (!key) return '(none)'
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}
