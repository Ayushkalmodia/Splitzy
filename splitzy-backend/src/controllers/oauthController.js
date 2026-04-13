import passport from 'passport'
import { findOrCreateOAuthUser } from '../services/oauthUserService.js'
import {
  signAccessToken,
  signRefreshToken,
  setRefreshCookie,
  toPublicUser
} from '../services/authTokenService.js'
import { isAppleConfigured, isGoogleConfigured } from '../config/passport.js'

const frontendOrigin = () => (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim()

const oauthDeniedRedirect = () =>
  `${frontendOrigin()}/oauth/callback?${new URLSearchParams({ error: 'oauth_denied' }).toString()}`

const oauthFailedRedirect = () =>
  `${frontendOrigin()}/oauth/callback?${new URLSearchParams({ error: 'oauth_failed' }).toString()}`

const buildSuccessRedirect = (accessToken, provider) => {
  const fragment = new URLSearchParams({
    access_token: accessToken,
    provider
  }).toString()
  return `${frontendOrigin()}/oauth/callback#${fragment}`
}

export const oauthStatus = (req, res) => {
  res.json({
    google: isGoogleConfigured(),
    apple: isAppleConfigured()
  })
}

export const startGoogle = (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.status(503).json({ message: 'Google sign-in is not configured' })
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
}

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', {
    session: false,
    failureRedirect: oauthDeniedRedirect()
  })(req, res, next)
}

export const startApple = (req, res, next) => {
  if (!isAppleConfigured()) {
    return res.status(503).json({ message: 'Apple sign-in is not configured' })
  }
  passport.authenticate('apple')(req, res, next)
}

export const appleCallback = (req, res, next) => {
  passport.authenticate('apple', {
    session: false,
    failureRedirect: oauthDeniedRedirect()
  })(req, res, next)
}

/**
 * Shared success handler: issue JWT + refresh rotation cookie, redirect SPA with access_token in hash (not sent to servers).
 */
export const completeOAuthLogin = async (req, res) => {
  const payload = req.user
  const provider = payload?.provider
  try {
    if (!payload?.providerId || !provider) {
      return res.redirect(oauthFailedRedirect())
    }
    const user = await findOrCreateOAuthUser({
      provider,
      providerId: payload.providerId,
      email: payload.email,
      name: payload.name,
      profileImage: payload.profileImage
    })
    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [...(user.refreshTokens || []), refreshToken]
    await user.save()
    setRefreshCookie(res, refreshToken)
    return res.redirect(buildSuccessRedirect(accessToken, provider))
  } catch (err) {
    console.error('OAuth completion error:', err?.message || err)
    return res.redirect(oauthFailedRedirect())
  }
}

/** Exported for tests (provider profile shape matches passport verify output). */
export async function processOAuthProfileForTest(profile) {
  const user = await findOrCreateOAuthUser({
    provider: profile.provider,
    providerId: profile.providerId,
    email: profile.email,
    name: profile.name,
    profileImage: profile.profileImage
  })
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken]
  await user.save()
  return {
    accessToken,
    refreshToken,
    user: toPublicUser(user)
  }
}
