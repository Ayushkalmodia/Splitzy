import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    /** Present for email/password accounts; omitted for OAuth-only until user sets a password. */
    passwordHash: { type: String, required: false, default: undefined },
    profileImage: { type: String },
    /** Last-used OAuth provider (informational; socialLinks is source of truth). */
    provider: { type: String, enum: ['google', 'apple'] },
    providerId: { type: String },
    /** How the user can sign in after merges, e.g. ['local', 'google']. */
    authTypes: [{ type: String, enum: ['local', 'google', 'apple'] }],
    socialLinks: [
      {
        provider: { type: String, enum: ['google', 'apple'], required: true },
        providerId: { type: String, required: true }
      }
    ],
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    role: { type: String, enum: ['admin', 'member'], default: 'member', index: true },
    refreshTokens: [{ type: String }]
  },
  { timestamps: true }
)

userSchema.index({ 'socialLinks.provider': 1, 'socialLinks.providerId': 1 })

export default mongoose.model('User', userSchema)
