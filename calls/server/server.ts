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
const rooms: {
  [key: string]: string[]
} = {}

const users: {
  [key: string]: {roomId: string}
} = {}

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`)

  // Join room handler
  socket.on('join-room', (roomId: string) => {
    try {
      if(rooms[roomId] == null || rooms[roomId] == undefined){
        rooms[roomId] = []
      }
      rooms[roomId].push(socket.id)
      users[socket.id] = {roomId}
      socket.join(roomId)

      // Notify existing users
      const existingUsers = rooms[roomId].filter(el => el != socket.id)
      if(existingUsers.length){
        socket.to(roomId).emit('')
      }
      // Notify others about new user
      io.to(roomId).emit('connectedUsers', JSON.stringify(rooms[roomId]))
    } catch (error) {
      console.error('Join room error:', error)
    }
  })

  // WebRTC signaling handlers
  // const handleWebRTCSignal = (event: string) => (payload: { targetUserId: string }) => {
  //   const targetUser = users[payload.targetUserId]
  //   if (!targetUser) return
  //   socket.to(targetUser.id).emit(event, payload)
  // }

  socket.on('offer', () => {
    console.log(socket.id)
  })
  // socket.on('answer', handleWebRTCSignal('answer'))
  // socket.on('ice-candidate', handleWebRTCSignal('ice-candidate'))

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
    const room = users[socket.id].roomId
    io.to(rooms[room]).emit('user-disconnected', socket.id)
    console.log(rooms[room])
    rooms[room] = rooms[room].filter(el=>el != socket.id)
    console.log(rooms[room])

  })
})

httpServer.listen(5000, () => {
  console.log('Server running on port 5000')
})
