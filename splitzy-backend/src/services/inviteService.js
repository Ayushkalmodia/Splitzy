import { v4 as uuidv4 } from 'uuid'
import Group from '../models/Group.js'
import User from '../models/User.js'

class InviteService {
  /**
   * Generate invite token for a group
   * @param {string} groupId - Group ID
   * @param {number} expiresInHours - Token expiry in hours (default: 24)
   * @returns {Promise<Object>} Invite token and expiry
   */
  static async generateInviteToken(groupId, expiresInHours = 24) {
    try {
      const token = uuidv4()
      const expiry = new Date()
      expiry.setHours(expiry.getHours() + expiresInHours)

      await Group.findByIdAndUpdate(groupId, {
        inviteToken: token,
        inviteTokenExpiry: expiry
      })

      return {
        token,
        expiry,
        inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${token}`
      }
    } catch (error) {
      throw new Error(`Failed to generate invite token: ${error.message}`)
    }
  }

  /**
   * Join group via invite token
   * @param {string} token - Invite token
   * @param {string} userId - User ID joining the group
   * @param {string} role - User role (default: 'member')
   * @returns {Promise<Object>} Updated group
   */
  static async joinViaInviteToken(token, userId, role = 'member') {
    try {
      const group = await Group.findOne({
        inviteToken: token,
        inviteTokenExpiry: { $gt: new Date() },
        isActive: true
      }).populate('members', 'email')

      if (!group) {
        throw new Error('Invalid or expired invite token')
      }

      const user = await User.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Check if user is already a member
      const existingMember = group.members.some((memberId) => memberId.toString() === userId)

      if (existingMember) {
        throw new Error('User is already a member of this group')
      }

      // Add user to group
      group.members.push(userId)

      await group.save()

      // Clear invite token after successful join
      await Group.findByIdAndUpdate(group._id, {
        $unset: { inviteToken: 1, inviteTokenExpiry: 1 }
      })

      return group
    } catch (error) {
      throw new Error(`Failed to join group: ${error.message}`)
    }
  }

  /**
   * Remove member from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to remove
   * @param {string} requestingUserId - User making the request
   * @returns {Promise<Object>} Updated group
   */
  static async removeMember(groupId, userId, requestingUserId) {
    try {
      const group = await Group.findById(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Check if requesting user is group creator
      if (group.createdBy.toString() !== requestingUserId) {
        throw new Error('Only group creator can remove members')
      }

      // Cannot remove the creator
      if (group.createdBy.toString() === userId) {
        throw new Error('Cannot remove group creator')
      }

      // Remove the member
      group.members = group.members.filter((memberId) => memberId.toString() !== userId)

      await group.save()
      return group
    } catch (error) {
      throw new Error(`Failed to remove member: ${error.message}`)
    }
  }

  /**
   * Update member role
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to update
   * @param {string} role - New role
   * @param {string} requestingUserId - User making the request
   * @returns {Promise<Object>} Updated group
   */
  static async updateMemberRole(groupId, userId, role, requestingUserId) {
    try {
      const group = await Group.findById(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      throw new Error('Member roles are no longer supported in user-ID membership mode')
    } catch (error) {
      throw new Error(`Failed to update member role: ${error.message}`)
    }
  }

  /**
   * Validate invite token
   * @param {string} token - Invite token
   * @returns {Promise<Object>} Group details if valid
   */
  static async validateInviteToken(token) {
    try {
      const group = await Group.findOne({
        inviteToken: token,
        inviteTokenExpiry: { $gt: new Date() },
        isActive: true
      }).select('name description createdBy inviteTokenExpiry').populate('createdBy', 'name email')

      if (!group) {
        throw new Error('Invalid or expired invite token')
      }

      return {
        group: {
          _id: group._id,
          name: group.name,
          description: group.description,
          createdBy: group.createdBy,
          expiresAt: group.inviteTokenExpiry
        }
      }
    } catch (error) {
      throw new Error(`Failed to validate invite token: ${error.message}`)
    }
  }
}

export default InviteService
