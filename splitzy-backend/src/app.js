import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import { connectDB } from './config/db.js'
import { registerPassportStrategies } from './config/passport.js'
import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import expenseRoutes from './routes/expenses.js'
import settlementRoutes from './routes/settlements.js'
import userRoutes from './routes/users.js'
import analyticsRoutes from './routes/analytics.js'
import budgetRoutes from './routes/budgets.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import xssClean from 'xss-clean'
dotenv.config()
connectDB()
registerPassportStrategies()

const app = express()

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1)
}

// Security middlewares
app.use(helmet())
app.use(cookieParser())
app.use(mongoSanitize())
app.use(xssClean())

const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change-me-session'
const isProd = process.env.NODE_ENV === 'production'
const sessionSameSite = process.env.OAUTH_SESSION_SAMESITE || (isProd ? 'none' : 'lax')
const sessionSecure =
  sessionSameSite === 'none' || process.env.COOKIE_SECURE === '1' || isProd
const sessionOpts = {
  name: 'splitzy.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: sessionSecure,
    httpOnly: true,
    sameSite: sessionSameSite === 'strict' ? 'strict' : sessionSameSite === 'none' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000
  }
}
if (process.env.SESSION_STORE === 'mongo' && process.env.MONGODB_URI) {
  sessionOpts.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 15 * 60,
    touchAfter: 24 * 3600
  })
}
app.use(session(sessionOpts))
app.use(passport.initialize())
app.use(passport.session())

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

// Basic rate limiting (relaxed in development to avoid local UI spam lockouts)
const isProduction = process.env.NODE_ENV === 'production'
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 5000
})
app.use(limiter)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/settlements', settlementRoutes)
app.use('/api/users', userRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/budgets', budgetRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
