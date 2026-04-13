/**
 * OAuth merge logic, JWT issuance, refresh rotation / reuse detection, and auth route guards.
 */
import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

let mongod
let app
let User
let findOrCreateOAuthUser
let mergeOAuthIntoUser
let processOAuthProfileForTest
let signRefreshToken

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  vi.resetModules()

  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'oauth-test-jwt'
  process.env.JWT_REFRESH_SECRET = 'oauth-test-refresh'
  process.env.CLIENT_ORIGIN = 'http://localhost:5173'
  process.env.NODE_ENV = 'development'
  process.env.SESSION_SECRET = 'oauth-test-session'
  // Block .env from enabling Google in this suite (dotenv does not override existing keys).
  process.env.GOOGLE_CLIENT_ID = ''
  process.env.GOOGLE_CLIENT_SECRET = ''

  User = (await import('../src/models/User.js')).default
  ;({ findOrCreateOAuthUser, mergeOAuthIntoUser } = await import('../src/services/oauthUserService.js'))
  ;({ processOAuthProfileForTest } = await import('../src/controllers/oauthController.js'))
  ;({ signRefreshToken } = await import('../src/services/authTokenService.js'))

  const { default: expressApp } = await import('../src/app.js')
  app = expressApp

  await mongoose.connection.asPromise().catch(() => {})
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Mongo connect timeout')), 15000)
      mongoose.connection.once('connected', () => {
        clearTimeout(t)
        resolve()
      })
    })
  }

  await User.syncIndexes()
}, 120000)

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongod) await mongod.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
})

describe('oauthUserService merge', () => {
  it('links Google to existing email/password user (same email)', async () => {
    const hash = await bcrypt.hash('secret12', 8)
    const u = await User.create({
      name: 'Local User',
      email: 'merge@example.com',
      passwordHash: hash,
      authTypes: ['local']
    })

    const out = await findOrCreateOAuthUser({
      provider: 'google',
      providerId: 'google-sub-1',
      email: 'merge@example.com',
      name: 'Local User',
      profileImage: 'https://example.com/p.jpg'
    })

    expect(out._id.toString()).toBe(u._id.toString())
    const fresh = await User.findById(u._id).lean()
    expect(
      fresh.socialLinks.some((l) => l.provider === 'google' && l.providerId === 'google-sub-1')
    ).toBe(true)
    expect(fresh.authTypes.sort()).toEqual(['google', 'local'].sort())
    expect(fresh.passwordHash).toBeTruthy()
    expect(fresh.profileImage).toBe('https://example.com/p.jpg')
  })

  it('adds Apple to user who already signed in with Google (same email identity)', async () => {
    await findOrCreateOAuthUser({
      provider: 'google',
      providerId: 'g-99',
      email: 'multi@example.com',
      name: 'Multi',
      profileImage: undefined
    })

    const u = await User.findOne({ email: 'multi@example.com' })
    expect(u.authTypes).toContain('google')

    await findOrCreateOAuthUser({
      provider: 'apple',
      providerId: 'apple-sub-99',
      email: 'multi@example.com',
      name: 'Multi Apple',
      profileImage: undefined
    })

    const fresh = await User.findById(u._id).lean()
    expect(fresh.socialLinks.length).toBe(2)
    expect(fresh.authTypes.sort()).toEqual(['apple', 'google'].sort())
  })

  it('creates a single account for new social user and prevents duplicate email via unique index', async () => {
    const a = await findOrCreateOAuthUser({
      provider: 'google',
      providerId: 'new-1',
      email: 'new@example.com',
      name: 'New',
      profileImage: undefined
    })
    expect(a.email).toBe('new@example.com')
    expect(a.passwordHash).toBeUndefined()

    await expect(
      User.create({
        name: 'Dup',
        email: 'new@example.com',
        passwordHash: await bcrypt.hash('x', 8),
        authTypes: ['local']
      })
    ).rejects.toThrow()
  })

  it('throws SOCIAL_CONFLICT when providerId is already linked to another user', async () => {
    await findOrCreateOAuthUser({
      provider: 'google',
      providerId: 'shared-sub',
      email: 'first@example.com',
      name: 'First',
      profileImage: undefined
    })
    await User.create({
      name: 'Second',
      email: 'second@example.com',
      passwordHash: await bcrypt.hash('secret12', 8),
      authTypes: ['local']
    })

    const second = await User.findOne({ email: 'second@example.com' })
    await expect(
      mergeOAuthIntoUser(second, {
        name: 'Second',
        profileImage: undefined,
        provider: 'google',
        providerId: 'shared-sub',
        email: 'second@example.com'
      })
    ).rejects.toEqual(expect.objectContaining({ code: 'SOCIAL_CONFLICT' }))
  })
})

describe('JWT generation after OAuth', () => {
  it('returns access and refresh tokens with expected JWT claims', async () => {
    const { accessToken, refreshToken, user } = await processOAuthProfileForTest({
      provider: 'google',
      providerId: 'jwt-sub',
      email: 'jwt@example.com',
      name: 'JWT User',
      profileImage: 'https://example.com/a.png'
    })

    const access = jwt.verify(accessToken, process.env.JWT_SECRET)
    expect(access.email).toBe('jwt@example.com')
    expect(access.name).toBe('JWT User')
    expect(access.role).toBe('member')
    expect(access.authTypes).toContain('google')

    const refresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    expect(String(refresh.id)).toBe(String(user.id))

    const dbUser = await User.findOne({ email: 'jwt@example.com' })
    expect(dbUser.refreshTokens).toContain(refreshToken)
  })
})

describe('refresh token reuse detection', () => {
  it('clears all refresh tokens when a rotated token is reused', async () => {
    const u = await User.create({
      name: 'R',
      email: 'r@example.com',
      passwordHash: await bcrypt.hash('secret12', 8),
      authTypes: ['local']
    })
    const oldRt = signRefreshToken(u)
    u.refreshTokens = [oldRt]
    await u.save()

    await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${oldRt}`)
    const u2 = await User.findById(u._id).lean()
    expect(u2.refreshTokens.length).toBe(1)
    expect(u2.refreshTokens[0]).not.toBe(oldRt)

    const res = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${oldRt}`)
    expect(res.status).toBe(401)

    const u3 = await User.findById(u._id).lean()
    expect(u3.refreshTokens.length).toBe(0)
  })
})

describe('email/password login with OAuth-only user', () => {
  it('rejects password login when passwordHash is missing', async () => {
    await findOrCreateOAuthUser({
      provider: 'apple',
      providerId: 'apple-only',
      email: 'appleonly@example.com',
      name: 'A',
      profileImage: undefined
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'appleonly@example.com', password: 'anything' })

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/social sign-in/i)
  })
})

describe('Google OAuth route when not configured', () => {
  it('returns 503 for /api/auth/google', async () => {
    const res = await request(app).get('/api/auth/google')
    expect(res.status).toBe(503)
  })
})

describe('OAuth status endpoint', () => {
  it('returns booleans for provider configuration', async () => {
    const res = await request(app).get('/api/auth/oauth/status')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ google: false, apple: false })
  })
})
