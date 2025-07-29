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
  socket.on('join-room', ({roomId, offer}: {roomId:string, offer: RTCSessionDescriptionInit}) => {
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
        socket.to(roomId).emit('offer', offer)
      }
      // Notify others about new user
      io.to(roomId).emit('connectedUsers', JSON.stringify(rooms[roomId]))
    } catch (error) {
      console.error('Join room error:', error)
    }
  })

  // WebRTC signaling handlers
  const handleWebRTCSignal = ({event, payload}: {event: 'answer'|'ice-candidate', payload: {roomId: string, answer?:any , candidate?: RTCIceCandidate}}) => {
    console.log(event,payload)
    const existingUsers = rooms[payload.roomId].filter(el => el != socket.id)
      if(existingUsers.length){
        switch (event){
          case 'answer':
            socket.to(payload.roomId).emit(event, payload.answer)
            break
          case 'ice-candidate':
            socket.to(payload.roomId).emit(event, payload.candidate)
            break
        }
      }
  }

  socket.on('answer', (data: {roomId: string, answer: any})=>handleWebRTCSignal({event: 'answer', payload: data}))
  socket.on('ice-candidate', (data: {roomId: string, candidate: RTCIceCandidate})=>handleWebRTCSignal({event: 'ice-candidate', payload: data}))

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
    const room = users[socket.id]?.roomId
    io.to(rooms[room]).emit('user-disconnected', socket.id)
    console.log(rooms[room])
    rooms[room] = rooms[room]?.filter(el=>el != socket.id)
    console.log(rooms[room])

  })
})

httpServer.listen(5000, () => {
  console.log('Server running on port 5000')
})
