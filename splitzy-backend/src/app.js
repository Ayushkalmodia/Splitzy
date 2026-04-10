import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import expenseRoutes from './routes/expenses.js'
import settlementRoutes from './routes/settlements.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import xssClean from 'xss-clean'
dotenv.config()
connectDB()

const app = express()

// Security middlewares
app.use(helmet())
app.use(cookieParser())
app.use(mongoSanitize())
app.use(xssClean())

// CORS allowlist (comma-separated in env)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    },
    credentials: true
  })
)

// Basic rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 })
app.use(limiter)
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/settlements', settlementRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
