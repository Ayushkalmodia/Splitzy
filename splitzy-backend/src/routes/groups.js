import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { 
  getGroups, 
  createGroup, 
  updateGroup, 
  deleteGroup,
  getGroupBalances,
  getGroupOptimizedSettlements,
  getGroupExpenses,
  generateInviteLink,
  generateInviteCode,
  joinByInviteCode,
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
router.get('/:id/optimized-settlements', getGroupOptimizedSettlements)
router.get('/:id/expenses', getGroupExpenses)

// Invite system
router.post('/:id/invite', generateInviteLink)
router.post('/:id/invite-code', generateInviteCode)
router.post('/join', joinByInviteCode)
router.get('/invite/:token', validateInvite)
router.post('/join/:token', joinGroup)

// Member management
router.delete('/:id/members/:memberId', removeMember)
router.put('/:id/members/:memberId/role', updateMemberRole)

export default router
