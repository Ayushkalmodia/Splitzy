import { api } from '../lib/api.js'

/**
 * Calls Node `/api/analytics/*`, which proxies to FastAPI with timeout handling.
 * Dedicated timeout for ML categorization (can be slower on cold start).
 */
const CATEGORIZE_TIMEOUT_MS = 12000

export const analyticsService = {
  /**
   * ML expense category prediction (React → Node → FastAPI).
   * @returns {Promise<{ predictedCategory: string, categoryConfidence: number }>}
   */
  categorizeExpense: async ({ description, merchant, amount }) => {
    const response = await api.post(
      '/analytics/categorize-expense',
      {
        description: String(description || '').trim(),
        merchant: merchant ? String(merchant).trim() : undefined,
        amount: amount != null && !Number.isNaN(Number(amount)) ? Number(amount) : undefined
      },
      { timeout: CATEGORIZE_TIMEOUT_MS }
    )
    return response.data
  }
}
