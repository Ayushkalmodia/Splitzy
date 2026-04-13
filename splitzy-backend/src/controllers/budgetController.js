import Budget from '../models/Budget.js'
import { getUserCategorySpendByMonth } from '../services/budgetAggregationService.js'
import { proxyAnalyticsRequest } from '../services/analyticsProxyService.js'

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100

const thresholdLevel = (util) => {
  if (util >= 1) return '100'
  if (util >= 0.8) return '80'
  if (util >= 0.5) return '50'
  return 'ok'
}

export const listBudgets = async (req, res) => {
  try {
    const items = await Budget.find({ userId: req.user.id }).sort({ category: 1 })
    res.json({ items })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createBudget = async (req, res) => {
  try {
    const { category, monthlyLimit, currency = 'USD' } = req.body
    const doc = await Budget.create({
      userId: req.user.id,
      category: String(category).toLowerCase().trim(),
      monthlyLimit,
      currency: String(currency).toUpperCase()
    })
    res.status(201).json(doc)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Budget already exists for this category' })
    }
    res.status(500).json({ message: err.message })
  }
}

export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params
    const budget = await Budget.findOne({ _id: id, userId: req.user.id })
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' })
    }
    const { category, monthlyLimit, currency } = req.body
    if (category !== undefined) budget.category = String(category).toLowerCase().trim()
    if (monthlyLimit !== undefined) budget.monthlyLimit = monthlyLimit
    if (currency !== undefined) budget.currency = String(currency).toUpperCase()
    await budget.save()
    res.json(budget)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Budget already exists for this category' })
    }
    res.status(500).json({ message: err.message })
  }
}

export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params
    const result = await Budget.deleteOne({ _id: id, userId: req.user.id })
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Budget not found' })
    }
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getBudgetStatus = async (req, res) => {
  try {
    const { month } = req.query
    const budgets = await Budget.find({ userId: req.user.id }).sort({ category: 1 })
    const spentByCat = await getUserCategorySpendByMonth(req.user.id, month)

    const lines = budgets.map((b) => {
      const spent = round2(spentByCat[b.category] || 0)
      const limit = round2(b.monthlyLimit)
      const utilization = limit > 0 ? spent / limit : 0
      return {
        id: b._id,
        category: b.category,
        monthlyLimit: limit,
        spent,
        currency: b.currency,
        utilization: round2(utilization),
        threshold: thresholdLevel(utilization)
      }
    })

    const payload = {
      month,
      lines,
      alerts: lines.filter((l) => l.threshold !== 'ok')
    }

    const pyBody = {
      month,
      budgets: lines.map((l) => ({
        category: l.category,
        monthly_limit: l.monthlyLimit,
        spent: l.spent,
        currency: l.currency
      }))
    }

    const py = await proxyAnalyticsRequest({
      method: 'post',
      path: '/budget-insights',
      body: pyBody
    })

    if (py.ok) {
      payload.insights = py.data
    } else {
      payload.insights = null
      payload.insightsError = py.message
    }

    res.json(payload)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
