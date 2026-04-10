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
      }).populate('members.userId', 'email')

      if (!group) {
        throw new Error('Invalid or expired invite token')
      }

      const user = await User.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Check if user is already a member
      const existingMember = group.members.find(member => 
        member.userId && member.userId.toString() === userId
      )

      if (existingMember) {
        throw new Error('User is already a member of this group')
      }

      // Add user to group
      group.members.push({
        userId: userId,
        email: user.email,
        role: role,
        joinedAt: new Date(),
        isTemporary: false
      })

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
   * Add temporary users to group
   * @param {string} groupId - Group ID
   * @param {Array} tempUsers - Array of temporary user objects
   * @returns {Promise<Object>} Updated group
   */
  static async addTemporaryUsers(groupId, tempUsers) {
    try {
      console.log('Adding temporary users to group:', groupId, tempUsers)
      const group = await Group.findById(groupId)
      if (!group) {
        throw new Error('Group not found')
      }
      
      const newMembers = []
      
      for (const tempUser of tempUsers) {
        // Check if email already exists as a registered user
        if (tempUser.email) {
          console.log('Looking for user with email:', tempUser.email)
          const existingUser = await User.findOne({ email: tempUser.email.toLowerCase() })
          console.log('Found existing user:', existingUser)
          if (existingUser) {
            // Add as registered user if not already member
            const existingMember = group.members.find(member => 
              member.userId && member.userId.toString() === existingUser._id.toString()
            )
            
            if (!existingMember) {
              newMembers.push({
                userId: existingUser._id,
                email: existingUser.email,
                role: tempUser.role || 'member',
                joinedAt: new Date(),
                isTemporary: false
              })
            }
            continue
          }
        }

        // Add as temporary user
        const existingTempMember = group.members.find(member => 
          member.email && member.email === tempUser.email
        )
        
        if (!existingTempMember) {
          newMembers.push({
            email: tempUser.email,
            tempName: tempUser.name || tempUser.tempName,
            role: tempUser.role || 'member',
            joinedAt: new Date(),
            isTemporary: true
          })
        }
      }

      group.members.push(...newMembers)
      await group.save()

      return group
    } catch (error) {
      throw new Error(`Failed to add temporary users: ${error.message}`)
    }
  }

  /**
   * Convert temporary user to registered user
   * @param {string} groupId - Group ID
   * @param {string} email - Temporary user email
   * @param {string} userId - New user ID
   * @returns {Promise<Object>} Updated group
   */
  static async convertTempUserToRegistered(groupId, email, userId) {
    try {
      const group = await Group.findById(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      const tempMemberIndex = group.members.findIndex(member => 
        member.isTemporary && member.email === email
      )

      if (tempMemberIndex === -1) {
        throw new Error('Temporary user not found in group')
      }

      const tempMember = group.members[tempMemberIndex]
      
      // Update the member to be a registered user
      group.members[tempMemberIndex] = {
        userId: userId,
        email: email,
        tempName: tempMember.tempName,
        role: tempMember.role,
        joinedAt: tempMember.joinedAt,
        isTemporary: false
      }

      await group.save()
      return group
    } catch (error) {
      throw new Error(`Failed to convert temporary user: ${error.message}`)
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

      // Check if requesting user is admin or owner
      const requestingMember = group.members.find(member => 
        member.userId && member.userId.toString() === requestingUserId
      )

      if (!requestingMember || (requestingMember.role !== 'admin' && group.owner.toString() !== requestingUserId)) {
        throw new Error('Only admins can remove members')
      }

      // Cannot remove the owner
      if (group.owner.toString() === userId) {
        throw new Error('Cannot remove group owner')
      }

      // Remove the member
      group.members = group.members.filter(member => 
        !(member.userId && member.userId.toString() === userId)
      )

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

      // Check if requesting user is admin or owner
      const requestingMember = group.members.find(member => 
        member.userId && member.userId.toString() === requestingUserId
      )

      if (!requestingMember || (requestingMember.role !== 'admin' && group.owner.toString() !== requestingUserId)) {
        throw new Error('Only admins can update member roles')
      }

      // Cannot change owner's role
      if (group.owner.toString() === userId) {
        throw new Error('Cannot change group owner role')
      }

      // Update the member role
      const memberIndex = group.members.findIndex(member => 
        member.userId && member.userId.toString() === userId
      )

      if (memberIndex === -1) {
        throw new Error('Member not found')
      }

      group.members[memberIndex].role = role
      await group.save()

      return group
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
      }).select('name description owner inviteTokenExpiry').populate('owner', 'name email')

      if (!group) {
        throw new Error('Invalid or expired invite token')
      }

      return {
        group: {
          _id: group._id,
          name: group.name,
          description: group.description,
          owner: group.owner,
          expiresAt: group.inviteTokenExpiry
        }
      }
    } catch (error) {
      throw new Error(`Failed to validate invite token: ${error.message}`)
    }
  }
}

export default InviteService
