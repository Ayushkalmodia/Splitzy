import mongoose from 'mongoose'
import { currencyEquals, divideCurrency, multiplyCurrency } from '../utils/currency.js'

const expenseSplitSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
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
  amount: { 
    type: Number, 
    required: false,
    min: 0 
  },
  percentage: { 
    type: Number, 
    required: false,
    min: 0,
    max: 100 
  },
  shares: { 
    type: Number, 
    required: false,
    min: 0 
  }
}, { _id: true })

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    category: { type: String, default: 'other' },
    date: { type: Date, default: Date.now },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    paidBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    splitType: { 
      type: String, 
      enum: ['equal', 'unequal', 'percentage', 'shares', 'manual'], 
      default: 'equal' 
    },
    splits: [expenseSplitSchema],
    notes: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    tags: [{ 
      type: String, 
      trim: true 
    }],
    receiptImageUrl: { 
      type: String, 
      trim: true 
    },
    // Backward compatibility fields
    splitBetween: [{ 
      type: String, 
      required: false 
    }],
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }
  },
  { timestamps: true }
)

// Index for better query performance
expenseSchema.index({ groupId: 1, createdAt: -1 })
expenseSchema.index({ paidBy: 1, createdAt: -1 })
expenseSchema.index({ 'splits.userId': 1 })
expenseSchema.index({ category: 1 })

// Validation middleware
expenseSchema.pre('save', function(next) {
  if (this.splitType === 'equal' && !this.splits.length) {
    // For backward compatibility, convert splitBetween to splits
    if (this.splitBetween && this.splitBetween.length > 0) {
      const equalAmount = divideCurrency(this.amount, this.splitBetween.length)
      this.splits = this.splitBetween.map(email => ({
        email,
        amount: equalAmount,
        percentage: divideCurrency(100, this.splitBetween.length),
        shares: 1
      }))
    }
  }
  
  // Validate that splits total equals the expense amount
  if (this.splits.length > 0) {
    const totalSplits = this.splits.reduce((sum, split) => {
      return sum + (split.amount || 0)
    }, 0)
    
    if (!currencyEquals(totalSplits, this.amount)) {
      return next(new Error('Total split amounts must equal the expense amount'))
    }
  }
  
  next()
})

export default mongoose.model('Expense', expenseSchema)
