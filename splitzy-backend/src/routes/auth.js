import { Router } from 'express'
import { login, register, forgotPassword, resetPassword, refresh, logout } from '../controllers/authController.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/refresh', refresh)
router.post('/logout', logout)

export default router
