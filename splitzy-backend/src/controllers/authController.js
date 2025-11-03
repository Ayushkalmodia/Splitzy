import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
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

    const token = signToken(user)
    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
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

    const token = signToken(user)
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
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
