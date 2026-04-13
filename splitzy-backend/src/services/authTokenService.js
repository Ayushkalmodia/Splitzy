import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
export const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(user.profileImage ? { profileImage: user.profileImage } : {}),
      ...(user.authTypes?.length ? { authTypes: user.authTypes } : {})
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  )

export const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, jti: crypto.randomBytes(16).toString('hex') },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  )

export const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

export const toPublicUser = (user) => ({
  id: user._id?.toString?.() ?? user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  ...(user.profileImage ? { profileImage: user.profileImage } : {}),
  ...(user.authTypes?.length ? { authTypes: user.authTypes } : {})
})
