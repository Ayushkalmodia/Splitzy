import mongoose from 'mongoose'

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true, lowercase: true, trim: true },
    monthlyLimit: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true, uppercase: true, maxlength: 3 }
  },
  { timestamps: true }
)

budgetSchema.index({ userId: 1, category: 1 }, { unique: true })

const Budget = mongoose.model('Budget', budgetSchema)
export default Budget
