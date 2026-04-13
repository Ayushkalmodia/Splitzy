import mongoose from 'mongoose'
import { customAlphabet } from 'nanoid'

const generateInviteCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    inviteCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    inviteToken: { type: String, sparse: true },
    inviteTokenExpiry: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

// Index for better query performance
groupSchema.index({ createdBy: 1, updatedAt: -1 })
groupSchema.index({ members: 1 })

groupSchema.pre('validate', function(next) {
  // Backward-compatibility for old payloads that still send "owner".
  if (!this.createdBy && this.owner) {
    this.createdBy = this.owner
  }

  const createdById = this.createdBy?.toString()
  const dedupedMembers = Array.from(
    new Set((this.members || []).map((memberId) => memberId?.toString()).filter(Boolean))
  )

  if (createdById && !dedupedMembers.includes(createdById)) {
    dedupedMembers.unshift(createdById)
  }

  this.members = dedupedMembers

  if (!this.members.length) {
    return next(new Error('Group must contain at least one member'))
  }

  if (!createdById) {
    return next(new Error('Group creator is required'))
  }

  if (!this.members.includes(createdById)) {
    return next(new Error('Group creator must be a member'))
  }

  if (!this.inviteCode) {
    this.inviteCode = generateInviteCode()
  }

  next()
})

export default mongoose.model('Group', groupSchema)
