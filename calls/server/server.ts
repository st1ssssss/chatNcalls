import express from 'express'
import { createServer } from 'http'
import * as mediasoup from 'mediasoup'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

interface Room {
  router: mediasoup.types.Router
  peers: Map<string, Peer>
}

interface Peer {
  socketId: string
  transports: Map<string, mediasoup.types.WebRtcTransport>
  producers: Map<string, mediasoup.types.Producer>
  consumers: Map<string, mediasoup.types.Consumer>
}

const rooms = new Map<string, Room>()
let worker: mediasoup.types.Worker

// Инициализация mediasoup worker
async function initMediaSoup() {
  try {
    worker = await mediasoup.createWorker({
      rtcMinPort: 40000,
      rtcMaxPort: 40100,
      logLevel: 'debug',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
    })
    console.log(`MediaSoup worker created successfully! PID: ${worker.pid}`)

    worker.on('died', (error) => {
      console.error('MediaSoup worker died:', error)
    })
  } catch (error) {
    console.error('Failed to create MediaSoup worker:', error)
    process.exit(1)
  }

}

// Создание или получение комнаты
async function getOrCreateRoom(roomId: string): Promise<Room> {
  let room = rooms.get(roomId)
  
  if (!room) {
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        }
      ]
    })
    
    room = {
      router,
      peers: new Map()
    }
    rooms.set(roomId, room)
  }
  
  return room
}

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`)
  
  socket.on('join-room', async ({ roomId }, callback) => {
    try {
      const room = await getOrCreateRoom(roomId)
      const peer: Peer = {
        socketId: socket.id,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map()
      }
      
      room.peers.set(socket.id, peer)
      socket.join(roomId)
      
      // Отправляем RTP возможности роутера клиенту
      const routerRtpCapabilities = room.router.rtpCapabilities
      callback({ routerRtpCapabilities })
      
      // Уведомляем других пользователей о новом участнике
      socket.to(roomId).emit('new-peer', { socketId: socket.id })
      
      // Отправляем новому участнику список существующих пиров
      const otherPeers = Array.from(room.peers.keys()).filter(id => id !== socket.id)
      if (otherPeers.length > 0) {
        socket.emit('existing-peers', { peers: otherPeers })
      }
    } catch (error:any) {
      console.error('Join room error:', error)
      callback({ error: error.message })
    }
  })
  
  // Создание WebRtcTransport
  socket.on('create-transport', async ({ roomId, direction }, callback) => {
    try {
      const room = rooms.get(roomId)
      if (!room) throw new Error('Room not found')
      
      const peer = room.peers.get(socket.id)
      if (!peer) throw new Error('Peer not found')
      
      const transport = await room.router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
      })
      
      peer.transports.set(transport.id, transport)
      
      // Обработка событий транспорта
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close()
        }
      })
      
      transport.on('@close', () => {
        console.log('Transport closed:', transport.id)
        peer.transports.delete(transport.id)
      })
      
      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      })
      
    } catch (error:any) {
      console.error('Create transport error:', error)
      callback({ error: error.message })
    }
  })
  
  // Подключение транспорта
  socket.on('connect-transport', async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const room = rooms.get(roomId)
      if (!room) throw new Error('Room not found')
      
      const peer = room.peers.get(socket.id)
      if (!peer) throw new Error('Peer not found')
      
      const transport = peer.transports.get(transportId)
      if (!transport) throw new Error('Transport not found')
      
      await transport.connect({ dtlsParameters })
      callback({ success: true })
    } catch (error:any) {
      console.error('Connect transport error:', error)
      callback({ error: error.message })
    }
  })
  
  // Создание продюсера
  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
    try {
      const room = rooms.get(roomId)
      if (!room) throw new Error('Room not found')
      
      const peer = room.peers.get(socket.id)
      if (!peer) throw new Error('Peer not found')
      
      const transport = peer.transports.get(transportId)
      if (!transport) throw new Error('Transport not found')
      
      const producer = await transport.produce({ kind, rtpParameters })
      peer.producers.set(producer.id, producer)
      
      // Уведомляем других участников о новом продюсере
      socket.to(roomId).emit('new-producer', {
        socketId: socket.id,
        producerId: producer.id,
        kind
      })
      
      callback({ id: producer.id })
      
      producer.on('transportclose', () => {
        console.log('Producer transport closed:', producer.id)
        producer.close()
      })
      
      producer.on('@close', () => {
        console.log('Producer closed:', producer.id)
        peer.producers.delete(producer.id)
        socket.to(roomId).emit('producer-closed', {
          socketId: socket.id,
          producerId: producer.id
        })
      })
    } catch (error:any) {
      console.error('Produce error:', error)
      callback({ error: error.message })
    }
  })
  
  // Создание консьюмера
  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = rooms.get(roomId)
      if (!room) throw new Error('Room not found')
      
      const peer = room.peers.get(socket.id)
      if (!peer) throw new Error('Peer not found')
      
      const transport = peer.transports.get(transportId)
      if (!transport) throw new Error('Transport not found')
      
      // Проверяем, существует ли продюсер
      let targetProducer: mediasoup.types.Producer | null = null
      let targetPeerId = ''
      
      for (const [peerId, otherPeer] of room.peers) {
        if (peerId === socket.id) continue
        
        const producer = otherPeer.producers.get(producerId)
        if (producer) {
          targetProducer = producer
          targetPeerId = peerId
          break
        }
      }
      
      if (!targetProducer) {
        throw new Error('Producer not found')
      }
      
      if (!room.router.canConsume({
        producerId: targetProducer.id,
        rtpCapabilities
      })) {
        throw new Error('Cannot consume')
      }
      
      const consumer = await transport.consume({
        producerId: targetProducer.id,
        rtpCapabilities,
        paused: false
      })
      
      peer.consumers.set(consumer.id, consumer)
      
      consumer.on('transportclose', () => {
        console.log('Consumer transport closed')
        consumer.close()
      })
      
      consumer.on('@close', () => {
        console.log('Consumer closed:', consumer.id)
        peer.consumers.delete(consumer.id)
      })
      
      callback({
        id: consumer.id,
        producerId: targetProducer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type
      })
      
    } catch (error:any) {
      console.error('Consume error:', error)
      callback({ error: error.message })
    }
  })
  
  // Разрешение консьюмера
  socket.on('resume-consumer', async ({ roomId, consumerId }, callback) => {
    try {
      const room = rooms.get(roomId)
      if (!room) throw new Error('Room not found')
      
      const peer = room.peers.get(socket.id)
      if (!peer) throw new Error('Peer not found')
      
      const consumer = peer.consumers.get(consumerId)
      if (!consumer) throw new Error('Consumer not found')
      
      await consumer.resume()
      callback({ success: true })
    } catch (error:any) {
      console.error('Resume consumer error:', error)
      callback({ error: error.message })
    }
  })
  
  socket.on('producer-closed', ({ roomId, producerId }) => {
    try {
      const room = rooms.get(roomId)
      if (!room) return
      
      // Ищем и закрываем все связанные консьюмеры
      for (const [peerId, peer] of room.peers) {
        for (const [consumerId, consumer] of peer.consumers) {
          if (consumer.producerId === producerId) {
            consumer.close()
            peer.consumers.delete(consumerId)
            io.to(peerId).emit('producer-closed', { producerId })
          }
        }
      }
    } catch (error) {
      console.error('Producer closed handler error:', error)
    }
  })
  
  // Отключение пользователя
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
    
    // Удаляем пользователя из всех комнат
    rooms.forEach((room, roomId) => {
      if (room.peers.has(socket.id)) {
        const peer = room.peers.get(socket.id)!
        
        // Закрываем все транспорты
        peer.transports.forEach(transport => transport.close())
        peer.producers.forEach(producer => producer.close())
        peer.consumers.forEach(consumer => consumer.close())
        
        room.peers.delete(socket.id)
        
        // Уведомляем других участников
        io.to(roomId).emit('peer-disconnected', { socketId: socket.id })
        
        // Если комната пустая, удаляем её
        if (room.peers.size === 0) {
          room.router.close()
          rooms.delete(roomId)
          console.log(`Room ${roomId} deleted`)
        }
      }
    })
  })
})

// Инициализация и запуск сервера
initMediaSoup().then(() => {
  httpServer.listen(5000, () => {
    console.log('Server running on port 5000')
  })
})