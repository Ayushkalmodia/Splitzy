/**
 * Core API: auth guards, validation, duplicate registration, budget query validation.
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import User from '../src/models/User.js'

let mongod
let app
let token
let userId

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'core-api-jwt'
  process.env.JWT_REFRESH_SECRET = 'core-api-refresh'
  process.env.CLIENT_ORIGIN = 'http://localhost:5173'
  process.env.NODE_ENV = 'development'
  process.env.SESSION_SECRET = 'core-api-session'
  process.env.GOOGLE_CLIENT_ID = ''
  process.env.GOOGLE_CLIENT_SECRET = ''

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

  const hash = await bcrypt.hash('password123', 8)
  const user = await User.create({
    name: 'Core User',
    email: `core-${Date.now()}@example.com`,
    passwordHash: hash,
    authTypes: ['local']
  })
  userId = user._id.toString()
  token = jwt.sign(
    { id: userId, email: user.email, name: user.name, role: 'member' },
    process.env.JWT_SECRET
  )
}, 120000)

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  if (mongod) await mongod.stop()
})

describe('Auth & guards', () => {
  it('rejects unauthenticated group list', async () => {
    const res = await request(app).get('/api/groups')
    expect(res.status).toBe(401)
  })

  it('registers then rejects duplicate email with 409', async () => {
    const email = `dup-${Date.now()}@example.com`
    const r1 = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email,
      password: 'secret123'
    })
    expect(r1.status).toBe(201)

    const r2 = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email,
      password: 'othersecret12'
    })
    expect(r2.status).toBe(409)
    expect(r2.body.message).toMatch(/already registered/i)
  })
})

describe('Expenses validation', () => {
  it('rejects create expense with invalid payload', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: '', amount: -5, groupId: 'not-an-id' })

    expect(res.status).toBe(400)
  })
})

describe('Budgets', () => {
  it('rejects status without valid month query', async () => {
    const res = await request(app)
      .get('/api/budgets/status?month=bad')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('updates monthly limit', async () => {
    const create = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'travel', monthlyLimit: 200, currency: 'USD' })
    expect(create.status).toBe(201)
    const id = create.body._id

    const upd = await request(app)
      .put(`/api/budgets/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monthlyLimit: 350 })

    expect(upd.status).toBe(200)
    expect(upd.body.monthlyLimit).toBe(350)
  })
})

describe('Groups CRUD', () => {
  it('creates a group when authenticated', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Trip', description: 'Test' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Trip')
    const memberIds = res.body.members.map((m) => (m._id || m).toString())
    expect(memberIds).toContain(userId)
  })
})
