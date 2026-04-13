/** Map FastAPI / ML display labels to persisted category slugs. */
export const ML_DISPLAY_TO_SLUG = {
  Food: 'food',
  Travel: 'transport',
  Shopping: 'shopping',
  Utilities: 'utilities',
  Entertainment: 'entertainment',
  Rent: 'rent',
  Other: 'other'
}

export const slugFromMlLabel = (label) => {
  if (!label || typeof label !== 'string') return 'other'
  const t = label.trim()
  if (ML_DISPLAY_TO_SLUG[t]) return ML_DISPLAY_TO_SLUG[t]
  const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  return ML_DISPLAY_TO_SLUG[cap] || 'other'
}

/** Dropdown options (slug `transport` = travel / transportation). */
export const EXPENSE_CATEGORY_OPTIONS = [
  { id: 'food', label: 'Food & Dining' },
  { id: 'transport', label: 'Travel & Transport' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'rent', label: 'Rent' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'other', label: 'Other' }
]
