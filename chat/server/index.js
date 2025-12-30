import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import {
  botName,
  formatMessage,
  getCurrentUser,
  getRoomUsers,
  userJoin,
  userLeave
} from './utils.js'

sqlite3.verbose()
const app = express()
app.use(express.json())
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', socket => {
  socket.on('joinRoom', async payload => {
    const user = userJoin({ ...payload, id: socket.id })
    socket.join(user.room)

    // Открываем или создаём файл базы данных
    const db = await open({
      filename: './chat.db',
      driver: sqlite3.Database
    })

    // 1. Создаём таблицу (если нет)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      text TEXT,
      time TEXT,
      room TEXT
    )
  `)

    // 3. Получаем все сообщения
    const messages = await db.all('SELECT * FROM messages ORDER BY id ASC')

    if (user) {
      io.to(user.room).emit(
        'loadMessages',
        messages.filter(mess => mess.room == user.room) //.map(x => [x.id, x.username, x.text, x.time])
      )
    }

    await db.close()

    console.log('IN Join Room Event')
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botName, `${user.username} has joined the chat`))

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })

  socket.on('chatMessage', async msg => {
    const user = getCurrentUser(socket.id)
    if (user) {
      var newMessage = formatMessage(user.username, msg)

      io.to(user.room).emit('message', newMessage)

      // Открываем или создаём файл базы данных
      const db = await open({
        filename: './chat.db',
        driver: sqlite3.Database
      })

      // 1. Создаём таблицу (если нет)
      await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      text TEXT,
      time TEXT,
      room TEXT
    )
  `)

      await db.run('INSERT INTO messages (username, text, time, room) VALUES (?, ?, ?, ?)', [
        newMessage.username,
        newMessage.text,
        newMessage.time,
        user.room
      ])

      await db.close()
    }
  })

  socket.on('disconnect', () => {
    const user = userLeave(socket.id)
    if (user) {
      io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`))
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      })
    }
  })
})

const PORT = 5001 || process.env.PORT

server.listen(PORT, () => {
  console.log('Server is running')
})
