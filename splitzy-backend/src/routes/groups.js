import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { 
  getGroups, 
  createGroup, 
  updateGroup, 
  deleteGroup,
  getGroupBalances,
  generateInviteLink,
  joinGroup,
  validateInvite,
  removeMember,
  updateMemberRole
} from '../controllers/groupController.js'
import { 
  validate, 
  createGroupSchema, 
  updateGroupSchema 
} from '../utils/validation.js'

const router = Router()

router.use(auth)

// Group CRUD operations
router.get('/', getGroups)
router.post('/', validate(createGroupSchema), createGroup)
router.put('/:id', validate(updateGroupSchema), updateGroup)
router.delete('/:id', deleteGroup)

// Group balances
router.get('/:id/balances', getGroupBalances)

// Invite system
router.post('/:id/invite', generateInviteLink)
router.get('/invite/:token', validateInvite)
router.post('/join/:token', joinGroup)

// Member management
router.delete('/:id/members/:memberId', removeMember)
router.put('/:id/members/:memberId/role', updateMemberRole)

export default router
