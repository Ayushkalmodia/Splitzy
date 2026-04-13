import Settlement from '../models/Settlement.js'
import Group from '../models/Group.js'
import User from '../models/User.js'
import BalanceService from '../services/balanceService.js'
import { validate, createSettlementSchema, updateSettlementSchema, paginationSchema } from '../utils/validation.js'
import { emitToGroup } from '../realtime/socket.js'

export const createSettlement = async (req, res) => {
  try {
    const settlementData = req.body
    
    // Validate that both users are members of the group
    const group = await Group.findOne({
      _id: settlementData.groupId,
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    }).populate('members', 'name email')

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    // Check if both users are group members
    const groupMemberIds = new Set(group.members.map((member) => member._id.toString()))
    const fromMember = settlementData.fromUser && groupMemberIds.has(String(settlementData.fromUser))
    const toMember = settlementData.toUser && groupMemberIds.has(String(settlementData.toUser))

    if (!fromMember || !toMember) {
      return res.status(400).json({ message: 'Both users must be group members' })
    }

    // Validate settlement amount
    if (!settlementData.amount || parseFloat(settlementData.amount) <= 0) {
      return res.status(400).json({ message: 'Settlement amount must be greater than 0' })
    }

    // Create settlement
    const settlement = await Settlement.create({
      ...settlementData,
      createdBy: req.user.id,
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
      status: 'confirmed'
    })

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('groupId', 'name')
      .populate('confirmedBy', 'name email')
      .populate('createdBy', 'name email')

    emitToGroup(settlementData.groupId, 'settlement:created', { settlement: populatedSettlement })

    res.status(201).json(populatedSettlement)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getSettlements = async (req, res) => {
  try {
    const { page = 1, limit = 20, groupId, status, sort = 'createdAt:desc' } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * lim

    const [sortField, sortDir] = String(sort).split(':')
    const sortObj = { [sortField || 'createdAt']: (sortDir === 'asc' ? 1 : -1) }

    // Build filter
    const filter = {
      $or: [
        { fromUser: req.user.id },
        { toUser: req.user.id },
        { createdBy: req.user.id }
      ]
    }

    if (groupId) filter.groupId = groupId
    if (status) filter.status = status

    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email')
        .populate('groupId', 'name')
        .populate('confirmedBy', 'name email')
        .populate('createdBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(lim),
      Settlement.countDocuments(filter)
    ])

    res.json({
      items: settlements,
      page: pageNum,
      limit: lim,
      total,
      hasNext: skip + settlements.length < total
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params
    const { page = 1, limit = 20, status, sort = 'createdAt:desc' } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * lim

    const [sortField, sortDir] = String(sort).split(':')
    const sortObj = { [sortField || 'createdAt']: (sortDir === 'asc' ? 1 : -1) }

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    // Build filter
    const filter = { groupId }
    if (status) filter.status = status

    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email')
        .populate('groupId', 'name')
        .populate('confirmedBy', 'name email')
        .populate('createdBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(lim),
      Settlement.countDocuments(filter)
    ])

    res.json({
      items: settlements,
      page: pageNum,
      limit: lim,
      total,
      hasNext: skip + settlements.length < total
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateSettlement = async (req, res) => {
  try {
    const { id } = req.params
    const settlementData = req.body

    const settlement = await Settlement.findOne({
      _id: id,
      $or: [
        { fromUser: req.user.id },
        { toUser: req.user.id },
        { createdBy: req.user.id }
      ]
    })

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found or access denied' })
    }

    // Update settlement
    const updatedSettlement = await Settlement.findByIdAndUpdate(
      id,
      settlementData,
      { new: true, runValidators: true }
    )

    const populatedSettlement = await Settlement.findById(updatedSettlement._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('groupId', 'name')
      .populate('confirmedBy', 'name email')
      .populate('createdBy', 'name email')

    res.json(populatedSettlement)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteSettlement = async (req, res) => {
  try {
    const { id } = req.params

    const settlement = await Settlement.findOne({
      _id: id,
      $or: [
        { fromUser: req.user.id },
        { toUser: req.user.id },
        { createdBy: req.user.id }
      ]
    })

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found or access denied' })
    }

    await Settlement.findByIdAndDelete(id)
    res.json({ message: 'Settlement deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const confirmSettlement = async (req, res) => {
  try {
    const { id } = req.params

    const settlement = await Settlement.findOne({
      _id: id,
      $or: [
        { fromUser: req.user.id },
        { toUser: req.user.id }
      ]
    })

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found or access denied' })
    }

    if (settlement.status === 'confirmed') {
      return res.status(400).json({ message: 'Settlement is already confirmed' })
    }

    settlement.status = 'confirmed'
    settlement.confirmedBy = req.user.id
    settlement.confirmedAt = new Date()
    await settlement.save()

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('groupId', 'name')
      .populate('confirmedBy', 'name email')
      .populate('createdBy', 'name email')

    res.json({
      message: 'Settlement confirmed successfully',
      settlement: populatedSettlement
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const cancelSettlement = async (req, res) => {
  try {
    const { id } = req.params

    const settlement = await Settlement.findOne({
      _id: id,
      $or: [
        { fromUser: req.user.id },
        { toUser: req.user.id },
        { createdBy: req.user.id }
      ]
    })

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found or access denied' })
    }

    if (settlement.status === 'cancelled') {
      return res.status(400).json({ message: 'Settlement is already cancelled' })
    }

    settlement.status = 'cancelled'
    await settlement.save()

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('groupId', 'name')
      .populate('confirmedBy', 'name email')
      .populate('createdBy', 'name email')

    res.json({
      message: 'Settlement cancelled successfully',
      settlement: populatedSettlement
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getSettlementSuggestions = async (req, res) => {
  try {
    const { groupId } = req.params

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    // Get current balances
    const balanceData = await BalanceService.calculateGroupBalances(groupId)
    
    // Populate user details for each suggestion
    const suggestions = await Promise.all(balanceData.debts.map(async (debt) => {
      const [fromUser, toUser] = await Promise.all([
        User.findById(debt.from.userId).select('name email'),
        User.findById(debt.to.userId).select('name email')
      ])

      return {
        fromUser: fromUser || { _id: debt.from.userId, name: debt.from.name, email: debt.from.email },
        toUser: toUser || { _id: debt.to.userId, name: debt.to.name, email: debt.to.email },
        amount: debt.amount,
        groupId: groupId,
        method: 'manual'
      }
    }))

    res.json({
      suggestions,
      totalSuggestions: suggestions.length
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
