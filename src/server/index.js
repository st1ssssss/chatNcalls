import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

io.on('connection', socket => {
  console.log('User connected')
  socket.on('offer', data => {
    socket.broadcast.emit('offer', data)
  })

  socket.on('answer', data => {
    socket.broadcast.emit('answer', data)
  })

  socket.on('ice-candidate', candidate => {
    socket.broadcast.emit('ice-candidate', candidate)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id)
  })
})

httpServer.listen(3000, () => {
  console.log(`Running on http://localhost:3000`)
})
