import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import {
  botName,
  formatMessage,
  getCurrentUser,
  getRoomUsers,
  userJoin,
  userLeave
} from './utils.js'

const app = express()
app.use(express.json())
const server = createServer(app)

//const express = require('express')
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mydb'
})

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '' // укажи пароль, если есть
  })

  // Создание БД
  await connection.query('CREATE DATABASE IF NOT EXISTS chatdb')

  // Подключение к БД
  await connection.changeUser({ database: 'chatdb' })

  // Создание таблицы
  await connection.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      time VARCHAR(20) NOT NULL
    )
  `)

  console.log('✅ База данных и таблица инициализированы.')
  await connection.end()
}

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', socket => {
  initDatabase().catch(err => {
    console.error('Ошибка инициализации:', err)
  })

  socket.on('joinRoom', payload => {
    const user = userJoin({ ...payload, id: socket.id })
    socket.join(user.room)
    console.log('IN Join Room Event')
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botName, `${user.username} has joined the chat`))

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })

  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id)
    if (user) {
      io.to(user.room).emit('message', formatMessage(user.username, msg))
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

const PORT = 3001 || process.env.PORT

server.listen(PORT, () => {
  console.log('Server is running')
})
