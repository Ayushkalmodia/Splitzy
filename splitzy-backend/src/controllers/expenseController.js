import Expense from '../models/Expense.js'
import Group from '../models/Group.js'
import BalanceService from '../services/balanceService.js'
import { fetchMlExpenseCategory } from '../services/expenseCategoryMlService.js'
import { validate, createExpenseSchema, updateExpenseSchema, expenseQuerySchema } from '../utils/validation.js'
import { isValidCurrency, roundToTwo, addCurrency, subtractCurrency, divideCurrency } from '../utils/currency.js'
import { emitToGroup } from '../realtime/socket.js'

const isSplitInGroupMembers = (split, group) => {
  const groupMemberIds = new Set((group.members || []).map((memberId) => memberId.toString()))
  const splitId = split.userId?.toString()
  return Boolean(splitId && groupMemberIds.has(splitId))
}

/**
 * Enrich payload with ML `predictedCategory` / `categoryConfidence`.
 * When `applyCategory` is true, also sets `category` to the ML slug.
 */
const applyMlCategoryFields = async (expenseData, { manualSelect, applyCategory }) => {
  const desc = String(expenseData.description || '').trim()
  if (!desc) return

  const ml = await fetchMlExpenseCategory({
    description: desc,
    merchant: expenseData.merchant,
    amount: expenseData.amount
  })
  if (!ml) return

  expenseData.predictedCategory = ml.slug
  expenseData.categoryConfidence = ml.categoryConfidence
  if (applyCategory && !manualSelect) {
    expenseData.category = ml.slug
  }
}

export const listExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'createdAt:desc',
      category,
      from,
      to,
      q
    } = req.query
    const [sortField, sortDir] = String(sort).split(':')
    const sortObj = { [sortField || 'createdAt']: (sortDir === 'asc' ? 1 : -1) }

    const groups = await Group.find({ members: req.user.id, isActive: true }).select('_id')
    const groupIds = groups.map((group) => group._id)
    const filter = { groupId: { $in: groupIds } }
    if (category) filter.category = category
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to) filter.date.$lte = new Date(to)
    }
    if (q) {
      filter.description = { $regex: String(q), $options: 'i' }
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * lim

    const [items, total] = await Promise.all([
      Expense.find(filter)
        .populate('paidBy', 'name email')
        .populate('splits.userId', 'name email')
        .populate('groupId', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(lim),
      Expense.countDocuments(filter)
    ])
    res.json({
      items,
      page: pageNum,
      limit: lim,
      total,
      hasNext: skip + items.length < total
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const listByGroup = async (req, res) => {
  const { groupId } = req.params
  try {
    const { page = 1, limit = 20, sort = 'createdAt:desc', category, from, to, q } = req.query
    const [sortField, sortDir] = String(sort).split(':')
    const sortObj = { [sortField || 'createdAt']: (sortDir === 'asc' ? 1 : -1) }

    const membership = await Group.findOne({ _id: groupId, members: req.user.id, isActive: true }).select('_id')
    if (!membership) {
      return res.status(403).json({ message: 'Access denied for this group' })
    }
    const filter = { groupId }
    if (category) filter.category = category
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to) filter.date.$lte = new Date(to)
    }
    if (q) filter.description = { $regex: String(q), $options: 'i' }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * lim

    const [items, total] = await Promise.all([
      Expense.find(filter)
        .populate('paidBy', 'name email')
        .populate('splits.userId', 'name email')
        .populate('groupId', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(lim),
      Expense.countDocuments(filter)
    ])
    res.json({ items, page: pageNum, limit: lim, total, hasNext: skip + items.length < total })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createExpense = async (req, res) => {
  try {
    const expenseData = req.body
    
    // Validate amount
    if (!isValidCurrency(expenseData.amount) || parseFloat(expenseData.amount) <= 0) {
      return res.status(400).json({
        message: 'Invalid amount',
        errors: ['Amount must be a positive number']
      })
    }
    
    // Round amount to 2 decimal places
    expenseData.amount = roundToTwo(expenseData.amount)
    
    // Validate and process splits
    const validation = BalanceService.validateExpenseSplits(expenseData)
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Invalid expense splits',
        errors: validation.errors
      })
    }
    
    // Set processed splits with rounded amounts
    expenseData.splits = validation.processedSplits.map(split => ({
      ...split,
      amount: roundToTwo(split.amount),
      percentage: roundToTwo(split.percentage)
    }))
    
    if (!expenseData.groupId) {
      return res.status(400).json({ message: 'Group is required for all expenses' })
    }

    const group = await Group.findOne({
      _id: expenseData.groupId,
      members: req.user.id,
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    // Validate that all split participants are group members
    for (const split of expenseData.splits) {
      if (!split.userId) {
        return res.status(400).json({ message: 'All split participants must be registered group members' })
      }
      if (!isSplitInGroupMembers(split, group)) {
        return res.status(400).json({ message: 'Split participant is not a group member' })
      }
    }

    const manualSelect = expenseData.categoryManuallySelected === true
    delete expenseData.categoryManuallySelected

    await applyMlCategoryFields(expenseData, {
      manualSelect,
      applyCategory: true
    })
    
    const expense = await Expense.create({
      ...expenseData,
      createdBy: req.user.id
    })
    
    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splits.userId', 'name email')
      .populate('groupId', 'name')
    emitToGroup(expenseData.groupId, 'expense:created', { expense: populatedExpense })

    res.status(201).json(populatedExpense)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params
    const expenseData = req.body
    
    // Check if expense exists and user has permission
    const existingExpense = await Expense.findById(id)
    
    if (!existingExpense) {
      return res.status(404).json({ message: 'Expense not found or access denied' })
    }
    
    // Validate amount if provided
    if (expenseData.amount !== undefined) {
      if (!isValidCurrency(expenseData.amount) || parseFloat(expenseData.amount) <= 0) {
        return res.status(400).json({
          message: 'Invalid amount',
          errors: ['Amount must be a positive number']
        })
      }
      expenseData.amount = roundToTwo(expenseData.amount)
    }
    
    // Validate and process splits if provided
    if (expenseData.splits || expenseData.splitType) {
      const fullExpenseData = { ...existingExpense.toObject(), ...expenseData }
      const validation = BalanceService.validateExpenseSplits(fullExpenseData)
      
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Invalid expense splits',
          errors: validation.errors
        })
      }
      
      expenseData.splits = validation.processedSplits.map(split => ({
        ...split,
        amount: roundToTwo(split.amount),
        percentage: roundToTwo(split.percentage)
      }))
    }
    
    const targetGroupId = expenseData.groupId || existingExpense.groupId
    const group = await Group.findOne({ _id: targetGroupId, members: req.user.id, isActive: true })
    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }
    if (expenseData.splits) {
      for (const split of expenseData.splits) {
        if (!split.userId) {
          return res.status(400).json({ message: 'All split participants must be registered group members' })
        }
        if (!isSplitInGroupMembers(split, group)) {
          return res.status(400).json({ message: 'Split participant is not a group member' })
        }
      }
    }

    // Updates: preserve category unless client explicitly opts in with `categoryManuallySelected: false`.
    const manualSelect = expenseData.categoryManuallySelected !== false
    delete expenseData.categoryManuallySelected

    const textFieldsTouched =
      expenseData.description !== undefined ||
      expenseData.merchant !== undefined ||
      expenseData.amount !== undefined

    if (textFieldsTouched) {
      const merged = {
        ...existingExpense.toObject(),
        ...expenseData
      }
      await applyMlCategoryFields(merged, {
        manualSelect,
        applyCategory: true
      })
      expenseData.predictedCategory = merged.predictedCategory
      expenseData.categoryConfidence = merged.categoryConfidence
      if (!manualSelect && merged.category) {
        expenseData.category = merged.category
      }
    }
    
    const expense = await Expense.findById(id)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }
    
    // Apply updates manually to trigger pre-save hooks
    Object.assign(expense, expenseData)
    await expense.save()
    
    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splits.userId', 'name email')
      .populate('groupId', 'name')
    emitToGroup(populatedExpense.groupId?._id || populatedExpense.groupId, 'expense:updated', { expense: populatedExpense })

    res.json(populatedExpense)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteExpense = async (req, res) => {
  const { id } = req.params
  try {
    // Check if expense exists and user has permission
    const expense = await Expense.findById(id)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or access denied' })
    }
    const group = await Group.findOne({ _id: expense.groupId, members: req.user.id, isActive: true }).select('_id')
    if (!group) {
      return res.status(403).json({ message: 'Access denied for this group' })
    }
    
    // Delete the expense
    await Expense.findByIdAndDelete(id)
    emitToGroup(expense.groupId, 'expense:deleted', { expenseId: id, groupId: expense.groupId })
    
    res.json({ 
      message: 'Expense deleted successfully',
      expenseId: id 
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const stats = async (req, res) => {
  try {
    const { groupId } = req.query
    
    const groups = await Group.find({ members: req.user.id, isActive: true }).select('_id')
    const groupIds = groups.map((group) => group._id)
    let filter = { groupId: { $in: groupIds } }
    if (groupId) {
      filter.groupId = groupId
    }
    
    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name email')
      .populate('splits.userId', 'name email')
    
    const totalSpent = expenses.reduce((sum, e) => addCurrency(sum, e.amount || 0), 0)
    const userEmail = req.user.email

    // Calculate user's balance using the new split structure
    let totalOwed = 0
    let totalReceived = 0
    
    expenses.forEach(expense => {
      const isPayer = expense.paidBy?._id?.toString() === req.user.id || 
                     expense.paidBy?.email === userEmail
      
      if (isPayer) {
        // User paid this expense
        const userSplits = expense.splits?.filter(split => 
          split.userId?.toString() === req.user.id || split.email === userEmail
        ) || []
        
        if (userSplits.length > 0) {
          const userShare = userSplits.reduce((sum, split) => addCurrency(sum, split.amount || 0), 0)
          totalReceived = addCurrency(totalReceived, subtractCurrency(expense.amount, userShare))
        } else {
          // Backward compatibility for old expenses
          const splitCount = expense.splitBetween?.length || expense.splits?.length || 1
          const userShare = divideCurrency(expense.amount, splitCount)
          totalReceived = addCurrency(totalReceived, subtractCurrency(expense.amount, userShare))
        }
      } else {
        // User didn't pay this expense
        const userSplits = expense.splits?.filter(split => 
          split.userId?.toString() === req.user.id || split.email === userEmail
        ) || []
        
        if (userSplits.length > 0) {
          totalOwed = addCurrency(totalOwed, userSplits.reduce((sum, split) => addCurrency(sum, split.amount || 0), 0))
        } else {
          // Backward compatibility for old expenses
          const splitCount = expense.splitBetween?.length || expense.splits?.length || 1
          totalOwed = addCurrency(totalOwed, divideCurrency(expense.amount, splitCount))
        }
      }
    })

    res.json({
      totalSpent: roundToTwo(totalSpent),
      totalOwed: roundToTwo(totalOwed),
      totalReceived: roundToTwo(totalReceived),
      netBalance: roundToTwo(subtractCurrency(totalReceived, totalOwed))
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getUserBalance = async (req, res) => {
  try {
    const balanceData = await BalanceService.getUserTotalBalance(req.user.id)
    res.json(balanceData)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
