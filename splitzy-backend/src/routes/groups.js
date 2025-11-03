import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { getGroups, createGroup, updateGroup, deleteGroup } from '../controllers/groupController.js'

const router = Router()

router.use(auth)
router.get('/', getGroups)
router.post('/', createGroup)
router.put('/:id', updateGroup)
router.delete('/:id', deleteGroup)

export default router
