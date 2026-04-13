import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import {
  categorize,
  categorizeExpenseMl,
  detectAnomaly,
  monthlyReport,
  optimizeSettlement
} from '../controllers/analyticsController.js'

const router = Router()

router.use(auth)

router.post('/categorize', categorize)
router.post('/categorize-expense', categorizeExpenseMl)
router.post('/detect-anomaly', detectAnomaly)
router.get('/monthly-report', monthlyReport)
router.post('/optimize-settlement', optimizeSettlement)

export default router
