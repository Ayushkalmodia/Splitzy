import mongoose from 'mongoose'

const settlementSchema = new mongoose.Schema(
  {
    groupId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Group', 
      required: true
    },
    fromUser: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    toUser: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'USD' 
    },
    method: { 
      type: String, 
      enum: ['cash', 'manual', 'bank_transfer', 'digital'], 
      default: 'manual' 
    },
    notes: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'cancelled'], 
      default: 'confirmed'
    },
    confirmedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    confirmedAt: { 
      type: Date 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }
  },
  { timestamps: true }
)

// Index for better query performance
settlementSchema.index({ groupId: 1, createdAt: -1 })
settlementSchema.index({ fromUser: 1, toUser: 1 })
settlementSchema.index({ status: 1 })

// Backward compatibility aliases
settlementSchema.virtual('from').get(function() {
  return this.fromUser
})

settlementSchema.virtual('to').get(function() {
  return this.toUser
})

settlementSchema.set('toJSON', { virtuals: true })
settlementSchema.set('toObject', { virtuals: true })

export default mongoose.model('Settlement', settlementSchema)
