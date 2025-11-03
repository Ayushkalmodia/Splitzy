import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'other' },
    date: { type: Date, default: Date.now },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    paidBy: { type: String, required: true },
    splitBetween: [{ type: String, required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
)

export default mongoose.model('Expense', expenseSchema)
