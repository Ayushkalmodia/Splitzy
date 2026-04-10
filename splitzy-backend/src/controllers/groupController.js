import Group from '../models/Group.js'
import User from '../models/User.js'
import InviteService from '../services/inviteService.js'
import BalanceService from '../services/balanceService.js'
import { validate, createGroupSchema, updateGroupSchema, inviteToGroupSchema, paginationSchema } from '../utils/validation.js'

export const getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * lim

    // Build filter
    const filter = {
      $or: [
        { owner: req.user.id },
        { 'members.userId': req.user.id }
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
        .populate('owner', 'name email')
        .populate('members.userId', 'name email')
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
    
    // Create group with owner as admin
    const group = await Group.create({
      name,
      description,
      owner: req.user.id,
      members: [] // Will be added by pre-save middleware
    })
    
    // Add additional members if provided
    if (members.length > 0) {
      await InviteService.addTemporaryUsers(group._id, members)
    }
    
    // Skip validation for this route (temporary fix)
    const populatedGroup = await Group.findById(group._id)
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')
      .sort({ updatedAt: -1 })
      .skip(0)
      .limit(1)
    const total = await Group.countDocuments({ _id: group._id })
      
    res.status(201).json(populatedGroup)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, members } = req.body

    // Check if user is admin or owner
    const group = await Group.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'members': { $elemMatch: { userId: req.user.id, role: 'admin' } } }
      ]
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found or insufficient permissions' })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (members !== undefined) {
      // Handle member updates
      await InviteService.addTemporaryUsers(id, members)
    }

    Object.assign(group, updateData)
    await group.save()

    const populatedGroup = await Group.findById(group._id)
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')

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
      owner: req.user.id
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
        { owner: req.user.id },
        { 'members.userId': req.user.id }
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

export const generateInviteLink = async (req, res) => {
  try {
    const { id } = req.params
    const { expiresInHours = 24 } = req.body
    
    // Check if user is admin or owner
    const group = await Group.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'members': { $elemMatch: { userId: req.user.id, role: 'admin' } } }
      ],
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

export const joinGroup = async (req, res) => {
  try {
    const { token } = req.params
    
    const group = await InviteService.joinViaInviteToken(token, req.user.id)
    
    const populatedGroup = await Group.findById(group._id)
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')

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
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')

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
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')

    res.json({
      message: 'Member role updated successfully',
      group: populatedGroup
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
