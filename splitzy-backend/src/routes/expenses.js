import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { listExpenses, listByGroup, createExpense, updateExpense, deleteExpense, stats } from '../controllers/expenseController.js'

const router = Router()

router.use(auth)
router.get('/', listExpenses)
router.get('/group/:groupId', listByGroup)
router.post('/', createExpense)
router.put('/:id', updateExpense)
router.delete('/:id', deleteExpense)
router.get('/stats', stats)

export default router
