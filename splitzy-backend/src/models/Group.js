import mongoose from 'mongoose'

const groupMemberSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false,
    default: null 
  },
  tempName: { 
    type: String, 
    required: false 
  },
  email: { 
    type: String, 
    required: false,
    lowercase: true,
    trim: true
  },
  role: { 
    type: String, 
    enum: ['admin', 'member'], 
    default: 'member' 
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  isTemporary: { 
    type: Boolean, 
    default: false 
  }
}, { _id: true })

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    members: [groupMemberSchema],
    inviteToken: { type: String, sparse: true },
    inviteTokenExpiry: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

// Index for better query performance
groupSchema.index({ 'members.userId': 1 })
groupSchema.index({ 'members.email': 1 })

// Ensure owner is always a member with admin role
groupSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('owner')) {
    const existingOwnerMember = this.members.find(m => 
      m.userId && m.userId.toString() === this.owner.toString()
    )
    
    if (!existingOwnerMember) {
      this.members.push({
        userId: this.owner,
        role: 'admin',
        joinedAt: new Date(),
        isTemporary: false
      })
    } else {
      existingOwnerMember.role = 'admin'
      existingOwnerMember.isTemporary = false
    }
  }
  next()
})

export default mongoose.model('Group', groupSchema)
