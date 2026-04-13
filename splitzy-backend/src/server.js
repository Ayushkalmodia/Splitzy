import http from 'http'
import app from './app.js'
import dotenv from 'dotenv'
import { initializeSocket } from './realtime/socket.js'

dotenv.config()

const PORT = process.env.PORT || 5050

const server = http.createServer(app)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
initializeSocket(server, allowedOrigins)

server.listen(PORT, () => {
  console.log(`Splitzy backend running on port ${PORT}`)
})
