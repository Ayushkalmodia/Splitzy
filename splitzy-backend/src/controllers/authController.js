import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN
  })

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN
  })

const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

export const register = async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' })
  }
  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, passwordHash })

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [...(user.refreshTokens || []), refreshToken]
    await user.save()
    setRefreshCookie(res, refreshToken)
    return res.status(201).json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

export const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })
  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [...(user.refreshTokens || []), refreshToken]
    await user.save()
    setRefreshCookie(res, refreshToken)
    return res.json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required' })
  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ message: 'User not found' })

    const token = crypto.randomBytes(20).toString('hex')
    user.resetToken = token
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    // Stub: return token so UI flow can proceed without email service
    return res.json({ message: 'Reset token generated', token })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) return res.status(400).json({ message: 'Token and newPassword are required' })
  try {
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } })
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' })

    user.passwordHash = await bcrypt.hash(newPassword, 10)
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    return res.json({ message: 'Password reset successful' })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ message: 'No refresh token' })

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
    const user = await User.findById(payload.id)
    if (!user) return res.status(401).json({ message: 'Invalid token' })
    const stored = (user.refreshTokens || []).includes(token)
    if (!stored) return res.status(401).json({ message: 'Invalid token' })

    // rotate refresh token
    const newRefresh = signRefreshToken(user)
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token).concat(newRefresh)
    await user.save()
    setRefreshCookie(res, newRefresh)

    const accessToken = signAccessToken(user)
    return res.json({ token: accessToken })
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
        const user = await User.findById(payload.id)
        if (user) {
          user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== token)
          await user.save()
        }
      } catch (_) {
        // ignore
      }
    }
    res.clearCookie('refreshToken')
    return res.json({ message: 'Logged out' })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}
