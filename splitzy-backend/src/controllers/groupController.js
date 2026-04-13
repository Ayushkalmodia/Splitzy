import Group from '../models/Group.js'
import User from '../models/User.js'
import Expense from '../models/Expense.js'
import InviteService from '../services/inviteService.js'
import BalanceService from '../services/balanceService.js'
import { proxyAnalyticsRequest } from '../services/analyticsProxyService.js'
import { validate, createGroupSchema, updateGroupSchema, inviteToGroupSchema, paginationSchema } from '../utils/validation.js'

const normalizeBalanceKey = (b) => {
  if (b.userId) {
    const raw = b.userId._id || b.userId
    const id = raw?.toString?.()
    if (id) return id
  }
  if (b.email) return String(b.email).toLowerCase()
  return null
}

const buildUserLookup = (balancesArray) => {
  const map = {}
  for (const b of balancesArray) {
    const key = normalizeBalanceKey(b)
    if (!key) continue
    const entry = {
      userId: b.userId?._id || b.userId,
      email: b.email,
      name: b.name || b.email || 'Member',
      isTemporary: !!b.isTemporary
    }
    map[key] = entry
  }
  return map
}

export const getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * lim

    // Build filter
    const filter = {
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    }

    // Add search filter if provided
    if (search) {
      filter.$and = filter.$and || []
      filter.$and.push({
        name: { $regex: search, $options: 'i' }
      })
    }

    const [groups, total] = await Promise.all([
      Group.find(filter)
        .populate('createdBy', 'name email')
        .populate('members', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(lim),
      Group.countDocuments(filter)
    ])

    res.json({
      items: groups,
      page: pageNum,
      limit: lim,
      total,
      hasNext: skip + groups.length < total
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createGroup = async (req, res) => {
  try {
    const { name, description, members = [] } = req.body

    const requestedMemberIds = Array.isArray(members) ? members : []
    const uniqueRequestedMemberIds = Array.from(new Set(requestedMemberIds.map(String)))

    if (uniqueRequestedMemberIds.length > 0) {
      const validUsers = await User.find({ _id: { $in: uniqueRequestedMemberIds } }).select('_id')
      if (validUsers.length !== uniqueRequestedMemberIds.length) {
        return res.status(400).json({ message: 'One or more selected users do not exist' })
      }
    }

    const finalMembers = Array.from(new Set([String(req.user.id), ...uniqueRequestedMemberIds]))

    const group = await Group.create({
      name,
      description,
      createdBy: req.user.id,
      members: finalMembers
    })

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')

    res.status(201).json(populatedGroup)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, members } = req.body

    // Check if user is group creator
    const group = await Group.findOne({
      _id: id,
      createdBy: req.user.id
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or insufficient permissions' })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (members !== undefined) {
      const requestedMemberIds = Array.isArray(members) ? members : []
      const uniqueRequestedMemberIds = Array.from(new Set(requestedMemberIds.map(String)))
      if (uniqueRequestedMemberIds.length > 0) {
        const validUsers = await User.find({ _id: { $in: uniqueRequestedMemberIds } }).select('_id')
        if (validUsers.length !== uniqueRequestedMemberIds.length) {
          return res.status(400).json({ message: 'One or more selected users do not exist' })
        }
      }
      updateData.members = Array.from(new Set([String(req.user.id), ...uniqueRequestedMemberIds]))
    }

    Object.assign(group, updateData)
    await group.save()

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')

    res.json(populatedGroup)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params
    
    const group = await Group.findOne({
      _id: id,
      createdBy: req.user.id
    })
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found or insufficient permissions' })
    }

    // Soft delete by setting isActive to false
    group.isActive = false
    await group.save()
    
    res.json({ message: 'Group deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getGroupBalances = async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: id,
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ],
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    const balances = await BalanceService.calculateGroupBalances(id)
    res.json(balances)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getGroupOptimizedSettlements = async (req, res) => {
  try {
    const { id } = req.params

    const group = await Group.findOne({
      _id: id,
      $or: [{ createdBy: req.user.id }, { members: req.user.id }],
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    const balanceData = await BalanceService.calculateGroupBalances(id)
    const balanceMap = {}
    for (const b of balanceData.balances) {
      const key = normalizeBalanceKey(b)
      if (!key) continue
      balanceMap[key] = Math.round((Number(b.netBalance) || 0) * 100) / 100
    }

    const legacyCount = balanceData.debts?.length ?? 0
    const result = await proxyAnalyticsRequest({
      method: 'post',
      path: '/optimize-settlement',
      body: {
        group_id: String(id),
        balances: balanceMap,
        legacy_suggestion_count: legacyCount
      }
    })

    if (!result.ok) {
      return res.status(result.status).json({
        message: result.message,
        details: result.details
      })
    }

    const lookup = buildUserLookup(balanceData.balances)
    const enrich = (uid) =>
      lookup[uid] || {
        userId: null,
        name: String(uid),
        email: null,
        isTemporary: true
      }

    const data = result.data
    res.json({
      ...data,
      legacyPairwiseCount: legacyCount,
      transactions: (data.transactions || []).map((t) => ({
        from: enrich(t.from),
        to: enrich(t.to),
        amount: t.amount
      }))
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getGroupExpenses = async (req, res) => {
  try {
    const { id } = req.params
    const group = await Group.findOne({ _id: id, members: req.user.id, isActive: true }).select('_id')
    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' })
    }

    const expenses = await Expense.find({ groupId: id })
      .populate('paidBy', 'name email')
      .populate('splits.userId', 'name email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })

    res.json({ items: expenses })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const generateInviteLink = async (req, res) => {
  try {
    const { id } = req.params
    const { expiresInHours = 24 } = req.body
    
    // Check if user is group creator
    const group = await Group.findOne({
      _id: id,
      createdBy: req.user.id,
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or insufficient permissions' })
    }

    const inviteData = await InviteService.generateInviteToken(id, expiresInHours)
    res.json(inviteData)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const generateInviteCode = async (req, res) => {
  try {
    const { id } = req.params
    const group = await Group.findOne({
      _id: id,
      createdBy: req.user.id,
      isActive: true
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or insufficient permissions' })
    }

    // Save to trigger generation in model if empty.
    await group.save()
    res.json({ inviteCode: group.inviteCode })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const joinByInviteCode = async (req, res) => {
  try {
    const inviteCode = String(req.body.inviteCode || '').trim().toUpperCase()
    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' })
    }

    const group = await Group.findOne({ inviteCode, isActive: true })
    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code' })
    }

    const members = new Set((group.members || []).map((memberId) => memberId.toString()))
    members.add(String(req.user.id))
    group.members = Array.from(members)
    await group.save()

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')

    res.json({
      message: 'Successfully joined the group',
      group: populatedGroup
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const joinGroup = async (req, res) => {
  try {
    const { token } = req.params
    
    const group = await InviteService.joinViaInviteToken(token, req.user.id)
    
    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')

    res.json({
      message: 'Successfully joined the group',
      group: populatedGroup
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

export const validateInvite = async (req, res) => {
  try {
    const { token } = req.params
    
    const inviteData = await InviteService.validateInviteToken(token)
    res.json(inviteData)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

export const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params
    
    const group = await InviteService.removeMember(id, memberId, req.user.id)
    
    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')

    res.json({
      message: 'Member removed successfully',
      group: populatedGroup
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

export const updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params
    const { role } = req.body
    
    const group = await InviteService.updateMemberRole(id, memberId, role, req.user.id)
    
    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')

    res.json({
      message: 'Member role updated successfully',
      group: populatedGroup
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
