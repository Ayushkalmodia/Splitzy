import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    role: { type: String, enum: ['admin', 'member'], default: 'member', index: true },
    refreshTokens: [{ type: String }]
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)
