/**
 * Google OAuth callback HTTP flow with passport.authenticate mocked (no real Google).
 */
import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import passport from 'passport'

let mongod
let app
let User

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  vi.resetModules()

  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'g-callback-test'
  process.env.JWT_REFRESH_SECRET = 'g-callback-refresh'
  process.env.CLIENT_ORIGIN = 'http://localhost:5173'
  process.env.NODE_ENV = 'development'
  process.env.SESSION_SECRET = 'g-sess'
  process.env.GOOGLE_CLIENT_ID = 'test-google-client'
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret'

  vi.spyOn(passport, 'authenticate').mockImplementation((_strategy, opts = {}) => {
    return (req, res, next) => {
      if (opts.scope) {
        return res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth?mock=1')
      }
      req.user = {
        provider: 'google',
        providerId: 'mock-google-sub',
        email: 'oauth-flow@example.com',
        name: 'Flow Test',
        profileImage: undefined
      }
      next()
    }
  })

  const mod = await import('../src/app.js')
  app = mod.default
  User = (await import('../src/models/User.js')).default

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
}, 120000)

afterAll(async () => {
  vi.restoreAllMocks()
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongod) await mongod.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
})

describe('Google OAuth (mocked passport)', () => {
  it('GET /api/auth/google redirects to provider authorize URL', async () => {
    const res = await request(app).get('/api/auth/google')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('mock=1')
  })

  it('GET /api/auth/google/callback redirects to SPA with access_token in fragment', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=fake&state=x')
    expect(res.status).toBe(302)
    const loc = res.headers.location
    expect(loc).toContain('http://localhost:5173/oauth/callback#')
    expect(loc).toMatch(/access_token=/)
    expect(loc).toMatch(/provider=google/)

    const u = await User.findOne({ email: 'oauth-flow@example.com' })
    expect(u).toBeTruthy()
    expect(u.socialLinks.some((l) => l.providerId === 'mock-google-sub')).toBe(true)
  })
})
