import { proxyAnalyticsRequest } from './analyticsProxyService.js'

/**
 * Map FastAPI display labels to Mongo / UI category slugs.
 */
const ML_LABEL_TO_SLUG = {
  Food: 'food',
  Travel: 'transport',
  Shopping: 'shopping',
  Utilities: 'utilities',
  Entertainment: 'entertainment',
  Rent: 'rent',
  Other: 'other'
}

const resolveLabelAndSlug = (rawLabel) => {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return { predictedLabel: 'Other', slug: 'other' }
  }
  const trimmed = rawLabel.trim()
  if (ML_LABEL_TO_SLUG[trimmed]) {
    return { predictedLabel: trimmed, slug: ML_LABEL_TO_SLUG[trimmed] }
  }
  const lower = trimmed.toLowerCase()
  const match = Object.entries(ML_LABEL_TO_SLUG).find(([k]) => k.toLowerCase() === lower)
  if (match) {
    return { predictedLabel: match[0], slug: match[1] }
  }
  return { predictedLabel: 'Other', slug: 'other' }
}

/**
 * Call Python `/categorize-expense`. Returns null on failure (caller should fall back).
 */
export const fetchMlExpenseCategory = async ({ description, merchant, amount }) => {
  const result = await proxyAnalyticsRequest({
    method: 'post',
    path: '/categorize-expense',
    body: {
      description: String(description || '').trim(),
      merchant: merchant ? String(merchant).trim() : undefined,
      amount: amount != null && amount !== '' ? Number(amount) : undefined
    }
  })

  if (!result.ok || !result.data) {
    return null
  }

  const { predictedLabel, slug } = resolveLabelAndSlug(result.data.predictedCategory)
  const confidence =
    typeof result.data.categoryConfidence === 'number'
      ? result.data.categoryConfidence
      : Number(result.data.categoryConfidence) || 0

  return {
    predictedLabel,
    slug,
    categoryConfidence: confidence
  }
}
