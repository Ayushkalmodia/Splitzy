import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { validate, createBudgetSchema, updateBudgetSchema, budgetMonthQuerySchema } from '../utils/validation.js'
import {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStatus
} from '../controllers/budgetController.js'

const router = Router()

router.use(auth)

router.get('/status', validate(budgetMonthQuerySchema, 'query'), getBudgetStatus)
router.get('/', listBudgets)
router.post('/', validate(createBudgetSchema), createBudget)
router.put('/:id', validate(updateBudgetSchema), updateBudget)
router.delete('/:id', deleteBudget)

export default router
