/**
 * Budgets + optimized settlements (Python nock).
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
import Budget from '../src/models/Budget.js'

let mongod
let app
let authToken
let userId
let groupId
let otherUserId

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'vitest-jwt-secret-budget'
  process.env.PYTHON_SERVICE_URL = 'http://localhost:8001'
  process.env.PYTHON_SERVICE_TIMEOUT_MS = '2000'
  process.env.PYTHON_SERVICE_RETRIES = '0'
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
    name: 'Budget User',
    email: `budget-${Date.now()}@example.com`,
    passwordHash: hash
  })
  userId = user._id.toString()

  const other = await User.create({
    name: 'Other Member',
    email: `other-${Date.now()}@example.com`,
    passwordHash: hash
  })
  otherUserId = other._id.toString()

  const group = await Group.create({
    name: 'Budget Group',
    createdBy: user._id,
    members: [user._id, other._id]
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

describe('GET /api/groups/:id/optimized-settlements', () => {
  it('proxies Python and enriches payer / payee objects', async () => {
    await Expense.deleteMany({ groupId })
    await Expense.create({
      description: 'Dinner',
      amount: 100,
      category: 'food',
      groupId,
      paidBy: userId,
      createdBy: userId,
      participants: [userId, otherUserId],
      splitType: 'equal',
      splits: [
        { userId, amount: 50 },
        { userId: otherUserId, amount: 50 }
      ],
      date: new Date('2026-04-05T12:00:00Z')
    })

    nock('http://localhost:8001')
      .post('/optimize-settlement')
      .reply(200, {
        transactions: [{ from: otherUserId, to: userId, amount: 50 }],
        transaction_count: 1,
        naive_bipartite_upper_bound: 1,
        transactions_saved_vs_bipartite: 0,
        transactions_saved_vs_legacy: 0,
        parties_with_nonzero_balance: 2,
        graph_nodes: 2,
        graph_edges: 1,
        algorithm: 'greedy_net_clearing_networkx'
      })

    const res = await request(app)
      .get(`/api/groups/${groupId}/optimized-settlements`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.transactions).toHaveLength(1)
    expect(res.body.transactions[0].from.name).toBeTruthy()
    expect(res.body.transactions[0].to.name).toBeTruthy()
    expect(res.body.transactions[0].amount).toBe(50)
  })
})

describe('Budgets API', () => {
  it('creates a budget and returns status with spend + insights', async () => {
    await Budget.deleteMany({ userId })
    await Expense.deleteMany({ groupId })

    await Expense.create({
      description: 'Groceries',
      amount: 80,
      category: 'food',
      groupId,
      paidBy: otherUserId,
      createdBy: userId,
      participants: [userId, otherUserId],
      splitType: 'equal',
      splits: [
        { userId, amount: 40 },
        { userId: otherUserId, amount: 40 }
      ],
      date: new Date('2026-04-10T12:00:00Z')
    })

    const createRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'food', monthlyLimit: 100, currency: 'USD' })

    expect(createRes.status).toBe(201)

    nock('http://localhost:8001')
      .post('/budget-insights')
      .reply(200, {
        alerts: [{ category: 'food', threshold: '50' }],
        recommendations: ['food: past halfway on budget (40% used). Track remaining discretionary spend.'],
        highest_risk_category: 'food'
      })

    const res = await request(app)
      .get('/api/budgets/status?month=2026-04')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.month).toBe('2026-04')
    expect(res.body.lines).toHaveLength(1)
    expect(res.body.lines[0].spent).toBe(40)
    expect(res.body.lines[0].category).toBe('food')
    expect(res.body.insights?.recommendations?.length).toBeGreaterThan(0)
  })
})
