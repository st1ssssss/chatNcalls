import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

interface User {
  id: string
  room?: string
}

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const users: Record<string, User> = {}

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`)
  users[socket.id] = { id: socket.id }

  // Join room handler
  socket.on('join-room', (roomId: string) => {
    try {
      users[socket.id].room = roomId
      socket.join(roomId)

      // Notify existing users
      const existingUsers = Object.values(users).filter(
        user => user.room === roomId && user.id !== socket.id
      )

      // Send existing users to new member
      socket.emit('existing-users', existingUsers)

      // Notify others about new user
      socket.to(roomId).emit('new-user-connected', users[socket.id])
    } catch (error) {
      console.error('Join room error:', error)
    }
  })

  // WebRTC signaling handlers
  const handleWebRTCSignal = (event: string) => (payload: { targetUserId: string }) => {
    const targetUser = users[payload.targetUserId]
    if (!targetUser) return
    socket.to(targetUser.id).emit(event, payload)
  }

  socket.on('offer', handleWebRTCSignal('offer'))
  socket.on('answer', handleWebRTCSignal('answer'))
  socket.on('ice-candidate', handleWebRTCSignal('ice-candidate'))

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
    const user = users[socket.id]
    if (user?.room) {
      socket.to(user.room).emit('user-disconnected', socket.id)
    }
    delete users[socket.id]
  })
})

httpServer.listen(3002, () => {
  console.log('Server running on port 3002')
})
