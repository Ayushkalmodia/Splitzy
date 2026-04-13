import User from '../models/User.js'

const PROVIDERS = ['google', 'apple']

const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null
  return email.toLowerCase().trim()
}

const hasSocialLink = (user, provider, providerId) =>
  (user.socialLinks || []).some((l) => l.provider === provider && l.providerId === providerId)

/**
 * Merge OAuth identity into an existing user (email as primary identity; link provider+providerId).
 */
export async function mergeOAuthIntoUser(user, { name, profileImage, provider, providerId, email }) {
  if (!PROVIDERS.includes(provider)) throw new Error('Invalid provider')

  const normalizedEmail = normalizeEmail(email)
  const links = [...(user.socialLinks || [])]

  if (!hasSocialLink(user, provider, providerId)) {
    const conflict = await User.findOne({
      _id: { $ne: user._id },
      socialLinks: { $elemMatch: { provider, providerId } }
    })
    if (conflict) {
      const err = new Error('This social account is already linked to another user')
      err.code = 'SOCIAL_CONFLICT'
      throw err
    }
    links.push({ provider, providerId })
  }

  user.socialLinks = links
  const types = new Set([...(user.authTypes || []), provider])
  if (user.passwordHash) types.add('local')
  user.authTypes = [...types]

  user.provider = provider
  user.providerId = providerId

  if (name && (!user.name || user.name === user.email?.split('@')[0])) {
    user.name = name
  }
  if (profileImage && !user.profileImage) {
    user.profileImage = profileImage
  }
  if (normalizedEmail && user.email !== normalizedEmail) {
    const taken = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } })
    if (taken) {
      const err = new Error('Email already associated with another account')
      err.code = 'EMAIL_CONFLICT'
      throw err
    }
    user.email = normalizedEmail
  }

  await user.save()
  return user
}

/**
 * Find or create user from verified OAuth profile. Email merges accounts; providerId links identity.
 */
export async function findOrCreateOAuthUser({ provider, providerId, email, name, profileImage }) {
  if (!providerId) {
    const err = new Error('Missing provider subject')
    err.code = 'MISSING_SUB'
    throw err
  }
  if (!PROVIDERS.includes(provider)) {
    const err = new Error('Invalid provider')
    err.code = 'INVALID_PROVIDER'
    throw err
  }

  const normalizedEmail = normalizeEmail(email)

  let user = await User.findOne({
    socialLinks: { $elemMatch: { provider, providerId } }
  })

  if (user) {
    return mergeOAuthIntoUser(user, { name, profileImage, provider, providerId, email: normalizedEmail })
  }

  if (normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail })
    if (user) {
      return mergeOAuthIntoUser(user, { name, profileImage, provider, providerId, email: normalizedEmail })
    }
  }

  if (!normalizedEmail) {
    const err = new Error('Email required for new account (re-authorize with email scope)')
    err.code = 'EMAIL_REQUIRED'
    throw err
  }

  const conflict = await User.findOne({
    socialLinks: { $elemMatch: { provider, providerId } }
  })
  if (conflict) {
    return mergeOAuthIntoUser(conflict, { name, profileImage, provider, providerId, email: normalizedEmail })
  }

  const types = [provider]
  return User.create({
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    profileImage: profileImage || undefined,
    authTypes: types,
    provider,
    providerId,
    socialLinks: [{ provider, providerId }]
  })
}

export { normalizeEmail }
