import Group from '../models/Group.js'
import Expense from '../models/Expense.js'
import User from '../models/User.js'

/**
 * Sum the authenticated user's share of expenses per category for a calendar month.
 * Share = split row matching userId or email; if none, 0.
 */
export async function getUserCategorySpendByMonth(userId, monthStr) {
  const user = await User.findById(userId).select('email')
  if (!user) {
    throw new Error('User not found')
  }

  const parts = monthStr.split('-')
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (!y || !m || m < 1 || m > 12) {
    throw new Error('Invalid month')
  }

  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59, 999)

  const groups = await Group.find({
    $or: [{ members: userId }, { createdBy: userId }],
    isActive: true
  }).select('_id')

  const groupIds = groups.map((g) => g._id)
  if (groupIds.length === 0) {
    return {}
  }

  const expenses = await Expense.find({
    groupId: { $in: groupIds },
    date: { $gte: start, $lte: end }
  }).select('category splits')

  const uidStr = userId.toString()
  const emailLower = (user.email || '').toLowerCase()
  const byCat = {}

  for (const exp of expenses) {
    const cat = (exp.category || 'other').toLowerCase()
    let share = 0
    const splits = exp.splits || []
    for (const s of splits) {
      const sid = s.userId ? s.userId.toString() : ''
      const sem = (s.email || '').toLowerCase()
      if (sid === uidStr || (emailLower && sem === emailLower)) {
        share += Number(s.amount) || 0
      }
    }
    byCat[cat] = (byCat[cat] || 0) + share
  }

  return byCat
}
