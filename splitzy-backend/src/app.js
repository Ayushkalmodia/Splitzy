import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import expenseRoutes from './routes/expenses.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

dotenv.config()
connectDB()

const app = express()

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' || "https://splitzy-frontend.vercel.app",
  credentials: true
}))
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/expenses', expenseRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
