import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { 
  listExpenses, 
  listByGroup, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  stats,
  getUserBalance
} from '../controllers/expenseController.js'
import { 
  validate, 
  createExpenseSchema, 
  updateExpenseSchema, 
  expenseQuerySchema 
} from '../utils/validation.js'

const router = Router()

router.use(auth)

// Statistics and balances - MUST come before /:id routes
router.get('/stats', stats)
router.get('/balance', getUserBalance)

// Expense CRUD operations
router.get('/', validate(expenseQuerySchema, 'query'), listExpenses)
router.get('/group/:groupId', validate(expenseQuerySchema, 'query'), listByGroup)
router.post('/', validate(createExpenseSchema), createExpense)
router.put('/:id', validate(updateExpenseSchema), updateExpense)
router.delete('/:id', deleteExpense)

export default router
