import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { botMessage, formatMessage, userJoin } from './utils.js'

const app = express()
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', socket => {
  socket.on('joinRoom', payload => {
    const user = userJoin({ ...payload, id: socket.id })
    socket.join(user.room)

    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botMessage, `${user.username} has joined the chat`))

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })
})

const PORT = 3001 || process.env.PORT

server.listen(PORT, () => {
  console.log('Server is running')
})
