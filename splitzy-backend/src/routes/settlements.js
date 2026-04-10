import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { 
  createSettlement,
  getSettlements,
  getGroupSettlements,
  updateSettlement,
  deleteSettlement,
  confirmSettlement,
  cancelSettlement,
  getSettlementSuggestions
} from '../controllers/settlementController.js'
import { 
  validate, 
  createSettlementSchema, 
  updateSettlementSchema,
  paginationSchema
} from '../utils/validation.js'

const router = Router()

router.use(auth)

// Settlement CRUD operations
router.get('/', validate(paginationSchema, 'query'), getSettlements)
router.post('/', validate(createSettlementSchema), createSettlement)
router.put('/:id', validate(updateSettlementSchema), updateSettlement)
router.delete('/:id', deleteSettlement)

// Group settlements
router.get('/group/:groupId', validate(paginationSchema, 'query'), getGroupSettlements)

// Settlement actions
router.post('/:id/confirm', confirmSettlement)
router.post('/:id/cancel', cancelSettlement)

// Settlement suggestions
router.get('/group/:groupId/suggestions', getSettlementSuggestions)

export default router
