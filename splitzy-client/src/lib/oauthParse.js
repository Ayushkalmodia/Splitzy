/**
 * Parse OAuth redirect fragment (#access_token=...&provider=...) from the SPA URL.
 */
export function parseOAuthHash(hash) {
  const raw = typeof hash === 'string' && hash.startsWith('#') ? hash.slice(1) : hash || ''
  const params = new URLSearchParams(raw)
  return {
    access_token: params.get('access_token') || '',
    provider: params.get('provider') || ''
  }
}

export function userFromAccessTokenPayload(accessToken) {
  const parts = accessToken.split('.')
  if (parts.length < 2) return null
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = atob(base64)
  const payload = JSON.parse(json)
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    ...(payload.profileImage ? { profileImage: payload.profileImage } : {}),
    ...(payload.authTypes ? { authTypes: payload.authTypes } : {})
  }
}

/**
 * Parse OAuth redirect fragment into session-ready fields (used by OAuthCallback + tests).
 */
export function resolveOAuthFragment(hash) {
  const { access_token, provider } = parseOAuthHash(hash)
  if (!access_token) {
    return { ok: false, error: 'missing_token' }
  }
  const user = userFromAccessTokenPayload(access_token)
  if (!user?.id || !user?.email) {
    return { ok: false, error: 'invalid_user' }
  }
  return { ok: true, access_token, user, provider }
}
