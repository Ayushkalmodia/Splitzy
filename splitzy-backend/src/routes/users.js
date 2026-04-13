import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { searchUsers } from '../controllers/userController.js'

const router = Router()

router.use(auth)
router.get('/search', searchUsers)

export default router
