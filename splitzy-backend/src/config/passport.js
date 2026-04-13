import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import jwt from 'jsonwebtoken'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const AppleStrategy = require('passport-apple')

const apiPublicUrl = () =>
  (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5050}`).replace(/\/$/, '')

const googleCallbackURL = () =>
  process.env.GOOGLE_CALLBACK_URL || `${apiPublicUrl()}/api/auth/google/callback`

const appleCallbackURL = () =>
  process.env.APPLE_CALLBACK_URL || `${apiPublicUrl()}/api/auth/apple/callback`

/**
 * OAuth2 stores short-lived state in the session directly; we do not persist user profiles in the session.
 */
passport.serializeUser((_user, done) => done(null, null))
passport.deserializeUser((_id, done) => done(null, null))

export function registerPassportStrategies() {
  if (process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
          callbackURL: googleCallbackURL(),
          passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value
            done(null, {
              provider: 'google',
              providerId: profile.id,
              email,
              name: profile.displayName || undefined,
              profileImage: profile.photos?.[0]?.value || undefined
            })
          } catch (err) {
            done(err)
          }
        }
      )
    )
  }

  const appleKey =
    process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
    process.env.APPLE_PRIVATE_KEY_STRING?.replace(/\\n/g, '\n')

  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    appleKey
  ) {
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKeyString: appleKey,
          callbackURL: appleCallbackURL(),
          passReqToCallback: true
        },
        (req, accessToken, refreshToken, idToken, _, done) => {
          try {
            const decoded = jwt.decode(idToken)
            if (!decoded?.sub) {
              return done(new Error('Invalid Apple id_token'))
            }
            const appleName = req.appleProfile?.name
            let fullName
            if (appleName) {
              fullName = [appleName.firstName, appleName.lastName].filter(Boolean).join(' ').trim() || undefined
            }
            done(null, {
              provider: 'apple',
              providerId: decoded.sub,
              email: decoded.email || undefined,
              name: fullName,
              profileImage: undefined
            })
          } catch (err) {
            done(err)
          }
        }
      )
    )
  }
}

export function isGoogleConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID?.trim()
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  return !!(id && secret)
}

export function isAppleConfigured() {
  const key =
    process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
    process.env.APPLE_PRIVATE_KEY_STRING?.replace(/\\n/g, '\n')
  return !!(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    key
  )
}
