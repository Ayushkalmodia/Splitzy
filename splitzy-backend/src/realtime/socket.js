import { Server } from 'socket.io'

let ioInstance = null

export const initializeSocket = (httpServer, corsOrigins) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  })

  ioInstance.on('connection', (socket) => {
    socket.on('group:join', (groupId) => {
      if (groupId) {
        socket.join(`group:${groupId}`)
      }
    })

    socket.on('group:leave', (groupId) => {
      if (groupId) {
        socket.leave(`group:${groupId}`)
      }
    })
  })

  return ioInstance
}

export const getIO = () => ioInstance

export const emitToGroup = (groupId, eventName, payload) => {
  if (!ioInstance || !groupId) return
  ioInstance.to(`group:${groupId}`).emit(eventName, payload)
}
