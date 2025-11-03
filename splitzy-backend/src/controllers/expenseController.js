import Expense from '../models/Expense.js'
import Group from '../models/Group.js'

export const listExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ createdBy: req.user.id }).sort({ createdAt: -1 })
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const listByGroup = async (req, res) => {
  const { groupId } = req.params
  try {
    const expenses = await Expense.find({ createdBy: req.user.id, groupId }).sort({ createdAt: -1 })
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createExpense = async (req, res) => {
  const { description, amount, category, date, groupId, paidBy, splitBetween } = req.body
  if (!description || amount == null || !paidBy || !splitBetween?.length) {
    return res.status(400).json({ message: 'description, amount, paidBy, splitBetween are required' })
  }
  try {
    // Normalize members
    let members = (Array.isArray(splitBetween) ? splitBetween : [])
      .map((m) => String(m).trim())
      .filter((m) => m.length > 0)
    const membersLower = members.map((m) => m.toLowerCase())
    const paidByTrim = String(paidBy).trim()
    const paidByLower = paidByTrim.toLowerCase()
    // Ensure current user is part of the expense
    if (!membersLower.includes(String(req.user.email).toLowerCase())) {
      members.push(req.user.email)
    }
    // Recompute lowers after possible push and dedupe case-insensitively
    const dedupMap = new Map()
    members.forEach((m) => {
      const key = m.toLowerCase()
      if (!dedupMap.has(key)) dedupMap.set(key, m.trim())
    })
    members = Array.from(dedupMap.values())

    // If group is specified, ensure group contains current user, then validate membership and payer
    if (groupId) {
      const group = await Group.findOne({ _id: groupId, owner: req.user.id })
      if (!group) return res.status(404).json({ message: 'Group not found' })
      let groupMembersNorm = (group.members || []).map((m) => String(m).trim().toLowerCase())
      const currentLower = String(req.user.email).trim().toLowerCase()
      if (!groupMembersNorm.includes(currentLower)) {
        group.members.push(req.user.email)
        // dedupe and persist
        const dedupMap = new Map()
        group.members.forEach((m) => {
          const key = String(m).trim().toLowerCase()
          if (!dedupMap.has(key)) dedupMap.set(key, String(m).trim())
        })
        group.members = Array.from(dedupMap.values())
        await group.save()
        groupMembersNorm = (group.members || []).map((m) => String(m).trim().toLowerCase())
      }
      const allInGroup = members.every((m) => groupMembersNorm.includes(String(m).trim().toLowerCase()))
      if (!allInGroup) {
        return res.status(400).json({ message: 'All participants must be members of the group' })
      }
      if (!groupMembersNorm.includes(paidByLower)) {
        return res.status(400).json({ message: 'paidBy must be a member of the group' })
      }
    }

    const expense = await Expense.create({
      description,
      amount,
      category,
      date,
      groupId,
      paidBy,
      splitBetween: members,
      createdBy: req.user.id
    })
    res.status(201).json(expense)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateExpense = async (req, res) => {
  const { id } = req.params
  const { description, amount, category, date, groupId, paidBy, splitBetween } = req.body
  try {
    // Normalize members
    let members = (Array.isArray(splitBetween) ? splitBetween : [])
      .map((m) => String(m).trim())
      .filter((m) => m.length > 0)
    const membersLower = members.map((m) => m.toLowerCase())
    const paidByTrim = String(paidBy).trim()
    const paidByLower = paidByTrim.toLowerCase()
    if (!membersLower.includes(String(req.user.email).toLowerCase())) {
      members.push(req.user.email)
    }
    const dedupMap = new Map()
    members.forEach((m) => {
      const key = m.toLowerCase()
      if (!dedupMap.has(key)) dedupMap.set(key, m.trim())
    })
    members = Array.from(dedupMap.values())

    // If group is specified, ensure group contains current user, then validate membership and payer
    if (groupId) {
      const group = await Group.findOne({ _id: groupId, owner: req.user.id })
      if (!group) return res.status(404).json({ message: 'Group not found' })
      let groupMembersNorm = (group.members || []).map((m) => String(m).trim().toLowerCase())
      const currentLower = String(req.user.email).trim().toLowerCase()
      if (!groupMembersNorm.includes(currentLower)) {
        group.members.push(req.user.email)
        const dedupMap = new Map()
        group.members.forEach((m) => {
          const key = String(m).trim().toLowerCase()
          if (!dedupMap.has(key)) dedupMap.set(key, String(m).trim())
        })
        group.members = Array.from(dedupMap.values())
        await group.save()
        groupMembersNorm = (group.members || []).map((m) => String(m).trim().toLowerCase())
      }
      const allInGroup = members.every((m) => groupMembersNorm.includes(String(m).trim().toLowerCase()))
      if (!allInGroup) {
        return res.status(400).json({ message: 'All participants must be members of the group' })
      }
      const paidByLower = String(paidBy).trim().toLowerCase()
      if (!groupMembersNorm.includes(paidByLower)) {
        return res.status(400).json({ message: 'paidBy must be a member of the group' })
      }
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { $set: { description, amount, category, date, groupId, paidBy, splitBetween: members } },
      { new: true }
    )
    if (!expense) return res.status(404).json({ message: 'Expense not found' })
    res.json(expense)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteExpense = async (req, res) => {
  const { id } = req.params
  try {
    const expense = await Expense.findOneAndDelete({ _id: id, createdBy: req.user.id })
    if (!expense) return res.status(404).json({ message: 'Expense not found' })
    res.json({ message: 'Expense deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const stats = async (req, res) => {
  try {
    const expenses = await Expense.find({ createdBy: req.user.id })
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const userEmail = req.user.email

    const totalOwed = expenses.reduce((sum, e) => {
      if (e.paidBy !== userEmail) {
        return sum + Number(e.amount || 0) / e.splitBetween.length
      }
      return sum
    }, 0)

    const totalReceived = expenses.reduce((sum, e) => {
      if (e.paidBy === userEmail) {
        const ownShare = Number(e.amount || 0) / e.splitBetween.length
        return sum + Number(e.amount || 0) - ownShare
      }
      return sum
    }, 0)

    res.json({
      totalSpent: Number(totalSpent.toFixed(2)),
      totalOwed: Number(totalOwed.toFixed(2)),
      totalReceived: Number(totalReceived.toFixed(2))
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
