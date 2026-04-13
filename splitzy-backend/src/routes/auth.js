import { Router } from 'express'
import { login, register, forgotPassword, resetPassword, refresh, logout } from '../controllers/authController.js'
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../utils/validation.js'
import {
  oauthStatus,
  startGoogle,
  googleCallback,
  startApple,
  appleCallback,
  completeOAuthLogin
} from '../controllers/oauthController.js'

const router = Router()

router.get('/oauth/status', oauthStatus)

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)
router.post('/refresh', refresh)
router.post('/logout', logout)

router.get('/google', startGoogle)
router.get('/google/callback', googleCallback, completeOAuthLogin)

router.get('/apple', startApple)
router.post('/apple/callback', appleCallback, completeOAuthLogin)

export default router
