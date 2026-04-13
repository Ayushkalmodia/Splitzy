/**
 * Integration tests: Mongo (memory) + Express + nock (FastAPI) + expense ML flow.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import nock from 'nock'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import User from '../src/models/User.js'
import Group from '../src/models/Group.js'
import Expense from '../src/models/Expense.js'

let mongod
let app
let authToken
let userId
let groupId

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'vitest-jwt-secret-splitzy'
  process.env.PYTHON_SERVICE_URL = 'http://localhost:8001'
  process.env.PYTHON_SERVICE_TIMEOUT_MS = '1500'
  process.env.NODE_ENV = 'development'
  process.env.CLIENT_ORIGIN = 'http://localhost:5173'

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

  const hash = await bcrypt.hash('pass12345', 8)
  const user = await User.create({
    name: 'Test User',
    email: `ml-test-${Date.now()}@example.com`,
    passwordHash: hash
  })
  userId = user._id.toString()
  const group = await Group.create({
    name: 'ML Test Group',
    createdBy: user._id,
    members: [user._id]
  })
  groupId = group._id.toString()

  authToken = jwt.sign(
    { id: userId, email: user.email, name: user.name, role: 'member' },
    process.env.JWT_SECRET
  )
}, 120000)

afterEach(() => {
  nock.cleanAll()
})

afterAll(async () => {
  nock.cleanAll()
  nock.enableNetConnect()
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongod) await mongod.stop()
})

const expensePayloadBase = () => ({
  description: 'pizza party',
  amount: 40,
  currency: 'USD',
  category: 'other',
  categoryManuallySelected: false,
  groupId,
  paidBy: userId,
  splitType: 'equal',
  splits: [{ userId }]
})

describe('FastAPI proxy + expense create', () => {
  it('saves predictedCategory and categoryConfidence when FastAPI returns 200', async () => {
    const scope = nock('http://localhost:8001')
      .post('/categorize-expense', (body) => body.description === 'pizza party')
      .reply(200, { predictedCategory: 'Food', categoryConfidence: 0.94 })

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send(expensePayloadBase())

    expect(res.status).toBe(201)
    expect(scope.isDone()).toBe(true)

    const doc = await Expense.findById(res.body._id).lean()
    expect(doc.description).toBe('pizza party')
    expect(doc.predictedCategory).toBe('food')
    expect(doc.categoryConfidence).toBeCloseTo(0.94, 5)
    expect(doc.category).toBe('food')
  })

  it('manual category override keeps user category but still stores ML metadata', async () => {
    nock('http://localhost:8001')
      .post('/categorize-expense')
      .reply(200, { predictedCategory: 'Food', categoryConfidence: 0.9 })

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...expensePayloadBase(),
        description: 'burger lunch',
        category: 'utilities',
        categoryManuallySelected: true
      })

    expect(res.status).toBe(201)
    const doc = await Expense.findById(res.body._id).lean()
    expect(doc.category).toBe('utilities')
    expect(doc.predictedCategory).toBe('food')
    expect(doc.categoryConfidence).toBeCloseTo(0.9, 5)
  })

  it('fallback when FastAPI returns error: expense still created without ML fields', async () => {
    nock('http://localhost:8001').post('/categorize-expense').reply(502, { message: 'upstream unavailable' })

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...expensePayloadBase(),
        description: 'some expense no ml',
        category: 'shopping',
        categoryManuallySelected: false
      })

    expect(res.status).toBe(201)
    const doc = await Expense.findById(res.body._id).lean()
    expect(doc.predictedCategory).toBeUndefined()
    expect(doc.categoryConfidence).toBeUndefined()
    expect(doc.category).toBe('shopping')
  })

  it('timeout returns 502 from proxy; expense still saves without ML', async () => {
    process.env.PYTHON_SERVICE_TIMEOUT_MS = '200'
    nock('http://localhost:8001')
      .post('/categorize-expense')
      .delay(800)
      .reply(200, { predictedCategory: 'Food', categoryConfidence: 0.5 })

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...expensePayloadBase(),
        description: 'timeout case expense',
        category: 'entertainment',
        categoryManuallySelected: false
      })

    process.env.PYTHON_SERVICE_TIMEOUT_MS = '1500'
    expect(res.status).toBe(201)
    const doc = await Expense.findById(res.body._id).lean()
    expect(doc.predictedCategory).toBeUndefined()
    expect(doc.category).toBe('entertainment')
  })
})
